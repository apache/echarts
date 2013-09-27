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
    function Scatter(messageCenter, zr, option, component){
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
        self.type = ecConfig.CHART_TYPE_SCATTER;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        
        var _sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
        var _symbol = [
              'circle', 'rectangle', 'triangle', 'diamond',
              'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
            ];
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
                    _sIndex2ShapeMap[i] = self.deepQuery([serie], 'symbol')
                                          || _symbol[i % _symbol.length];
                    if (legend){
                        self.selectedMap[serieName] = 
                            legend.isSelected(serieName);
                            
                        _sIndex2ColorMap[i] = 
                            zrColor.alpha(legend.getColor(serieName),0.5);
                            
                        iconShape = legend.getItemShape(serieName);
                        if (iconShape) {
                            // 回调legend，换一个更形象的icon
                            iconShape.shape = 'icon';
                            var iconType = _sIndex2ShapeMap[i];
                            iconShape.style.brushType = iconType.match('empty') 
                                                        ? 'stroke' : 'both';
                            iconType = iconType.replace('empty', '')
                                               .toLowerCase();
                            if (iconType.match('star')) {
                                iconShape.style.n = 
                                    (iconType.replace('star','') - 0) || 5;
                                iconType = 'star';
                            } 
                            iconShape.style.iconType = iconType;
                            legend.setItemShape(serieName, iconShape);
                        }
                    } else {
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
            var symbolSize;
            for (var j = 0, k = seriesArray.length; j < k; j++) {
                seriesIndex = seriesArray[j];
                serie = series[seriesIndex];
                if (serie.data.length === 0) {
                    continue;
                }
                
                xAxis = component.xAxis.getAxis(serie.xAxisIndex || 0);
                yAxis = component.yAxis.getAxis(serie.yAxisIndex || 0);
                
                symbolSize = self.deepQuery([serie], 'symbolSize');
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
                        x,  // 横坐标
                        y,  // 纵坐标
                        (typeof symbolSize == 'function'
                        ? symbolSize(value)
                        : symbolSize),                  // 图形大小
                        _sIndex2ShapeMap[seriesIndex],  // 图形类型
                        i,                              // 数据index
                        data.name || ''                 // 名称
                    ]);
                }
            }
            // console.log(pointList)
            _buildPointList(pointList);
        }

        /**
         * 生成折线和折线上的拐点
         */
        function _buildPointList(pointList) {
            var dataRange = component.dataRange;
            var rangColor;  // 更高优先级
            var nColor;     // normal
            var nLineWidth;
            var eColor;     // emphasis
            var eLineWidth;
            
            var serie;
            var queryTarget;
            var data;
            var seriesPL;
            var singlePoint;
            var symbolRotate;
            
            for (var seriesIndex in pointList) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                // 多级控制
                queryTarget = [serie];
                nColor = self.deepQuery(
                    queryTarget, 'itemStyle.normal.color'
                ) || _sIndex2ColorMap[seriesIndex];
                nLineWidth = self.deepQuery(
                    queryTarget, 'itemStyle.normal.lineStyle.width'
                );
                
                eColor = self.deepQuery(
                    queryTarget, 'itemStyle.emphasis.color'
                );
                eLineWidth = self.deepQuery(
                    queryTarget, 'itemStyle.emphasis.lineStyle.width'
                );
                
                symbolRotate = self.deepQuery(
                    queryTarget, 'symbolRotate'
                );
                
                if (serie.large && serie.data.length > serie.largeThreshold) {
                    self.shapeList.push(_getLargeSymbol(
                        seriesPL, nColor, eColor
                    ));
                    continue;
                }

                /*
                 * pointlist=[
                 *      0  x,
                 *      1  y, 
                 *      2  图形大小
                 *      3  图形类型
                 *      4  数据index
                 *      5  名称
                 * ]
                 */
                for (var i = 0, l = seriesPL.length; i < l; i++) {
                    singlePoint = seriesPL[i];
                    data = serie.data[singlePoint[4]];
                    
                    if (dataRange) {
                        if (isNaN(data[2])) {
                            continue;
                        }
                        rangColor = dataRange.getColor(data[2]);
                        if (!rangColor) {
                            continue;
                        }
                    }
                    else {
                        rangColor = nColor;
                    }
                    
                    queryTarget = [data];
                    self.shapeList.push(_getSymbol(
                        seriesIndex,    // seriesIndex
                        singlePoint[4], // dataIndex
                        singlePoint[5], // name
                        
                        singlePoint[0], // x
                        singlePoint[1], // y
                        
                        // 大小
                        self.deepQuery(queryTarget, 'symbolSize')
                        || singlePoint[2],
                        
                        // 方向
                        self.deepQuery(queryTarget, 'symbolRotate') 
                        || symbolRotate,
                        
                        // 类型
                        self.deepQuery(queryTarget, 'symbol')
                        || singlePoint[3],
                        
                        // 填充颜色
                        self.deepQuery(queryTarget, 'itemStyle.normal.color')
                        || rangColor,
                        // 线宽
                        self.deepQuery(
                            queryTarget, 'itemStyle.normal.lineStyle.width'
                        )|| nLineWidth,
                        
                        //------------高亮
                        // 填充颜色
                        self.deepQuery(
                            queryTarget, 'itemStyle.emphasis.color'
                        ) || eColor || nColor,
                        // 线宽
                        self.deepQuery(
                            queryTarget, 'itemStyle.emphasis.lineStyle.width'
                        )|| eLineWidth || nLineWidth
                    ));
                }
            }
            // console.log(self.shapeList)
        }

        /**
         * 生成散点图上的图形
         */
        function _getSymbol(
            seriesIndex, dataIndex, name, 
            x, y, symbolSize, symbolRotate, symbol,
            nColor, nLineWidth, eColor, eLineWidth
        ) {
            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase,
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : symbol.match('empty') ? 'stroke' : 'fill',
                    color : nColor,
                    strokeColor : nColor,
                    lineWidth: nLineWidth
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eColor,
                    lineWidth : eLineWidth
                },
                clickable : true
            };
            
            if (typeof symbolRotate != 'undefined') {
                itemShape.rotation = [
                    symbolRotate * Math.PI / 180, x, y
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

            /*
            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            */
           
           itemShape = self.addLabel(
                itemShape, 
                series[seriesIndex], 
                series[seriesIndex].data[dataIndex], 
                name, 
                'vertical'
            );

            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            // for animation
            itemShape._x = x;
            itemShape._y = y;
            
            return itemShape;
        }
        
        function _getLargeSymbol(symbolList, nColor, eColor) {
            return {
                shape : 'symbol',
                zlevel : _zlevelBase,
                hoverable: false,
                style : {
                    pointList : symbolList,
                    color : nColor,
                    strokeColor : nColor
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eColor
                }
            };
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
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
            var x;
            var y;
            var serie;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                x = self.shapeList[i]._x || 0;
                y = self.shapeList[i]._y || 0;
                zr.modShape(self.shapeList[i].id, {
                    scale : [0, 0, x, y]
                });
                zr.animate(self.shapeList[i].id, '')
                    .when(
                        (self.deepQuery([serie],'animationDuration')
                        || duration),
                        
                        {scale : [1, 1, x, y]},
                        
                        (self.deepQuery([serie], 'animationEasing')
                        || easing)
                    )
                    .start();
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.ondataRange = ondataRange;
        self.animation = animation;

        init(option, component);
    }
    
    // 动态扩展zrender shape：symbol
    require('../util/shape/symbol');
    
    // 自注册
    require('../chart').define('scatter', Scatter);
    
    return Scatter;
});