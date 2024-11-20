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

import * as zrUtil from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import ChordSeriesModel, { ChordEdgeItemOption } from './ChordSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import { getViewRect, getCircleLayout } from '../../util/layout';
import SeriesModel from '../../model/Series';
import { CircleLayoutOptionMixin, SeriesOption } from '../../util/types';
import { GraphNode } from '../../data/Graph';
import { getCurvenessForEdge } from '../helper/multipleGraphEdgeHelper';
import {ChordPathShape} from './ChordEdge';

const RADIAN = Math.PI / 180;

export default function chordCircularLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('chord', function (seriesModel: ChordSeriesModel) {
        chordLayout(seriesModel, api);
    });
}

function chordLayout(seriesModel: ChordSeriesModel, api: ExtensionAPI) {
    const viewRect = getViewRect(seriesModel, api);

    const { cx, cy, r, r0 } = getCircleLayout(
        seriesModel as unknown as SeriesModel<CircleLayoutOptionMixin & SeriesOption<unknown>>,
        api
    );

    const nodeData = seriesModel.getData();
    const nodeGraph = nodeData.graph;

    const edgeData = seriesModel.getEdgeData();
    const edgeCount = edgeData.count();

    nodeData.setLayout({
        cx: cx,
        cy: cy
    });

    if (!edgeCount) {
        return;
    }

    nodeGraph.eachNode(node => {
        node.setLayout({
            value: 0
        });
    })

    const updateNodeLayout = (node: GraphNode, edgeValue: number) => {
        const layout = node.getLayout();
        node.setLayout({
            value: layout.value + edgeValue
        });
    };

    nodeGraph.eachEdge(function (edge) {
        const value = edge.getValue('value') as number;
        updateNodeLayout(edge.node1, value);
        updateNodeLayout(edge.node2, value);
    });

    let angle = -seriesModel.get('startAngle') * RADIAN;
    const sum = edgeData.getSum('value');
    // / 2 for two edges for a pair of nodes
    const unitAngle = Math.PI * 2 / (sum || edgeCount) / 2;
    nodeGraph.eachNode(node => {
        const value = node.getLayout().value as number;

        const spanAngle = unitAngle * (sum ? value : 1);

        node.setLayout({
            cx,
            cy,
            r0,
            r,
            startAngle: angle,
            endAngle: angle + spanAngle,
            accAngle: angle // For edge shapes
        });
        angle += spanAngle;
    });

    const layoutNodeOfEdge = (node: GraphNode, spanAngle: number): number[][] => {
        const node1Layout = node.getLayout();
        const node1AccAngle = node1Layout.accAngle;
        const point1 = [
            node1Layout.cx + r0 * Math.cos(node1AccAngle),
            node1Layout.cy + r0 * Math.sin(node1AccAngle)
        ];
        const point2 = [
            node1Layout.cx + r0 * Math.cos(node1AccAngle + spanAngle),
            node1Layout.cy + r0 * Math.sin(node1AccAngle + spanAngle)
        ];
        node.setLayout({
            accAngle: node1AccAngle + spanAngle
        }, true);
        return [point1, point2];
    };

    nodeGraph.eachEdge(function (edge, index) {
        let curveness = zrUtil.retrieve3(
            edge.getModel<ChordEdgeItemOption>().get(['lineStyle', 'curveness']),
            getCurvenessForEdge(edge, seriesModel, index),
            0
        );
        console.log(curveness);

        const value = edge.getValue('value') as number;
        const spanAngle = unitAngle * (sum ? value : 1);

        const node1Points = layoutNodeOfEdge(edge.node1, spanAngle);
        const node2Points = layoutNodeOfEdge(edge.node2, spanAngle);
        const cp: number[][] = [];
        zrUtil.each([0, 1], i => {
            const p1 = node1Points[i];
            const p2 = node2Points[1 - i];
            cp[i] = null;
            const x12 = (p1[0] + p2[0]) / 2;
            const y12 = (p1[1] + p2[1]) / 2;
            if (+curveness) {
                curveness *= 3;
                cp[i] = [
                    cx * curveness + x12 * (1 - curveness),
                    cy * curveness + y12 * (1 - curveness)
                ];
            }
        });
        edge.setLayout({
            n11: node1Points[0],
            n12: node1Points[1],
            n21: node2Points[0],
            n22: node2Points[1],

            cp1: cp[0],
            cp2: cp[1],

            cx,
            cy,
            r: r0
        } as ChordPathShape);
    });
}
