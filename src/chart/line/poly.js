// Poly path support NaN point
define(function (require) {

    var Path = require('zrender/graphic/Path');
    var vec2 = require('zrender/core/vector');

    var mathMin = Math.min;
    var mathMax = Math.max;

    var scaleAndAdd = vec2.scaleAndAdd;
    var v2Copy = vec2.copy;

    // Temporary variable
    var v = [];
    var cp0 = [];
    var cp1 = [];

    function drawSegment(ctx, points, start, allLen, segLen, dir, smooth) {
        var idx = start;
        for (var k = 0; k < segLen; k++) {
            var p = points[idx];
            if (idx >= allLen || idx < 0 || isNaN(p[0]) || isNaN(p[1])) {
                break;
            }

            if (idx === start) {
                ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
                v2Copy(cp0, p);
            }
            else {
                if (smooth > 0) {
                    var prevIdx = idx - dir;
                    var nextIdx = idx + dir;
                    if (dir > 0) {
                        prevIdx = mathMax(prevIdx, start);
                        nextIdx = mathMin(nextIdx, allLen - 1);
                    }
                    else {
                        nextIdx = mathMax(nextIdx, 0);
                        prevIdx = mathMin(prevIdx, start);
                    }
                    var prevP = points[prevIdx];
                    var nextP = points[nextIdx];
                    // If next data is null
                    if (isNaN(nextP[0]) || isNaN(nextP[1])) {
                        nextP = p;
                    }

                    vec2.sub(v, nextP, prevP);

                    scaleAndAdd(cp1, p, v, -smooth / 2);

                    ctx.bezierCurveTo(
                        cp0[0], cp0[1],
                        cp1[0], cp1[1],
                        p[0], p[1]
                    );
                    // cp0 of next segment
                    scaleAndAdd(cp0, p, v, smooth / 2);
                }
                else {
                    ctx.lineTo(p[0], p[1]);
                }
            }

            idx += dir;
        }

        return k;
    }

    return {

        Polyline: Path.extend({

            type: 'ec-polyline',

            shape: {
                points: [],

                smooth: 0
            },

            style: {
                fill: null,

                stroke: '#000',

                smooth: 0
            },

            buildPath: function (ctx, shape) {
                var points = shape.points;

                var i = 0;
                var len = points.length;

                while (i < len) {
                    i += drawSegment(ctx, points, i, len, len, 1, shape.smooth) + 1;
                }
            }
        }),

        Polygon: Path.extend({

            type: 'ec-polygon',

            shape: {
                points: [],
                // Offset between stacked base points and points
                stackedOnPoints: [],
                smooth: 0,
                stackedOnSmooth: 0
            },

            buildPath: function (ctx, shape) {
                var points = shape.points;
                var stackedOnPoints = shape.stackedOnPoints;

                var i = 0;
                var len = points.length;
                while (i < len) {
                    var k = drawSegment(
                        ctx, points, i, len, len, 1, shape.smooth
                    );
                    drawSegment(
                        ctx, stackedOnPoints, i + k - 1, len, k, -1, shape.stackedOnSmooth
                    );
                    i += k + 1;

                    ctx.closePath();
                }
            }
        })
    };
});