/**
 * echarts组件：时间轴组件
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var Base = require('./base');
    
    // 图形依赖
    var RectangleShape = require('zrender/shape/Rectangle');
    var PolygonShape = require('zrender/shape/Polygon');
    var IconShape = require('../util/shape/Icon');
    var ChainShape = require('../util/shape/Chain');
    
    var ecConfig = require('../config');
    var zrUtil = require('zrender/tool/util');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     */
    function Timeline(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, zr, option);

        this.messageCenter = messageCenter;
        this.myChart = myChart;

        var self = this;
        self._ondrift = function (dx, dy) {
            return self.__ondrift(this, dx, dy);
        };
        self._ondragend = function () {
            return self.__ondragend();
        };
        self._setCurrentOption = function() {
            self.currentIndex %= self.options.length;
            console.log(self.currentIndex);
            var curOption = self.options[self.currentIndex];
            if (self.selectedMap) {
                curOption.legend = curOption.legend || {};
                curOption.legend.selected = self.selectedMap;
            }
            self.myChart.setOption(curOption, self.timelineOption.notMerge);
        };
        self._onFrame = function() {
            self._setCurrentOption();
            self._syncHandleShape();
            
            if (self.timelineOption.autoPlay) {
                self.playTicket = setTimeout(
                    function() {
                        self.currentIndex += 1;
                        if (!self.timelineOption.loop && self.currentIndex >= self.options.length) {
                            self.currentIndex = self.options.length - 1;
                            self.stop();
                            return;
                        }
                        self._onFrame();
                    },
                    self.timelineOption.playInterval
                );
            }
        };

        this.init(option);
    }
    
    Timeline.prototype = {
        type : ecConfig.COMPONENT_TYPE_TIMELINE,
        _buildShape : function () {
            // 位置参数，通过计算所得x, y, width, height
            this._location = this._getLocation();
            this._buildBackground();
            this._buildControl();
            this._chainPoint = this._getChainPoint();
            this._buildChain();
            this._buildHandle();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        /**
         * 根据选项计算实体的位置坐标
         */
        _getLocation : function () {
            var timelineOption = this.timelineOption;
            var padding = timelineOption.padding;
            
            // 水平布局
            var zrWidth = this.zr.getWidth();
            var x = this.parsePercent(timelineOption.x, zrWidth);
            var x2 = this.parsePercent(timelineOption.x2, zrWidth);
            var width;
            if (typeof timelineOption.width == 'undefined') {
                width = zrWidth - x - x2;
                x2 = zrWidth - x2;
            }
            else {
                width = this.parsePercent(timelineOption.width, zrWidth);
                x2 = x + width;
            }

            var zrHeight = this.zr.getHeight();
            var height = this.parsePercent(timelineOption.height, zrHeight);
            var y;
            var y2;
            if (typeof timelineOption.y != 'undefined') {
                y = this.parsePercent(timelineOption.y, zrHeight);
                y2 = y + height;
            }
            else {
                y2 = zrHeight - this.parsePercent(timelineOption.y2, zrHeight);
                y = y2 - height;
            }

            return {
                x : x + padding[3],
                y : y + padding[0],
                x2 : x2 - padding[1],
                y2 : y2 - padding[2],
                width : width - padding[1] - padding[3],
                height : height - padding[0] - padding[2]
            };
        },

        /**
         * 根据选项计算时间链条上的坐标及symbolList
         */
        _getChainPoint : function() {
            var timelineOption = this.timelineOption;
            var symbol = timelineOption.symbol.toLowerCase();
            var symbolSize = timelineOption.symbolSize;
            var data = timelineOption.data;
            var x = this._location.x;
            var width = this._location.x2 - this._location.x;
            var len = data.length;
            
            width = width / len;
            x += width / 2;
            var list = [];
            var curSymbol;
            var n;
            var isEmpty;
            for (var i = 0; i < len; i++) {
                curSymbol = (data[i].symbol && data[i].symbol.toLowerCase()) || symbol;
                if (curSymbol.match('empty')) {
                    curSymbol = curSymbol.replace('empty', '');
                    isEmpty = true;
                }
                else {
                    isEmpty = false;
                }
                if (curSymbol.match('star')) {
                    n = (curSymbol.replace('star','') - 0) || 5;
                    curSymbol = 'star';
                }
                
                list.push({
                    x : x,
                    n : n,
                    isEmpty : isEmpty,
                    symbol : curSymbol,
                    symbolSize : data[i].symbolSize || symbolSize,
                    name : data[i].name || data[i]
                });
                x += width;
            }
            return list;
        },
        
        _buildBackground : function () {
            var timelineOption = this.timelineOption;
            var padding = timelineOption.padding;
            var width = this._location.width;
            var height = this._location.height;
            
            if (timelineOption.borderWidth != 0 
                || timelineOption.backgroundColor.replace(/\s/g,'') != 'rgba(0,0,0,0)'
            ) {
                // 背景
                this.shapeList.push(new RectangleShape({
                    zlevel : this._zlevelBase,
                    hoverable :false,
                    style : {
                        x : this._location.x - padding[3],
                        y : this._location.y - padding[0],
                        width : width + padding[1] + padding[3],
                        height : height + padding[0] + padding[2],
                        brushType : timelineOption.borderWidth === 0
                                    ? 'fill' : 'both',
                        color : timelineOption.backgroundColor,
                        strokeColor : timelineOption.borderColor,
                        lineWidth : timelineOption.borderWidth
                    }
                }));
            }
        },

        _buildControl : function() {
            var self = this;
            var timelineOption = this.timelineOption;
            var lineStyle = timelineOption.lineStyle;
            if (timelineOption.controlPosition == 'none') {
                return;
            }
            var iconSize = 15;
            var iconGap = 5;
            var x;
            if (timelineOption.controlPosition == 'left') {
                x = this._location.x;
                this._location.x += (iconSize + iconGap) * 3;
            }
            else {
                x = this._location.x2 - ((iconSize + iconGap) * 3 - iconGap);
                this._location.x2 -= (iconSize + iconGap) * 3;
            }
            
            var y = this._location.y;
            var iconStyle = {
                zlevel : this._zlevelBase,
                style : {
                    iconType : 'timelineControl',
                    symbol : 'last',
                    x : x,
                    y : y,
                    width : iconSize,
                    height : iconSize,
                    brushType : 'stroke',
                    color: lineStyle.color,
                    strokeColor : lineStyle.color,
                    lineWidth : lineStyle.width
                },
                highlightStyle : {
                    color : '#1e90ff',
                    strokeColor : '#1e90ff',
                    lineWidth : lineStyle.width + 1
                },
                clickable : true
            };
            
            this._ctrLastShape = new IconShape(iconStyle);
            this._ctrLastShape.onclick = function() {
                self.last();
            };
            this.shapeList.push(this._ctrLastShape);
            
            x += iconSize + iconGap;
            this._ctrPlayShape = new IconShape(zrUtil.clone(iconStyle));
            this._ctrPlayShape.style.brushType = 'fill';
            this._ctrPlayShape.style.symbol = 'play';
            this._ctrPlayShape.style.status = this.timelineOption.autoPlay ? 'playing' : 'stop';
            this._ctrPlayShape.style.x = x;
            this._ctrPlayShape.onclick = function() {
                if (self._ctrPlayShape.style.status == 'stop') {
                    self.play();
                }
                else {
                    self.stop();
                }
            };
            this.shapeList.push(this._ctrPlayShape);
            
            x += iconSize + iconGap;
            this._ctrNextShape = new IconShape(zrUtil.clone(iconStyle));
            this._ctrNextShape.style.symbol = 'next';
            this._ctrNextShape.style.x = x;
            this._ctrNextShape.onclick = function() {
                self.next();
            };
            this.shapeList.push(this._ctrNextShape);
        },
        
        /**
         * 构建时间轴
         */
        _buildChain : function () {
            var timelineOption = this.timelineOption;
            var lineStyle = timelineOption.lineStyle;
            this._timelineShae = {
                zlevel : this._zlevelBase,
                style : {
                    x : this._location.x,
                    y : this.subPixelOptimize(this._location.y, lineStyle.width),
                    width : this._location.x2 - this._location.x,
                    height : this._location.height / 2,
                    chainPoint : this._chainPoint,
                    brushType:'both',
                    strokeColor : lineStyle.color,
                    lineWidth : lineStyle.width,
                    lineType : lineStyle.type
                }
            };

            this._timelineShae = new ChainShape(this._timelineShae);
            this.shapeList.push(this._timelineShae);
        },

        /**
         * 构建拖拽手柄
         */
        _buildHandle : function () {
            var timelineOption = this.timelineOption;
            var data = timelineOption.data;
            var lineStyle = timelineOption.lineStyle;
            var curPoint = this._chainPoint[this.currentIndex];
            var symbolSize = curPoint.symbolSize + 1;
            this._handleShape = {
                zlevel : this._zlevelBase,
                draggable : true,
                style : {
                    iconType: curPoint.symbol,
                    x : curPoint.x - symbolSize,
                    y : this._location.y + this._location.height / 4 - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType:'fill',
                    color : '#1e90ff',
                    text : curPoint.name,
                    textPosition : 'specific',
                    textX : curPoint.x,
                    textY : this._location.y + this._location.height / 4 * 3,
                    textAlign : 'center',
                    textBaseline : 'middle'
                },
                highlightStyle : {
                    strokeColor : '#1e90ff',
                    lineWidth : lineStyle.width,
                },
                ondrift : this._ondrift,
                ondragend : this._ondragend
            };
            
            this._handleShape = new IconShape(this._handleShape);
            this.shapeList.push(this._handleShape);
        },
        
        _syncHandleShape : function() {
            var curPoint = this._chainPoint[this.currentIndex];
            var symbolSize = curPoint.symbolSize + 1;
            this._handleShape.style.iconType = curPoint.symbol;
            this._handleShape.style.text = curPoint.name;
            this._handleShape.style.n = curPoint.n;
            this.zr.animate(this._handleShape.id, 'style')
                .when(
                    500,
                    {
                        x : curPoint.x - symbolSize,
                        textX : curPoint.x,
                        y : this._location.y + this._location.height / 4 - symbolSize,
                        width : symbolSize * 2,
                        height : symbolSize * 2
                    }
                )
                .start('ExponentialOut');
        },

        /**
         * 拖拽范围控制
         */
        __ondrift : function (shape, dx, dy) {
            var chainPoint = this._chainPoint;
            var len = chainPoint.length;
            var newIndex;
            if (shape.style.x + dx <= chainPoint[0].x) {
                shape.style.x = chainPoint[0].x;
                newIndex = 0;
            }
            else if (shape.style.x + dx >= chainPoint[len - 1].x) {
                shape.style.x = chainPoint[len - 1].x;
                newIndex = len - 1;
            }
            else {
                shape.style.x += dx;
                for (var i = 0; i < len - 1; i++) {
                    if (shape.style.x > chainPoint[i].x && shape.style.x < chainPoint[i + 1].x) {
                        // catch you！
                        newIndex = (Math.abs(shape.style.x - chainPoint[i].x)
                                   < Math.abs(shape.style.x - chainPoint[i + 1].x))
                                   ? i : (i + 1);
                        break;
                    }
                }
            }
            var curPoint = chainPoint[newIndex];
            var symbolSize = curPoint.symbolSize + 1;
            shape.style.iconType = curPoint.symbol;
            shape.style.n = curPoint.n;
            shape.style.textX = shape.style.x + shape.style.width / 2;
            shape.style.y = this._location.y + this._location.height / 4 - symbolSize;
            shape.style.width = symbolSize * 2;
            shape.style.height = symbolSize * 2;
            shape.style.text = curPoint.name;
            
            //console.log(newIndex)
            if (newIndex == this.currentIndex) {
                return true; // 啥事都没发生
            }
            
            this.currentIndex = newIndex;
            this.timelineOption.autoPlay && this.stop(); // 停止自动播放
            if (!this.timelineOption.realtime) {
                this._setCurrentOption();
            }
            else {
                var self = this;
                this.playTicket = setTimeout(function() {
                    self._setCurrentOption();
                },200);
            }

            return true;
        },
        
        __ondragend : function () {
            this.isDragend = true;
        },
        
        /**
         * 数据项被拖拽出去
         */
        ondragend : function (param, status) {
            if (!this.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            if (!this._isSilence && !this.timelineOption.realtime) {
                this.messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: this._zoom}
                );
            }
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            this.isDragend = false;
            this._syncHandleShape();
            return;
        },

        /**
         * 图例选择
         */
        onlegendSelected : function (param, status) {
            this.selectedMap = zrUtil.clone(param.selected);
        },
        
        last : function () {
            console.log('last');
            this.timelineOption.autoPlay && this.stop(); // 停止自动播放
            
            this.currentIndex -= 1;
            if (this.currentIndex < 0) {
                this.currentIndex = this.options.length - 1;
            }
            this._onFrame();
        },
        
        next : function () {
            console.log('next');
            this.timelineOption.autoPlay && this.stop(); // 停止自动播放
            
            this.currentIndex += 1;
            if (this.currentIndex >= this.options.length) {
                this.currentIndex = 0;
            }
            this._onFrame();
        },
        
        play : function (startIdx, autoPlay) {
            console.log('play');
            
            if (this._ctrPlayShape && this._ctrPlayShape.style.status != 'playing') {
                this._ctrPlayShape.style.status = 'playing';
                this.zr.modShape(this._ctrPlayShape.id);
                this.zr.refresh();
            }
            
            this.timelineOption.autoPlay = true;
            
            this.currentIndex += 1;
            if (this.currentIndex >= this.options.length) {
                this.currentIndex = 0;
            }
            this._onFrame();
        },
        
        stop : function () {
            console.log('stop');
            
            if (this._ctrPlayShape && this._ctrPlayShape.style.status != 'stop') {
                this._ctrPlayShape.style.status = 'stop';
                this.zr.modShape(this._ctrPlayShape.id);
                this.zr.refresh();
            }
            
            this.timelineOption.autoPlay = false;
            
            clearTimeout(this.playTicket);
        },
        
        init : function (newOption) {
            this.option = newOption || this.option;
            this.timelineOption = this.option.timeline = this.reformOption(this.option.timeline);
            // 补全padding属性
            this.timelineOption.padding = this.reformCssArray(
                this.timelineOption.padding
            );
                
            this.options = this.option.options;
            this.currentIndex = this.timelineOption.currentIndex % this.options.length;
            
            /*
            if (!this.timelineOption.notMerge) {
                for (var i = 1, l = this.options.length; i < l; i++) {
                    this.options[i] = zrUtil.merge(
                        this.options[i], this.options[i - 1]
                    );
                }
            }
            */
            
            if (this.timelineOption.show) {
                this._buildShape();
            }
            
            this.myChart.setOption(this.options[this.currentIndex], this.timelineOption.notMerge);
            
            if (this.timelineOption.autoPlay) {
                var self = this;
                this.playTicket = setTimeout(
                    function() {
                        self.play();
                    },
                    this.ecTheme.animationDuration
                );
            }
            
            this.selectedMap = false;
        },
        
        /**
         * 避免dataZoom带来两次refresh，不设refresh接口，resize重复一下buildshape逻辑 
         */
        resize : function () {
            if (this.timelineOption.show) {
                this.clear();
                this._buildShape();
            }
        },
        
        /**
         * 释放后实例不可用，重载基类方法
         */
        dispose : function () {
            this.clear();
            this.shapeList = null;
            
            clearTimeout(this.playTicket);
        }
    };
    
    function timelineControl(ctx, style) {
        var lineWidth = style.lineWidth;
        var x = style.x + lineWidth;
        var y = style.y + lineWidth + 2;
        var width = style.width - lineWidth;
        var height = style.height - lineWidth;
        
        
        var symbol = style.symbol;
        if (symbol == 'last') {
            ctx.moveTo(x + width - 2, y + height / 3);
            ctx.lineTo(x + width - 2, y);
            ctx.lineTo(x + 2, y + height / 2);
            ctx.lineTo(x + width - 2, y + height);
            ctx.lineTo(x + width - 2, y + height / 3 * 2);
            ctx.moveTo(x, y);
        } 
        else if (symbol == 'next') {
            ctx.moveTo(x + 2, y + height / 3);
            ctx.lineTo(x + 2, y);
            ctx.lineTo(x + width - 2, y + height / 2);
            ctx.lineTo(x + 2, y + height);
            ctx.lineTo(x + 2, y + height / 3 * 2);
            ctx.moveTo(x, y);
        }
        else if (symbol == 'play') {
            if (style.status == 'stop') {
                ctx.moveTo(x + 2, y);
                ctx.lineTo(x + width - 2, y + height / 2);
                ctx.lineTo(x + 2, y + height);
                ctx.lineTo(x + 2, y);
            }
            else {
                var delta = style.brushType == 'both' ? 2 : 3;
                ctx.rect(x + 2, y, delta, height);
                ctx.rect(x + width - delta - 2, y, delta, height);
            }
        }
        else if (symbol.match('image')) {
            var imageLocation = '';
            imageLocation = symbol.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
            symbol = IconShape.prototype.iconLibrary.image;
            symbol(ctx, {
                x : x,
                y : y,
                width : width,
                height : height,
                image : imageLocation
            });
        }
    }
    IconShape.prototype.iconLibrary['timelineControl'] = timelineControl;
    
    zrUtil.inherits(Timeline, Base);
    
    require('../component').define('timeline', Timeline);
    
    return Timeline;
});