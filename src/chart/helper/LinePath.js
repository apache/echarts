/**
 * Line path for bezier and straight line draw
 */
define(function (require) {
    var graphic = require('../../util/graphic');

    var straightLineProto = graphic.Line.prototype;
    var bezierCurveProto = graphic.BezierCurve.prototype;

    return graphic.extendShape({

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
            (shape.cpx1 == null || shape.cpy1 == null
                ? straightLineProto : bezierCurveProto).buildPath(ctx, shape);
        },

        pointAt: function (t) {
            var shape = this.shape;
            return shape.cpx1 == null || shape.cpy1 == null
                ? straightLineProto.pointAt.call(this, t)
                : bezierCurveProto.pointAt.call(this, t);
        }
    });
});