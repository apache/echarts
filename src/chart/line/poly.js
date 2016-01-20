// Poly path support NaN point
define(function (require) {

    var Path = require('zrender/graphic/Path');
    var vec2 = require('zrender/core/vector');

    var mathMin = Math.min;
    var mathMax = Math.max;
    var vec2Min = vec2.min;
    var vec2Max = vec2.max;

    var scaleAndAdd = vec2.scaleAndAdd;
    var v2Copy = vec2.copy;

    // Temporary variable
    var v = [];
    var cp0 = [];
    var cp1 = [];

    function drawSegment(
        ctx, points, start, allLen, segLen,
        dir, smoothMin, smoothMax, smooth
    ) {
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
                    // Last point
                    if ((dir > 0 && idx === allLen - 1)
                        || (dir <= 0 && idx  === 0)
                    ) {
                        v2Copy(cp1, p);
                    }
                    else {
                        var prevP = points[prevIdx];
                        var nextP = points[nextIdx];
                        // If next data is null
                        if (isNaN(nextP[0]) || isNaN(nextP[1])) {
                            nextP = p;
                        }

                        vec2.sub(v, nextP, prevP);

                        scaleAndAdd(cp1, p, v, -smooth / 2);
                    }
                    // Smooth constraint
                    vec2Min(cp0, cp0, smoothMax);
                    vec2Max(cp0, cp0, smoothMin);
                    vec2Min(cp1, cp1, smoothMax);
                    vec2Max(cp1, cp1, smoothMin);

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

    function getBoundingBox(points, smoothConstraint) {
        var ptMin = [Infinity, Infinity];
        var ptMax = [-Infinity, -Infinity];
        if (smoothConstraint) {
            for (var i = 0; i < points.length; i++) {
                var pt = points[i];
                if (pt[0] < ptMin[0]) { ptMin[0] = pt[0]; }
                if (pt[1] < ptMin[1]) { ptMin[1] = pt[1]; }
                if (pt[0] > ptMax[0]) { ptMax[0] = pt[0]; }
                if (pt[1] > ptMax[1]) { ptMax[1] = pt[1]; }
            }
        }
        return {
            min: smoothConstraint ? ptMin : ptMax,
            max: smoothConstraint ? ptMax : ptMin
        };
    }

    return {

        Polyline: Path.extend({

            type: 'ec-polyline',

            shape: {
                points: [],

                smooth: 0,

                smoothConstraint: true
            },

            style: {
                fill: null,

                stroke: '#000'
            },

            buildPath: function (ctx, shape) {
                var points = shape.points;

                var i = 0;
                var len = points.length;

                var result = getBoundingBox(points, shape.smoothConstraint);

                while (i < len) {
                    i += drawSegment(
                        ctx, points, i, len, len,
                        1, result.min, result.max, shape.smooth
                    ) + 1;
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
                stackedOnSmooth: 0,
                smoothConstraint: true
            },

            buildPath: function (ctx, shape) {
                var points = shape.points;
                var stackedOnPoints = shape.stackedOnPoints;

                var i = 0;
                var len = points.length;
                var bbox = getBoundingBox(points, shape.smoothConstraint);
                var stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);
                while (i < len) {
                    var k = drawSegment(
                        ctx, points, i, len, len,
                        1, bbox.min, bbox.max, shape.smooth
                    );
                    drawSegment(
                        ctx, stackedOnPoints, i + k - 1, len, k,
                        -1, stackedOnBBox.min, stackedOnBBox.max, shape.stackedOnSmooth
                    );
                    i += k + 1;

                    ctx.closePath();
                }
            }
        })
    };
});