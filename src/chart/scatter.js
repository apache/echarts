/**
 * echarts图表类：散点图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 */
define(function (require) {
    var ChartBase = require('./base');
    
    // 图形依赖
    var SymbolShape = require('../util/shape/Symbol');
    // 组件依赖
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    require('../component/dataRange');
    
    var ecConfig = require('../config');
    // 散点图默认参数
    ecConfig.scatter = {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        clickable: true,
        legendHoverLink: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        // symbol: null,        // 图形类型
        symbolSize: 4,          // 图形大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
        // symbolRotate: null,  // 图形旋转控制
        large: false,           // 大规模散点图
        largeThreshold: 2000,   // 大规模阀值，large为true且数据量>largeThreshold才启用大规模模式
        itemStyle: {
            normal: {
                // color: 各异,
                label: {
                    show: false
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                    //           'inside'|'left'|'right'|'top'|'bottom'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                }
            },
            emphasis: {
                // color: '各异'
                label: {
                    show: false
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                    //           'inside'|'left'|'right'|'top'|'bottom'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                }
            }
        }
    };

    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Scatter(ecTheme, messageCenter, zr, option, myChart){
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.refresh(option);
    }
    
    Scatter.prototype = {
        type: ecConfig.CHART_TYPE_SCATTER,
        /**
         * 绘制图形
         */
        _buildShape: function () {
            var series = this.series;
            this._sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
            this._symbol = this.option.symbolList;
            this._sIndex2ShapeMap = {};  // series图形类型，seriesIndex索引到_symbol
            
            this.selectedMap = {};
            this.xMarkMap = {};
            
            var legend = this.component.legend;
            var seriesArray = [];
            var serie;                              // 临时映射变量
            var serieName;                          // 临时映射变量
            var iconShape;
            var iconType;
            for (var i = 0, l = series.length; i < l; i++) {
                serie = series[i];
                serieName = serie.name;
                if (serie.type === ecConfig.CHART_TYPE_SCATTER) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    this._sIndex2ShapeMap[i] = this.query(serie, 'symbol')
                                          || this._symbol[i % this._symbol.length];
                    if (legend){
                        this.selectedMap[serieName] = legend.isSelected(serieName);
                        this._sIndex2ColorMap[i] = zrColor.alpha(legend.getColor(serieName), 0.5);
                            
                        iconShape = legend.getItemShape(serieName);
                        if (iconShape) {
                            // 回调legend，换一个更形象的icon
                            var iconType = this._sIndex2ShapeMap[i];
                            iconShape.style.brushType = iconType.match('empty') ? 'stroke' : 'both';
                            iconType = iconType.replace('empty', '').toLowerCase();
                            
                            if (iconType.match('rectangle')) {
                                iconShape.style.x += Math.round(
                                    (iconShape.style.width - iconShape.style.height) / 2
                                );
                                iconShape.style.width = iconShape.style.height;
                            }
                            
                            if (iconType.match('star')) {
                                iconShape.style.n = (iconType.replace('star','') - 0) || 5;
                                iconType = 'star';
                            }
                            
                            if (iconType.match('image')) {
                                iconShape.style.image = iconType.replace(
                                    new RegExp('^image:\\/\\/'), ''
                                );
                                iconShape.style.x += Math.round(
                                    (iconShape.style.width - iconShape.style.height) / 2
                                );
                                iconShape.style.width = iconShape.style.height;
                                iconType = 'image';
                            }
            
                            iconShape.style.iconType = iconType;
                            legend.setItemShape(serieName, iconShape);
                        }
                    } 
                    else {
                        this.selectedMap[serieName] = true;
                        this._sIndex2ColorMap[i] = zrColor.alpha(this.zr.getColor(i), 0.5);
                    }
                      
                    if (this.selectedMap[serieName]) {
                        seriesArray.push(i);
                    }
                }
            }
            
            this._buildSeries(seriesArray);
            
            this.addShapeList();
        },

        /**
         * 构建类目轴为水平方向的散点图系列
         */
        _buildSeries: function (seriesArray) {
            if (seriesArray.length === 0) {
                return;
            }
            var series = this.series;
            var seriesIndex;
            var serie;
            var data;
            var value;
            var xAxis;
            var yAxis; 

            var pointList = {};
            var x;
            var y;
            for (var j = 0, k = seriesArray.length; j < k; j++) {
                seriesIndex = seriesArray[j];
                serie = series[seriesIndex];
                if (serie.data.length === 0) {
                    continue;
                }
                
                xAxis = this.component.xAxis.getAxis(serie.xAxisIndex || 0);
                yAxis = this.component.yAxis.getAxis(serie.yAxisIndex || 0);
                
                pointList[seriesIndex] = [];
                for (var i = 0, l = serie.data.length; i < l; i++) {
                    data = serie.data[i];
                    value = this.getDataFromOption(data, '-');
                    if (value === '-' || value.length < 2) {
                        // 数据格式不符
                        continue;
                    }
                    x = xAxis.getCoord(value[0]);
                    y = yAxis.getCoord(value[1]);
                    pointList[seriesIndex].push([
                        x,                  // 横坐标
                        y,                  // 纵坐标
                        i,                  // 数据index
                        data.name || ''     // 名称
                    ]);
                    
                }
                this.xMarkMap[seriesIndex] = this._markMap(
                    xAxis, yAxis, serie.data, pointList[seriesIndex]
                ); 
                this.buildMark(seriesIndex);
            }
            
            // console.log(pointList)
            this._buildPointList(pointList);
        },
        
        _markMap: function (xAxis, yAxis, data, pointList) {
            var xMarkMap = {
                min0: Number.POSITIVE_INFINITY,
                max0: Number.NEGATIVE_INFINITY,
                sum0: 0,
                counter0: 0,
                average0: 0,
                min1: Number.POSITIVE_INFINITY,
                max1: Number.NEGATIVE_INFINITY,
                sum1: 0,
                counter1: 0,
                average1: 0
            };
            var value;
            for (var i = 0, l = pointList.length; i < l; i++) {
                /**
                x,                  // 横坐标
                y,                  // 纵坐标
                i,                  // 数据index
                data.name || ''     // 名称 
                 */
                value = data[pointList[i][2]].value || data[pointList[i][2]];
                // 横轴
                if (xMarkMap.min0 > value[0]) {
                    xMarkMap.min0 = value[0];
                    xMarkMap.minY0 = pointList[i][1];
                    xMarkMap.minX0 = pointList[i][0];
                }
                if (xMarkMap.max0 < value[0]) {
                    xMarkMap.max0 = value[0];
                    xMarkMap.maxY0 = pointList[i][1];
                    xMarkMap.maxX0 = pointList[i][0];
                }
                xMarkMap.sum0 += value[0];
                xMarkMap.counter0++;
                
                // 纵轴
                if (xMarkMap.min1 > value[1]) {
                    xMarkMap.min1 = value[1];
                    xMarkMap.minY1 = pointList[i][1];
                    xMarkMap.minX1 = pointList[i][0];
                }
                if (xMarkMap.max1 < value[1]) {
                    xMarkMap.max1 = value[1];
                    xMarkMap.maxY1 = pointList[i][1];
                    xMarkMap.maxX1 = pointList[i][0];
                }
                xMarkMap.sum1 += value[1];
                xMarkMap.counter1++;
            }
            
            var gridX = this.component.grid.getX();
            var gridXend = this.component.grid.getXend();
            var gridY = this.component.grid.getY();
            var gridYend = this.component.grid.getYend();
            
            xMarkMap.average0 = xMarkMap.sum0 / xMarkMap.counter0;
            var x = xAxis.getCoord(xMarkMap.average0); 
            // 横轴平均纵向
            xMarkMap.averageLine0 = [
                [x, gridYend],
                [x, gridY]
            ];
            xMarkMap.minLine0 = [
                [xMarkMap.minX0, gridYend],
                [xMarkMap.minX0, gridY]
            ];
            xMarkMap.maxLine0 = [
                [xMarkMap.maxX0, gridYend],
                [xMarkMap.maxX0, gridY]
            ];
            
            xMarkMap.average1 = xMarkMap.sum1 / xMarkMap.counter1;
            var y = yAxis.getCoord(xMarkMap.average1);
            // 纵轴平均横向
            xMarkMap.averageLine1 = [
                [gridX, y],
                [gridXend, y]
            ];
            xMarkMap.minLine1 = [
                [gridX, xMarkMap.minY1],
                [gridXend, xMarkMap.minY1]
            ];
            xMarkMap.maxLine1 = [
                [gridX, xMarkMap.maxY1],
                [gridXend, xMarkMap.maxY1]
            ];
            
            return xMarkMap;
        },
        
        /**
         * 生成折线和折线上的拐点
         */
        _buildPointList: function (pointList) {
            var series = this.series;
            var serie;
            var seriesPL;
            var singlePoint;
            var shape;
            for (var seriesIndex in pointList) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];                
                if (serie.large && serie.data.length > serie.largeThreshold) {
                    this.shapeList.push(this._getLargeSymbol(
                        serie,
                        seriesPL, 
                        this.getItemStyleColor(
                            this.query(
                                serie, 'itemStyle.normal.color'
                            ),
                            seriesIndex,
                            -1
                        ) || this._sIndex2ColorMap[seriesIndex]
                    ));
                    continue;
                }

                /*
                 * pointlist=[
                 *      0  x,
                 *      1  y, 
                 *      2  数据index
                 *      3  名称
                 * ]
                 */
                
                for (var i = 0, l = seriesPL.length; i < l; i++) {
                    singlePoint = seriesPL[i];
                    shape = this._getSymbol(
                        seriesIndex,    // seriesIndex
                        singlePoint[2], // dataIndex
                        singlePoint[3], // name
                        singlePoint[0], // x
                        singlePoint[1]  // y
                    );
                    shape && this.shapeList.push(shape);
                }
            }
            // console.log(this.shapeList)
        },

        /**
         * 生成折线图上的拐点图形
         */
        _getSymbol: function (seriesIndex, dataIndex, name, x, y) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            
            var dataRange = this.component.dataRange;
            var rangColor;
            if (dataRange) {
                rangColor = isNaN(data[2]) 
                            ? this._sIndex2ColorMap[seriesIndex]
                            : dataRange.getColor(data[2]);
                if (!rangColor) {
                    return null;
                }
            }
            else {
                rangColor = this._sIndex2ColorMap[seriesIndex];
            }
            
            var itemShape = this.getSymbolShape(
                serie, seriesIndex, data, dataIndex, name, 
                x, y,
                this._sIndex2ShapeMap[seriesIndex], 
                rangColor,
                'rgba(0,0,0,0)',
                'vertical'
            );
            itemShape.zlevel = serie.zlevel;
            itemShape.z = serie.z;
            
            itemShape._main = true;
            return itemShape;
        },
        
        _getLargeSymbol: function (serie, pointList, nColor) {
            return new SymbolShape({
                zlevel: serie.zlevel,
                z: serie.z,
                _main: true,
                hoverable: false,
                style: {
                    pointList: pointList,
                    color: nColor,
                    strokeColor: nColor
                },
                highlightStyle: {
                    pointList: []
                }
            });
        },
        
        // 位置转换
        getMarkCoord: function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xMarkMap = this.xMarkMap[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            var pos;
            
            if (mpData.type
                && (mpData.type === 'max' || mpData.type === 'min' || mpData.type === 'average')
            ) {
                // 特殊值内置支持
                // 默认取纵值
                var valueIndex = mpData.valueIndex != null ? mpData.valueIndex : 1;
                pos = [
                    xMarkMap[mpData.type + 'X' + valueIndex],
                    xMarkMap[mpData.type + 'Y' + valueIndex],
                    xMarkMap[mpData.type + 'Line' + valueIndex],
                    xMarkMap[mpData.type + valueIndex]
                ];
            }
            else {
                pos = [
                    typeof mpData.xAxis != 'string' && xAxis.getCoordByIndex
                        ? xAxis.getCoordByIndex(mpData.xAxis || 0)
                        : xAxis.getCoord(mpData.xAxis || 0),
                    
                    typeof mpData.yAxis != 'string' && yAxis.getCoordByIndex
                        ? yAxis.getCoordByIndex(mpData.yAxis || 0)
                        : yAxis.getCoord(mpData.yAxis || 0)
                ];
            }
            
            return pos;
        },

        /**
         * 刷新
         */
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            
            this.backupShapeList();
            this._buildShape();
        },
        
        /**
         * 值域响应
         * @param {Object} param
         * @param {Object} status
         */
        ondataRange: function (param, status) {
            if (this.component.dataRange) {
                this.refresh();
                status.needRefresh = true;
            }
            return;
        }
    };
    
    zrUtil.inherits(Scatter, ChartBase);
    
    // 图表注册
    require('../chart').define('scatter', Scatter);
    
    return Scatter;
});