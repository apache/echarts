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
import {getSymbolSize} from './graphHelper';
import Graph from '../../data/Graph';

const v1: number[] = [];
const v2: number[] = [];
const v3: number[] = [];
const quadraticAt = curveTool.quadraticAt;
const cubicAt = curveTool.cubicAt;
const v2DistSquare = vec2.distSquare;
const mathAbs = Math.abs;
export function intersectCurveCircle(
    curvePoints: number[][],
    center: number[],
    radius: number
) {
    const p0 = curvePoints[0];
    const p1 = curvePoints[1];
    const p2 = curvePoints[2];
    const p3 = curvePoints[3] ?? [null, null];

    let d = Infinity;
    let t;
    const radiusSquare = radius * radius;
    let interval = 0.1;

    const bezierAt = p3[0] && p3[1]
        ? cubicAt 
        : function (p0: number, p1: number, p2: number, p3: number, t: number): number {
            return quadraticAt(p0, p1, p2, t);
    };

    for (let _t = 0.1; _t <= 0.9; _t += 0.1) {
        v1[0] = bezierAt(p0[0], p1[0], p2[0], p3[0], _t);
        v1[1] = bezierAt(p0[1], p1[1], p2[1], p3[1], _t);
        const diff = mathAbs(v2DistSquare(v1, center) - radiusSquare);
        if (diff < d) {
            d = diff;
            t = _t;
        }
    }
    // Assume the segment is monotone，Find root through Bisection method
    // At most 32 iteration
    for (let i = 0; i < 32; i++) {
        // const prev = t - interval;
        const next = t + interval;
        // v1[0] = bezierAt(p0[0], p1[0], p2[0], p3[0], prev);
        // v1[1] = bezierAt(p0[1], p1[1], p2[1], p3[1], prev);
        v2[0] = bezierAt(p0[0], p1[0], p2[0], p3[0], t);
        v2[1] = bezierAt(p0[1], p1[1], p2[1], p3[1], t);
        v3[0] = bezierAt(p0[0], p1[0], p2[0], p3[0], next);
        v3[1] = bezierAt(p0[1], p1[1], p2[1], p3[1], next);

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

// Adjust edge to avoid
export default function adjustEdge(graph: Graph, scale: number) {
    const tmp0: number[] = [];
    const quadraticSubdivide = curveTool.quadraticSubdivide;
    const cubicSubdivide = curveTool.cubicSubdivide;
    const pts3: number[][] = [[], [], []];
    const pts2: number[][] = [[], []];
    const pts4 : number[][] = [[], [], [], []];
    const v: number[] = [];
    scale /= 2;

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
            if (linePoints[3]) {
                linePoints.__original.push(vec2.clone(linePoints[3]));
            }
        }
        const originalPoints = linePoints.__original;
        // Cubic curve
        if (linePoints[3] != null) {
            vec2.copy(pts4[0], originalPoints[0]);
            vec2.copy(pts4[1], originalPoints[2]);
            vec2.copy(pts4[2], originalPoints[3]);
            vec2.copy(pts4[3], originalPoints[1]);

            if (fromSymbol && fromSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node1);

                let t = intersectCurveCircle(pts4, originalPoints[0], symbolSize * scale);
                if (t > 0.5) {
                    t = 1 - t;
                }
                // Subdivide and get the second
                cubicSubdivide(pts4[0][0], pts4[1][0], pts4[2][0], pts4[3][0], t, tmp0);
                pts4[0][0] = tmp0[4];
                pts4[1][0] = tmp0[5];
                pts4[2][0] = tmp0[6];
                cubicSubdivide(pts4[0][1], pts4[1][1], pts4[2][1], pts4[3][1], t, tmp0);
                pts4[0][1] = tmp0[4];
                pts4[1][1] = tmp0[5];
                pts4[2][1] = tmp0[6];
            }
            if (toSymbol && toSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node2);

                let t = intersectCurveCircle(pts4, originalPoints[1], symbolSize * scale);
                if (t < 0.5) {
                    t = 1 - t;
                }
                // Subdivide and get the first
                cubicSubdivide(pts4[0][0], pts4[1][0], pts4[2][0], pts4[3][0], t, tmp0);
                pts4[1][0] = tmp0[1];
                pts4[2][0] = tmp0[2];
                pts4[3][0] = tmp0[3];
                cubicSubdivide(pts4[0][1], pts4[1][1], pts4[2][1], pts4[3][1], t, tmp0);
                pts4[1][1] = tmp0[1];
                pts4[2][1] = tmp0[2];
                pts4[3][1] = tmp0[3];
            }
            vec2.copy(linePoints[0], pts4[0]);
            vec2.copy(linePoints[1], pts4[3]);
            vec2.copy(linePoints[2], pts4[1]);
            vec2.copy(linePoints[3], pts4[2]);
        }
        // Quadratic curve
        else if (linePoints[2] != null) {
            vec2.copy(pts3[0], originalPoints[0]);
            vec2.copy(pts3[1], originalPoints[2]);
            vec2.copy(pts3[2], originalPoints[1]);
            if (fromSymbol && fromSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node1);

                const t = intersectCurveCircle(pts3, originalPoints[0], symbolSize * scale);
                // Subdivide and get the second
                quadraticSubdivide(pts3[0][0], pts3[1][0], pts3[2][0], t, tmp0);
                pts3[0][0] = tmp0[3];
                pts3[1][0] = tmp0[4];
                quadraticSubdivide(pts3[0][1], pts3[1][1], pts3[2][1], t, tmp0);
                pts3[0][1] = tmp0[3];
                pts3[1][1] = tmp0[4];
            }
            if (toSymbol && toSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node2);

                const t = intersectCurveCircle(pts3, originalPoints[1], symbolSize * scale);
                // Subdivide and get the first
                quadraticSubdivide(pts3[0][0], pts3[1][0], pts3[2][0], t, tmp0);
                pts3[1][0] = tmp0[1];
                pts3[2][0] = tmp0[2];
                quadraticSubdivide(pts3[0][1], pts3[1][1], pts3[2][1], t, tmp0);
                pts3[1][1] = tmp0[1];
                pts3[2][1] = tmp0[2];
            }
            // Copy back to layout
            vec2.copy(linePoints[0], pts3[0]);
            vec2.copy(linePoints[1], pts3[2]);
            vec2.copy(linePoints[2], pts3[1]);
        }
        // Line
        else {
            vec2.copy(pts2[0], originalPoints[0]);
            vec2.copy(pts2[1], originalPoints[1]);

            vec2.sub(v, pts2[1], pts2[0]);
            vec2.normalize(v, v);
            if (fromSymbol && fromSymbol !== 'none') {

                const symbolSize = getSymbolSize(edge.node1);

                vec2.scaleAndAdd(pts2[0], pts2[0], v, symbolSize * scale);
            }
            if (toSymbol && toSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node2);

                vec2.scaleAndAdd(pts2[1], pts2[1], v, -symbolSize * scale);
            }
            vec2.copy(linePoints[0], pts2[0]);
            vec2.copy(linePoints[1], pts2[1]);
        }
    });
}