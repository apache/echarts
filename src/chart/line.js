/**
 * echarts图表类：折线图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var BrokenLineShape = require('zrender/shape/BrokenLine');
    var IconShape = require('../util/shape/Icon');
    var HalfSmoothPolygonShape = require('../util/shape/HalfSmoothPolygon');
    // 组件依赖
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Line(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);

        this.refresh(option);
    }
    
    Line.prototype = {
        type : ecConfig.CHART_TYPE_LINE,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            var series = this.series;
            this.finalPLMap = {}; // 完成的point list(PL)
            this._sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
            this._symbol = this.option.symbolList;
            this._sIndex2ShapeMap = {};  // series拐点图形类型，seriesIndex索引到shape type

            this.selectedMap = {};
            this.xMarkMap = {};

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
                if (series[i].type == this.type) {
                    series[i] = this.reformOption(series[i]);
                    xAxisIndex = series[i].xAxisIndex;
                    yAxisIndex = series[i].yAxisIndex;
                    xAxis = this.component.xAxis.getAxis(xAxisIndex);
                    yAxis = this.component.yAxis.getAxis(yAxisIndex);
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
            // console.log(_position2sIndexMap);
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    this._buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }
            this.addShapeList();
        },

        /**
         * 构建单个方向上的折线图
         *
         * @param {number} seriesIndex 系列索引
         */
        _buildSinglePosition : function (position, seriesArray) {
            var mapData = this._mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }
            switch (position) {
                case 'bottom' :
                case 'top' :
                    this._buildHorizontal(seriesArray, maxDataLength, locationMap, this.xMarkMap);
                    break;
                case 'left' :
                case 'right' :
                    this._buildVertical(seriesArray, maxDataLength, locationMap, this.xMarkMap);
                    break;
            }
            
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                this.buildMark(seriesArray[i]);
            }
        },

        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        _mapData : function (seriesArray) {
            var series = this.series;
            var serie;                              // 临时映射变量
            var dataIndex = 0;                      // 堆积数据所在位置映射
            var stackMap = {};                      // 堆积数据位置映射，堆积组在二维中的第几项
            var magicStackKey = '__kener__stack__'; // 堆积命名，非堆积数据安单一堆积处理
            var stackKey;                           // 临时映射变量
            var serieName;                          // 临时映射变量
            var legend = this.component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            var iconShape;
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                
                this._sIndex2ShapeMap[seriesArray[i]]
                    = this._sIndex2ShapeMap[seriesArray[i]]
                      || this.query(serie,'symbol')
                      || this._symbol[i % this._symbol.length];
                      
                if (legend){
                    this.selectedMap[serieName] = legend.isSelected(serieName);
                    
                    this._sIndex2ColorMap[seriesArray[i]]
                        = legend.getColor(serieName);
                        
                    iconShape = legend.getItemShape(serieName);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        iconShape.style.iconType = 'legendLineIcon';
                        iconShape.style.symbol = 
                            this._sIndex2ShapeMap[seriesArray[i]];
                        
                        legend.setItemShape(serieName, iconShape);
                    }
                } else {
                    this.selectedMap[serieName] = true;
                    this._sIndex2ColorMap[seriesArray[i]]
                        = this.zr.getColor(seriesArray[i]);
                }

                if (this.selectedMap[serieName]) {
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
        },

        /**
         * 构建类目轴为水平方向的折线图系列
         */
        _buildHorizontal : function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            var series = this.series;
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var xAxisIndex = serie.xAxisIndex;
            var categoryAxis = this.component.xAxis.getAxis(xAxisIndex);
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var x;
            var y;
            var lastYP; // 正向堆积处理
            var baseYP;
            var lastYN; // 负向堆积处理
            var baseYN;
            //var this.finalPLMap = {}; // 完成的point list(PL)
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
                    // 堆积数据用第一条valueAxis
                    yAxisIndex = series[locationMap[j][0]].yAxisIndex || 0;
                    valueAxis = this.component.yAxis.getAxis(yAxisIndex);
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
                                this.finalPLMap[seriesIndex] =
                                    this.finalPLMap[seriesIndex] || [];

                                this.finalPLMap[seriesIndex].push(
                                    curPLMap[seriesIndex]
                                );

                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        //y = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆积
                            lastYP -= m > 0
                                      ? valueAxis.getCoordSize(value)
                                      : (baseYP - valueAxis.getCoord(value));
                            y = lastYP;
                        }
                        else if (value < 0){
                            // 负向堆积
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
                lastYP = this.component.grid.getY();
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
                        if (this.deepQuery(
                                [data, serie, this.option], 'calculable'
                            )
                        ) {
                            symbolSize = this.deepQuery(
                                [data, serie],
                                'symbolSize'
                            );
                            lastYP += symbolSize * 2 + 5;
                            y = lastYP;
                            this.shapeList.push(this._getCalculableItem(
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
                    this.finalPLMap[sId] = this.finalPLMap[sId] || [];
                    this.finalPLMap[sId].push(curPLMap[sId]);
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
                    y = this.component.yAxis.getAxis(series[seriesIndex].yAxisIndex || 0)
                        .getCoord(xMarkMap[seriesIndex].average);
                    xMarkMap[seriesIndex].averageLine = [
                        [this.component.grid.getX(), y],
                        [this.component.grid.getXend(), y]
                    ];
                    
                    xMarkMap[seriesIndex].minLine = [
                        [this.component.grid.getX(), xMarkMap[seriesIndex].minY],
                        [this.component.grid.getXend(), xMarkMap[seriesIndex].minY]
                    ];
                    xMarkMap[seriesIndex].maxLine = [
                        [this.component.grid.getX(), xMarkMap[seriesIndex].maxY],
                        [this.component.grid.getXend(), xMarkMap[seriesIndex].maxY]
                    ];
                }
            }
            
            this._buildBorkenLine(seriesArray, this.finalPLMap, categoryAxis, 'horizontal');
        },

        /**
         * 构建类目轴为垂直方向的折线图系列
         */
        _buildVertical : function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            var series = this.series;
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var yAxisIndex = serie.yAxisIndex;
            var categoryAxis = this.component.yAxis.getAxis(yAxisIndex);
            var xAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var x;
            var y;
            var lastXP; // 正向堆积处理
            var baseXP;
            var lastXN; // 负向堆积处理
            var baseXN;
            //var this.finalPLMap = {}; // 完成的point list(PL)
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
                    // 堆积数据用第一条valueAxis
                    xAxisIndex = series[locationMap[j][0]].xAxisIndex || 0;
                    valueAxis = this.component.xAxis.getAxis(xAxisIndex);
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
                                this.finalPLMap[seriesIndex] =
                                    this.finalPLMap[seriesIndex] || [];

                                this.finalPLMap[seriesIndex].push(
                                    curPLMap[seriesIndex]
                                );

                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        //x = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆积
                            lastXP += m > 0
                                      ? valueAxis.getCoordSize(value)
                                      : (valueAxis.getCoord(value) - baseXP);
                            x = lastXP;
                        }
                        else if (value < 0){
                            // 负向堆积
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
                lastXP = this.component.grid.getXend();
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
                        if (this.deepQuery(
                                [data, serie, this.option], 'calculable'
                            )
                        ) {
                            symbolSize = this.deepQuery(
                                [data, serie],
                                'symbolSize'
                            );
                            lastXP -= symbolSize * 2 + 5;
                            x = lastXP;
                            this.shapeList.push(this._getCalculableItem(
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
                    this.finalPLMap[sId] = this.finalPLMap[sId] || [];
                    this.finalPLMap[sId].push(curPLMap[sId]);
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
                    
                    x = this.component.xAxis.getAxis(series[seriesIndex].xAxisIndex || 0)
                        .getCoord(xMarkMap[seriesIndex].average);
                        
                    xMarkMap[seriesIndex].averageLine = [
                        [x, this.component.grid.getYend()],
                        [x, this.component.grid.getY()]
                    ];
                    xMarkMap[seriesIndex].minLine = [
                        [xMarkMap[seriesIndex].minX, this.component.grid.getYend()],
                        [xMarkMap[seriesIndex].minX, this.component.grid.getY()]
                    ];
                    xMarkMap[seriesIndex].maxLine = [
                        [xMarkMap[seriesIndex].maxX, this.component.grid.getYend()],
                        [xMarkMap[seriesIndex].maxX, this.component.grid.getY()]
                    ];
                }
            }
            
            this._buildBorkenLine(seriesArray, this.finalPLMap, categoryAxis, 'vertical');
        },

        /**
         * 生成折线和折线上的拐点
         */
        _buildBorkenLine : function (seriesArray, pointList, categoryAxis, orient) {
            var series = this.series;
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
            var brokenLineShape;
            var halfSmoothPolygonShape;
            
            var isLarge;
            
            // 堆积层叠需求，反顺序构建
            var seriesIndex;
            for (var sIdx = seriesArray.length - 1; sIdx >= 0; sIdx--) {
                seriesIndex = seriesArray[sIdx];
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                if (serie.type == this.type && typeof seriesPL != 'undefined') {
                    defaultColor = this._sIndex2ColorMap[seriesIndex];
                    // 多级控制
                    lineWidth = this.query(
                        serie, 'itemStyle.normal.lineStyle.width'
                    );
                    lineType = this.query(
                        serie, 'itemStyle.normal.lineStyle.type'
                    );
                    lineColor = this.query(
                        serie, 'itemStyle.normal.lineStyle.color'
                    );
                    normalColor = this.getItemStyleColor(
                        this.query(serie, 'itemStyle.normal.color'), seriesIndex, -1
                    );

                    isFill = typeof this.query(
                        serie, 'itemStyle.normal.areaStyle'
                    ) != 'undefined';

                    fillNormalColor = this.query(
                        serie, 'itemStyle.normal.areaStyle.color'
                    );

                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        isLarge = this._isLarge(orient, singlePL);
                        if (!isLarge) { // 非大数据模式才显示拐点symbol
                            for (var j = 0, k = singlePL.length; j < k; j++) {
                                data = serie.data[singlePL[j][2]];
                                if (this.deepQuery(
                                        [data, serie], 'showAllSymbol'
                                    ) // 全显示
                                    || (categoryAxis.isMainAxis(singlePL[j][2])
                                        && this.deepQuery(
                                               [data, serie], 'symbol'
                                           ) != 'none'
                                       ) // 主轴非空
                                    || this.deepQuery(
                                            [data, serie, this.option],
                                            'calculable'
                                       ) // 可计算
                                ) {
                                    this.shapeList.push(this._getSymbol(
                                        seriesIndex,
                                        singlePL[j][2], // dataIndex
                                        singlePL[j][3], // name
                                        singlePL[j][0], // x
                                        singlePL[j][1], // y
                                        orient
                                    ));
                                }
                            }
                        }
                        else {
                            // 大数据模式截取pointList
                            singlePL = this._getLargePointList(orient, singlePL);
                        }
                        
                        // 折线图
                        brokenLineShape = new BrokenLineShape({
                            zlevel : this._zlevelBase,
                            style : {
                                miterLimit: lineWidth,
                                pointList : singlePL,
                                strokeColor : lineColor
                                              || normalColor 
                                              || defaultColor,
                                lineWidth : lineWidth,
                                lineType : lineType,
                                smooth : this._getSmooth(serie.smooth),
                                shadowColor : this.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowColor'
                                ),
                                shadowBlur: this.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowBlur'
                                ),
                                shadowOffsetX: this.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowOffsetX'
                                ),
                                shadowOffsetY: this.query(
                                  serie,
                                  'itemStyle.normal.lineStyle.shadowOffsetY'
                                )
                            },
                            hoverable : false,
                            _main : true,
                            _seriesIndex : seriesIndex,
                            _orient : orient
                        });
                        
                        ecData.pack(
                            brokenLineShape,
                            series[seriesIndex], seriesIndex,
                            0, i, series[seriesIndex].name
                        );
                        
                        this.shapeList.push(brokenLineShape);
                        
                        if (isFill) {
                            halfSmoothPolygonShape = new HalfSmoothPolygonShape({
                                zlevel : this._zlevelBase,
                                style : {
                                    miterLimit: lineWidth,
                                    pointList : zrUtil.clone(singlePL).concat([
                                        [
                                            singlePL[singlePL.length - 1][4],
                                            singlePL[singlePL.length - 1][5]
                                        ],
                                        [
                                            singlePL[0][4],
                                            singlePL[0][5]
                                        ]
                                    ]),
                                    brushType : 'fill',
                                    smooth : this._getSmooth(serie.smooth),
                                    color : fillNormalColor
                                            ? fillNormalColor
                                            : zrColor.alpha(defaultColor,0.5)
                                },
                                hoverable : false,
                                _main : true,
                                _seriesIndex : seriesIndex,
                                _orient : orient
                            });
                            ecData.pack(
                                halfSmoothPolygonShape,
                                series[seriesIndex], seriesIndex,
                                0, i, series[seriesIndex].name
                            );
                            this.shapeList.push(halfSmoothPolygonShape);
                        }
                    }
                }
            }
        },
        
        _isLarge : function(orient, singlePL) {
            if (singlePL.length < 2) {
                return false;
            }
            else {
                return orient == 'horizontal'
                       ? (Math.abs(singlePL[0][0] - singlePL[1][0]) < 0.5)
                       : (Math.abs(singlePL[0][1] - singlePL[1][1]) < 0.5);
            }
        },
        
        /**
         * 大规模pointList优化 
         */
        _getLargePointList : function(orient, singlePL) {
            var total;
            if (orient == 'horizontal') {
                total = this.component.grid.getWidth();
            }
            else {
                total = this.component.grid.getHeight();
            }
            
            var len = singlePL.length;
            var newList = [];
            for (var i = 0; i < total; i++) {
                newList[i] = singlePL[Math.floor(len / total * i)];
            }
            return newList;
        },
        
        _getSmooth : function (isSmooth/*, pointList, orient*/) {
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
        },

        /**
         * 生成空数据所需的可计算提示图形
         */
        _getCalculableItem : function (seriesIndex, dataIndex, name, x, y, orient) {
            var series = this.series;
            var color = series[seriesIndex].calculableHolderColor
                        || this.ecTheme.calculableHolderColor;

            var itemShape = this._getSymbol(
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
        },

        /**
         * 生成折线图上的拐点图形
         */
        _getSymbol : function (seriesIndex, dataIndex, name, x, y, orient) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            
            var itemShape = this.getSymbolShape(
                serie, seriesIndex, data, dataIndex, name, 
                x, y,
                this._sIndex2ShapeMap[seriesIndex], 
                this._sIndex2ColorMap[seriesIndex],
                '#fff',
                orient == 'vertical' ? 'horizontal' : 'vertical' // 翻转
            );
            itemShape.zlevel = this._zlevelBase + 1;
            
            if (this.deepQuery([data, serie, this.option], 'calculable')) {
                this.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            
            return itemShape;
        },

        // 位置转换
        getMarkCoord : function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xMarkMap = this.xMarkMap[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            
            if (mpData.type
                && (mpData.type == 'max' || mpData.type == 'min' || mpData.type == 'average')
            ) {
                // 特殊值内置支持
                return [
                    xMarkMap[mpData.type + 'X'],
                    xMarkMap[mpData.type + 'Y'],
                    xMarkMap[mpData.type + 'Line'],
                    xMarkMap[mpData.type]
                ];
            }
            
            return [
                typeof mpData.xAxis != 'string' && xAxis.getCoordByIndex
                    ? xAxis.getCoordByIndex(mpData.xAxis || 0)
                    : xAxis.getCoord(mpData.xAxis || 0),
                
                typeof mpData.yAxis != 'string' && yAxis.getCoordByIndex
                    ? yAxis.getCoordByIndex(mpData.yAxis || 0)
                    : yAxis.getCoord(mpData.yAxis || 0)
            ];
        },
        
        /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            
            this.backupShapeList();
            this._buildShape();
        },
        
        ontooltipHover : function (param, tipShape) {
            var seriesIndex = param.seriesIndex;
            var dataIndex = param.dataIndex;
            var seriesPL;
            var singlePL;
            var len = seriesIndex.length;
            while (len--) {
                seriesPL = this.finalPLMap[seriesIndex[len]];
                if (seriesPL) {
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        for (var j = 0, k = singlePL.length; j < k; j++) {
                            if (dataIndex == singlePL[j][2]) {
                                tipShape.push(this._getSymbol(
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
        },

        /**
         * 动态数据增加动画 
         */
        addDataAnimation : function (params) {
            var series = this.series;
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
            for (var i = this.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = this.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (this.shapeList[i]._main) {
                        pointList = this.shapeList[i].style.pointList;
                        // 主线动画
                        dx = Math.abs(pointList[0][0] - pointList[1][0]);
                        dy = Math.abs(pointList[0][1] - pointList[1][1]);
                        isHorizontal = 
                            this.shapeList[i]._orient == 'horizontal';
                            
                        if (aniMap[seriesIndex][2]) {
                            // 队头加入删除末尾
                            if (this.shapeList[i].type == 'polygon') {
                                //区域图
                                var len = pointList.length;
                                this.shapeList[i].style.pointList[len - 3]
                                    = pointList[len - 2];
                                isHorizontal
                                ? (this.shapeList[i].style.pointList[len - 3][0]
                                       = pointList[len - 4][0]
                                  )
                                : (this.shapeList[i].style.pointList[len - 3][1]
                                       = pointList[len - 4][1]
                                  );
                                this.shapeList[i].style.pointList[len - 2]
                                    = pointList[len - 1];
                            }
                            this.shapeList[i].style.pointList.pop();
                            
                            isHorizontal ? (x = dx, y = 0) : (x = 0, y = -dy);
                        }
                        else {
                            // 队尾加入删除头部
                            this.shapeList[i].style.pointList.shift();
                            if (this.shapeList[i].type == 'polygon') {
                                //区域图
                                var targetPoint = 
                                    this.shapeList[i].style.pointList.pop();
                                isHorizontal
                                ? (targetPoint[0] = pointList[0][0])
                                : (targetPoint[1] = pointList[0][1]);
                                this.shapeList[i].style.pointList.push(
                                    targetPoint
                                );
                            }
                            isHorizontal ? (x = -dx, y = 0) : (x = 0, y = dy);
                        }
                        
                        this.zr.modShape(
                            this.shapeList[i].id, 
                            {
                                style : {
                                    pointList: this.shapeList[i].style.pointList
                                }
                            },
                            true
                        );
                    }
                    else {
                        // 拐点动画
                        if (aniMap[seriesIndex][2] 
                            && this.shapeList[i]._dataIndex 
                                == series[seriesIndex].data.length - 1
                        ) {
                            // 队头加入删除末尾
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] 
                                 && this.shapeList[i]._dataIndex === 0
                        ) {
                            // 队尾加入删除头部
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        }
                    }
                    this.shapeList[i].position = [0, 0];
                    this.zr.animate(this.shapeList[i].id, '')
                        .when(
                            500,
                            {position : [x, y]}
                        )
                        .start();
                }
            }
        }
    };

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
        symbol = IconShape.prototype.iconLibrary[symbol];
        
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
    IconShape.prototype.iconLibrary['legendLineIcon'] = legendLineIcon;
    
    zrUtil.inherits(Line, ChartBase);
    zrUtil.inherits(Line, ComponentBase);
    
    // 图表注册
    require('../chart').define('line', Line);
    
    return Line;
});