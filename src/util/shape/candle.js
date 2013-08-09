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
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，横坐标
           y             : {Array},   // 必须，纵坐标数组
           width         : {number},  // 必须，宽度
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
        var matrix = require('zrender/tool/matrix');
        
        function Candle() {
            this.type = 'candle';
        }

        Candle.prototype =  {
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
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.width / 2 - lineWidth / 2),
                    y : Math.round(style.y[3] - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.y[0] - style.y[3] + lineWidth
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
            }
        };

        require('zrender/shape/base').derive(Candle);
        require('zrender/shape').define('candle', new Candle());
        
        return Candle;
    }
);