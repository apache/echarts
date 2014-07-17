/**
 * echarts图表类：柱形图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var RectangleShape = require('zrender/shape/Rectangle');
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
    function Bar(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);
        
        this.refresh(option);
    }
    
    Bar.prototype = {
        type : ecConfig.CHART_TYPE_BAR,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            var series = this.series;
            this.selectedMap = {};
            this.xMarkMap = {};
            
            // series默认颜色索引，seriesIndex索引到color
            this._sIndex2colorMap = {};
            
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
                if (series[i].type == ecConfig.CHART_TYPE_BAR) {
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
            // console.log(_position2sIndexMap)
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    this._buildSinglePosition(
                        position, _position2sIndexMap[position], this.xMarkMap
                    );
                }
            }

            this.addShapeList();
        },

        /**
         * 构建单个方向上的柱形图
         *
         * @param {number} seriesIndex 系列索引
         */
        _buildSinglePosition : function (position, seriesArray, xMarkMap) {
            var mapData = this._mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }

            switch (position) {
                case 'bottom' :
                case 'top' :
                    this._buildHorizontal(maxDataLength, locationMap, seriesArray, xMarkMap);
                    break;
                case 'left' :
                case 'right' :
                    this._buildVertical(maxDataLength, locationMap, seriesArray, xMarkMap);
                    break;
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
                if (legend){
                    this.selectedMap[serieName] = legend.isSelected(serieName);
                    this._sIndex2colorMap[seriesArray[i]] =
                        legend.getColor(serieName);
                    
                    iconShape = legend.getItemShape(serieName);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        if (serie.itemStyle.normal.borderWidth > 0) {
                            iconShape.style.x += 1;
                            iconShape.style.y += 1;
                            iconShape.style.width -= 2;
                            iconShape.style.height -= 2;
                            iconShape.style.strokeColor = 
                            iconShape.highlightStyle.strokeColor =
                                serie.itemStyle.normal.borderColor;
                            iconShape.highlightStyle.lineWidth = 3;
                            iconShape.style.brushType = 'both';
                        }
                        legend.setItemShape(serieName, iconShape);
                    }
                } else {
                    this.selectedMap[serieName] = true;
                    this._sIndex2colorMap[seriesArray[i]] =
                        this.zr.getColor(seriesArray[i]);
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
         * 构建类目轴为水平方向的柱形图系列
         */
        _buildHorizontal : function (maxDataLength, locationMap, seriesArray, xMarkMap) {
            var series = this.series;
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var xAxisIndex = serie.xAxisIndex;
            var categoryAxis = this.component.xAxis.getAxis(xAxisIndex);
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var size = this._mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barWidth = size.barWidth;                   // 自适应宽度
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;
            var interval = size.interval;

            var x;
            var y;
            var lastYP; // 正向堆积处理
            var baseYP;
            var lastYN; // 负向堆积处理
            var baseYN;
            var barShape;
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                x = categoryAxis.getCoordByIndex(i) - gap / 2;
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
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] 
                                                || {
                                                    min : Number.POSITIVE_INFINITY,
                                                    max : Number.NEGATIVE_INFINITY,
                                                    sum : 0,
                                                    counter : 0,
                                                    average : 0
                                                };
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        //y = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆积
                            //barHeight = baseYP - y;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (baseYP - valueAxis.getCoord(value));
                            // 非堆积数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastYP -= barHeight;
                            y = lastYP;
                        }
                        else if (value < 0){
                            // 负向堆积
                            //barHeight = y - baseYN;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (valueAxis.getCoord(value) - baseYN);
                            // 非堆积数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            y = lastYN;
                            lastYN += barHeight;
                        }
                        else {
                            // 0值
                            barHeight = 0;//baseYP - y;
                            // 最小高度无效
                            lastYP -= barHeight;
                            y = lastYP;
                        }
                        xMarkMap[seriesIndex][i] = 
                            x + (barWidthMap[seriesIndex] || barWidth) / 2;
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minY = y;
                            xMarkMap[seriesIndex].minX = xMarkMap[seriesIndex][i];
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxY = y;
                            xMarkMap[seriesIndex].maxX = xMarkMap[seriesIndex][i];
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                        
                        if (i % interval === 0) {
                            barShape = this._getBarItem(
                                seriesIndex, i,
                                categoryAxis.getNameByIndex(i),
                                x, y,
                                barWidthMap[seriesIndex] || barWidth,
                                barHeight,
                                'vertical'
                            );
                            this.shapeList.push(new RectangleShape(barShape));
                        }
                    }

                    // 补充空数据的拖拽提示框
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
                            lastYP -= this.ecTheme.island.r;
                            y = lastYP;

                            barShape = this._getBarItem(
                                seriesIndex, i,
                                categoryAxis.getNameByIndex(i),
                                x + 0.5, y + 0.5,
                                (barWidthMap[seriesIndex] || barWidth) - 1,
                                this.ecTheme.island.r - 1,
                                'vertical'
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.lineWidth = 1;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor =
                                    serie.calculableHolderColor
                                    || this.ecTheme.calculableHolderColor;

                            this.shapeList.push(new RectangleShape(barShape));
                        }
                    }

                    x += ((barWidthMap[seriesIndex] || barWidth) + barGap);
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
                    
                    xMarkMap[seriesIndex].isHorizontal = true;
                    this.buildMark(seriesIndex);
                }
            }
        },

        /**
         * 构建类目轴为垂直方向的柱形图系列
         */
        _buildVertical : function (maxDataLength, locationMap, seriesArray, xMarkMap) {
            var series = this.series;
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var yAxisIndex = serie.yAxisIndex;
            var categoryAxis = this.component.yAxis.getAxis(yAxisIndex);
            var xAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var size = this._mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barWidth = size.barWidth;                   // 自适应宽度
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;
            var interval = size.interval;

            var x;
            var y;
            var lastXP; // 正向堆积处理
            var baseXP;
            var lastXN; // 负向堆积处理
            var baseXN;
            var barShape;
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                y = categoryAxis.getCoordByIndex(i) + gap / 2;
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
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] 
                                                || {
                                                    min : Number.POSITIVE_INFINITY,
                                                    max : Number.NEGATIVE_INFINITY,
                                                    sum : 0,
                                                    counter : 0,
                                                    average : 0
                                                };
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        //x = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆积
                            //barHeight = x - baseXP;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (valueAxis.getCoord(value) - baseXP);
                            // 非堆积数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            x = lastXP;
                            lastXP += barHeight;
                        }
                        else if (value < 0){
                            // 负向堆积
                            //barHeight = baseXN - x;
                            barHeight = m > 0 
                                        ? valueAxis.getCoordSize(value)
                                        : (baseXN - valueAxis.getCoord(value));
                            // 非堆积数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastXN -= barHeight;
                            x = lastXN;
                        }
                        else {
                            // 0值
                            barHeight = 0;//x - baseXP;
                            // 最小高度无效
                            x = lastXP;
                            lastXP += barHeight;
                        }

                        xMarkMap[seriesIndex][i] = 
                            y - (barWidthMap[seriesIndex] || barWidth) / 2;
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minX = x + barHeight;
                            xMarkMap[seriesIndex].minY = xMarkMap[seriesIndex][i];
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxX = x + barHeight;
                            xMarkMap[seriesIndex].maxY = xMarkMap[seriesIndex][i];
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                        
                        if (i % interval === 0) {
                            barShape = this._getBarItem(
                                seriesIndex, i,
                                categoryAxis.getNameByIndex(i),
                                x, y - (barWidthMap[seriesIndex] || barWidth),
                                barHeight,
                                barWidthMap[seriesIndex] || barWidth,
                                'horizontal'
                            );
                            this.shapeList.push(new RectangleShape(barShape));
                        }
                    }

                    // 补充空数据的拖拽提示框
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
                            x = lastXP;
                            lastXP += this.ecTheme.island.r;

                            barShape = this._getBarItem(
                                seriesIndex,
                                i,
                                categoryAxis.getNameByIndex(i),
                                x + 0.5, y + 0.5 - (barWidthMap[seriesIndex] || barWidth),
                                this.ecTheme.island.r - 1,
                                (barWidthMap[seriesIndex] || barWidth) - 1,
                                'horizontal'
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.lineWidth = 1;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor =
                                    serie.calculableHolderColor
                                    || this.ecTheme.calculableHolderColor;

                            this.shapeList.push(new RectangleShape(barShape));
                        }
                    }

                    y -= ((barWidthMap[seriesIndex] || barWidth) + barGap);
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
                    
                    xMarkMap[seriesIndex].isHorizontal = false;
                    this.buildMark(seriesIndex);
                }
            }
        },
        
        /**
         * 我真是自找麻烦啊，为啥要允许系列级个性化最小宽度和高度啊！！！
         * @param {CategoryAxis} categoryAxis 类目坐标轴，需要知道类目间隔大小
         * @param {Array} locationMap 整形数据的系列索引
         */
        _mapSize : function (categoryAxis, locationMap, ignoreUserDefined) {
            var series = this.series;
            var seriesIndex;
            var barWidthMap = {};
            var barMinHeightMap = {};
            var sBarWidth;
            var sBarWidthCounter = 0;
            var sBarWidthTotal = 0;
            var barGap;
            var barCategoryGap;
            var hasFound;
            var queryTarget;
            var interval = 1;

            for (var j = 0, k = locationMap.length; j < k; j++) {
                hasFound = false;   // 同一堆积第一个barWidth生效
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    queryTarget = series[seriesIndex];
                    if (!ignoreUserDefined) {
                        if (!hasFound) {
                            sBarWidth = this.query(
                                queryTarget,
                                'barWidth'
                            );
                            if (typeof sBarWidth != 'undefined') {
                                // 同一堆积第一个生效barWidth
                                barWidthMap[seriesIndex] = sBarWidth;
                                sBarWidthTotal += sBarWidth;
                                sBarWidthCounter++;
                                hasFound = true;
                                // 复位前面同一堆积但没被定义的
                                for (var ii = 0, ll = m; ii < ll; ii++) {
                                    var pSeriesIndex = locationMap[j][ii];
                                    barWidthMap[pSeriesIndex] = sBarWidth;
                                }
                            }
                        } else {
                            barWidthMap[seriesIndex] = sBarWidth;   // 用找到的一个
                        }
                    }

                    barMinHeightMap[seriesIndex] = this.query(
                        queryTarget,
                        'barMinHeight'
                    );
                    barGap = typeof barGap != 'undefined' 
                             ? barGap
                             : this.query(
                                   queryTarget,
                                   'barGap'
                               );
                    barCategoryGap = typeof barCategoryGap != 'undefined' 
                                     ? barCategoryGap
                                     : this.query(
                                           queryTarget,
                                           'barCategoryGap'
                                       );
                }
            }

            var gap;
            var barWidth;
            if (locationMap.length != sBarWidthCounter) {
                // 至少存在一个自适应宽度的柱形图
                if (!ignoreUserDefined) {
                    gap = typeof barCategoryGap == 'string' 
                          && barCategoryGap.match(/%$/)
                              // 百分比
                              ? Math.floor(
                                  categoryAxis.getGap() 
                                  * (100 - parseFloat(barCategoryGap)) 
                                  / 100
                                )
                              // 数值
                              : (categoryAxis.getGap() - barCategoryGap);
                    if (typeof barGap == 'string' && barGap.match(/%$/)) {
                        barGap = parseFloat(barGap) / 100;
                        barWidth = Math.floor(
                            (gap - sBarWidthTotal)
                            / ((locationMap.length - 1) * barGap 
                               + locationMap.length - sBarWidthCounter)
                        );
                        barGap = Math.floor(barWidth * barGap);
                    }
                    else {
                        barGap = parseFloat(barGap);
                        barWidth = Math.floor(
                            (gap - sBarWidthTotal 
                                 - barGap * (locationMap.length - 1)
                            )
                            / (locationMap.length - sBarWidthCounter)
                        );
                    }
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    if (barWidth <= 0) {
                        return this._mapSize(categoryAxis, locationMap, true);
                    }
                }
                else {
                    // 忽略用户定义的宽度设定
                    gap = categoryAxis.getGap();
                    barGap = 0;
                    barWidth = Math.floor(gap / locationMap.length);
                    // 已经忽略用户定义的宽度设定依然还无法满足显示，只能硬来了;
                    if (barWidth <= 0) {
                        interval = Math.floor(locationMap.length / gap);
                        barWidth = 1;
                    }
                }
            }
            else {
                // 全是自定义宽度，barGap无效，系列间隔决定barGap
                gap = sBarWidthCounter > 1
                      ? (typeof barCategoryGap == 'string' 
                         && barCategoryGap.match(/%$/)
                        )
                          // 百分比
                          ? Math.floor(
                              categoryAxis.getGap() 
                              * (100 - parseFloat(barCategoryGap)) 
                              / 100
                            )
                          // 数值
                          : (categoryAxis.getGap() - barCategoryGap)
                      // 只有一个
                      : sBarWidthTotal;
                barWidth = 0;
                barGap = sBarWidthCounter > 1 
                         ? Math.floor(
                               (gap - sBarWidthTotal) / (sBarWidthCounter - 1)
                           )
                         : 0;
                if (barGap < 0) {
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    return this._mapSize(categoryAxis, locationMap, true);
                }
            }

            return {
                barWidthMap : barWidthMap,
                barMinHeightMap : barMinHeightMap ,
                gap : gap,
                barWidth : barWidth,
                barGap : barGap,
                interval : interval
            };
        },

        /**
         * 生成最终图形数据
         */
        _getBarItem : function (seriesIndex, dataIndex, name, x, y, width, height, orient) {
            var series = this.series;
            var barShape;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            // 多级控制
            var defaultColor = this._sIndex2colorMap[seriesIndex];
            var queryTarget = [data, serie];
            var normalColor = this.deepQuery(
                queryTarget,
                'itemStyle.normal.color'
            ) || defaultColor;
            var emphasisColor = this.deepQuery(
                queryTarget,
                'itemStyle.emphasis.color'
            );
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            var normalBorderWidth = normal.borderWidth;
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            barShape = {
                zlevel : this._zlevelBase,
                clickable: true,
                style : {
                    x : x,
                    y : y,
                    width : width,
                    height : height,
                    brushType : 'both',
                    color : this.getItemStyleColor(normalColor, seriesIndex, dataIndex, data),
                    radius : normal.borderRadius,
                    lineWidth : normalBorderWidth,
                    strokeColor : normal.borderColor
                },
                highlightStyle : {
                    color : this.getItemStyleColor(emphasisColor, seriesIndex, dataIndex, data),
                    radius : emphasis.borderRadius,
                    lineWidth : emphasis.borderWidth,
                    strokeColor : emphasis.borderColor
                },
                _orient : orient
            };
            barShape.highlightStyle.color = barShape.highlightStyle.color
                            || (typeof barShape.style.color == 'string'
                                ? zrColor.lift(barShape.style.color, -0.3)
                                : barShape.style.color
                               );
            // 考虑线宽的显示优化
            if (normalBorderWidth > 0
                && barShape.style.height > normalBorderWidth
                && barShape.style.width > normalBorderWidth
            ) {
                barShape.style.y += normalBorderWidth / 2;
                barShape.style.height -= normalBorderWidth;
                barShape.style.x += normalBorderWidth / 2;
                barShape.style.width -= normalBorderWidth;
            }
            else {
                // 太小了或者线宽小于0，废了边线
                barShape.style.brushType = 'fill';
            }
            
            barShape.highlightStyle.textColor = barShape.highlightStyle.color;
            
            barShape = this.addLabel(barShape, serie, data, name, orient);
            if (barShape.style.textPosition == 'insideLeft'
                || barShape.style.textPosition == 'insideRight'
                || barShape.style.textPosition == 'insideTop'
                || barShape.style.textPosition == 'insideBottom'
            ) {
                var gap = 5;
                switch (barShape.style.textPosition) {
                    case 'insideLeft' : 
                        barShape.style.textX = barShape.style.x + gap;
                        barShape.style.textY = barShape.style.y + barShape.style.height / 2;
                        barShape.style.textAlign = 'left';
                        barShape.style.textBaseline = 'middle';
                        break;
                    case 'insideRight' : 
                        barShape.style.textX = barShape.style.x + barShape.style.width - gap;
                        barShape.style.textY = barShape.style.y + barShape.style.height / 2;
                        barShape.style.textAlign = 'right';
                        barShape.style.textBaseline = 'middle';
                        break;
                    case 'insideTop' : 
                        barShape.style.textX = barShape.style.x + barShape.style.width / 2;
                        barShape.style.textY = barShape.style.y + gap / 2;
                        barShape.style.textAlign = 'center';
                        barShape.style.textBaseline = 'top';
                        break;
                    case 'insideBottom' : 
                        barShape.style.textX = barShape.style.x + barShape.style.width / 2;
                        barShape.style.textY = barShape.style.y + barShape.style.height - gap / 2;
                        barShape.style.textAlign = 'center';
                        barShape.style.textBaseline = 'bottom';
                        break;
                }
                barShape.style.textPosition = 'specific';
                barShape.style.textColor = barShape.style.textColor || '#fff';
            }
            
            

            if (this.deepQuery([data, serie, this.option],'calculable')) {
                this.setCalculable(barShape);
                barShape.draggable = true;
            }

            ecData.pack(
                barShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            return barShape;
        },

        // 位置转换
        getMarkCoord : function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xMarkMap = this.xMarkMap[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            var dataIndex;
            var pos;
            if (mpData.type
                && (mpData.type == 'max' || mpData.type == 'min' || mpData.type == 'average')
            ) {
                // 特殊值内置支持
                pos = [
                    xMarkMap[mpData.type + 'X'],
                    xMarkMap[mpData.type + 'Y'],
                    xMarkMap[mpData.type + 'Line'],
                    xMarkMap[mpData.type]
                ];
            }
            else if (xMarkMap.isHorizontal) {
                // 横向
                dataIndex = typeof mpData.xAxis == 'string' && xAxis.getIndexByName
                            ? xAxis.getIndexByName(mpData.xAxis)
                            : (mpData.xAxis || 0);
                
                var x = xMarkMap[dataIndex];
                x = typeof x != 'undefined'
                    ? x 
                    : typeof mpData.xAxis != 'string' && xAxis.getCoordByIndex
                      ? xAxis.getCoordByIndex(mpData.xAxis || 0)
                      : xAxis.getCoord(mpData.xAxis || 0);
                
                pos = [x, yAxis.getCoord(mpData.yAxis || 0)];
            }
            else {
                // 纵向
                dataIndex = typeof mpData.yAxis == 'string' && yAxis.getIndexByName
                            ? yAxis.getIndexByName(mpData.yAxis)
                            : (mpData.yAxis || 0);
                
                var y = xMarkMap[dataIndex];
                y = typeof y != 'undefined'
                    ? y
                    : typeof mpData.yAxis != 'string' && yAxis.getCoordByIndex
                      ? yAxis.getCoordByIndex(mpData.yAxis || 0)
                      : yAxis.getCoord(mpData.yAxis || 0);
                
                pos = [xAxis.getCoord(mpData.xAxis || 0), y];
            }
            
            return pos;
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
            var serie;
            var seriesIndex;
            var dataIndex;
            for (var i = this.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = ecData.get(this.shapeList[i], 'seriesIndex');
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (this.shapeList[i].type == 'rectangle') {
                        // 主动画
                        dataIndex = ecData.get(this.shapeList[i], 'dataIndex');
                        serie = series[seriesIndex];
                        if (aniMap[seriesIndex][2] 
                            && dataIndex == serie.data.length - 1
                        ) {
                            // 队头加入删除末尾
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] && dataIndex === 0) {
                            // 队尾加入删除头部
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        }
                        if (this.shapeList[i]._orient == 'horizontal') {
                            // 条形图
                            dy = this.component.yAxis.getAxis(
                                    serie.yAxisIndex || 0
                                 ).getGap();
                            y = aniMap[seriesIndex][2] ? -dy : dy;
                            x = 0;
                        }
                        else {
                            // 柱形图
                            dx = this.component.xAxis.getAxis(
                                    serie.xAxisIndex || 0
                                 ).getGap();
                            x = aniMap[seriesIndex][2] ? dx : -dx;
                            y = 0;
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
        }
    };
    
    zrUtil.inherits(Bar, ChartBase);
    zrUtil.inherits(Bar, ComponentBase);
    
    // 图表注册
    require('../chart').define('bar', Bar);
    
    return Bar;
});