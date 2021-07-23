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
import Graph from '../../data/Graph';
import * as zrUtil from 'zrender/src/core/util';
import {getCurvenessForEdge} from '../helper/multipleGraphEdgeHelper';


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
        let points = [p1, p2];
        if (+curveness && edge.node1 !== edge.node2) {
            points.push([
                (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness / 2,
                (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness / 2
            ]);
            points.push([
                (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness / 2,
                (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness / 2
            ]);
        }
        if (edge.node1 === edge.node2) {
            const size = Number(seriesModel.get('symbolSize'));
            points = [[p1[0] + size / 4, p1[1] - size / 5], [p2[0] + size / 4, p2[1] - size / 5]];
            points.push([
                (points[0][0] + points[1][0]) / 2 - Number(size) * 2,
                (points[0][1] + points[1][1]) / 2 + Number(size) * 2.5
            ]);
            points.push([
                (points[0][0] + points[1][0]) / 2 - Number(size) * 2,
                (points[0][1] + points[1][1]) / 2 - Number(size) * 1.5
            ]);
        }
        edge.setLayout(points);
    });
}
