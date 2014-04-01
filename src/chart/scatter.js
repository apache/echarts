/**
 * echarts图表类：散点图
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
    function Scatter(ecConfig, messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_SCATTER;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        
        var _sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
        var _symbol = ecConfig.symbolList;
        var _sIndex2ShapeMap = {};  // series图形类型，seriesIndex索引到_symbol

        function _buildShape() {
            self.selectedMap = {};
            
            var legend = component.legend;
            var seriesArray = [];
            var serie;                              // 临时映射变量
            var serieName;                          // 临时映射变量
            var iconShape;
            var iconType;
            for (var i = 0, l = series.length; i < l; i++) {
                serie = series[i];
                serieName = serie.name;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    series[i] = self.reformOption(series[i]);
                    _sIndex2ShapeMap[i] = self.query(serie, 'symbol')
                                          || _symbol[i % _symbol.length];
                    if (legend){
                        self.selectedMap[serieName] = legend.isSelected(serieName);
                            
                        _sIndex2ColorMap[i] = zrColor.alpha(legend.getColor(serieName), 0.5);
                            
                        iconShape = legend.getItemShape(serieName);
                        if (iconShape) {
                            // 回调legend，换一个更形象的icon
                            iconShape.shape = 'icon';
                            var iconType = _sIndex2ShapeMap[i];
                            iconShape.style.brushType = iconType.match('empty') ? 'stroke' : 'both';
                            iconType = iconType.replace('empty', '').toLowerCase();
                            
                            if (iconType.match('star')) {
                                iconShape.style.n = (iconType.replace('star','') - 0) || 5;
                                iconType = 'star';
                            }
                            
                            if (iconType.match('image')) {
                                iconShape.style.image = iconType.replace(
                                    new RegExp('^image:\\/\\/'), ''
                                );
                                iconShape.style.x += Math.round(
                                    (iconShape.style.width 
                                     - iconShape.style.height) 
                                    / 2
                                );
                                iconShape.style.width = iconShape.style.height;
                                iconType = 'image';
                            }
            
                            iconShape.style.iconType = iconType;
                            legend.setItemShape(serieName, iconShape);
                        }
                    } 
                    else {
                        self.selectedMap[serieName] = true;
                        _sIndex2ColorMap[i] = zr.getColor(i);
                    }
                      
                    if (self.selectedMap[serieName]) {
                        seriesArray.push(i);
                    }
                }
            }
            if (seriesArray.length === 0) {
                return;
            }
            _buildSeries(seriesArray);

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建类目轴为水平方向的散点图系列
         */
        function _buildSeries(seriesArray) {
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
                
                xAxis = component.xAxis.getAxis(serie.xAxisIndex || 0);
                yAxis = component.yAxis.getAxis(serie.yAxisIndex || 0);
                
                pointList[seriesIndex] = [];
                for (var i = 0, l = serie.data.length; i < l; i++) {
                    data = serie.data[i];
                    value = typeof data != 'undefined'
                            ? (typeof data.value != 'undefined'
                              ? data.value
                              : data)
                            : '-';
                    if (value == '-' || value.length < 2) {
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
                _markMap(xAxis, yAxis, serie.data, pointList[seriesIndex]);
                self.buildMark(
                    serie,
                    seriesIndex,
                    component,
                    {
                        xMarkMap : _needMarkMap(seriesIndex) 
                                   ? _markMap(xAxis, yAxis, serie.data, pointList[seriesIndex])
                                   : {}
                    }
                );
            }
            
            // console.log(pointList)
            _buildPointList(pointList);
        }
        
        function _needMarkMap(seriesIndex) {
            var serie = series[seriesIndex];
            var mark = [];
            if (serie.markPoint && serie.markPoint.data) {
                mark.push(serie.markPoint.data);
            }
            if (serie.markLine && serie.markLine.data) {
                mark.push(serie.markLine.data);
            }
            
            var data;
            var len = mark.length;
            while (len--) {
                data = mark[len];
                for (var i = 0, l = data.length; i < l; i++) {
                    if (data[i].type == 'max' 
                        || data[i].type == 'min' 
                        || data[i].type == 'average'
                    ) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        function _markMap(xAxis, yAxis, data, pointList) {
            var xMarkMap = {
                min0 : Number.POSITIVE_INFINITY,
                max0 : Number.NEGATIVE_INFINITY,
                sum0 : 0,
                counter0 : 0,
                average0 : 0,
                min1 : Number.POSITIVE_INFINITY,
                max1 : Number.NEGATIVE_INFINITY,
                sum1 : 0,
                counter1 : 0,
                average1 : 0
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
            
            var gridX = component.grid.getX();
            var gridXend = component.grid.getXend();
            var gridY = component.grid.getY();
            var gridYend = component.grid.getYend();
            
            xMarkMap.average0 = (xMarkMap.sum0 / xMarkMap.counter0).toFixed(2) - 0;
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
            
            xMarkMap.average1 = (xMarkMap.sum1 / xMarkMap.counter1).toFixed(2) - 0;
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
        }
        
        /**
         * 生成折线和折线上的拐点
         */
        function _buildPointList(pointList) {
            var serie;
            var seriesPL;
            var singlePoint;
            var shape;
            for (var seriesIndex in pointList) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];                
                if (serie.large && serie.data.length > serie.largeThreshold) {
                    self.shapeList.push(_getLargeSymbol(
                        seriesPL, 
                        self.getItemStyleColor(
                            self.query(
                                serie, 'itemStyle.normal.color'
                            ),
                            seriesIndex,
                            -1
                        ) || _sIndex2ColorMap[seriesIndex]
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
                    shape = _getSymbol(
                        seriesIndex,    // seriesIndex
                        singlePoint[2], // dataIndex
                        singlePoint[3], // name
                        singlePoint[0], // x
                        singlePoint[1] // y
                    );
                    shape && self.shapeList.push(shape);
                }
            }
            // console.log(self.shapeList)
        }

        /**
         * 生成折线图上的拐点图形
         */
        function _getSymbol(seriesIndex, dataIndex, name, x, y) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            
            var dataRange = component.dataRange;
            var rangColor;
            if (dataRange) {
                rangColor = isNaN(data[2]) 
                            ? _sIndex2ColorMap[seriesIndex]
                            : dataRange.getColor(data[2]);
                if (!rangColor) {
                    return null;
                }
            }
            else {
                rangColor = _sIndex2ColorMap[seriesIndex];
            }
            
            var itemShape = self.getSymbolShape(
                serie, seriesIndex, data, dataIndex, name, 
                x, y,
                _sIndex2ShapeMap[seriesIndex], 
                rangColor,
                'rgba(0,0,0,0)',
                'vertical'
            );
            itemShape.zlevel = _zlevelBase;
            itemShape._mark = false; // 非mark
            itemShape._main = true;
            return itemShape;
        }
        
        function _getLargeSymbol(pointList, nColor) {
            return {
                shape : 'symbol',
                zlevel : _zlevelBase,
                _main : true,
                hoverable: false,
                style : {
                    pointList : pointList,
                    color : nColor,
                    strokeColor : nColor
                }
            };
        }
        
        // 位置转换
        function getMarkCoord(serie, seriesIndex, mpData, markCoordParams) {
            var xAxis = component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = component.yAxis.getAxis(serie.yAxisIndex);
            var pos;
            
            if (mpData.type
                && (mpData.type == 'max' || mpData.type == 'min' || mpData.type == 'average')
            ) {
                // 特殊值内置支持
                // 默认取纵值
                var valueIndex = typeof mpData.valueIndex != 'undefined'
                                 ? mpData.valueIndex : 1;
                pos = [
                    markCoordParams.xMarkMap[mpData.type + 'X' + valueIndex],
                    markCoordParams.xMarkMap[mpData.type + 'Y' + valueIndex],
                    markCoordParams.xMarkMap[mpData.type + 'Line' + valueIndex],
                    markCoordParams.xMarkMap[mpData.type + valueIndex]
                ];
            }
            else {
                pos = [
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
            
            return pos;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
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
        
        /**
         * 值域响应
         * @param {Object} param
         * @param {Object} status
         */
        function ondataRange(param, status) {
            if (component.dataRange) {
                refresh();
                status.needRefresh = true;
            }
            return;
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

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i]._main) {
                    if (self.shapeList[i].shape == 'symbol') {
                        continue;
                    }
                    serie = series[self.shapeList[i]._seriesIndex];
                    x = self.shapeList[i]._x || 0;
                    y = self.shapeList[i]._y || 0;
                    zr.modShape(
                        self.shapeList[i].id, 
                        {
                            scale : [0, 0, x, y]
                        },
                        true
                    );
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.query(serie,'animationDuration')
                            || duration),
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
        self.ondataRange = ondataRange;

        init(option, component);
    }
    
    // 动态扩展zrender shape：symbol
    require('../util/shape/symbol');
    
    // 自注册
    require('../chart').define('scatter', Scatter);
    
    return Scatter;
});