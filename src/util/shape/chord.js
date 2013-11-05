/**
 * zrender
 *
 * @author pissang (https://github.com/pissang)
 *
 * shape类：chord
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'candle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           center        : {array},
           source0       : {number},
           source1       : {number},
           target0       : {number},
           target1       : {number},
           r             : {number},
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
define(function(require) {

    var util = require('zrender/tool/util');
    function ChordShape() {
        this.type = 'chord';
    }
    var _ctx = util.getContext();

    ChordShape.prototype = {
        // center, source0, source1, target0, target1, r
        buildPath : function(ctx, style) {
            var PI2 = Math.PI * 2;
            var cx = style.center[0];
            var cy = style.center[1];
            var r = style.r;
            var s0 = style.source0 / 180 * Math.PI;
            var s1 = style.source1 / 180 * Math.PI;
            var t0 = style.target0 / 180 * Math.PI;
            var t1 = style.target1 / 180 * Math.PI;
            var sx0 = cx + Math.cos(PI2 - s0) * r;
            var sy0 = cy - Math.sin(PI2 - s0) * r;
            var sx1 = cx + Math.cos(PI2 - s1) * r;
            var sy1 = cy - Math.sin(PI2 - s1) * r;
            var tx0 = cx + Math.cos(PI2 - t0) * r;
            var ty0 = cy - Math.sin(PI2 - t0) * r;
            var tx1 = cx + Math.cos(PI2 - t1) * r;
            var ty1 = cy - Math.sin(PI2 - t1) * r;

            ctx.moveTo(sx0, sy0);
            ctx.arc(cx, cy, style.r, s0, s1, false);
            ctx.bezierCurveTo(
                (cx - sx1) * 0.70 + sx1, 
                (cy - sy1) * 0.70 + sy1,
                (cx - tx0) * 0.70 + tx0, 
                (cy - ty0) * 0.70 + ty0,
                tx0, ty0
            );
            // Chord to self
            if (style.source0 === style.target0 &&
                style.source1 === style.target1) {
                return;
            }
            ctx.arc(cx, cy, style.r, t0, t1, false);
            ctx.bezierCurveTo(
                (cx - tx1) * 0.70 + tx1, 
                (cy - ty1) * 0.70 + ty1,
                (cx - sx0) * 0.70 + sx0, 
                (cy - sy0) * 0.70 + sy0,
                sx0, sy0
            );
        },
        
        getRect : function(){
            return {
                x : 0,
                y : 0,
                width : 0,
                height : 0
            };
        },
                
        isCover : function(e, x, y) {
            if (!_ctx.isPointInPath) {  // In ie
                return false;
            }
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
            _ctx.beginPath();
            ChordShape.prototype.buildPath.call(null, _ctx, e.style);
            _ctx.closePath();
            
            return _ctx.isPointInPath(x, y);
        }
    };

    require('zrender/shape/base').derive(ChordShape);
    require('zrender/shape').define('chord', new ChordShape());

    return ChordShape;
});