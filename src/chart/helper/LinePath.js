/**
 * Line path for bezier and straight line draw
 */

import * as graphic from '../../util/graphic';
import * as vec2 from 'zrender/src/core/vector';

var straightLineProto = graphic.Line.prototype;
var bezierCurveProto = graphic.BezierCurve.prototype;

function isLine(shape) {
    return isNaN(+shape.cpx1) || isNaN(+shape.cpy1);
}

export default graphic.extendShape({

    type: 'ec-line',

    style: {
        stroke: '#000',
        fill: null
    },

    shape: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        percent: 1,
        cpx1: null,
        cpy1: null
    },

    buildPath: function (ctx, shape) {
        (isLine(shape) ? straightLineProto : bezierCurveProto).buildPath(ctx, shape);
    },

    pointAt: function (t) {
        return isLine(this.shape)
            ? straightLineProto.pointAt.call(this, t)
            : bezierCurveProto.pointAt.call(this, t);
    },

    tangentAt: function (t) {
        var shape = this.shape;
        var p = isLine(shape)
            ? [shape.x2 - shape.x1, shape.y2 - shape.y1]
            : bezierCurveProto.tangentAt.call(this, t);
        return vec2.normalize(p, p);
    }
});