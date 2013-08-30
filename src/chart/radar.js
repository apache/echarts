/**
 * echarts图表类：雷达图
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 */

 define(
    function(require) {
        /**
         * 构造函数
         * @param {Object} messageCenter echart消息中心
         * @param {ZRender} zr zrender实例
         * @param {Object} series 数据
         * @param {Object} component 组件
         */
        function Radar(messageCenter, zr, option, component) {
            // 基类装饰
            var ComponentBase = require('../component/base');
            ComponentBase.call(this, zr);
            // 可计算特性装饰
            var CalculableBase = require('./calculableBase');
            CalculableBase.call(this, zr, option);

            var ecConfig = require('../config');
            var ecData = require('../util/ecData');

            var zrUtil = require('zrender/tool/util');
            var ecCoordinates = require('../util/coordinates');
            var zrColor = require('zrender/tool/color');

            var self = this;
            self.type = ecConfig.CHART_TYPE_RADAR;

            var series;                 // 共享数据源，不要修改跟自己无关的项
            var serie;

            var _zlevelBase = self.getZlevelBase();

            var _width = zr.getWidth();
            var _height = zr.getHeight();

            var _queryTarget;

            var _dropBoxList;
            
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
             * 绘制图形
             */
            function _buildShape() {  
                self.selectedMap = {};
                for (var i = 0, l = series.length; i < l ; i ++) {
                    if (series[i].type == ecConfig.CHART_TYPE_RADAR) {
                        serie = series[i];
                        _queryTarget = [serie, option];
                        serie = self.reformOption(serie);
                        
                        _dropBoxList = [];
                        _addDropBox(i);
 
                        _buildDataShape(i);
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
            function _buildDataShape(index) {
                var _ecIndicator_ = serie._ecIndicator_;
                var polarIndex;
                var center = self.deepQuery(_queryTarget, 'center');
                var data = serie.data;
                var pointList;
                var color = self.deepQuery(_queryTarget, 'color');
                
                var strokeColor = self.deepQuery(_queryTarget, 'strokeColor');
                var lineWidth = self.deepQuery(_queryTarget, 'lineWidth');
                var name = self.deepQuery(_queryTarget, 'name');
                var shape;
                var calculable = self.deepQuery(_queryTarget, 'calculable');
                
               
                for (var i = 0; i < data.length; i ++) {
                    name = self.deepQuery([data[i]], 'name');
                    color = self.deepQuery(
                        [data[i], serie, option], 'color'
                    );
                    color = _getDataShapeColor(name);

                    if (!color) {
                        continue;
                    }
                    polarIndex = self.deepQuery([data[i], serie], 'polarIndex');
                    strokeColor = self.deepQuery(
                        [data[i], serie, option], 'strokeColor'
                    );
                    lineWidth = self.deepQuery(
                        [data[i], serie, option], 'lineWidth'
                    );

                    pointList =
                        _getDataShapePoints(
                            //_ecIndicator_, data[i], center
                            polarIndex, data[i]
                        );
                    shape = _getDataShape(
                        pointList, color, strokeColor, lineWidth, i,
                        calculable
                    );
                    _addDataShape(
                        shape, index, data[i], i, calculable
                    );
                }
                
            }

            /**
             * 获取图形的颜色
             * @param {string} itemName 图形名称
             * @param {Object} color 获取到的color  没有legend时使用
             * @return {Object} color | false 返回颜色时显示图形
             */
            function _getDataShapeColor(itemName, color) {
                var legend = component.legend;
                var legendColor;
                var color = self.deepQuery(_queryTarget, 'color');

                if (legend){
                    self.selectedMap[itemName] = legend.isSelected(itemName);

                    if (!legend.isSelected(itemName)) {
                        return false;
                    }

                    legendColor = legend.getColor(itemName);
                    
                    return legendColor;
                } else {
                    self.selectedMap[itemName] = true;
                    return color;
                }
            }

            /**
             * 获取绘制的图形
             * @param {Array<Array<number>>} 绘制的点集
             * @param {string} 绘制方式 stroke | fill | both 描边 | 填充 | 描边 + 填充
             * @param {string} 颜色
             * @param {string} 描边颜色
             * @param {number} 线条宽度
             * @param {boolean=} hoverable
             * @param {boolean=} draggable
             * @return {Object} 绘制的图形对象
             */ 
            function _getShape(
                pointList, brushType, color, strokeColor, lineWidth, 
                hoverable, draggable
            ) {
                return {
                    shape : 'polygon',
                    style : {
                        pointList   : pointList,
                        brushType   : brushType,
                        color       : color,
                        strokeColor : strokeColor,
                        lineWidth   : lineWidth
                    },
                    hoverable : hoverable || false,
                    draggable : draggable || false
                };
            }

            /**
             * 添加数据图形
             * @param {Array<Array<number>>} pointList 点集
             * @param {string | Array<string>} color 填充颜色
             * @param {string | Array<string>} strokeColor 描边颜色
             * @param {number} 线条宽度
             * @param {number=} data数组序列号
             * @return {Object} shape
             */ 
            function _getDataShape(
                pointList, color, strokeColor, lineWidth, index, draggable
            ) {
                var index = index || 0;
                var color = _getValueInArray(color, index);
                var strokeColor = _getValueInArray(strokeColor, index);
                
                return _getShape(
                    pointList, 'both', color, strokeColor, lineWidth, 
                    true, draggable
                )
            }

            /**
             * 添加数据图形
             * @param {Object} shape
             * @param {Object} serie
             * @param {Object} data
             * @param {number} dataIndex
             * @param {boolean} calcalable
             */
            function _addDataShape(
                shape, seriesIndex, data, dataIndex, calculable
            ) {
                var queryTarget = [data, series[seriesIndex], option];
                var name = self.deepQuery(queryTarget, 'name');
                var polarIndex = self.deepQuery(queryTarget, 'polarIndex');
                var indicator = component.polar.getIndicator(polarIndex);
                ecData.pack(
                    shape, series[seriesIndex], seriesIndex, 
                    data, dataIndex, name, indicator
                );
                if (calculable) {
                    self.setCalculable(shape);
                }
                self.shapeList.push(shape);
            }

            /**
             * 获取数据的点集
             * @param {number} polarIndex
             * @param {Array<Object>} 处理的数据
             * @return {Array<Array<number>>} 点集
             */
            function _getDataShapePoints(polarIndex, dataArr) {
                var pointList = [];
                var vector;
                var polar = component.polar;
                var value;

                for (var i = 0; i < dataArr.value.length; i ++) {
                    
                    value = dataArr.value[i];
                    
                    vector = polar.getVector(value, polarIndex, i);
                    if (vector) {
                        pointList.push(vector);
                    } 
                }
                return pointList;
            }

            /**
             * 转换坐标
             *
             * @param {Array<number>} 原始坐标
             * @param {Array<number>} 中点坐标
             * @param {number} 缩小的倍数
             *
             * @return {Array<number>} 转换后的坐标
             */
            function _mapVector(vector, center, scale) {
                return [
                    vector[0] * scale + center[0],
                    vector[1] * scale + center[1]
                ]
            }

            /**
             * 从数组中获取值 不是数组是返回自己
             * @param {*} array 
             * @param {number} index array为数组时的序列号,如果大于数组长度求余
             * @return {Object}
             */
            function _getValueInArray(array, index) {
                if (!(array instanceof Array)) {
                    return array;
                }
                else {
                    return array[index % array.length];
                }
            }

            /**
             * 增加外围接受框
             * @param {number} serie的序列
             */
            function _addDropBox(index) {
                var calculable = self.deepQuery(_queryTarget, 'calculable');
                var polarIndex
                var shape;
                var data = serie.data;

                if (!calculable) {
                    return;
                }
                for (var i = 0; i < data.length; i ++) {
                    polarIndex = self.deepQuery([data[i], serie, option], 
                            'polarIndex');
                    if (!_dropBoxList[polarIndex]) {
                        shape = component.polar.getDropBox(polarIndex);
                        self.setCalculable(shape);
                        ecData.pack(shape, series, index, undefined, -1);
                        self.shapeList.push(shape);
                        _dropBoxList[polarIndex] = true;
                    }
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
                    data = series[seriesIndex].data[dataIndex];
                    legend && legend.del(data.name);
                    data.name += option.nameConnector
                                 + ecData.get(dragged, 'name');
                    value = ecData.get(dragged, 'value');
                    for (var i = 0 ; i < value.length; i ++) {
                        data.value[i] += value[i];
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
             * 刷新
             */
            function refresh() {
                self.clear();
                _buildShape();
            }

            function animation() {
                var duration = self.deepQuery([option], 'animationDuration');
                var easing = self.deepQuery([option], 'animationEasing');
                var dataIndex;
                var seriesIndex;
                var data;
                var serie;
                var polarIndex;
                var polar = component.polar;
                var center;
                var item;

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
                        zr.modShape(self.shapeList[i].id, {
                            scale : [0.1, 0.1, center[0], center[1]]
                        });
                        
                        zr.animate(item.id, '')
                            .when(
                                (self.deepQuery([serie],'animationDuration')
                                || duration)
                                + dataIndex * 100,

                                {scale : [1, 1, center[0], center[1]]},

                                (self.deepQuery([serie], 'animationEasing')
                                || easing)
                            )
                            .start();
                    }
                }

            }

            self.init = init;
            self.refresh = refresh;
            self.animation = animation;
            self.ondrop = ondrop;
            self.ondragend = ondragend;

            init(option, component);
        }

        // 图表注册
        require('../chart').define('radar', Radar);
        
        return Radar;
    }
)