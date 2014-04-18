/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：蜡烛
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'candle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，横坐标
           y             : {Array},   // 必须，纵坐标数组
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
       shape  : 'candle',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : [100,123,90,125],
           width : 150,
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
        var Base = require('zrender/shape/Base');
        var matrix = require('zrender/tool/matrix');

        function Candle(options) {
            Base.call(this, options);
        }
        
        Candle.prototype =  {
            type: 'candle',
            _numberOrder : function(a, b) {
                return b - a;
            },
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                style.y.sort(this._numberOrder);
                
                ctx.moveTo(style.x, style.y[3]);
                ctx.lineTo(style.x, style.y[2]);
                ctx.moveTo(style.x - style.width / 2, style.y[2]);
                ctx.rect(
                    style.x - style.width / 2,
                    style.y[2],
                    style.width,
                    style.y[1] - style.y[2]
                );
                ctx.moveTo(style.x, style.y[1]);
                ctx.lineTo(style.x, style.y[0]);
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - style.width / 2 - lineWidth / 2),
                    y : Math.round(style.y[3] - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.y[0] - style.y[3] + lineWidth
                };
                return style.__rect;
            },
            
            
            isCover : function(x, y) {
                //对鼠标的坐标也做相同的变换
                if(this.needTransform && this._transform){
                    var inverseMatrix = [];
                    matrix.invert(inverseMatrix, this._transform);

                    var originPos = [x, y];
                    matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的__needTransform不准确
                        this.updateNeedTransform();
                    }

                    x = originPos[0];
                    y = originPos[1];
                }

                // 快速预判并保留判断矩形
                var rect = this.style.__rect;
                if (!rect) {
                    rect = this.style.__rect = this.getRect(this.style);
                }
                if (x >= rect.x
                    && x <= (rect.x + rect.width)
                    && y >= rect.y
                    && y <= (rect.y + rect.height)
                ) {
                    // 矩形内
                    return true;
                }
                
                return false;
            }
        };

        require('zrender/tool/util').inherits(Candle, Base);
        return Candle;
    }
);