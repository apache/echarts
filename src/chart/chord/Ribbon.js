define(function (require) {

    var sin = Math.sin;
    var cos = Math.cos;

    return require('../../util/graphic').extendShape({

        type: 'ec-ribbon',

        shape: {
            cx: 0,
            cy: 0,
            r: 0,
            s0: 0,
            s1: 0,
            t0: 0,
            t1: 0
        },

        style: {
            fill: '#000'
        },

        buildPath: function (ctx, shape) {

            var clockwise = shape.clockwise || false;

            var cx = shape.cx;
            var cy = shape.cy;
            var r = shape.r;
            var s0 = shape.s0;
            var s1 = shape.s1;
            var t0 = shape.t0;
            var t1 = shape.t1;
            var sx0 = cx + cos(s0) * r;
            var sy0 = cy + sin(s0) * r;
            var sx1 = cx + cos(s1) * r;
            var sy1 = cy + sin(s1) * r;
            var tx0 = cx + cos(t0) * r;
            var ty0 = cy + sin(t0) * r;
            var tx1 = cx + cos(t1) * r;
            var ty1 = cy + sin(t1) * r;

            ctx.moveTo(sx0, sy0);
            ctx.arc(cx, cy, shape.r, s0, s1, !clockwise);
            ctx.bezierCurveTo(
                (cx - sx1) * 0.70 + sx1,
                (cy - sy1) * 0.70 + sy1,
                (cx - tx0) * 0.70 + tx0,
                (cy - ty0) * 0.70 + ty0,
                tx0, ty0
            );
            // Chord to self
            if (shape.s0 === shape.t0 && shape.s1 === shape.t1) {
                return;
            }
            ctx.arc(cx, cy, shape.r, t0, t1, !clockwise);
            ctx.bezierCurveTo(
                (cx - tx1) * 0.70 + tx1,
                (cy - ty1) * 0.70 + ty1,
                (cx - sx0) * 0.70 + sx0,
                (cy - sy0) * 0.70 + sy0,
                sx0, sy0
            );
        }
    });
});