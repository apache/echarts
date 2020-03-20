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
import {simpleLayout} from './simpleLayoutHelper';
import {circularLayout} from './circularLayoutHelper';
import {linearMap} from '../../util/number';
import * as vec2 from 'zrender/src/core/vector';
import * as zrUtil from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import GraphSeriesModel, { GraphNodeItemOption, GraphEdgeItemOption } from './GraphSeries';

export interface ForceLayoutInstance {
    step(cb: (stopped: boolean) => void): void
    warmUp(): void
    setFixed(idx: number): void
    setUnfixed(idx: number): void
}


export default function (ecModel: GlobalModel) {
    ecModel.eachSeriesByType('graph', function (graphSeries: GraphSeriesModel) {
        const coordSys = graphSeries.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            return;
        }
        if (graphSeries.get('layout') === 'force') {
            let preservedPoints = graphSeries.preservedPoints || {};
            let graph = graphSeries.getGraph();
            let nodeData = graph.data;
            let edgeData = graph.edgeData;
            let forceModel = graphSeries.getModel('force');
            let initLayout = forceModel.get('initLayout');
            if (graphSeries.preservedPoints) {
                nodeData.each(function (idx) {
                    let id = nodeData.getId(idx);
                    nodeData.setItemLayout(idx, preservedPoints[id] || [NaN, NaN]);
                });
            }
            else if (!initLayout || initLayout === 'none') {
                simpleLayout(graphSeries);
            }
            else if (initLayout === 'circular') {
                circularLayout(graphSeries, 'value');
            }

            let nodeDataExtent = nodeData.getDataExtent('value');
            let edgeDataExtent = edgeData.getDataExtent('value');
            // let edgeDataExtent = edgeData.getDataExtent('value');
            let repulsion = forceModel.get('repulsion');
            let edgeLength = forceModel.get('edgeLength');
            let repulsionArr = zrUtil.isArray(repulsion)
                ? repulsion : [repulsion, repulsion];
            let edgeLengthArr = zrUtil.isArray(edgeLength)
                ? edgeLength : [edgeLength, edgeLength];

            // Larger value has smaller length
            edgeLengthArr = [edgeLengthArr[1], edgeLengthArr[0]];

            let nodes = nodeData.mapArray('value', function (value: number, idx) {
                let point = nodeData.getItemLayout(idx) as number[];
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
            let edges = edgeData.mapArray('value', function (value: number, idx) {
                let edge = graph.getEdgeByIndex(idx);
                let d = linearMap(value, edgeDataExtent, edgeLengthArr);
                if (isNaN(d)) {
                    d = (edgeLengthArr[0] + edgeLengthArr[1]) / 2;
                }
                let edgeModel = edge.getModel<GraphEdgeItemOption>();
                return {
                    n1: nodes[edge.node1.dataIndex],
                    n2: nodes[edge.node2.dataIndex],
                    d: d,
                    curveness: edgeModel.get(['lineStyle', 'curveness']) || 0,
                    ignoreForceLayout: edgeModel.get('ignoreForceLayout')
                };
            });

            // let coordSys = graphSeries.coordinateSystem;
            let rect = coordSys.getBoundingRect();
            let forceInstance = forceLayout(nodes, edges, {
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
                    let e = edges[i];
                    let edge = graph.getEdgeByIndex(i);
                    let p1 = e.n1.p;
                    let p2 = e.n2.p;
                    let points = edge.getLayout() as number[][];
                    points = points ? points.slice() : [];
                    points[0] = points[0] || [];
                    points[1] = points[1] || [];
                    vec2.copy(points[0], p1);
                    vec2.copy(points[1], p2);
                    if (+e.curveness) {
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
