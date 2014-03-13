/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function(require) {
    function Base(zr, option){
        var ecData = require('../util/ecData');
        var accMath = require('../util/accMath');

        var zrUtil = require('zrender/tool/util');
        var self = this;

        self.selectedMap = {};

        self.shapeHandler = {
            onclick : function() {
                self.isClick = true;
            },
            ondragover : function (param) {
                // 返回触发可计算特性的图形提示
                var calculableShape = zrUtil.clone(param.target);
                calculableShape.highlightStyle = {
                    text : '',
                    r : calculableShape.style.r + 5,
                    brushType : 'stroke',
                    strokeColor : option.calculableColor,//self.zr.getCalculableColor(),
                    lineWidth : (calculableShape.style.lineWidth || 1) + 12
                };
                self.zr.addHoverShape(calculableShape);
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
        };

        function setCalculable(shape) {
            shape.dragEnableTime = option.DRAG_ENABLE_TIME;
            shape.ondragover = self.shapeHandler.ondragover;
            shape.ondragend = self.shapeHandler.ondragend;
            shape.ondrop = self.shapeHandler.ondrop;
            return shape;
        }

        /**
         * 数据项被拖拽进来
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

            // 落到数据item上，数据被拖拽到某个数据项上，数据修改
            var data = option.series[seriesIndex].data[dataIndex] || '-';
            if (data.value) {
                if (data.value != '-') {
                    option.series[seriesIndex].data[dataIndex].value = 
                        accMath.accAdd(
                            option.series[seriesIndex].data[dataIndex].value,
                            ecData.get(dragged, 'value')
                        );
                }
                else {
                    option.series[seriesIndex].data[dataIndex].value =
                        ecData.get(dragged, 'value');
                }
            }
            else {
                if (data != '-') {
                    option.series[seriesIndex].data[dataIndex] = 
                        accMath.accAdd(
                            option.series[seriesIndex].data[dataIndex],
                            ecData.get(dragged, 'value')
                        );
                }
                else {
                    option.series[seriesIndex].data[dataIndex] =
                        ecData.get(dragged, 'value');
                }
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 数据项被拖拽出去
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是折线图bar，删除被拖拽走的数据
            option.series[seriesIndex].data[dataIndex] = '-';

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        /**
         * 图例选择
         */
        function onlegendSelected(param, status) {
            var legendSelected = param.selected;
            for (var itemName in self.selectedMap) {
                if (self.selectedMap[itemName] != legendSelected[itemName]) {
                    // 有一项不一致都需要重绘
                    status.needRefresh = true;
                }
                self.selectedMap[itemName] = legendSelected[itemName];
            }
            return;
        }

        /**
         * 基类方法
         */
        self.setCalculable = setCalculable;
        self.ondrop = ondrop;
        self.ondragend = ondragend;
        self.onlegendSelected = onlegendSelected;
    }

    return Base;
});
