/**
 * echarts图表类：折线图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Line(ecConfig, messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_LINE;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        var finalPLMap = {}; // 完成的point list(PL)
        var _sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
        var _symbol = ecConfig.symbolList;
        var _sIndex2ShapeMap = {};  // series拐点图形类型，seriesIndex索引到shape type

        require('zrender/shape').get('icon').define(
            'legendLineIcon', legendLineIcon
        );
        
        function _buildShape() {
            finalPLMap = {};
            self.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : [],
                left : [],
                right : []
            };
            var xAxisIndex;
            var yAxisIndex;
            var xAxis;
            var yAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == self.type) {
                    series[i] = self.reformOption(series[i]);
                    xAxisIndex = series[i].xAxisIndex;
                    yAxisIndex = series[i].yAxisIndex;
                    xAxis = component.xAxis.getAxis(xAxisIndex);
                    yAxis = component.yAxis.getAxis(yAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                    else if (yAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[yAxis.getPosition()].push(i);
                    }
                }
            }
            //console.log(_position2sIndexMap)
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    _buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个方向上的折线图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePosition(position, seriesArray) {
            var mapData = _mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }

            var xMarkMap = {}; // 为标注记录一些参数
            switch (position) {
                case 'bottom' :
                case 'top' :
                    _buildHorizontal(maxDataLength, locationMap, xMarkMap);
                    break;
                case 'left' :
                case 'right' :
                    _buildVertical(maxDataLength, locationMap, xMarkMap);
                    break;
            }
            
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                self.buildMark(
                    series[seriesArray[i]],
                    seriesArray[i],
                    component,
                    {
                        xMarkMap : xMarkMap
                    }
                );
            }
        }

        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        function _mapData(seriesArray) {
            var serie;                              // 临时映射变量
            var dataIndex = 0;                      // 堆叠数据所在位置映射
            var stackMap = {};                      // 堆叠数据位置映射，堆叠组在二维中的第几项
            var magicStackKey = '__kener__stack__'; // 堆叠命名，非堆叠数据安单一堆叠处理
            var stackKey;                           // 临时映射变量
            var serieName;                          // 临时映射变量
            var legend = component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            var iconShape;
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                
                _sIndex2ShapeMap[seriesArray[i]]
                    = _sIndex2ShapeMap[seriesArray[i]]
                      || self.query(serie,'symbol')
                      || _symbol[i % _symbol.length];
                      
                if (legend){
                    self.selectedMap[serieName] = legend.isSelected(serieName);
                    
                    _sIndex2ColorMap[seriesArray[i]]
                        = legend.getColor(serieName);
                        
                    iconShape = legend.getItemShape(serieName);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        iconShape.shape = 'icon';
                        iconShape.style.iconType = 'legendLineIcon';
                        iconShape.style.symbol = 
                            _sIndex2ShapeMap[seriesArray[i]];
                        
                        legend.setItemShape(serieName, iconShape);
                    }
                } else {
                    self.selectedMap[serieName] = true;
                    _sIndex2ColorMap[seriesArray[i]]
                        = zr.getColor(seriesArray[i]);
                }

                if (self.selectedMap[serieName]) {
                    stackKey = serie.stack || (magicStackKey + seriesArray[i]);
                    if (typeof stackMap[stackKey] == 'undefined') {
                        stackMap[stackKey] = dataIndex;
                        locationMap[dataIndex] = [seriesArray[i]];
                        dataIndex++;
                    }
                    else {
                        // 已经分配了位置就推进去就行
                        locationMap[stackMap[stackKey]].push(seriesArray[i]);
                    }
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }
            /* 调试输出
            var s = '';
            for (var i = 0, l = maxDataLength; i < l; i++) {
                s = '[';
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    s +='['
                    for (var m = 0, n = locationMap[j].length - 1; m < n; m++) {
                        s += series[locationMap[j][m]].data[i] + ','
                    }
                    s += series[locationMap[j][locationMap[j].length - 1]]
                         .data[i];
                    s += ']'
                }
                s += ']';
                console.log(s);
            }
            console.log(locationMap)
            */

            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        }

        /**
         * 构建类目轴为水平方向的折线图系列
         */
        function _buildHorizontal(maxDataLength, locationMap, xMarkMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var xAxisIndex = serie.xAxisIndex;
            var categoryAxis = component.xAxis.getAxis(xAxisIndex);
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var x;
            var y;
            var lastYP; // 正向堆叠处理
            var baseYP;
            var lastYN; // 负向堆叠处理
            var baseYN;
            //var finalPLMap = {}; // 完成的point list(PL)
            var curPLMap = {};   // 正在记录的point list(PL)
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                x = categoryAxis.getCoordByIndex(i);
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    yAxisIndex = series[locationMap[j][0]].yAxisIndex || 0;
                    valueAxis = component.yAxis.getAxis(yAxisIndex);
                    baseYP = lastYP = baseYN = lastYN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] 
                                                || {
                                                    min : Number.POSITIVE_INFINITY,
                                                    max : Number.NEGATIVE_INFINITY,
                                                    sum : 0,
                                                    counter : 0,
                                                    average : 0
                                                };
                        if (value == '-') {
                            // 空数据则把正在记录的curPLMap添加到finalPLMap中
                            if (curPLMap[seriesIndex].length > 0) {
                                finalPLMap[seriesIndex] =
                                    finalPLMap[seriesIndex] || [];

                                finalPLMap[seriesIndex].push(
                                    curPLMap[seriesIndex]
                                );

                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        //y = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆叠
                            lastYP -= m > 0
                                      ? valueAxis.getCoordSize(value)
                                      : (baseYP - valueAxis.getCoord(value));
                            y = lastYP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            lastYN += m > 0 
                                      ? valueAxis.getCoordSize(value)
                                      : (valueAxis.getCoord(value) - baseYN);
                            y = lastYN;
                        }
                        curPLMap[seriesIndex].push(
                            [x, y, i, categoryAxis.getNameByIndex(i), x, baseYP]
                        );
                        
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minY = y;
                            xMarkMap[seriesIndex].minX = x;
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxY = y;
                            xMarkMap[seriesIndex].maxX = x;
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                    }
                }
                // 补充空数据的拖拽提示
                lastYP = component.grid.getY();
                var symbolSize;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }
                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            symbolSize = self.deepQuery(
                                [data, serie],
                                'symbolSize'
                            );
                            lastYP += symbolSize * 2 + 5;
                            y = lastYP;
                            self.shapeList.push(_getCalculableItem(
                                seriesIndex, i, categoryAxis.getNameByIndex(i),
                                x, y, 'horizontal'
                            ));
                        }
                    }
                }
            }
            
            // 把剩余未完成的curPLMap全部添加到finalPLMap中
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    finalPLMap[sId] = finalPLMap[sId] || [];
                    finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    if (xMarkMap[seriesIndex].counter > 0) {
                        xMarkMap[seriesIndex].average = 
                            (xMarkMap[seriesIndex].sum / xMarkMap[seriesIndex].counter).toFixed(2) 
                            - 0;
                    }
                    y = component.yAxis.getAxis(series[seriesIndex].yAxisIndex || 0)
                        .getCoord(xMarkMap[seriesIndex].average);
                    xMarkMap[seriesIndex].averageLine = [
                        [component.grid.getX(), y],
                        [component.grid.getXend(), y]
                    ];
                    
                    xMarkMap[seriesIndex].minLine = [
                        [component.grid.getX(), xMarkMap[seriesIndex].minY],
                        [component.grid.getXend(), xMarkMap[seriesIndex].minY]
                    ];
                    xMarkMap[seriesIndex].maxLine = [
                        [component.grid.getX(), xMarkMap[seriesIndex].maxY],
                        [component.grid.getXend(), xMarkMap[seriesIndex].maxY]
                    ];
                }
            }
            
            _buildBorkenLine(finalPLMap, categoryAxis, 'horizontal');
        }

        /**
         * 构建类目轴为垂直方向的折线图系列
         */
        function _buildVertical(maxDataLength, locationMap, xMarkMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var yAxisIndex = serie.yAxisIndex;
            var categoryAxis = component.yAxis.getAxis(yAxisIndex);
            var xAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var x;
            var y;
            var lastXP; // 正向堆叠处理
            var baseXP;
            var lastXN; // 负向堆叠处理
            var baseXN;
            //var finalPLMap = {}; // 完成的point list(PL)
            var curPLMap = {};   // 正在记录的point list(PL)
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                y = categoryAxis.getCoordByIndex(i);
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    xAxisIndex = series[locationMap[j][0]].xAxisIndex || 0;
                    valueAxis = component.xAxis.getAxis(xAxisIndex);
                    baseXP = lastXP = baseXN = lastXN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] 
                                                || {
                                                    min : Number.POSITIVE_INFINITY,
                                                    max : Number.NEGATIVE_INFINITY,
                                                    sum : 0,
                                                    counter : 0,
                                                    average : 0
                                                };
                        if (value == '-') {
                            // 空数据则把正在记录的curPLMap添加到finalPLMap中
                            if (curPLMap[seriesIndex].length > 0) {
                                finalPLMap[seriesIndex] =
                                    finalPLMap[seriesIndex] || [];

                                finalPLMap[seriesIndex].push(
                                    curPLMap[seriesIndex]
                                );

                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        //x = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆叠
                            lastXP += m > 0
                                      ? valueAxis.getCoordSize(value)
                                      : (valueAxis.getCoord(value) - baseXP);
                            x = lastXP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            lastXN -= m > 0
                                      ? valueAxis.getCoordSize(value)
                                      : (baseXN - valueAxis.getCoord(value));
                            x = lastXN;
                        }
                        curPLMap[seriesIndex].push(
                            [x, y, i, categoryAxis.getNameByIndex(i), baseXP, y]
                        );
                        
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minX = x;
                            xMarkMap[seriesIndex].minY = y;
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxX = x;
                            xMarkMap[seriesIndex].maxY = y;
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                    }
                }
                // 补充空数据的拖拽提示
                lastXP = component.grid.getXend();
                var symbolSize;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }
                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            symbolSize = self.deepQuery(
                                [data, serie],
                                'symbolSize'
                            );
                            lastXP -= symbolSize * 2 + 5;
                            x = lastXP;
                            self.shapeList.push(_getCalculableItem(
                                seriesIndex, i, categoryAxis.getNameByIndex(i),
                                x, y, 'vertical'
                            ));
                        }
                    }
                }
            }

            // 把剩余未完成的curPLMap全部添加到finalPLMap中
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    finalPLMap[sId] = finalPLMap[sId] || [];
                    finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    if (xMarkMap[seriesIndex].counter > 0) {
                        xMarkMap[seriesIndex].average = 
                            (xMarkMap[seriesIndex].sum / xMarkMap[seriesIndex].counter).toFixed(2) 
                            - 0;
                    }
                    
                    x = component.xAxis.getAxis(series[seriesIndex].xAxisIndex || 0)
                        .getCoord(xMarkMap[seriesIndex].average);
                        
                    xMarkMap[seriesIndex].averageLine = [
                        [x, component.grid.getYend()],
                        [x, component.grid.getY()]
                    ];
                    xMarkMap[seriesIndex].minLine = [
                        [xMarkMap[seriesIndex].minX, component.grid.getYend()],
                        [xMarkMap[seriesIndex].minX, component.grid.getY()]
                    ];
                    xMarkMap[seriesIndex].maxLine = [
                        [xMarkMap[seriesIndex].maxX, component.grid.getYend()],
                        [xMarkMap[seriesIndex].maxX, component.grid.getY()]
                    ];
                }
            }
            
            _buildBorkenLine(finalPLMap, categoryAxis, 'vertical');
        }

        /**
         * 生成折线和折线上的拐点
         */
        function _buildBorkenLine(pointList, categoryAxis, orient) {
            var defaultColor;

            // 折线相关
            var lineWidth;
            var lineType;
            var lineColor;
            var normalColor;

            // 填充相关
            var isFill;
            var fillNormalColor;

            var serie;
            var data;
            var seriesPL;
            var singlePL;

            // 堆叠层叠需求，反顺序构建
            for (var seriesIndex = series.length - 1;
                seriesIndex >= 0;
                seriesIndex--
            ) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                if (serie.type == self.type && typeof seriesPL != 'undefined') {
                    defaultColor = _sIndex2ColorMap[seriesIndex];
                    // 多级控制
                    lineWidth = self.query(
                        serie, 'itemStyle.normal.lineStyle.width'
                    );
                    lineType = self.query(
                        serie, 'itemStyle.normal.lineStyle.type'
                    );
                    lineColor = self.query(
                        serie, 'itemStyle.normal.lineStyle.color'
                    );
                    normalColor = self.getItemStyleColor(
                        self.query(serie, 'itemStyle.normal.color'), seriesIndex, -1
                    );

                    isFill = typeof self.query(
                        serie, 'itemStyle.normal.areaStyle'
                    ) != 'undefined';

                    fillNormalColor = self.query(
                        serie, 'itemStyle.normal.areaStyle.color'
                    );

                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        for (var j = 0, k = singlePL.length; j < k; j++) {
                            data = serie.data[singlePL[j][2]];
                            if (self.deepQuery(
                                    [data, serie], 'showAllSymbol'
                                ) // 全显示
                                || (categoryAxis.isMainAxis(singlePL[j][2])
                                    && self.deepQuery(
                                           [data, serie], 'symbol'
                                       ) != 'none'
                                   ) // 主轴非空
                                || self.deepQuery(
                                        [data, serie, option],
                                        'calculable'
                                   ) // 可计算
                            ) {
                                self.shapeList.push(_getSymbol(
                                    seriesIndex,
                                    singlePL[j][2], // dataIndex
                                    singlePL[j][3], // name
                                    singlePL[j][0], // x
                                    singlePL[j][1], // y
                                    orient
                                ));
                            }

                        }
                        // 折线图
                        self.shapeList.push({
                            shape : 'brokenLine',
                            zlevel : _zlevelBase,
                            style : {
                                miterLimit: lineWidth,
                                pointList : singlePL,
                                strokeColor : lineColor
                                              || normalColor 
                                              || defaultColor,
                                lineWidth : lineWidth,
                                lineType : lineType,
                                smooth : _getSmooth(serie.smooth),
                                shadowColor : self.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowColor'
                                ),
                                shadowBlur: self.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowBlur'
                                ),
                                shadowOffsetX: self.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowOffsetX'
                                ),
                                shadowOffsetY: self.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowOffsetY'
                                )
                            },
                            hoverable : false,
                            _main : true,
                            _seriesIndex : seriesIndex,
                            _orient : orient
                        });
                        
                        if (isFill) {
                            self.shapeList.push({
                                shape : 'halfSmoothPolygon',
                                zlevel : _zlevelBase,
                                style : {
                                    miterLimit: lineWidth,
                                    pointList : singlePL.concat([
                                        [
                                            singlePL[singlePL.length - 1][4],
                                            singlePL[singlePL.length - 1][5] - 2
                                        ],
                                        [
                                            singlePL[0][4],
                                            singlePL[0][5] - 2
                                        ]
                                    ]),
                                    brushType : 'fill',
                                    smooth : _getSmooth(serie.smooth),
                                    color : fillNormalColor
                                            ? fillNormalColor
                                            : zrColor.alpha(defaultColor,0.5)
                                },
                                hoverable : false,
                                _main : true,
                                _seriesIndex : seriesIndex,
                                _orient : orient
                            });
                        }
                    }
                }
            }
        }
        
        function _getSmooth(isSmooth/*, pointList, orient*/) {
            if (isSmooth) {
                /* 不科学啊，发现0.3通用了
                var delta;
                if (orient == 'horizontal') {
                    delta = Math.abs(pointList[0][0] - pointList[1][0]);
                }
                else {
                    delta = Math.abs(pointList[0][1] - pointList[1][1]);
                }
                */
                return 0.3;
            }
            else {
                return 0;
            }
        }

        /**
         * 生成空数据所需的可计算提示图形
         */
        function _getCalculableItem(
            seriesIndex, dataIndex, name, x, y, orient
        ) {
            var color = series[seriesIndex].calculableHolderColor
                        || ecConfig.calculableHolderColor;

            var itemShape = _getSymbol(
                seriesIndex, dataIndex, name,
                x, y, orient
            );
            itemShape.style.color = color;
            itemShape.style.strokeColor = color;
            itemShape.rotation = [0,0];
            itemShape.hoverable = false;
            itemShape.draggable = false;
            itemShape.style.text = undefined;

            return itemShape;
        }

        /**
         * 生成折线图上的拐点图形
         */
        function _getSymbol(seriesIndex, dataIndex, name, x, y, orient) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            
            var itemShape = self.getSymbolShape(
                serie, seriesIndex, data, dataIndex, name, 
                x, y,
                _sIndex2ShapeMap[seriesIndex], 
                _sIndex2ColorMap[seriesIndex],
                '#fff',
                orient == 'vertical' ? 'horizontal' : 'vertical' // 翻转
            );
            itemShape.zlevel = _zlevelBase + 1;
            
            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            
            return itemShape;
        }

        // 位置转换
        function getMarkCoord(serie, seriesIndex, mpData, markCoordParams) {
            var xAxis = component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = component.yAxis.getAxis(serie.yAxisIndex);
            
            if (mpData.type
                && (mpData.type == 'max' || mpData.type == 'min' || mpData.type == 'average')
            ) {
                // 特殊值内置支持
                return [
                    markCoordParams.xMarkMap[seriesIndex][mpData.type + 'X'],
                    markCoordParams.xMarkMap[seriesIndex][mpData.type + 'Y'],
                    markCoordParams.xMarkMap[seriesIndex][mpData.type + 'Line'],
                    markCoordParams.xMarkMap[seriesIndex][mpData.type]
                ];
            }
            
            return [
                typeof mpData.xAxis != 'string' 
                && xAxis.getCoordByIndex
                ? xAxis.getCoordByIndex(mpData.xAxis || 0)
                : xAxis.getCoord(mpData.xAxis || 0),
                
                typeof mpData.yAxis != 'string' 
                && yAxis.getCoordByIndex
                ? yAxis.getCoordByIndex(mpData.yAxis || 0)
                : yAxis.getCoord(mpData.yAxis || 0)
            ];
        }
        
        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }
        
        function ontooltipHover(param, tipShape) {
            var seriesIndex = param.seriesIndex;
            var dataIndex = param.dataIndex;
            var seriesPL;
            var singlePL;
            var len = seriesIndex.length;
            while (len--) {
                seriesPL = finalPLMap[seriesIndex[len]];
                if (seriesPL) {
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        for (var j = 0, k = singlePL.length; j < k; j++) {
                            if (dataIndex == singlePL[j][2]) {
                                tipShape.push(_getSymbol(
                                    seriesIndex[len],   // seriesIndex
                                    singlePL[j][2],     // dataIndex
                                    singlePL[j][3],     // name
                                    singlePL[j][0],     // x
                                    singlePL[j][1],     // y
                                    'horizontal'
                                ));
                            }
                        }
                    }
                }
            }
        }

        /**
         * 动态数据增加动画 
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var dy;
            var seriesIndex;
            var pointList;
            var isHorizontal; // 是否横向布局， isHorizontal;
            for (var i = self.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = self.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (self.shapeList[i]._main) {
                        pointList = self.shapeList[i].style.pointList;
                        // 主线动画
                        dx = Math.abs(pointList[0][0] - pointList[1][0]);
                        dy = Math.abs(pointList[0][1] - pointList[1][1]);
                        isHorizontal = 
                            self.shapeList[i]._orient == 'horizontal';
                            
                        if (aniMap[seriesIndex][2]) {
                            // 队头加入删除末尾
                            if (self.shapeList[i].shape == 'polygon') {
                                //区域图
                                var len = pointList.length;
                                self.shapeList[i].style.pointList[len - 3]
                                    = pointList[len - 2];
                                isHorizontal
                                ? (self.shapeList[i].style.pointList[len - 3][0]
                                       = pointList[len - 4][0]
                                  )
                                : (self.shapeList[i].style.pointList[len - 3][1]
                                       = pointList[len - 4][1]
                                  );
                                self.shapeList[i].style.pointList[len - 2]
                                    = pointList[len - 1];
                            }
                            self.shapeList[i].style.pointList.pop();
                            
                            isHorizontal ? (x = dx, y = 0) : (x = 0, y = -dy);
                        }
                        else {
                            // 队尾加入删除头部
                            self.shapeList[i].style.pointList.shift();
                            if (self.shapeList[i].shape == 'polygon') {
                                //区域图
                                var targetPoint = 
                                    self.shapeList[i].style.pointList.pop();
                                isHorizontal
                                ? (targetPoint[0] = pointList[0][0])
                                : (targetPoint[1] = pointList[0][1]);
                                self.shapeList[i].style.pointList.push(
                                    targetPoint
                                );
                            }
                            isHorizontal ? (x = -dx, y = 0) : (x = 0, y = dy);
                        }
                        zr.modShape(
                            self.shapeList[i].id, 
                            {
                                style : {
                                    pointList: self.shapeList[i].style.pointList
                                }
                            },
                            true
                        );
                    }
                    else {
                        // 拐点动画
                        if (aniMap[seriesIndex][2] 
                            && self.shapeList[i]._dataIndex 
                                == series[seriesIndex].data.length - 1
                        ) {
                            // 队头加入删除末尾
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] 
                                 && self.shapeList[i]._dataIndex === 0
                        ) {
                            // 队尾加入删除头部
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                    }
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            500,
                            {position : [x, y]}
                        )
                        .start();
                }
            }
        }
        
        /**
         * 动画设定
         */
        function animation() {
            var duration = self.query(option, 'animationDuration');
            var easing = self.query(option, 'animationEasing');
            var x;
            var y;
            var serie;
            var dataIndex = 0;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i]._main) {
                    serie = series[self.shapeList[i]._seriesIndex];
                    dataIndex += 1;
                    x = self.shapeList[i].style.pointList[0][0];
                    y = self.shapeList[i].style.pointList[0][1];
                    if (self.shapeList[i]._orient == 'horizontal') {
                        zr.modShape(
                            self.shapeList[i].id, 
                            {
                                scale : [0, 1, x, y]
                            },
                            true
                        );
                    }
                    else {
                        zr.modShape(
                            self.shapeList[i].id, 
                            {
                                scale : [1, 0, x, y]
                            },
                            true
                        );
                    }
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.query(serie,'animationDuration')
                            || duration)
                            + dataIndex * 100,
                            {scale : [1, 1, x, y]}
                        )
                        .start(
                            self.query(serie, 'animationEasing') || easing
                        );
                }
            }
            
            self.animationMark(duration, easing);
        }

        // 重载基类方法
        self.getMarkCoord = getMarkCoord;
        self.animation = animation;
        
        self.init = init;
        self.refresh = refresh;
        self.ontooltipHover = ontooltipHover;
        self.addDataAnimation = addDataAnimation;

        init(option, component);
    }

    function legendLineIcon(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        
        var dy = height / 2;
        
        if (style.symbol.match('empty')) {
            ctx.fillStyle = '#fff';
        }
        style.brushType = 'both';
        
        var symbol = style.symbol.replace('empty', '').toLowerCase();
        if (symbol.match('star')) {
            dy = (symbol.replace('star','') - 0) || 5;
            y -= 1;
            symbol = 'star';
        } 
        else if (symbol == 'rectangle' || symbol == 'arrow') {
            x += (width - height) / 2;
            width = height;
        }
        
        var imageLocation = '';
        if (symbol.match('image')) {
            imageLocation = symbol.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
            symbol = 'image';
            x += Math.round((width - height) / 2) - 1;
            width = height = height + 2;
        }
        symbol = require('zrender/shape').get('icon').get(symbol);
        
        if (symbol) {
            var x2 = style.x;
            var y2 = style.y;
            ctx.moveTo(x2, y2 + dy);
            ctx.lineTo(x2 + 5, y2 + dy);
            ctx.moveTo(x2 + style.width - 5, y2 + dy);
            ctx.lineTo(x2 + style.width, y2 + dy);
            
            symbol(ctx, {
                x : x + 4,
                y : y + 4,
                width : width - 8,
                height : height - 8,
                n : dy,
                image : imageLocation
            });
            
        }
        else {
            ctx.moveTo(x, y + dy);
            ctx.lineTo(x + width, y + dy);
        }
    }
    
    // 动态扩展zrender shape：halfSmoothPolygon
    require('../util/shape/halfSmoothPolygon');
    
    // 图表注册
    require('../chart').define('line', Line);
    
    return Line;
});