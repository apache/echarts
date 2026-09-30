/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as curveTool from 'zrender/src/core/curve';
import * as vec2 from 'zrender/src/core/vector';
import { normalizeSymbolSize, normalizeSymbolOffset } from '../../util/symbol';
import {
    getSymbolBoundaryDistance,
    getSymbolContainChecker,
    symbolRotateToRad
} from './nodeShapeHelper';
import Graph, { GraphNode } from '../../data/Graph';

const quadraticAt = curveTool.quadraticAt;
const v2DistSquare = vec2.distSquare;
const mathAbs = Math.abs;

// Curve sampling resolution used to locate where a quadratic edge crosses a node outline.
const CURVE_SAMPLES = 20;
const CURVE_BISECT_ITERATIONS = 12;

interface NodeShapeParams {
    symbolType: string
    // Half already folded into scale by nodeShapeHelper; these are full sizes/offsets in px,
    // pre-multiplied by the node global scale.
    size: number[]
    rotateRad: number
    keepAspect: boolean
    offset: number[]
}

/**
 * Collect the node's symbol geometry (already scaled by the graph global scale) needed to probe
 * its outline. All of these visuals are populated by `visual/symbol` before the view renders.
 */
function getNodeShapeParams(node: GraphNode, globalScale: number): NodeShapeParams {
    const rawSize = normalizeSymbolSize(node.getVisual('symbolSize'));
    const rawOffset = normalizeSymbolOffset(node.getVisual('symbolOffset'), rawSize);
    return {
        symbolType: node.getVisual('symbol') || 'circle',
        size: [rawSize[0] * globalScale, rawSize[1] * globalScale],
        rotateRad: symbolRotateToRad(node.getVisual('symbolRotate')),
        keepAspect: node.getVisual('symbolKeepAspect'),
        offset: rawOffset ? [rawOffset[0] * globalScale, rawOffset[1] * globalScale] : null
    };
}

function getNodeBoundaryDistance(
    node: GraphNode, globalScale: number, dirX: number, dirY: number
): number {
    const p = getNodeShapeParams(node, globalScale);
    return getSymbolBoundaryDistance(p.symbolType, p.size, p.rotateRad, p.keepAspect, p.offset, dirX, dirY);
}

const v1: number[] = [];
const v2: number[] = [];
const v3: number[] = [];
/**
 * Legacy circle intersection, kept as a fallback for the rare cases where the generic outline
 * search cannot find a crossing (e.g. an unfillable node symbol or a degenerate offset).
 */
