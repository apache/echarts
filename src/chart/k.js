/**
 * echarts图表类：K线图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var CandleShape = require('../util/shape/Candle');
    // 组件依赖
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function K(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);

        this.refresh(option);
    }
    
    K.prototype = {
        type : ecConfig.CHART_TYPE_K,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            var series = this.series;
            this.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : []
            };
            var xAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_K) {
                    series[i] = this.reformOption(series[i]);
                    xAxis = this.component.xAxis.getAxis(series[i].xAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                }
            }
            //console.log(_position2sIndexMap)
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
         * 构建单个方向上的K线图
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
            this._buildHorizontal(seriesArray, maxDataLength, locationMap);

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
            var serieName;                          // 临时映射变量
            var legend = this.component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                if (legend){
                    this.selectedMap[serieName] = legend.isSelected(serieName);
                } else {
                    this.selectedMap[serieName] = true;
                }

                if (this.selectedMap[serieName]) {
                    locationMap.push(seriesArray[i]);
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }
            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        },

        /**
         * 构建类目轴为水平方向的K线图系列
         */
        _buildHorizontal : function (seriesArray, maxDataLength, locationMap) {
            var series = this.series;
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex;
            var serie;
            var xAxisIndex;
            var categoryAxis;
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var pointList = {};
            var candleWidth;
            var data;
            var value;
            var barMaxWidth;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                seriesIndex = locationMap[j];
                serie = series[seriesIndex];
                
                xAxisIndex = serie.xAxisIndex || 0;
                categoryAxis = this.component.xAxis.getAxis(xAxisIndex);
                candleWidth = serie.barWidth 
                              || Math.floor(categoryAxis.getGap() / 2);
                barMaxWidth = serie.barMaxWidth;
                if (barMaxWidth && barMaxWidth < candleWidth) {
                    candleWidth = barMaxWidth;
                }
                yAxisIndex = serie.yAxisIndex || 0;
                valueAxis = this.component.yAxis.getAxis(yAxisIndex);
                
                pointList[seriesIndex] = [];
                for (var i = 0, l = maxDataLength; i < l; i++) {
                    if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                        // 系列数据超出类目轴长度
                        break;
                    }
                    
                    data = serie.data[i];
                    value = typeof data != 'undefined'
                            ? (typeof data.value != 'undefined'
                              ? data.value
                              : data)
                            : '-';
                    if (value == '-' || value.length != 4) {
                        // 数据格式不符
                        continue;
                    }
                    pointList[seriesIndex].push([
                        categoryAxis.getCoordByIndex(i),    // 横坐标
                        candleWidth,
                        valueAxis.getCoord(value[0]),       // 纵坐标：开盘
                        valueAxis.getCoord(value[1]),       // 纵坐标：收盘
                        valueAxis.getCoord(value[2]),       // 纵坐标：最低
                        valueAxis.getCoord(value[3]),       // 纵坐标：最高
                        i,                                  // 数据index
                        categoryAxis.getNameByIndex(i)      // 类目名称
                    ]);
                }
            }
            // console.log(pointList)
            this._buildKLine(seriesArray, pointList);
        },

        /**
         * 生成K线
         */
        _buildKLine : function (seriesArray, pointList) {
            var series = this.series;
            // normal:
            var nLineWidth;
            var nLineColor;
            var nLineColor0;    // 阴线
            var nColor;
            var nColor0;        // 阴线
            
            // emphasis:
            var eLineWidth;
            var eLineColor;
            var eLineColor0;
            var eColor;
            var eColor0;

            var serie;
            var queryTarget;
            var data;
            var seriesPL;
            var singlePoint;
            var candleType;

            var seriesIndex;
            for (var sIdx = 0, len = seriesArray.length; sIdx < len; sIdx++) {
                seriesIndex = seriesArray[sIdx];
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                
                if (this._isLarge(seriesPL)) {
                    seriesPL = this._getLargePointList(seriesPL);
                }
                
                if (serie.type == ecConfig.CHART_TYPE_K
                    && typeof seriesPL != 'undefined'
                ) {
                    // 多级控制
                    queryTarget = serie;
                    nLineWidth = this.query(
                        queryTarget, 'itemStyle.normal.lineStyle.width'
                    );
                    nLineColor = this.query(
                        queryTarget, 'itemStyle.normal.lineStyle.color'
                    );
                    nLineColor0 = this.query(
                        queryTarget, 'itemStyle.normal.lineStyle.color0'
                    );
                    nColor = this.query(
                        queryTarget, 'itemStyle.normal.color'
                    );
                    nColor0 = this.query(
                        queryTarget, 'itemStyle.normal.color0'
                    );
                    
                    eLineWidth = this.query(
                        queryTarget, 'itemStyle.emphasis.lineStyle.width'
                    );
                    eLineColor = this.query(
                        queryTarget, 'itemStyle.emphasis.lineStyle.color'
                    );
                    eLineColor0 = this.query(
                        queryTarget, 'itemStyle.emphasis.lineStyle.color0'
                    );
                    eColor = this.query(
                        queryTarget, 'itemStyle.emphasis.color'
                    );
                    eColor0 = this.query(
                        queryTarget, 'itemStyle.emphasis.color0'
                    );

                    /*
                     * pointlist=[
                     *      0  x,
                     *      1  width, 
                     *      2  y0,
                     *      3  y1,
                     *      4  y2,
                     *      5  y3,
                     *      6  dataIndex,
                     *      7  categoryName
                     * ]
                     */
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePoint = seriesPL[i];
                        data = serie.data[singlePoint[6]];
                        queryTarget = data;
                        candleType = singlePoint[3] < singlePoint[2];
                        this.shapeList.push(this._getCandle(
                            seriesIndex,    // seriesIndex
                            singlePoint[6], // dataIndex
                            singlePoint[7], // name
                            
                            singlePoint[0], // x
                            singlePoint[1], // width
                            singlePoint[2], // y开盘
                            singlePoint[3], // y收盘
                            singlePoint[4], // y最低
                            singlePoint[5], // y最高
                            
                            // 填充颜色
                            candleType
                            ? (this.query(          // 阳
                                   queryTarget, 'itemStyle.normal.color'
                               ) || nColor)
                            : (this.query(          // 阴
                                   queryTarget, 'itemStyle.normal.color0'
                               ) || nColor0),
                            
                            // 线宽
                            this.query(
                               queryTarget, 'itemStyle.normal.lineStyle.width'
                            ) || nLineWidth,
                            
                            // 线色
                            candleType
                            ? (this.query(          // 阳
                                   queryTarget,
                                   'itemStyle.normal.lineStyle.color'
                               ) || nLineColor)
                            : (this.query(          // 阴
                                   queryTarget,
                                   'itemStyle.normal.lineStyle.color0'
                               ) || nLineColor0),
                            
                            //------------高亮
                            
                            // 填充颜色
                            candleType
                            ? (this.query(          // 阳
                                   queryTarget, 'itemStyle.emphasis.color'
                               ) || eColor || nColor)
                            : (this.query(          // 阴
                                   queryTarget, 'itemStyle.emphasis.color0'
                               ) || eColor0 || nColor0),
                            
                            // 线宽
                            this.query(
                               queryTarget, 'itemStyle.emphasis.lineStyle.width'
                            ) || eLineWidth || nLineWidth,
                            
                            // 线色
                            candleType
                            ? (this.query(          // 阳
                                   queryTarget,
                                   'itemStyle.emphasis.lineStyle.color'
                               ) || eLineColor || nLineColor)
                            : (this.query(          // 阴
                                   queryTarget,
                                   'itemStyle.emphasis.lineStyle.color0'
                               ) || eLineColor0 || nLineColor0)
                        ));
                    }
                }
            }
            // console.log(this.shapeList)
        },

        _isLarge : function(singlePL) {
            return singlePL[0][1] < 0.5;
        },
        
        /**
         * 大规模pointList优化 
         */
        _getLargePointList : function(singlePL) {
            var total = this.component.grid.getWidth();
            var len = singlePL.length;
            var newList = [];
            for (var i = 0; i < total; i++) {
                newList[i] = singlePL[Math.floor(len / total * i)];
            }
            return newList;
        },
        
        /**
         * 生成K线图上的图形
         */
        _getCandle : function (
            seriesIndex, dataIndex, name, 
            x, width, y0, y1, y2, y3, 
            nColor, nLinewidth, nLineColor, 
            eColor, eLinewidth, eLineColor
        ) {
            var series = this.series;
            var itemShape = {
                zlevel : this._zlevelBase,
                clickable: true,
                style : {
                    x : x,
                    y : [y0, y1, y2, y3],
                    width : width,
                    color : nColor,
                    strokeColor : nLineColor,
                    lineWidth : nLinewidth,
                    brushType : 'both'
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eLineColor,
                    lineWidth : eLinewidth
                },
                _seriesIndex: seriesIndex
            };
            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );
            
            itemShape = new CandleShape(itemShape);
            return itemShape;
        },

        // 位置转换
        getMarkCoord : function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            
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

        /**
         * 动画设定
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
            var serie;
            var seriesIndex;
            var dataIndex;
             for (var i = 0, l = this.shapeList.length; i < l; i++) {
                seriesIndex = this.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (this.shapeList[i].type == 'candle') {
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
                        dx = this.component.xAxis.getAxis(
                                serie.xAxisIndex || 0
                             ).getGap();
                        x = aniMap[seriesIndex][2] ? dx : -dx;
                        y = 0;
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
    
    zrUtil.inherits(K, ChartBase);
    zrUtil.inherits(K, ComponentBase);
    
    // 图表注册
    require('../chart').define('k', K);
    
    return K;
});