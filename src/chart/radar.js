/**
 * echarts图表类：雷达图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, 511415343@qq.com)
 */

 define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
     // 图形依赖
    var PolygonShape = require('zrender/shape/Polygon');
     // 组件依赖
    require('../component/polar');
    
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
     * @constructor
     * @exports Radar
     */
    function Radar(ecTheme, messageCenter, zr, option, myChart) {
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);

        this.refresh(option);
    }
    
    Radar.prototype = {
        type : ecConfig.CHART_TYPE_RADAR,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            this.selectedMap = {};
            this._symbol = this.option.symbolList;
            this._queryTarget;
            this._dropBoxList = [];
            this._radarDataCounter = 0;
            
            var series = this.series;
            var legend = this.component.legend;
            var serieName;
            for (var i = 0, l = series.length; i < l ; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_RADAR) {
                    this.serie = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    serieName = this.serie.name || '';
                    // 系列图例开关
                    this.selectedMap[serieName] = 
                        legend ? legend.isSelected(serieName) : true;
                    
                    if (this.selectedMap[serieName]) {
                        this._queryTarget = [this.serie, this.option];
    
                        // 添加可拖拽提示框，多系列共用一个极坐标，第一个优先
                        if (this.deepQuery(this._queryTarget, 'calculable')) {
                            this._addDropBox(i);
                        }
                        this._buildSingleRadar(i);
                        this.buildMark(i);
                    }
                }
            }

            this.addShapeList();
        },

        /**
         * 构建数据图形
         * @param {number} 序列的index
         */
        _buildSingleRadar : function (index) {
            var legend = this.component.legend;
            var iconShape;
            var data = this.serie.data;
            var defaultColor;
            var name;
            var pointList;
            var calculable = this.deepQuery(this._queryTarget, 'calculable');
           
            for (var i = 0; i < data.length; i++) {
                name = data[i].name || '';
                
                // 图例开关
                this.selectedMap[name] = legend 
                    ? legend.isSelected(name) : true;
                if (!this.selectedMap[name]) {
                    continue;
                }
                
                 // 默认颜色策略
                if (legend) {
                    // 有图例则从图例中获取颜色定义
                    defaultColor = legend.getColor(name);
                    iconShape = legend.getItemShape(name);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        iconShape.style.brushType = this.deepQuery(
                            [data[i], this.serie], 'itemStyle.normal.areaStyle'
                        ) ? 'both' : 'stroke';
                        legend.setItemShape(name, iconShape);
                    }
                }
                else {
                    // 全局颜色定义
                    defaultColor = this.zr.getColor(i);
                }

                pointList = this._getPointList(this.serie.polarIndex, data[i]);
                // 添加拐点形状
                this._addSymbol(
                    pointList, defaultColor, i, index, this.serie.polarIndex);
                // 添加数据形状
                this._addDataShape(
                    pointList, defaultColor, data[i],
                    index, i, calculable
                );
                this._radarDataCounter++;
            }
        },

        /**
         * 获取数据的点集
         * @param {number} polarIndex
         * @param {Array<Object>} 处理的数据
         * @return {Array<Array<number>>} 点集
         */
        _getPointList : function (polarIndex, dataArr) {
            var pointList = [];
            var vector;
            var polar = this.component.polar;

            var value;
            for (var i = 0, l = dataArr.value.length; i < l; i++) {
                value = dataArr.value[i].value != null ? dataArr.value[i].value : dataArr.value[i];
                vector = value != '-' 
                         ? polar.getVector(polarIndex, i, value)
                         : false;
                if (vector) {
                    pointList.push(vector);
                } 
            }
            return pointList;
        },
        
        /**
         * 添加拐点
         * @param {Array<Array<number>>} pointList 点集
         * @param {string} defaultColor 默认填充颜色
         * @param {object} data 数据
         * @param {number} serieIndex
         */
        _addSymbol :function (pointList, defaultColor, dataIndex, seriesIndex, polarIndex) {
            var series = this.series;
            var itemShape;
            var polar = this.component.polar;

            for (var i = 0, l = pointList.length; i < l; i++) {
                itemShape = this.getSymbolShape(
                    this.deepMerge(
                        [series[seriesIndex].data[dataIndex], series[seriesIndex]]
                    ),
                    seriesIndex, 
                    series[seriesIndex].data[dataIndex].value[i], i,
                    polar.getIndicatorText(polarIndex, i),
                    pointList[i][0],    // x
                    pointList[i][1],    // y
                    this._symbol[this._radarDataCounter % this._symbol.length],
                    defaultColor,
                    '#fff',
                    'vertical'
                );
                itemShape.zlevel = this._zlevelBase + 1;
                ecData.set(itemShape, 'data', series[seriesIndex].data[dataIndex]);
                ecData.set(itemShape, 'value', series[seriesIndex].data[dataIndex].value);
                ecData.set(itemShape, 'dataIndex', dataIndex);
                ecData.set(itemShape, 'special', i);
                this.shapeList.push(itemShape);
            }
        },
        
        /**
         * 添加数据图形
         * @param {Array<Array<number>>} pointList 点集
         * @param {string} defaultColor 默认填充颜色
         * @param {object} data 数据
         * @param {number} serieIndex
         * @param {number} dataIndex
         * @param {boolean} calcalable
         */ 
        _addDataShape : function (
            pointList, defaultColor, data,
            seriesIndex, dataIndex, calculable
        ) {
            var series = this.series;
            // 多级控制
            var queryTarget = [data, this.serie];
            var nColor = this.getItemStyleColor(
                this.deepQuery(
                    queryTarget, 'itemStyle.normal.color'
                ),
                seriesIndex,
                dataIndex,
                data
            );
            var nLineWidth = this.deepQuery(
                queryTarget, 'itemStyle.normal.lineStyle.width'
            );
            var nLineType = this.deepQuery(
                queryTarget, 'itemStyle.normal.lineStyle.type'
            );
            var nAreaColor = this.deepQuery(
                queryTarget, 'itemStyle.normal.areaStyle.color'
            );
            var nIsAreaFill = this.deepQuery(
                queryTarget, 'itemStyle.normal.areaStyle'
            );
            var shape = {
                zlevel : this._zlevelBase,
                style : {
                    pointList   : pointList,
                    brushType   : nIsAreaFill ? 'both' : 'stroke',
                    color       : nAreaColor 
                                  || nColor 
                                  || (typeof defaultColor === 'string' 
                                      ? zrColor.alpha(defaultColor,0.5) : defaultColor),
                    strokeColor : nColor || defaultColor,
                    lineWidth   : nLineWidth,
                    lineType    : nLineType
                },
                highlightStyle : {
                    brushType   : this.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.areaStyle'
                                  ) || nIsAreaFill 
                                  ? 'both' : 'stroke',
                    color       : this.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.areaStyle.color'
                                  ) 
                                  || nAreaColor 
                                  || nColor 
                                  || (typeof defaultColor === 'string' 
                                      ? zrColor.alpha(defaultColor,0.5) : defaultColor),
                    strokeColor : this.getItemStyleColor(
                                       this.deepQuery(
                                           queryTarget, 'itemStyle.emphasis.color'
                                       ),
                                       seriesIndex,
                                       dataIndex,
                                       data
                                   )
                                   || nColor || defaultColor,
                    lineWidth   : this.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.lineStyle.width'
                                  ) || nLineWidth,
                    lineType    : this.deepQuery(
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
                this.component.polar.getIndicator(series[seriesIndex].polarIndex)
            );
            if (calculable) {
                shape.draggable = true;
                this.setCalculable(shape);
            }
            
            shape = new PolygonShape(shape); 
            this.shapeList.push(shape);
        },

        /**
         * 增加外围接受框
         * @param {number} serie的序列
         */
        _addDropBox : function (index) {
            var series = this.series;
            var polarIndex = this.deepQuery(
                this._queryTarget, 'polarIndex'
            );
            if (!this._dropBoxList[polarIndex]) {
                var shape = this.component.polar.getDropBox(polarIndex);
                shape.zlevel = this._zlevelBase;
                this.setCalculable(shape);
                ecData.pack(shape, series, index, undefined, -1);
                this.shapeList.push(shape);
                this._dropBoxList[polarIndex] = true;
            }
        },

        /**
         * 数据项被拖拽出去，重载基类方法
         */
        ondragend : function (param, status) {
            var series = this.series;
            if (!this.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            // 被拖拽图形元素
            var target = param.target;

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是饼图sector，删除被拖拽走的数据
            this.component.legend && this.component.legend.del(
                series[seriesIndex].data[dataIndex].name
            );

            series[seriesIndex].data.splice(dataIndex, 1);

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            this.isDragend = false;

            return;
        },

         /**
         * 数据项被拖拽进来， 重载基类方法
         */
        ondrop : function (param, status) {
            var series = this.series;
            if (!this.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var data;
            var legend = this.component.legend;
            var value;

            if (dataIndex === -1) {
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
                data.name += this.option.nameConnector
                             + ecData.get(dragged, 'name');
                value = ecData.get(dragged, 'value');
                for (var i = 0 ; i < value.length; i++) {
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
            this.isDrop = false;

            return;
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
        }
    };
    
    zrUtil.inherits(Radar, ChartBase);
    zrUtil.inherits(Radar, ComponentBase);
    
    // 图表注册
    require('../chart').define('radar', Radar);
    
    return Radar;
});