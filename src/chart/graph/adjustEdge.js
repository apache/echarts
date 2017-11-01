import * as curveTool from 'zrender/src/core/curve';
import * as vec2 from 'zrender/src/core/vector';

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

    // Assume the segment is monotone，Find root through Bisection method
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
export default function (graph, scale) {
    var tmp0 = [];
    var quadraticSubdivide = curveTool.quadraticSubdivide;
    var pts = [[], [], []];
    var pts2 = [[], []];
    var v = [];
    scale /= 2;

    function getSymbolSize(node) {
        var symbolSize = node.getVisual('symbolSize');
        if (symbolSize instanceof Array) {
            symbolSize = (symbolSize[0] + symbolSize[1]) / 2;
        }
        return symbolSize;
    }
    graph.eachEdge(function (edge, idx) {
        var linePoints = edge.getLayout();
        var fromSymbol = edge.getVisual('fromSymbol');
        var toSymbol = edge.getVisual('toSymbol');

        if (!linePoints.__original) {
            linePoints.__original = [
                vec2.clone(linePoints[0]),
                vec2.clone(linePoints[1])
            ];
            if (linePoints[2]) {
                linePoints.__original.push(vec2.clone(linePoints[2]));
            }
        }
        var originalPoints = linePoints.__original;
        // Quadratic curve
        if (linePoints[2] != null) {
            vec2.copy(pts[0], originalPoints[0]);
            vec2.copy(pts[1], originalPoints[2]);
            vec2.copy(pts[2], originalPoints[1]);
            if (fromSymbol && fromSymbol != 'none') {
                var symbolSize = getSymbolSize(edge.node1);

                var t = intersectCurveCircle(pts, originalPoints[0], symbolSize * scale);
                // Subdivide and get the second
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[0][0] = tmp0[3];
                pts[1][0] = tmp0[4];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[0][1] = tmp0[3];
                pts[1][1] = tmp0[4];
            }
            if (toSymbol && toSymbol != 'none') {
                var symbolSize = getSymbolSize(edge.node2);

                var t = intersectCurveCircle(pts, originalPoints[1], symbolSize * scale);
                // Subdivide and get the first
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[1][0] = tmp0[1];
                pts[2][0] = tmp0[2];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[1][1] = tmp0[1];
                pts[2][1] = tmp0[2];
            }
            // Copy back to layout
            vec2.copy(linePoints[0], pts[0]);
            vec2.copy(linePoints[1], pts[2]);
            vec2.copy(linePoints[2], pts[1]);
        }
        // Line
        else {
            vec2.copy(pts2[0], originalPoints[0]);
            vec2.copy(pts2[1], originalPoints[1]);

            vec2.sub(v, pts2[1], pts2[0]);
            vec2.normalize(v, v);
            if (fromSymbol && fromSymbol != 'none') {

                var symbolSize = getSymbolSize(edge.node1);

                vec2.scaleAndAdd(pts2[0], pts2[0], v, symbolSize * scale);
            }
            if (toSymbol && toSymbol != 'none') {
                var symbolSize = getSymbolSize(edge.node2);

                vec2.scaleAndAdd(pts2[1], pts2[1], v, -symbolSize * scale);
            }
            vec2.copy(linePoints[0], pts2[0]);
            vec2.copy(linePoints[1], pts2[1]);
        }
    });
}