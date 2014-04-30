/**
 * echarts可计算特性基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ecData = require('../util/ecData');
    var accMath = require('../util/accMath');
    var zrUtil = require('zrender/tool/util');
    
    function Base(){
        var self = this;
        this.selectedMap = {};
        this.shapeHandler = {
            onclick : function () {
                self.isClick = true;
            },
            
            ondragover : function (param) {
                // 返回触发可计算特性的图形提示
                var calculableShape = param.target;
                calculableShape.highlightStyle = calculableShape.highlightStyle || {};
                
                // 备份特此特性
                var highlightStyle = calculableShape.highlightStyle;
                var brushType = highlightStyle.brushTyep;
                var strokeColor = highlightStyle.strokeColor;
                var lineWidth = highlightStyle.lineWidth;
                
                highlightStyle.brushType = 'stroke';
                highlightStyle.strokeColor = self.ecTheme.calculableColor;
                highlightStyle.lineWidth = calculableShape.type == 'icon' ? 30 : 10;
                
                self.zr.addHoverShape(calculableShape);
                
                setTimeout(function (){
                    // 复位
                    if (calculableShape.highlightStyle) {
                        calculableShape.highlightStyle.brushType = brushType;
                        calculableShape.highlightStyle.strokeColor = strokeColor;
                        calculableShape.highlightStyle.lineWidth = lineWidth;
                    }
                },20);
            },
            
            ondrop : function (param) {
                // 排除一些非数据的拖拽进入
                if (typeof ecData.get(param.dragged, 'data') != 'undefined') {
                    self.isDrop = true;
                }
            },
            
            ondragend : function () {
                self.isDragend = true;
            }
        }
    }
    
    /**
     * 基类方法
     */
    Base.prototype = {
        /**
         * 图形拖拽特性 
         */
        setCalculable : function (shape) {
            shape.dragEnableTime = this.ecTheme.DRAG_ENABLE_TIME;
            shape.ondragover = this.shapeHandler.ondragover;
            shape.ondragend = this.shapeHandler.ondragend;
            shape.ondrop = this.shapeHandler.ondrop;
            return shape;
        },

        /**
         * 数据项被拖拽进来
         */
        ondrop : function (param, status) {
            if (!this.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 落到数据item上，数据被拖拽到某个数据项上，数据修改
            var data = this.option.series[seriesIndex].data[dataIndex] || '-';
            if (data.value) {
                if (data.value != '-') {
                    this.option.series[seriesIndex].data[dataIndex].value = 
                        accMath.accAdd(
                            this.option.series[seriesIndex].data[dataIndex].value,
                            ecData.get(dragged, 'value')
                        );
                }
                else {
                    this.option.series[seriesIndex].data[dataIndex].value =
                        ecData.get(dragged, 'value');
                }
            }
            else {
                if (data != '-') {
                    this.option.series[seriesIndex].data[dataIndex] = 
                        accMath.accAdd(
                            this.option.series[seriesIndex].data[dataIndex],
                            ecData.get(dragged, 'value')
                        );
                }
                else {
                    this.option.series[seriesIndex].data[dataIndex] =
                        ecData.get(dragged, 'value');
                }
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            this.isDrop = false;

            return;
        },

        /**
         * 数据项被拖拽出去
         */
        ondragend : function (param, status) {
            if (!this.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是折线图bar，删除被拖拽走的数据
            this.option.series[seriesIndex].data[dataIndex] = '-';

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            this.isDragend = false;

            return;
        },

        /**
         * 图例选择
         */
        onlegendSelected : function (param, status) {
            var legendSelected = param.selected;
            for (var itemName in this.selectedMap) {
                if (this.selectedMap[itemName] != legendSelected[itemName]) {
                    // 有一项不一致都需要重绘
                    status.needRefresh = true;
                }
                this.selectedMap[itemName] = legendSelected[itemName];
            }
            return;
        }
    }

    return Base;
});
