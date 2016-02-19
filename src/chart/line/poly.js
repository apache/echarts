// Poly path support NaN point
define(function (require) {

    var Path = require('zrender/graphic/Path');
    var vec2 = require('zrender/core/vector');

    var vec2Min = vec2.min;
    var vec2Max = vec2.max;

    var scaleAndAdd = vec2.scaleAndAdd;
    var v2Copy = vec2.copy;

    // Temporary variable
    var v = [];
    var cp0 = [];
    var cp1 = [];

    function drawSegment(
        ctx, points, start, stop, len,
        dir, smoothMin, smoothMax, smooth, smoothMonotone
    ) {
        var idx = start;
        for (var k = 0; k < len; k++) {
            var p = points[idx];
            if (idx >= stop || idx < 0 || isNaN(p[0]) || isNaN(p[1])) {
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

                    var ratioNextSeg = 0.5;
                    var prevP = points[prevIdx];
                    var nextP = points[nextIdx];
                    // Last point
                    if ((dir > 0 && (idx === len - 1 || isNaN(nextP[0]) || isNaN(nextP[1])))
                        || (dir <= 0 && (idx === 0 ||  isNaN(nextP[0]) || isNaN(nextP[1])))
                    ) {
                        v2Copy(cp1, p);
                    }
                    else {
                        // If next data is null
                        if (isNaN(nextP[0]) || isNaN(nextP[1])) {
                            nextP = p;
                        }

                        vec2.sub(v, nextP, prevP);

                        var lenPrevSeg;
                        var lenNextSeg;
                        if (smoothMonotone === 'x' || smoothMonotone === 'y') {
                            var dim = smoothMonotone === 'x' ? 0 : 1;
                            lenPrevSeg = Math.abs(p[dim] - prevP[dim]);
                            lenNextSeg = Math.abs(p[dim] - nextP[dim]);
                        }
                        else {
                            lenPrevSeg = vec2.dist(p, prevP);
                            lenNextSeg = vec2.dist(p, nextP);
                        }

                        // Use ratio of seg length
                        ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

                        scaleAndAdd(cp1, p, v, -smooth * (1 - ratioNextSeg));
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
                    scaleAndAdd(cp0, p, v, smooth * ratioNextSeg);
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

                smoothConstraint: true,

                smoothMonotone: null
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
                        1, result.min, result.max, shape.smooth,
                        shape.smoothMonotone
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

                smoothConstraint: true,

                smoothMonotone: null
            },

            buildPath: function (ctx, shape) {
                var points = shape.points;
                var stackedOnPoints = shape.stackedOnPoints;

                var i = 0;
                var len = points.length;
                var smoothMonotone = shape.smoothMonotone;
                var bbox = getBoundingBox(points, shape.smoothConstraint);
                var stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);
                while (i < len) {
                    var k = drawSegment(
                        ctx, points, i, len, len,
                        1, bbox.min, bbox.max, shape.smooth,
                        smoothMonotone
                    );
                    drawSegment(
                        ctx, stackedOnPoints, i + k - 1, len, k,
                        -1, stackedOnBBox.min, stackedOnBBox.max, shape.stackedOnSmooth,
                        smoothMonotone
                    );
                    i += k + 1;

                    ctx.closePath();
                }
            }
        })
    };
});