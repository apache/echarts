/**
 * echarts组件：孤岛数据
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表选项
     */
    function Island(ecConfig, messageCenter, zr) {
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, ecConfig, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, ecConfig);
                
        var ecData = require('../util/ecData');

        var zrEvent = require('zrender/tool/event');

        var self = this;
        self.type = ecConfig.CHART_TYPE_ISLAND;
        var option;

        var _zlevelBase = self.getZlevelBase();
        var _nameConnector;
        var _valueConnector;
        var _zrHeight = zr.getHeight();
        var _zrWidth = zr.getWidth();

        /**
         * 孤岛合并
         *
         * @param {string} tarShapeIndex 目标索引
         * @param {Object} srcShape 源目标，合入目标后删除
         */
        function _combine(tarShape, srcShape) {
            var zrColor = require('zrender/tool/color');
            var accMath = require('../util/accMath');
            var value = accMath.accAdd(
                            ecData.get(tarShape, 'value'),
                            ecData.get(srcShape, 'value')
                        );
            var name = ecData.get(tarShape, 'name')
                       + _nameConnector
                       + ecData.get(srcShape, 'name');

            tarShape.style.text = name + _valueConnector + value;

            ecData.set(tarShape, 'value', value);
            ecData.set(tarShape, 'name', name);
            tarShape.style.r = option.island.r;
            tarShape.style.color = zrColor.mix(
                tarShape.style.color,
                srcShape.style.color
            );
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                newOption.island = self.reformOption(newOption.island);
                option = newOption;
    
                _nameConnector = option.nameConnector;
                _valueConnector = option.valueConnector;
            }
        }
        
        function render(newOption) {
            refresh(newOption);

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                zr.addShape(self.shapeList[i]);
            }
        }
        
        function getOption() {
            return option;
        }

        function resize() {
            var newWidth = zr.getWidth();
            var newHieght = zr.getHeight();
            var xScale = newWidth / (_zrWidth || newWidth);
            var yScale = newHieght / (_zrHeight || newHieght);
            if (xScale == 1 && yScale == 1) {
                return;
            }
            _zrWidth = newWidth;
            _zrHeight = newHieght;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                zr.modShape(
                    self.shapeList[i].id,
                    {
                        style: {
                            x: Math.round(self.shapeList[i].style.x * xScale),
                            y: Math.round(self.shapeList[i].style.y * yScale)
                        }
                    },
                    true
                );
            }
        }

        function add(shape) {
            var name = ecData.get(shape, 'name');
            var value = ecData.get(shape, 'value');
            var seriesName = typeof ecData.get(shape, 'series') != 'undefined'
                             ? ecData.get(shape, 'series').name
                             : '';
            var font = self.getFont(option.island.textStyle);
            var islandShape = {
                shape : 'circle',
                id : zr.newShapeId(self.type),
                zlevel : _zlevelBase,
                style : {
                    x : shape.style.x,
                    y : shape.style.y,
                    r : option.island.r,
                    color : shape.style.color || shape.style.strokeColor,
                    text : name + _valueConnector + value,
                    textFont : font
                },
                draggable : true,
                hoverable : true,
                onmousewheel : self.shapeHandler.onmousewheel,
                _type : 'island'
            };
            if (islandShape.style.color == '#fff') {
                islandShape.style.color = shape.style.strokeColor;
            }
            self.setCalculable(islandShape);
            islandShape.dragEnableTime = 0;
            ecData.pack(
                islandShape,
                {name:seriesName}, -1,
                value, -1,
                name
            );
            self.shapeList.push(islandShape);
            zr.addShape(islandShape);
        }

        function del(shape) {
            zr.delShape(shape.id);
            var newShapeList = [];
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].id != shape.id) {
                    newShapeList.push(self.shapeList[i]);
                }
            }
            self.shapeList = newShapeList;
        }

        /**
         * 数据项被拖拽进来， 重载基类方法
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            // 拖拽产生孤岛数据合并
            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            _combine(target, dragged);
            zr.modShape(target.id, target);

            status.dragIn = true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 数据项被拖拽出去， 重载基类方法
         */
        function ondragend(param, status) {
            var target = param.target;      // 拖拽安放目标
            if (!self.isDragend) {
                // 拖拽的不是孤岛数据，如果没有图表接受孤岛数据，需要新增孤岛数据
                if (!status.dragIn) {
                    target.style.x = zrEvent.getX(param.event);
                    target.style.y = zrEvent.getY(param.event);
                    add(target);
                    status.needRefresh = true;
                }
            }
            else {
                // 拖拽的是孤岛数据，如果有图表接受了孤岛数据，需要删除孤岛数据
                if (status.dragIn) {
                    del(target);
                    status.needRefresh = true;
                }
            }

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        /**
         * 滚轮改变孤岛数据值
         */
        self.shapeHandler.onmousewheel = function(param) {
            var shape = param.target;

            var event = param.event;
            var delta = zrEvent.getDelta(event);
            delta = delta > 0 ? (-1) : 1;
            shape.style.r -= delta;
            shape.style.r = shape.style.r < 5 ? 5 : shape.style.r;

            var value = ecData.get(shape, 'value');
            var dvalue = value * option.island.calculateStep;
            if (dvalue > 1) {
                value = Math.round(value - dvalue * delta);
            }
            else {
                value = (value - dvalue * delta).toFixed(2) - 0;
            }

            var name = ecData.get(shape, 'name');
            shape.style.text = name + ':' + value;

            ecData.set(shape, 'value', value);
            ecData.set(shape, 'name', name);

            zr.modShape(shape.id, shape);
            zr.refresh();
            zrEvent.stop(event);
        };

        self.refresh = refresh;
        self.render = render;
        self.resize = resize;
        self.getOption = getOption;
        self.add = add;
        self.del = del;
        self.ondrop = ondrop;
        self.ondragend = ondragend;
    }

    // 图表注册
    require('../chart').define('island', Island);
    
    return Island;
});