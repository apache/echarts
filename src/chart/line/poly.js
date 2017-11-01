// Poly path support NaN point

import Path from 'zrender/src/graphic/Path';
import * as vec2 from 'zrender/src/core/vector';
import fixClipWithShadow from 'zrender/src/graphic/helper/fixClipWithShadow';

var vec2Min = vec2.min;
var vec2Max = vec2.max;

var scaleAndAdd = vec2.scaleAndAdd;
var v2Copy = vec2.copy;

// Temporary variable
var v = [];
var cp0 = [];
var cp1 = [];

function isPointNull(p) {
    return isNaN(p[0]) || isNaN(p[1]);
}

function drawSegment(
    ctx, points, start, segLen, allLen,
    dir, smoothMin, smoothMax, smooth, smoothMonotone, connectNulls
) {
    var prevIdx = 0;
    var idx = start;
    for (var k = 0; k < segLen; k++) {
        var p = points[idx];
        if (idx >= allLen || idx < 0) {
            break;
        }
        if (isPointNull(p)) {
            if (connectNulls) {
                idx += dir;
                continue;
            }
            break;
        }

        if (idx === start) {
            ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
            v2Copy(cp0, p);
        }
        else {
            if (smooth > 0) {
                var nextIdx = idx + dir;
                var nextP = points[nextIdx];
                if (connectNulls) {
                    // Find next point not null
                    while (nextP && isPointNull(points[nextIdx])) {
                        nextIdx += dir;
                        nextP = points[nextIdx];
                    }
                }

                var ratioNextSeg = 0.5;
                var prevP = points[prevIdx];
                var nextP = points[nextIdx];
                // Last point
                if (!nextP || isPointNull(nextP)) {
                    v2Copy(cp1, p);
                }
                else {
                    // If next data is null in not connect case
                    if (isPointNull(nextP) && !connectNulls) {
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

        prevIdx = idx;
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

export var Polyline = Path.extend({

    type: 'ec-polyline',

    shape: {
        points: [],

        smooth: 0,

        smoothConstraint: true,

        smoothMonotone: null,

        connectNulls: false
    },

    style: {
        fill: null,

        stroke: '#000'
    },

    brush: fixClipWithShadow(Path.prototype.brush),

    buildPath: function (ctx, shape) {
        var points = shape.points;

        var i = 0;
        var len = points.length;

        var result = getBoundingBox(points, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointNull(points[len - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointNull(points[i])) {
                    break;
                }
            }
        }
        while (i < len) {
            i += drawSegment(
                ctx, points, i, len, len,
                1, result.min, result.max, shape.smooth,
                shape.smoothMonotone, shape.connectNulls
            ) + 1;
        }
    }
});

export var Polygon = Path.extend({

    type: 'ec-polygon',

    shape: {
        points: [],

        // Offset between stacked base points and points
        stackedOnPoints: [],

        smooth: 0,

        stackedOnSmooth: 0,

        smoothConstraint: true,

        smoothMonotone: null,

        connectNulls: false
    },

    brush: fixClipWithShadow(Path.prototype.brush),

    buildPath: function (ctx, shape) {
        var points = shape.points;
        var stackedOnPoints = shape.stackedOnPoints;

        var i = 0;
        var len = points.length;
        var smoothMonotone = shape.smoothMonotone;
        var bbox = getBoundingBox(points, shape.smoothConstraint);
        var stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointNull(points[len - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointNull(points[i])) {
                    break;
                }
            }
        }
        while (i < len) {
            var k = drawSegment(
                ctx, points, i, len, len,
                1, bbox.min, bbox.max, shape.smooth,
                smoothMonotone, shape.connectNulls
            );
            drawSegment(
                ctx, stackedOnPoints, i + k - 1, k, len,
                -1, stackedOnBBox.min, stackedOnBBox.max, shape.stackedOnSmooth,
                smoothMonotone, shape.connectNulls
            );
            i += k + 1;

            ctx.closePath();
        }
    }
});
