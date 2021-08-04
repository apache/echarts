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
function intersectCurveCircle(
    curvePoints: number[][],
    center: number[],
    radius: number
) {
    const p0 = curvePoints[0];
    const p1 = curvePoints[1];
    const p2 = curvePoints[2];
    const p3 = curvePoints[3];

    let d = Infinity;
    let t;
    const radiusSquare = radius * radius;
    let interval = 0.1;

    if(p3) {
        for (let _t = 0.1; _t <= 0.9; _t += 0.1) {
            v1[0] = cubicAt(p0[0], p1[0], p2[0], p3[0], _t);
            v1[1] = cubicAt(p0[1], p1[1], p2[1], p3[1], _t);
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
            v2[0] = cubicAt(p0[0], p1[0], p2[0], p3[0], t);
            v2[1] = cubicAt(p0[1], p1[1], p2[1], p3[1], t);
            v3[0] = cubicAt(p0[0], p1[0], p2[0], p3[0], next);
            v3[1] = cubicAt(p0[1], p1[1], p2[1], p3[1], next);

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
    }
    else {
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
    }

    return t;
}

function cubicPosition(pt: number[], center: number[]) {
    const radiusSquare = v2DistSquare(pt, center);
    const out: number[] = [];
    if (pt[0] - center[0] < 0)
        out[0] = Math.sqrt(36 * radiusSquare / (1 + Math.pow(pt[1] - center[1], 2) / Math.pow(pt[0] - center[0], 2))) + center[0];
    else if (pt[0] - center[0] > 0)
        out[0] = -Math.sqrt(36 * radiusSquare / (1 + Math.pow(pt[1] - center[1], 2) / Math.pow(pt[0] - center[0], 2))) + center[0];
    if (pt[1] - center[1] < 0)
        out[1] = Math.sqrt(36 * radiusSquare / (1 + Math.pow(pt[0] - center[0], 2) / Math.pow(pt[1] - center[1], 2))) + center[1];
    else if (pt[1] - center[1] > 0)
        out[1] = -Math.sqrt(36 * radiusSquare / (1 + Math.pow(pt[0] - center[0], 2) / Math.pow(pt[1] - center[1], 2))) + center[1];
    return out;
}

// Adjust edge to avoid
export default function adjustEdge(graph: Graph, scale: number) {
    const tmp0: number[] = [];
    const quadraticSubdivide = curveTool.quadraticSubdivide;
    const cubicSubdivide = curveTool.cubicSubdivide;
    const pts: number[][] = [[], [], []];
    const pts2: number[][] = [[], []];
    const pts3 : number[][] = [[], [], [], []];
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
            vec2.copy(pts3[0], originalPoints[0]);
            vec2.copy(pts3[1], originalPoints[2]);
            vec2.copy(pts3[2], originalPoints[3]);
            vec2.copy(pts3[3], originalPoints[1]);

            const inEdges = edge.node1.inEdges.filter((edge) => {
                return edge.node1 !== edge.node2
            });
            const outEdges = edge.node1.outEdges.filter((edge) => {
                return edge.node1 !== edge.node2
            });
            const allPoints: number[][] = [];
            if (inEdges.length + outEdges.length > 1) {
                let d = -Infinity;
                let pt1: number[] = [];
                let pt2: number[] = [];
                for (let edge of inEdges) {
                    allPoints.push(edge.getLayout()[1]);
                }
                for (let edge of outEdges) {
                    allPoints.push(edge.getLayout()[0]);
                }
                for (let i = 0; i < allPoints.length - 1; i++) {
                    for (let j = i + 1; j < allPoints.length; j++) {
                        if (v2DistSquare(allPoints[i], allPoints[j]) > d) {
                            d = v2DistSquare(allPoints[i], allPoints[j]);
                            pt1 = allPoints[i];
                            pt2 = allPoints[j];
                        }
                    }
                }
                let out1: number[] = [];
                let out2: number[] = [];
                out1 = cubicPosition(pt1, originalPoints[0]);
                
                vec2.copy(pts3[1], out1);
                out2 = cubicPosition(pt2, originalPoints[0]);
                vec2.copy(pts3[2], out2);
            }
            if (fromSymbol && fromSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node1);

                const t = intersectCurveCircle(pts3, originalPoints[0], symbolSize * scale);
                // Subdivide and get the second
                cubicSubdivide(pts3[0][0], pts3[1][0], pts3[2][0], pts3[3][0], t, tmp0);
                pts3[0][0] = tmp0[4];
                pts3[1][0] = tmp0[5];
                pts3[2][0] = tmp0[6];
                cubicSubdivide(pts3[0][1], pts3[1][1], pts3[2][1], pts3[3][1], t, tmp0);
                pts3[0][1] = tmp0[4];
                pts3[1][1] = tmp0[5];
                pts3[2][1] = tmp0[6];
            }
            if (toSymbol && toSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node2);

                const t = intersectCurveCircle(pts3, originalPoints[1], symbolSize * scale);
                // Subdivide and get the first
                cubicSubdivide(pts3[0][0], pts3[1][0], pts3[2][0], pts3[3][0], t, tmp0);
                pts3[1][0] = tmp0[1];
                pts3[2][0] = tmp0[2];
                pts3[3][0] = tmp0[3];
                cubicSubdivide(pts3[0][1], pts3[1][1], pts3[2][1], pts3[3][1], t, tmp0);
                pts3[1][1] = tmp0[1];
                pts3[2][1] = tmp0[2];
                pts3[3][1] = tmp0[3];
            }
            vec2.copy(linePoints[0], pts3[0]);
            vec2.copy(linePoints[1], pts3[3]);
            vec2.copy(linePoints[2], pts3[1]);
            vec2.copy(linePoints[3], pts3[2]);
        }
        // Quadratic curve
        else if (linePoints[2] != null) {
            vec2.copy(pts[0], originalPoints[0]);
            vec2.copy(pts[1], originalPoints[2]);
            vec2.copy(pts[2], originalPoints[1]);
            if (fromSymbol && fromSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node1);

                const t = intersectCurveCircle(pts, originalPoints[0], symbolSize * scale);
                // Subdivide and get the second
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[0][0] = tmp0[3];
                pts[1][0] = tmp0[4];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[0][1] = tmp0[3];
                pts[1][1] = tmp0[4];
            }
            if (toSymbol && toSymbol !== 'none') {
                const symbolSize = getSymbolSize(edge.node2);

                const t = intersectCurveCircle(pts, originalPoints[1], symbolSize * scale);
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