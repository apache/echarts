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
const v2DistSquare = vec2.distSquare;
const mathAbs = Math.abs;
function intersectCurveCircle(
    curvePoints: number[][],
    center: number[],
    radius: number
) {
    let p0 = curvePoints[0];
    let p1 = curvePoints[1];
    let p2 = curvePoints[2];

    let d = Infinity;
    let t;
    let radiusSquare = radius * radius;
    let interval = 0.1;

    for (let _t = 0.1; _t <= 0.9; _t += 0.1) {
        v1[0] = quadraticAt(p0[0], p1[0], p2[0], _t);
        v1[1] = quadraticAt(p0[1], p1[1], p2[1], _t);
        let diff = mathAbs(v2DistSquare(v1, center) - radiusSquare);
        if (diff < d) {
            d = diff;
            t = _t;
        }
    }

    // Assume the segment is monotone，Find root through Bisection method
    // At most 32 iteration
    for (let i = 0; i < 32; i++) {
        // let prev = t - interval;
        let next = t + interval;
        // v1[0] = quadraticAt(p0[0], p1[0], p2[0], prev);
        // v1[1] = quadraticAt(p0[1], p1[1], p2[1], prev);
        v2[0] = quadraticAt(p0[0], p1[0], p2[0], t);
        v2[1] = quadraticAt(p0[1], p1[1], p2[1], t);
        v3[0] = quadraticAt(p0[0], p1[0], p2[0], next);
        v3[1] = quadraticAt(p0[1], p1[1], p2[1], next);

        let diff = v2DistSquare(v2, center) - radiusSquare;
        if (mathAbs(diff) < 1e-2) {
            break;
        }

        // let prevDiff = v2DistSquare(v1, center) - radiusSquare;
        let nextDiff = v2DistSquare(v3, center) - radiusSquare;

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
export default function (graph: Graph, scale: number) {
    let tmp0: number[] = [];
    let quadraticSubdivide = curveTool.quadraticSubdivide;
    let pts: number[][] = [[], [], []];
    let pts2: number[][] = [[], []];
    let v: number[] = [];
    scale /= 2;

    graph.eachEdge(function (edge, idx) {
        let linePoints = edge.getLayout();
        let fromSymbol = edge.getVisual('fromSymbol');
        let toSymbol = edge.getVisual('toSymbol');

        if (!linePoints.__original) {
            linePoints.__original = [
                vec2.clone(linePoints[0]),
                vec2.clone(linePoints[1])
            ];
            if (linePoints[2]) {
                linePoints.__original.push(vec2.clone(linePoints[2]));
            }
        }
        let originalPoints = linePoints.__original;
        // Quadratic curve
        if (linePoints[2] != null) {
            vec2.copy(pts[0], originalPoints[0]);
            vec2.copy(pts[1], originalPoints[2]);
            vec2.copy(pts[2], originalPoints[1]);
            if (fromSymbol && fromSymbol !== 'none') {
                let symbolSize = getSymbolSize(edge.node1);

                let t = intersectCurveCircle(pts, originalPoints[0], symbolSize * scale);
                // Subdivide and get the second
                quadraticSubdivide(pts[0][0], pts[1][0], pts[2][0], t, tmp0);
                pts[0][0] = tmp0[3];
                pts[1][0] = tmp0[4];
                quadraticSubdivide(pts[0][1], pts[1][1], pts[2][1], t, tmp0);
                pts[0][1] = tmp0[3];
                pts[1][1] = tmp0[4];
            }
            if (toSymbol && toSymbol !== 'none') {
                let symbolSize = getSymbolSize(edge.node2);

                let t = intersectCurveCircle(pts, originalPoints[1], symbolSize * scale);
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

                let symbolSize = getSymbolSize(edge.node1);

                vec2.scaleAndAdd(pts2[0], pts2[0], v, symbolSize * scale);
            }
            if (toSymbol && toSymbol !== 'none') {
                let symbolSize = getSymbolSize(edge.node2);

                vec2.scaleAndAdd(pts2[1], pts2[1], v, -symbolSize * scale);
            }
            vec2.copy(linePoints[0], pts2[0]);
            vec2.copy(linePoints[1], pts2[1]);
        }
    });
}