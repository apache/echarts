/**
 * @module echarts/util/shape/Ribbon
 * @author pissang (https://github.com/pissang)
 */
/**
 * @typedef {Object} IRibbonStyle
 * @property {number} x
 * @property {number} y
 * @property {number} source0
 * @property {number} source1
 * @property {number} target0
 * @property {number} target1
 * @property {number} r
 * @property {boolean} clockWise
 * @property {string} [brushType='fill']
 * @property {string} [color='#000000'] 填充颜色
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */
define(function (require) {
    var Base = require('zrender/shape/Base');
    var PathProxy = require('zrender/shape/util/PathProxy');
    var zrUtil = require('zrender/tool/util');
    var area = require('zrender/tool/area');

    // var _ctx = zrUtil.getContext();
    
    function RibbonShape(options) {
        Base.call(this, options);

        this._pathProxy = new PathProxy();
    }

    RibbonShape.prototype = {
        
        type : 'ribbon',
        
        buildPath : function (ctx, style) {

            var clockWise = style.clockWise || false;

            var path = this._pathProxy;
            path.begin(ctx);

            var cx = style.x;
            var cy = style.y;
            var r = style.r;
            var s0 = style.source0 / 180 * Math.PI;
            var s1 = style.source1 / 180 * Math.PI;
            var t0 = style.target0 / 180 * Math.PI;
            var t1 = style.target1 / 180 * Math.PI;
            var sx0 = cx + Math.cos(s0) * r;
            var sy0 = cy + Math.sin(s0) * r;
            var sx1 = cx + Math.cos(s1) * r;
            var sy1 = cy + Math.sin(s1) * r;
            var tx0 = cx + Math.cos(t0) * r;
            var ty0 = cy + Math.sin(t0) * r;
            var tx1 = cx + Math.cos(t1) * r;
            var ty1 = cy + Math.sin(t1) * r;

            path.moveTo(sx0, sy0);
            path.arc(cx, cy, style.r, s0, s1, !clockWise);
            path.bezierCurveTo(
                (cx - sx1) * 0.70 + sx1, 
                (cy - sy1) * 0.70 + sy1,
                (cx - tx0) * 0.70 + tx0, 
                (cy - ty0) * 0.70 + ty0,
                tx0, ty0
            );
            // Chord to self
            if (style.source0 === style.target0
                && style.source1 === style.target1
            ) {
                return;
            }
            path.arc(cx, cy, style.r, t0, t1, !clockWise);
            path.bezierCurveTo(
                (cx - tx1) * 0.70 + tx1,
                (cy - ty1) * 0.70 + ty1,
                (cx - sx0) * 0.70 + sx0, 
                (cy - sy0) * 0.70 + sy0,
                sx0, sy0
            );
        },
        
        getRect : function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            if (!this._pathProxy.isEmpty()) {
                this.buildPath(null, style);
            }
            return this._pathProxy.fastBoundingRect();
        },

        isCover : function (x, y) {
            var rect = this.getRect(this.style);
            if (x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height)
            ) {
                return area.isInsidePath(
                    this._pathProxy.pathCommands, 0, 'fill', x, y
                );
            }
        }
    };

    zrUtil.inherits(RibbonShape, Base);
    
    return RibbonShape;
});