define(function(require) {
    'use strict';

    var smoothBezier = require('zrender/graphic/helper/smoothBezier');

    return require('zrender/graphic/Path').extend({

        type: 'ec-area',

        shape: {
            points: [],
            // Offset between stacked base points and points
            stackedOnPoints: []
        },

        buildPath: function (ctx, shape) {
            var points = shape.points;
            var stackedOnPoints = shape.stackedOnPoints;

            var i = 0;
            var len = points.length;
            while (i < len) {
                for (var k = i; k < len; k++) {
                    var p = points[k];
                    if (p == null || isNaN(p[0]) || isNaN(p[1])) {
                        break;
                    }
                    ctx[k === i ? 'moveTo' : 'lineTo'](p[0], p[1]);
                }
                var tmp = k;
                for (k--; k >= i; k--) {
                    var p = stackedOnPoints[k];
                    ctx.lineTo(p[0], p[1]);
                }
                i = tmp + 1;
            }
        }
    });
});