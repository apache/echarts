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

import * as vec2 from 'zrender/src/core/vector';
import GraphSeriesModel, { GraphNodeItemOption, GraphEdgeItemOption } from './GraphSeries';
import Graph, { GraphNode } from '../../data/Graph';
import * as zrUtil from 'zrender/src/core/util';
import {getCurvenessForEdge} from '../helper/multipleGraphEdgeHelper';
import { getNodeGlobalScale } from './graphHelper';

function cubicPosition(pt: number[], center: number[], radius: number) {
    const rSquare = radius * radius;
    const sqrt = Math.sqrt;
    const pow = Math.pow;
    const out: number[] = [];
    if (pt[0] < center[0]) {
        out[0] = sqrt(rSquare / (1 + (pow(pt[1] - center[1], 2) / pow(pt[0] - center[0], 2)))) + center[0];
    }
    else if (pt[0] >= center[0]) {
        out[0] = -sqrt(rSquare / (1 + (pow(pt[1] - center[1], 2) / pow(pt[0] - center[0], 2)))) + center[0];
    }
    if (pt[1] < center[1]) {
        out[1] = sqrt(rSquare / (1 + (pow(pt[0] - center[0], 2) / pow(pt[1] - center[1], 2)))) + center[1];
    }
    else if (pt[1] - center[1] >= 0) {
        out[1] = -sqrt(rSquare / (1 + (pow(pt[0] - center[0], 2) / pow(pt[1] - center[1], 2)))) + center[1];
    }
    return out;
}

export function simpleLayout(seriesModel: GraphSeriesModel) {
    const coordSys = seriesModel.coordinateSystem;
    if (coordSys && coordSys.type !== 'view') {
        return;
    }
    const graph = seriesModel.getGraph();

    graph.eachNode(function (node) {
        const model = node.getModel<GraphNodeItemOption>();
        node.setLayout([+model.get('x'), +model.get('y')]);
    });

    simpleLayoutEdge(graph, seriesModel);
}

export function simpleLayoutEdge(graph: Graph, seriesModel: GraphSeriesModel) {
    graph.eachEdge(function (edge, index) {
        const curveness = zrUtil.retrieve3(
            edge.getModel<GraphEdgeItemOption>().get(['lineStyle', 'curveness']),
            -getCurvenessForEdge(edge, seriesModel, index, true),
            0
        );
        const p1 = vec2.clone(edge.node1.getLayout());
        const p2 = vec2.clone(edge.node2.getLayout());
        const points = [p1, p2];
        if (edge.node1 === edge.node2) {
            const symbolSize = seriesModel.get('symbolSize');
            const size = zrUtil.isArray(symbolSize) ? Number((symbolSize[0] + symbolSize[1]) / 2) : Number(symbolSize);
            const radius = getNodeGlobalScale(seriesModel) * size / 2;
            const inEdges = edge.node1.inEdges.filter((edge) => {
                return edge.node1 !== edge.node2;
            });
            const outEdges = edge.node1.outEdges.filter((edge) => {
                return edge.node1 !== edge.node2;
            });
            const allNodes: GraphNode[] = []
            inEdges.forEach((edge) => {
                allNodes.push(edge.node1);
            });
            outEdges.forEach((edge) => {
                allNodes.push(edge.node2);
            });
            console.log(allNodes)
            const vectors: any[][] = [];
            let d = -Infinity;
            let pt1: number[] = [];
            let pt2: number[] = [];
            if (allNodes.length > 1) {
                allNodes.forEach(node => {
                    let v: any[] = [];
                    vec2.sub(v, node.getLayout(), edge.node1.getLayout());
                    vec2.normalize(v, v);
                    vectors.push(v);
                })
                // find the max angle
                for (let i = 0; i < vectors.length; i++) {
                    for (let j = i + 1; j < vectors.length; j++) {
                        if (vec2.distSquare(vectors[i], vectors[j]) > d) {
                            d = vec2.distSquare(vectors[i], vectors[j]);
                            pt1 = vectors[i];
                            pt2 = vectors[j];
                        }
                    }
                }
                // if the angle is more than sixty degree
                if (vec2.distSquare(pt1, pt2) > Math.sqrt(3)) {
                    vec2.scaleAndAdd(pt1, p1, pt1, radius);
                    vec2.scaleAndAdd(pt2, p2, pt2, radius);
                    const point1 = cubicPosition(pt1, p1, 10 * radius)
                    const point2 = cubicPosition(pt2, p2, 10 * radius)
                    const mid = [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2];
                    vec2.sub(mid, mid, p1);
                    const degree = Math.atan2(mid[1], mid[0]) / Math.PI * 180
                    const v1 = [Math.cos((degree - 30) * Math.PI /180), Math.sin((degree - 30) * Math.PI / 180)];
                    const v2 = [Math.cos((degree + 30) * Math.PI / 180), Math.sin((degree + 30) * Math.PI / 180)];
                    vec2.scaleAndAdd(v1, p1, v1, 10 * radius);
                    vec2.scaleAndAdd(v2, p2, v2, 10 * radius);
                    console.log(v1,v2)
                    points.push(v1, v2);
                }
                else {
                    vec2.scaleAndAdd(pt1, p1, pt1, radius);
                    vec2.scaleAndAdd(pt2, p2, pt2, radius);
                    points.push(cubicPosition(pt1, p1, 10 * radius));
                    points.push(cubicPosition(pt2, p2, 10 * radius));
                }
            }
            else {
                points.push([
                    p1[0] - radius * 4,
                    p2[1] - radius * 6,
                ]);
                points.push([
                    p1[0] + radius * 4,
                    p2[1] - radius * 6,
                ]);
            }
        }
        else if (+curveness) {
            points.push([
                (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness,
                (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness
            ]);
        }
        edge.setLayout(points);
    });
}
