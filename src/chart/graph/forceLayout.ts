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

import {forceLayout} from './forceHelper';
import {cubicPosition, simpleLayout} from './simpleLayoutHelper';
import {circularLayout} from './circularLayoutHelper';
import {linearMap} from '../../util/number';
import * as vec2 from 'zrender/src/core/vector';
import * as zrUtil from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import GraphSeriesModel, { GraphNodeItemOption, GraphEdgeItemOption } from './GraphSeries';
import {getCurvenessForEdge} from '../helper/multipleGraphEdgeHelper';
import { getNodeGlobalScale, getSymbolSize } from './graphHelper';
import { GraphNode } from '../../data/Graph';

export interface ForceLayoutInstance {
    step(cb: (stopped: boolean) => void): void
    warmUp(): void
    setFixed(idx: number): void
    setUnfixed(idx: number): void
}


export default function graphForceLayout(ecModel: GlobalModel) {
    ecModel.eachSeriesByType('graph', function (graphSeries: GraphSeriesModel) {
        const coordSys = graphSeries.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            return;
        }
        if (graphSeries.get('layout') === 'force') {
            const preservedPoints = graphSeries.preservedPoints || {};
            const graph = graphSeries.getGraph();
            const nodeData = graph.data;
            const edgeData = graph.edgeData;
            const forceModel = graphSeries.getModel('force');
            const initLayout = forceModel.get('initLayout');
            if (graphSeries.preservedPoints) {
                nodeData.each(function (idx) {
                    const id = nodeData.getId(idx);
                    nodeData.setItemLayout(idx, preservedPoints[id] || [NaN, NaN]);
                });
            }
            else if (!initLayout || initLayout === 'none') {
                simpleLayout(graphSeries);
            }
            else if (initLayout === 'circular') {
                circularLayout(graphSeries, 'value');
            }

            const nodeDataExtent = nodeData.getDataExtent('value');
            const edgeDataExtent = edgeData.getDataExtent('value');
            // let edgeDataExtent = edgeData.getDataExtent('value');
            const repulsion = forceModel.get('repulsion');
            const edgeLength = forceModel.get('edgeLength');
            const repulsionArr = zrUtil.isArray(repulsion)
                ? repulsion : [repulsion, repulsion];
            let edgeLengthArr = zrUtil.isArray(edgeLength)
                ? edgeLength : [edgeLength, edgeLength];

            // Larger value has smaller length
            edgeLengthArr = [edgeLengthArr[1], edgeLengthArr[0]];

            const nodes = nodeData.mapArray('value', function (value: number, idx) {
                const point = nodeData.getItemLayout(idx) as number[];
                let rep = linearMap(value, nodeDataExtent, repulsionArr);
                if (isNaN(rep)) {
                    rep = (repulsionArr[0] + repulsionArr[1]) / 2;
                }
                return {
                    w: rep,
                    rep: rep,
                    fixed: nodeData.getItemModel<GraphNodeItemOption>(idx).get('fixed'),
                    p: (!point || isNaN(point[0]) || isNaN(point[1])) ? null : point
                };
            });
            const edges = edgeData.mapArray('value', function (value: number, idx) {
                const edge = graph.getEdgeByIndex(idx);
                let d = linearMap(value, edgeDataExtent, edgeLengthArr);
                if (isNaN(d)) {
                    d = (edgeLengthArr[0] + edgeLengthArr[1]) / 2;
                }
                const edgeModel = edge.getModel<GraphEdgeItemOption>();
                const curveness = zrUtil.retrieve3(
                    edge.getModel<GraphEdgeItemOption>().get(['lineStyle', 'curveness']),
                    -getCurvenessForEdge(edge, graphSeries, idx, true),
                    0
                );
                return {
                    n1: nodes[edge.node1.dataIndex],
                    n2: nodes[edge.node2.dataIndex],
                    d: d,
                    curveness,
                    ignoreForceLayout: edgeModel.get('ignoreForceLayout')
                };
            });

            // let coordSys = graphSeries.coordinateSystem;
            const rect = coordSys.getBoundingRect();
            const forceInstance = forceLayout(nodes, edges, {
                rect: rect,
                gravity: forceModel.get('gravity'),
                friction: forceModel.get('friction')
            });
            forceInstance.beforeStep(function (nodes, edges) {
                for (let i = 0, l = nodes.length; i < l; i++) {
                    if (nodes[i].fixed) {
                        // Write back to layout instance
                        vec2.copy(
                            nodes[i].p,
                            graph.getNodeByIndex(i).getLayout() as number[]
                        );
                    }
                }
            });
            forceInstance.afterStep(function (nodes, edges, stopped) {
                for (let i = 0, l = nodes.length; i < l; i++) {
                    if (!nodes[i].fixed) {
                        graph.getNodeByIndex(i).setLayout(nodes[i].p);
                    }
                    preservedPoints[nodeData.getId(i)] = nodes[i].p;
                }
                for (let i = 0, l = edges.length; i < l; i++) {
                    const e = edges[i];
                    const edge = graph.getEdgeByIndex(i);
                    const p1 = e.n1.p;
                    const p2 = e.n2.p;
                    let points = edge.getLayout() as number[][];
                    points = points ? points.slice() : [];
                    points[0] = points[0] || [];
                    points[1] = points[1] || [];
                    vec2.copy(points[0], p1);
                    vec2.copy(points[1], p2);
                    if (e.n1 === e.n2) {
                        const size = getSymbolSize(edge.node1);
                        const radius = getNodeGlobalScale(graphSeries) * size / 2;
                        const inEdges = edge.node1.inEdges.filter((edge) => {
                            return edge.node1 !== edge.node2;
                        });
                        const outEdges = edge.node1.outEdges.filter((edge) => {
                            return edge.node1 !== edge.node2;
                        });
                        const allNodes: GraphNode[] = [];
                        inEdges.forEach((edge) => {
                            allNodes.push(edge.node1);
                        });
                        outEdges.forEach((edge) => {
                            allNodes.push(edge.node2);
                        });
                        const vectors: any[][] = [];
                        let d = -Infinity;
                        let pt1: number[] = [];
                        let pt2: number[] = [];
                        if (allNodes.length > 1) {
                            allNodes.forEach(node => {
                                const v: any[] = [];
                                vec2.sub(v, node.getLayout(), edge.node1.getLayout());
                                vec2.normalize(v, v);
                                vectors.push(v);
                            });
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
                                const point1 = cubicPosition(pt1, p1, 10 * radius);
                                const point2 = cubicPosition(pt2, p2, 10 * radius);
                                const mid = [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2];
                                vec2.sub(mid, mid, p1);
                                const degree = Math.atan2(mid[1], mid[0]) / Math.PI * 180;
                                const v1 = [Math.cos((degree - 30) * Math.PI / 180),
                                     Math.sin((degree - 30) * Math.PI / 180)];
                                const v2 = [Math.cos((degree + 30) * Math.PI / 180),
                                     Math.sin((degree + 30) * Math.PI / 180)];
                                vec2.scaleAndAdd(v1, p1, v1, 10 * radius);
                                vec2.scaleAndAdd(v2, p2, v2, 10 * radius);
                                points[2] = v1;
                                points[3] = v2;
                            }
                            else {
                                vec2.scaleAndAdd(pt1, p1, pt1, radius);
                                vec2.scaleAndAdd(pt2, p2, pt2, radius);
                                points[2] = cubicPosition(pt1, p1, 10 * radius);
                                points[3] = cubicPosition(pt2, p2, 10 * radius);
                            }
                        }
                        else {
                            points[2] = [
                                p1[0] - radius * 4,
                                p2[1] - radius * 6
                            ];
                            points[3] = [
                                p1[0] + radius * 4,
                                p2[1] - radius * 6
                            ];
                        }
                    }
                    else if (+e.curveness) {
                        points[2] = [
                            (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * e.curveness,
                            (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * e.curveness
                        ];
                    }
                    edge.setLayout(points);
                }
            });
            graphSeries.forceLayout = forceInstance;
            graphSeries.preservedPoints = preservedPoints;

            // Step to get the layout
            forceInstance.step();
        }
        else {
            // Remove prev injected forceLayout instance
            graphSeries.forceLayout = null;
        }
    });
}