function intersectCurveCircle(
    curvePoints: number[][],
    center: number[],
    radius: number
) {
    const p0 = curvePoints[0];
    const p1 = curvePoints[1];
    const p2 = curvePoints[2];

    let d = Infinity;
    let t;
    const radiusSquare = radius * radius;
    let interval = 0.1;

    for (let _t = 0.1; _t <= 0.9; _t += 0.1) {
        v1[0] = quadraticAt(p0[0], p1[0], p2[0], _t);
        v1[1] = quadraticAt(p0[1], p1[1], p2[1], _t);
        const diff = mathAbs(v2DistSquare(v1, center) - radiusSquare);
        if (diff < d) {
            d = diff;
            t = _t;
        }
    }

    // Assume the segment is monotone，Find root through Bisection method
    // At most 32 iteration
    for (let i = 0; i < 32; i++) {
        // let prev = t - interval;
        const next = t + interval;
        // v1[0] = quadraticAt(p0[0], p1[0], p2[0], prev);
        // v1[1] = quadraticAt(p0[1], p1[1], p2[1], prev);
        v2[0] = quadraticAt(p0[0], p1[0], p2[0], t);
        v2[1] = quadraticAt(p0[1], p1[1], p2[1], t);
        v3[0] = quadraticAt(p0[0], p1[0], p2[0], next);
        v3[1] = quadraticAt(p0[1], p1[1], p2[1], next);

        const diff = v2DistSquare(v2, center) - radiusSquare;
        if (mathAbs(diff) < 1e-2) {
            break;
        }

        // let prevDiff = v2DistSquare(v1, center) - radiusSquare;
        const nextDiff = v2DistSquare(v3, center) - radiusSquare;

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

/**
 * Find the parameter `t` where the quadratic `curvePoints` crosses `node`'s transformed outline.
 * The node sits at one end of the curve (`fromStart` ? `t = 0` : `t = 1`), which is inside the
 * outline; we walk toward the other end to find the exit crossing, then refine by bisection.
 * Falls back to the circle intersection if no clean crossing is found.
 */
function intersectCurveNode(
    curvePoints: number[][],
    node: GraphNode,
    globalScale: number,
    fromStart: boolean
): number {
    const p0 = curvePoints[0];
    const p1 = curvePoints[1];
    const p2 = curvePoints[2];
    const p = getNodeShapeParams(node, globalScale);

    const cx = fromStart ? p0[0] : p2[0];
    const cy = fromStart ? p0[1] : p2[1];
    const contain = getSymbolContainChecker(p.symbolType, p.size, p.rotateRad, p.keepAspect, p.offset);

    function isInside(t: number): boolean {
        const x = quadraticAt(p0[0], p1[0], p2[0], t);
        const y = quadraticAt(p0[1], p1[1], p2[1], t);
        return contain(x - cx, y - cy);
    }

    // Bracket the outline crossing between an inside `t` and an adjacent outside `t`.
    let inT = fromStart ? 0 : 1;
    let outT = -1;
    if (isInside(inT)) {
        for (let i = 1; i <= CURVE_SAMPLES; i++) {
            const t = fromStart ? i / CURVE_SAMPLES : 1 - i / CURVE_SAMPLES;
            if (!isInside(t)) {
                outT = t;
                break;
            }
            inT = t;
        }
    }

    if (outT < 0) {
        // Endpoint not inside its own outline, or the whole curve lies inside it.
        const radius = Math.max(p.size[0], p.size[1]) / 2;
        return intersectCurveCircle(curvePoints, [cx, cy], radius);
    }

    let lo = inT;
    let hi = outT;
    for (let i = 0; i < CURVE_BISECT_ITERATIONS; i++) {
        const mid = (lo + hi) / 2;
        if (isInside(mid)) {
            lo = mid;
        }
        else {
            hi = mid;
        }
    }
    return (lo + hi) / 2;
}

// Adjust edge endpoints so an edge's end-symbol sits flush against the node outline instead of
// being hidden underneath it, accounting for the node symbol's shape and transform.
export default function adjustEdge(graph: Graph, globalScale: number) {
    const tmp0: number[] = [];
    const quadraticSubdivide = curveTool.quadraticSubdivide;
    const pts: number[][] = [[], [], []];
    const pts2: number[][] = [[], []];
    const v: number[] = [];

    graph.eachEdge(function (edge, idx) {
        const linePoints = edge.getLayout();
        const fromSymbol = edge.getVisual('fromSymbol');
        const toSymbol = edge.getVisual('toSymbol');

        if (!linePoints.__original) {
            linePoints.__original = [
                vec2.clone(linePoints[0]),
                vec2.clone(linePoints[1])
            ];
            if (linePoints[2]) {
                linePoints.__original.push(vec2.clone(linePoints[2]));
            }
        }
        const originalPoints = linePoints.__original;
        // Quadratic curve
        if (linePoints[2] != null) {
            vec2.copy(pts[0], originalPoints[0]);
            vec2.copy(pts[1], originalPoints[2]);
            vec2.copy(pts[2], originalPoints[1]);
            if (fromSymbol && fromSymbol !== 'none') {
                const t = intersectCurveNode(pts, edge.node1, globalScale, true);
                // Subdivide and get the second
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[0][0] = tmp0[3];
                pts[1][0] = tmp0[4];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[0][1] = tmp0[3];
                pts[1][1] = tmp0[4];
            }
            if (toSymbol && toSymbol !== 'none') {
                const t = intersectCurveNode(pts, edge.node2, globalScale, false);
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
            if (fromSymbol && fromSymbol !== 'none') {
                // Approach direction at node1 points toward node2.
                const dist = getNodeBoundaryDistance(edge.node1, globalScale, v[0], v[1]);
                vec2.scaleAndAdd(pts2[0], pts2[0], v, dist);
            }
            if (toSymbol && toSymbol !== 'none') {
                // Approach direction at node2 points toward node1.
                const dist = getNodeBoundaryDistance(edge.node2, globalScale, -v[0], -v[1]);
                vec2.scaleAndAdd(pts2[1], pts2[1], v, -dist);
            }
            vec2.copy(linePoints[0], pts2[0]);
            vec2.copy(linePoints[1], pts2[1]);
        }
    });
}
