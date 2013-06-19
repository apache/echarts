/**
 * echarts扩展zrender shape
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：icon
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'icon',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，左上角横坐标
           y             : {number},  // 必须，左上角纵坐标
           width         : {number},  // 必须，宽度
           height        : {number},  // 必须，高度
           iconType      : {string},  // 必须，icon类型
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'icon',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           width : 150,
           height : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    function(require) {
        var matrix = require('zrender/tool/matrix');
        
        function Icon() {
            this.type = 'icon';
            this.brushTypeOnly = 'stroke';
            this._iconLibrary = {
                mark : _iconMark,
                markUndo : _iconMarkUndo,
                markClear : _iconMarkClear,
                refresh : _iconRefresh,
                lineChart : _iconLineChart,
                barChart : _iconBarChart,
                dataView : _iconDataView
            };
        }

        function _iconMark(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;
            ctx.moveTo(style.x,                 style.y + style.height);
            ctx.lineTo(style.x + 5 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 3 * dy);
            ctx.lineTo(style.x + 13 * dx,       style.y);
            ctx.lineTo(style.x + 2 * dx,        style.y + 11 * dy);
            ctx.lineTo(style.x,                 style.y + style.height);

            ctx.moveTo(style.x + 6 * dx,        style.y + 10 * dy);
            ctx.lineTo(style.x + 14 * dx,       style.y + 2 * dy);

            ctx.moveTo(style.x + 10 * dx,       style.y + 13 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 13 * dy);

            ctx.moveTo(style.x + 13 * dx,       style.y + 10 * dy);
            ctx.lineTo(style.x + 13 * dx,       style.y + style.height);
        }

        function _iconMarkUndo(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;
            ctx.moveTo(style.x,                 style.y + style.height);
            ctx.lineTo(style.x + 5 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 3 * dy);
            ctx.lineTo(style.x + 13 * dx,       style.y);
            ctx.lineTo(style.x + 2 * dx,        style.y + 11 * dy);
            ctx.lineTo(style.x,                 style.y + style.height);

            ctx.moveTo(style.x + 6 * dx,        style.y + 10 * dy);
            ctx.lineTo(style.x + 14 * dx,       style.y + 2 * dy);

            ctx.moveTo(style.x + 10 * dx,       style.y + 13 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 13 * dy);
        }

        function _iconMarkClear(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x + 4 * dx,        style.y + 15 * dy);
            ctx.lineTo(style.x + 9 * dx,        style.y + 13 * dy);
            ctx.lineTo(style.x + 14 * dx,       style.y + 8 * dy);
            ctx.lineTo(style.x + 11 * dx,       style.y + 5 * dy);
            ctx.lineTo(style.x + 6 * dx,        style.y + 10 * dy);
            ctx.lineTo(style.x + 4 * dx,        style.y + 15 * dy);

            ctx.moveTo(style.x + 5 * dx,        style.y);
            ctx.lineTo(style.x + 11 * dx,        style.y);
            ctx.moveTo(style.x + 5 * dx,        style.y + dy);
            ctx.lineTo(style.x + 11 * dx,        style.y + dy);
            ctx.moveTo(style.x,        style.y + 2 * dy);
            ctx.lineTo(style.x + style.width,        style.y + 2 * dy);

            ctx.moveTo(style.x,        style.y + 5 * dy);
            ctx.lineTo(style.x + 3 * dx,        style.y + style.height);
            ctx.lineTo(style.x + 13 * dx,        style.y + style.height);
            ctx.lineTo(style.x + style.width,        style.y + 5 * dy);
        }

        function _iconRefresh(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;
            var r = style.width / 2;

            ctx.arc(style.x + r, style.y + r, r - dx, 0, Math.PI * 2 / 3);
            ctx.moveTo(style.x + 3 * dx,        style.y + style.height);
            ctx.lineTo(style.x + 0 * dx,        style.y + 12 * dy);
            ctx.lineTo(style.x + 5 * dx,        style.y + 11 * dy);

            ctx.moveTo(style.x, style.y + 8 * dy);
            ctx.arc(style.x + r, style.y + r, r - dx, Math.PI, Math.PI * 5 / 3);
            ctx.moveTo(style.x + 13 * dx,       style.y);
            ctx.lineTo(style.x + style.width,   style.y + 4 * dy);
            ctx.lineTo(style.x + 11 * dx,       style.y + 5 * dy);
        }

        function _iconLineChart(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x, style.y);
            ctx.lineTo(style.x, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + style.height);

            ctx.moveTo(style.x + 2 * dx,    style.y + 14 * dy);
            ctx.lineTo(style.x + 7 * dx,    style.y + 6 * dy);
            ctx.lineTo(style.x + 11 * dx,   style.y + 11 * dy);
            ctx.lineTo(style.x + 15 * dx,   style.y + 2 * dy);
        }

        function _iconBarChart(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x, style.y);
            ctx.lineTo(style.x, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + style.height);

            ctx.moveTo(style.x + 3 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + 3 * dx,        style.y + 6 * dy);
            ctx.lineTo(style.x + 4 * dx,        style.y + 6 * dy);
            ctx.lineTo(style.x + 4 * dx,        style.y + 14 * dy);
            ctx.moveTo(style.x + 7 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + 7 * dx,        style.y + 2 * dy);
            ctx.lineTo(style.x + 8 * dx,        style.y + 2 * dy);
            ctx.lineTo(style.x + 8 * dx,        style.y + 14 * dy);
            ctx.moveTo(style.x + 11 * dx,       style.y + 14 * dy);
            ctx.lineTo(style.x + 11 * dx,       style.y + 9 * dy);
            ctx.lineTo(style.x + 12 * dx,       style.y + 9 * dy);
            ctx.lineTo(style.x + 12 * dx,       style.y + 14 * dy);
        }

        function _iconDataView(ctx, style) {
            var dx = style.width / 16;

            ctx.moveTo(style.x + dx, style.y);
            ctx.lineTo(style.x + dx, style.y + style.height);
            ctx.lineTo(style.x + 15 * dx, style.y + style.height);
            ctx.lineTo(style.x + 15 * dx, style.y);
            ctx.lineTo(style.x + dx, style.y);

            ctx.moveTo(style.x + 3 * dx, style.y + 3 * dx);
            ctx.lineTo(style.x + 13 * dx, style.y + 3 * dx);

            ctx.moveTo(style.x + 3 * dx, style.y + 6 * dx);
            ctx.lineTo(style.x + 13 * dx, style.y + 6 * dx);

            ctx.moveTo(style.x + 3 * dx, style.y + 9 * dx);
            ctx.lineTo(style.x + 13 * dx, style.y + 9 * dx);

            ctx.moveTo(style.x + 3 * dx, style.y + 12 * dx);
            ctx.lineTo(style.x + 9 * dx, style.y + 12 * dx);

        }

        Icon.prototype =  {
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if (this._iconLibrary[style.iconType]) {
                    this._iconLibrary[style.iconType](ctx, style);
                }
                else {
                    ctx.moveTo(style.x, style.y);
                    ctx.lineTo(style.x + style.width, style.y);
                    ctx.lineTo(style.x + style.width, style.y + style.height);
                    ctx.lineTo(style.x, style.y + style.height);
                    ctx.lineTo(style.x, style.y);
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                return {
                    x : Math.round(style.x),
                    y : Math.round(style.y),
                    width : style.width,
                    height : style.height
                };
            },

            isCover : function(e, x, y) {
                //对鼠标的坐标也做相同的变换
                if(e.__needTransform && e._transform){
                    var inverseMatrix = [];
                    matrix.invert(inverseMatrix, e._transform);

                    var originPos = [x, y];
                    matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的__needTransform不准确
                        if (Math.abs(e.rotation[0]) > 0.0001
                            || Math.abs(e.position[0]) > 0.0001
                            || Math.abs(e.position[1]) > 0.0001
                            || Math.abs(e.scale[0] - 1) > 0.0001
                            || Math.abs(e.scale[1] - 1) > 0.0001
                        ) {
                            e.__needTransform = true;
                        } else {
                            e.__needTransform = false;
                        }
                    }

                    x = originPos[0];
                    y = originPos[1];
                }

                // 快速预判并保留判断矩形
                var rect;
                if (e.style.__rect) {
                    rect = e.style.__rect;
                }
                else {
                    rect = this.getRect(e.style);
                    rect = [
                        rect.x,
                        rect.x + rect.width,
                        rect.y,
                        rect.y + rect.height
                    ];
                    e.style.__rect = rect;
                }
                if (x >= rect[0]
                    && x <= rect[1]
                    && y >= rect[2]
                    && y <= rect[3]
                ) {
                    // 矩形内
                    return true;
                }
                else {
                    return false;
                }
            },

            define : function(iconType, pathMethod) {
                _iconLibrary[iconType] = pathMethod;
            },

            get : function(iconType) {
                return _iconLibrary[iconType];
            }
        };

        require('zrender/shape/base').derive(Icon);
        require('zrender/shape').define('icon', new Icon());
            
        return Icon;
    }
);