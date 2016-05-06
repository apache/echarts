define(function (require) {

    var curveTool = require('zrender/core/curve');
    var vec2 = require('zrender/core/vector');

    var v1 = [];
    var v2 = [];
    var v3 = [];
    var quadraticAt = curveTool.quadraticAt;
    var v2DistSquare = vec2.distSquare;
    var mathAbs = Math.abs;
    function intersectCurveCircle(curvePoints, center, radius) {
        var p0 = curvePoints[0];
        var p1 = curvePoints[1];
        var p2 = curvePoints[2];

        var d = Infinity;
        var t;
        var radiusSquare = radius * radius;
        var interval = 0.1;

        for (var _t = 0.1; _t <= 0.9; _t += 0.1) {
            v1[0] = quadraticAt(p0[0], p1[0], p2[0], _t);
            v1[1] = quadraticAt(p0[1], p1[1], p2[1], _t);
            var diff = mathAbs(v2DistSquare(v1, center) - radiusSquare);
            if (diff < d) {
                d = diff;
                t = _t;
            }
        }

        // Assume the segment is monotone through Bisection method

        // At most 32 iteration
        for (var i = 0; i < 32; i++) {
            // var prev = t - interval;
            var next = t + interval;
            // v1[0] = quadraticAt(p0[0], p1[0], p2[0], prev);
            // v1[1] = quadraticAt(p0[1], p1[1], p2[1], prev);
            v2[0] = quadraticAt(p0[0], p1[0], p2[0], t);
            v2[1] = quadraticAt(p0[1], p1[1], p2[1], t);
            v3[0] = quadraticAt(p0[0], p1[0], p2[0], next);
            v3[1] = quadraticAt(p0[1], p1[1], p2[1], next);

            var diff = v2DistSquare(v2, center) - radiusSquare;
            if (mathAbs(diff) < 1e-2) {
                break;
            }

            // var prevDiff = v2DistSquare(v1, center) - radiusSquare;
            var nextDiff = v2DistSquare(v3, center) - radiusSquare;

            interval /= 2;
            if (diff < 0) {
                if (nextDiff >= 0) {
                    t = t + interval;
                }
                else {
                    t = t - interval;
                }
            }
            else {
                if (nextDiff >= 0) {
                    t = t - interval;
                }
                else {
                    t = t + interval;
                }
            }
        }

        return t;
    }
    // Adjust edge to avoid
    return function (seriesModel) {
        var graph = seriesModel.getGraph();
        var tmp0 = [];
        var quadraticSubdivide = curveTool.quadraticSubdivide;
        var pts = [];
        // TODO With scale
        graph.eachEdge(function (edge) {
            var linePoints = edge.getLayout();
            pts[0] = linePoints[0].slice();
            pts[1] = linePoints[2].slice();
            pts[2] = linePoints[1].slice();
            var fromSymbol = edge.getVisual('fromSymbol');
            var toSymbol = edge.getVisual('toSymbol');
            if (fromSymbol && fromSymbol != 'none') {
                var t = intersectCurveCircle(pts, linePoints[0], edge.node1.getVisual('symbolSize') / 2);
                // Subdivide and get the second
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[0][0] = tmp0[3];
                pts[1][0] = tmp0[4];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[0][1] = tmp0[3];
                pts[1][1] = tmp0[4];
            }
            if (toSymbol && toSymbol != 'none') {
                var t = intersectCurveCircle(pts, linePoints[1], edge.node2.getVisual('symbolSize') / 2);
                // Subdivide and get the first
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[1][0] = tmp0[1];
                pts[2][0] = tmp0[2];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[1][1] = tmp0[1];
                pts[2][1] = tmp0[2];
            }
            edge.setLayout([pts[0], pts[2], pts[1]]);
        });
    };
});