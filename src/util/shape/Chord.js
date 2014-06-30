/**
 * zrender
 *
 * @author pissang (https://github.com/pissang)
 *
 * shape类：chord
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'chord',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
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
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
 */
define(function (require) {
    var Base = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');
    var _ctx = zrUtil.getContext();
    
    function ChordShape(options) {
        Base.call(this, options);
    }

    ChordShape.prototype = {
        type : 'chord',
        
        // center, source0, source1, target0, target1, r
        buildPath : function (ctx, style) {
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
        
        getRect : function (){
            return {
                x : 0,
                y : 0,
                width : 0,
                height : 0
            };
        },
                
        isCover : function (x, y) {
            if (!_ctx.isPointInPath) {  // In ie
                return false;
            }
            var originPos = this.getTansform(x, y);
            x = originPos[0];
            y = originPos[1];
            
            _ctx.beginPath();
            ChordShape.prototype.buildPath.call(null, _ctx, this.style);
            _ctx.closePath();
            
            return _ctx.isPointInPath(x, y);
        }
    };

    zrUtil.inherits(ChordShape, Base);
    
    return ChordShape;
});