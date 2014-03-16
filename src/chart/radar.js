/**
 * echarts图表类：雷达图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, yangji01@baidu.com)
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
    function Radar(ecConfig, messageCenter, zr, option, component) {
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecData = require('../util/ecData');

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_RADAR;

        var series;                 // 共享数据源，不要修改跟自己无关的项
        var serie;

        var _zlevelBase = self.getZlevelBase();

        var _queryTarget;

        var _dropBoxList;

        var _symbol = ecConfig.symbolList;
        var _radarDataCounter;
        
        /**
         * 绘制图形
         */
        function _buildShape() {
            var legend = component.legend;
            self.selectedMap = {};
            _dropBoxList = [];
            _radarDataCounter = 0;
            var serieName;
            for (var i = 0, l = series.length; i < l ; i ++) {
                if (series[i].type == ecConfig.CHART_TYPE_RADAR) {
                    serie = self.reformOption(series[i]);
                    serieName = serie.name || '';
                    // 系列图例开关
                    self.selectedMap[serieName] = 
                        legend ? legend.isSelected(serieName) : true;
                    
                    if (self.selectedMap[serieName]) {
                        _queryTarget = [serie, option];
    
                        // 添加可拖拽提示框，多系列共用一个极坐标，第一个优先
                        if (self.deepQuery(_queryTarget, 'calculable')) {
                            _addDropBox(i);
                        }
                        _buildSingleRadar(i);
                        self.buildMark(
                            series[i],
                            i,
                            component
                        );
                    }
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建数据图形
         * @param {number} 序列的index
         */
        function _buildSingleRadar(index) {
            var legend = component.legend;
            var iconShape;
            var data = serie.data;
            var defaultColor;
            var name;
            var pointList;
            var calculable = self.deepQuery(_queryTarget, 'calculable');
           
            for (var i = 0; i < data.length; i ++) {
                name = data[i].name || '';
                
                // 图例开关
                self.selectedMap[name] = legend 
                                         ? legend.isSelected(name) 
                                         : true;
                if (!self.selectedMap[name]) {
                    continue;
                }
                
                 // 默认颜色策略
                if (legend) {
                    // 有图例则从图例中获取颜色定义
                    defaultColor = legend.getColor(name);
                    iconShape = legend.getItemShape(name);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        iconShape.style.brushType = self.deepQuery(
                            [data[i], serie], 'itemStyle.normal.areaStyle'
                        ) ? 'both' : 'stroke';
                        legend.setItemShape(name, iconShape);
                    }
                }
                else {
                    // 全局颜色定义
                    defaultColor = zr.getColor(i);
                }

                pointList = _getPointList(serie.polarIndex, data[i]);
                // 添加拐点形状
                _addSymbol(pointList, defaultColor, i, index);
                // 添加数据形状
                _addDataShape(
                    pointList, defaultColor, data[i],
                    index, i, calculable
                );
                _radarDataCounter++;
            }
            
        }

        /**
         * 获取数据的点集
         * @param {number} polarIndex
         * @param {Array<Object>} 处理的数据
         * @return {Array<Array<number>>} 点集
         */
        function _getPointList(polarIndex, dataArr) {
            var pointList = [];
            var vector;
            var polar = component.polar;

            for (var i = 0, l = dataArr.value.length; i < l; i++) {
                vector = polar.getVector(polarIndex, i, dataArr.value[i]);
                if (vector) {
                    pointList.push(vector);
                } 
            }
            return pointList;
        }
        
        /**
         * 添加拐点
         * @param {Array<Array<number>>} pointList 点集
         * @param {string} defaultColor 默认填充颜色
         * @param {object} data 数据
         * @param {number} serieIndex
         */
        function _addSymbol(pointList, defaultColor, dataIndex, seriesIndex) {
            var itemShape;
            for (var i = 0, l = pointList.length; i < l; i++) {
                itemShape = self.getSymbolShape(
                    series[seriesIndex], seriesIndex, 
                    series[seriesIndex].data[dataIndex], dataIndex, '', 
                    pointList[i][0],    // x
                    pointList[i][1],    // y
                    _symbol[_radarDataCounter % _symbol.length],
                    defaultColor,
                    '#fff',
                    'vertical'
                );
                itemShape.zlevel = _zlevelBase + 1;
                self.shapeList.push(itemShape);
            }
        }
        
        /**
         * 添加数据图形
         * @param {Array<Array<number>>} pointList 点集
         * @param {string} defaultColor 默认填充颜色
         * @param {object} data 数据
         * @param {number} serieIndex
         * @param {number} dataIndex
         * @param {boolean} calcalable
         */ 
        function _addDataShape(
            pointList, defaultColor, data,
            seriesIndex, dataIndex, calculable
        ) {
            // 多级控制
            var queryTarget = [data, serie];
            var nColor = self.getItemStyleColor(
                self.deepQuery(
                    queryTarget, 'itemStyle.normal.color'
                ),
                seriesIndex,
                dataIndex,
                data
            );
            var nLineWidth = self.deepQuery(
                queryTarget, 'itemStyle.normal.lineStyle.width'
            );
            var nLineType = self.deepQuery(
                queryTarget, 'itemStyle.normal.lineStyle.type'
            );
            var nAreaColor = self.deepQuery(
                queryTarget, 'itemStyle.normal.areaStyle.color'
            );
            var nIsAreaFill = self.deepQuery(
                queryTarget, 'itemStyle.normal.areaStyle'
            );
            var shape = {
                shape : 'polygon',
                zlevel : _zlevelBase,
                style : {
                    pointList   : pointList,
                    brushType   : nIsAreaFill ? 'both' : 'stroke',
                    color       : nAreaColor 
                                  || nColor 
                                  || zrColor.alpha(defaultColor,0.5),
                    strokeColor : nColor || defaultColor,
                    lineWidth   : nLineWidth,
                    lineType    : nLineType
                },
                highlightStyle : {
                    brushType   : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.areaStyle'
                                  ) || nIsAreaFill 
                                  ? 'both' : 'stroke',
                    color       : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.areaStyle.color'
                                  ) 
                                  || nAreaColor 
                                  || nColor 
                                  || zrColor.alpha(defaultColor,0.5),
                    strokeColor : self.getItemStyleColor(
                                       self.deepQuery(
                                           queryTarget, 'itemStyle.emphasis.color'
                                       ),
                                       seriesIndex,
                                       dataIndex,
                                       data
                                   )
                                   || nColor || defaultColor,
                    lineWidth   : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.lineStyle.width'
                                  ) || nLineWidth,
                    lineType    : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.lineStyle.type'
                                  ) || nLineType
                }
            };
            ecData.pack(
                shape,
                series[seriesIndex],    // 系列
                seriesIndex,            // 系列索引
                data,                   // 数据
                dataIndex,              // 数据索引
                data.name,              // 数据名称
                // 附加指标信息 
                component.polar.getIndicator(series[seriesIndex].polarIndex)
            );
            if (calculable) {
                shape.draggable = true;
                self.setCalculable(shape);
            }
            self.shapeList.push(shape);
        }

        /**
         * 增加外围接受框
         * @param {number} serie的序列
         */
        function _addDropBox(index) {
            var polarIndex = self.deepQuery(
                _queryTarget, 'polarIndex'
            );
            if (!_dropBoxList[polarIndex]) {
                var shape = component.polar.getDropBox(polarIndex);
                shape.zlevel = _zlevelBase;
                self.setCalculable(shape);
                ecData.pack(shape, series, index, undefined, -1);
                self.shapeList.push(shape);
                _dropBoxList[polarIndex] = true;
            }
        }

        /**
         * 数据项被拖拽出去，重载基类方法
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是饼图sector，删除被拖拽走的数据
            component.legend && component.legend.del(
                series[seriesIndex].data[dataIndex].name
            );

            series[seriesIndex].data.splice(dataIndex, 1);

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

         /**
         * 数据项被拖拽进来， 重载基类方法
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var data;
            var legend = component.legend;
            var value;

            if (dataIndex == -1) {
                data = {
                    value : ecData.get(dragged, 'value'),
                    name : ecData.get(dragged, 'name')
                };

                series[seriesIndex].data.push(data);

                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }
            else {
                // 数据被拖拽到某个数据项上，数据修改
                var accMath = require('../util/accMath');
                data = series[seriesIndex].data[dataIndex];
                legend && legend.del(data.name);
                data.name += option.nameConnector
                             + ecData.get(dragged, 'name');
                value = ecData.get(dragged, 'value');
                for (var i = 0 ; i < value.length; i ++) {
                    data.value[i] = accMath.accAdd(data.value[i], value[i]);
                }
                
                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
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

        function animation() {
            var duration = self.query(option, 'animationDuration');
            var easing = self.query(option, 'animationEasing');
            var dataIndex;
            var seriesIndex;
            var data;
            var serie;
            var polarIndex;
            var polar = component.polar;
            var center;
            var item;
            var x;
            var y;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'polygon') {
                    item = self.shapeList[i];
                    seriesIndex = ecData.get(item, 'seriesIndex');
                    dataIndex = ecData.get(item, 'dataIndex');

                    serie = series[seriesIndex];
                    data = serie.data[dataIndex];

                    polarIndex = self.deepQuery(
                        [data, serie, option], 'polarIndex');
                    center = polar.getCenter(polarIndex);
                    x = center[0];
                    y = center[1];
                    zr.modShape(
                        self.shapeList[i].id, 
                        {
                            scale : [0.1, 0.1, x, y]
                        },
                        true
                    );
                    
                    zr.animate(item.id, '')
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
        self.animation = animation;
        
        self.init = init;
        self.refresh = refresh;
        self.ondrop = ondrop;
        self.ondragend = ondragend;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('radar', Radar);
    
    return Radar;
});