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
    function Line(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_LINE;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        var _sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
        var _symbol = [
              'circle', 'rectangle', 'triangle', 'diamond',
              'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
            ];
        var _sIndex2ShapeMap = {};  // series拐点图形类型，seriesIndex索引到shape type

        require('zrender/shape').get('icon').define(
            'legendLineIcon', legendLineIcon
        );
        
        function _buildShape() {
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
                if (series[i].type == ecConfig.CHART_TYPE_LINE) {
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

            switch (position) {
                case 'bottom' :
                case 'top' :
                    _buildHorizontal(maxDataLength, locationMap);
                    break;
                case 'left' :
                case 'right' :
                    _buildVertical(maxDataLength, locationMap);
                    break;
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
                      || self.deepQuery([serie],'symbol')
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
        function _buildHorizontal(maxDataLength, locationMap) {
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
            var finalPLMap = {}; // 完成的point list(PL)
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
                        y = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆叠
                            lastYP -= (baseYP - y);
                            y = lastYP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            lastYN += y - baseYN;
                            y = lastYN;
                        }
                        curPLMap[seriesIndex].push(
                            [x, y, i, categoryAxis.getNameByIndex(i), x, baseYP]
                        );
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
                                x, y
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
            _buildBorkenLine(finalPLMap, categoryAxis, 'horizontal');
        }

        /**
         * 构建类目轴为垂直方向的折线图系列
         */
        function _buildVertical(maxDataLength, locationMap) {
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
            var finalPLMap = {}; // 完成的point list(PL)
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
                        x = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆叠
                            lastXP += x - baseXP;
                            x = lastXP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            lastXN -= baseXN - x;
                            x = lastXN;
                        }
                        curPLMap[seriesIndex].push(
                            [x, y, i, categoryAxis.getNameByIndex(i), baseXP, y]
                        );
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
                                x, y
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
            //console.log(finalPLMap);
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
            var emphasisColor;

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
                if (serie.type == ecConfig.CHART_TYPE_LINE
                    && typeof seriesPL != 'undefined'
                ) {
                    defaultColor = _sIndex2ColorMap[seriesIndex];
                    // 多级控制
                    lineWidth = self.deepQuery(
                        [serie], 'itemStyle.normal.lineStyle.width'
                    );
                    lineType = self.deepQuery(
                        [serie], 'itemStyle.normal.lineStyle.type'
                    );
                    lineColor = self.deepQuery(
                        [serie], 'itemStyle.normal.lineStyle.color'
                    );
                    normalColor = self.deepQuery(
                        [serie], 'itemStyle.normal.color'
                    );
                    emphasisColor = self.deepQuery(
                        [serie], 'itemStyle.emphasis.color'
                    );

                    isFill = typeof self.deepQuery(
                        [serie], 'itemStyle.normal.areaStyle'
                    ) != 'undefined';

                    fillNormalColor = self.deepQuery(
                        [serie], 'itemStyle.normal.areaStyle.color'
                    );

                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        for (var j = 0, k = singlePL.length; j < k; j++) {
                            data = serie.data[singlePL[j][2]];
                            if ((categoryAxis.isMainAxis(singlePL[j][2]) // 主轴
                                 && self.deepQuery(                      // 非空
                                        [data, serie], 'symbol'
                                    ) != 'none'
                                )
                                || self.deepQuery(                      // 可计算
                                        [data, serie, option],
                                        'calculable'
                                   )
                            ) {
                                self.shapeList.push(_getSymbol(
                                    seriesIndex,
                                    singlePL[j][2], // dataIndex
                                    singlePL[j][3], // name
                                    singlePL[j][0], // x
                                    singlePL[j][1], // y
                                    self.deepQuery(
                                        [data], 'itemStyle.normal.color'
                                    ) || normalColor
                                      || defaultColor,
                                    self.deepQuery(
                                        [data], 'itemStyle.emphasis.color'
                                    ) || emphasisColor
                                      || normalColor
                                      || defaultColor,
                                    lineWidth,
                                    self.deepQuery(
                                        [data, serie], 'symbolRotate'
                                    )
                                ));
                            }

                        }
                        // 折线图
                        self.shapeList.push({
                            shape : 'brokenLine',
                            zlevel : _zlevelBase,
                            style : {
                                pointList : singlePL,
                                strokeColor : lineColor
                                              || normalColor
                                              || defaultColor,
                                lineWidth : lineWidth,
                                lineType : lineType,
                                shadowColor : self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowColor'
                                ),
                                shadowBlur: self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowBlur'
                                ),
                                shadowOffsetX: self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowOffsetX'
                                ),
                                shadowOffsetY: self.deepQuery(
                                  [serie],
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
                                shape : 'polygon',
                                zlevel : _zlevelBase,
                                style : {
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

        /**
         * 生成空数据所需的可计算提示图形
         */
        function _getCalculableItem(seriesIndex, dataIndex, name, x, y) {
            var color = series[seriesIndex].calculableHolderColor
                        || ecConfig.calculableHolderColor;

            var itemShape = _getSymbol(
                seriesIndex, dataIndex, name,
                x, y,
                color,
                _sIndex2ColorMap[seriesIndex],
                2
            );

            itemShape.hoverable = false;
            itemShape.draggable = false;
            itemShape.highlightStyle.lineWidth = 20;

            return itemShape;
        }

        /**
         * 生成折线图上的拐点图形
         */
        function _getSymbol(
            seriesIndex, dataIndex, name, x, y,
            normalColor, emphasisColor, lineWidth, rotate
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var symbol = self.deepQuery([data], 'symbol')
                         || _sIndex2ShapeMap[seriesIndex]
                         || 'cricle';
            var symbolSize = self.deepQuery([data, serie],'symbolSize');

            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase + 1,
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : 'both',
                    color : symbol.match('empty') ? '#fff' : normalColor,
                    strokeColor : normalColor,
                    lineWidth: lineWidth * 2
                },
                highlightStyle : {
                    color : emphasisColor,
                    strokeColor : emphasisColor
                },
                clickable : true
            };
            
            if (typeof rotate != 'undefined') {
                itemShape.rotation = [
                    rotate * Math.PI / 180, x, y
                ];
            }
            
            if (symbol.match('star')) {
                itemShape.style.iconType = 'star';
                itemShape.style.n = 
                    (symbol.replace('empty', '').replace('star','') - 0) || 5;
            }
            
            if (symbol == 'none') {
                itemShape.invisible = true;
                itemShape.hoverable = false;
            }

            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(itemShape);
                itemShape.draggable = true;
            }

            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            itemShape._x = x;
            itemShape._y = y;

            return itemShape;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            option = newOption;
            component = newComponent;

            series = option.series;

            self.clear();
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh() {
            self.clear();
            _buildShape();
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
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
                        zr.modShape(self.shapeList[i].id, {
                            scale : [0, 1, x, y]
                        });
                    }
                    else {
                        zr.modShape(self.shapeList[i].id, {
                            scale : [1, 0, x, y]
                        });
                    }
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 100,

                            {scale : [1, 1, x, y]},

                            (self.deepQuery([serie], 'animationEasing')
                            || easing)
                        )
                        .start();
                }
                else {
                    x = self.shapeList[i]._x || 0;
                    y = self.shapeList[i]._y || 0;
                    zr.modShape(self.shapeList[i].id, {
                        scale : [0, 0, x, y]
                    });
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration,
                            {scale : [1, 1, x, y]},
                            'QuinticOut'
                        )
                        .start();
                }
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.animation = animation;

        init(option, component);
    }

    function legendLineIcon(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        
        var dy = height / 2;
        ctx.moveTo(x, y + dy);
        ctx.lineTo(x + width, y + dy);
        
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
        else if (symbol == 'rectangle') {
            x += (width - height) / 2;
            width = height;
        }
        symbol = require('zrender/shape').get('icon').get(symbol);
        
        if (symbol) {
            symbol(ctx, {
                x : x + 3,
                y : y + 3,
                width : width - 6,
                height : height - 6,
                n : dy
            });
        }
    }
        
    // 图表注册
    require('../chart').define('line', Line);
    
    return Line;
});