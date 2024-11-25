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

import GlobalModel from '../../model/Global';
import ChordSeriesModel from './ChordSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import { getCircleLayout } from '../../util/layout';
import SeriesModel from '../../model/Series';
import { CircleLayoutOptionMixin, SeriesOption } from '../../util/types';

const RADIAN = Math.PI / 180;

export default function chordCircularLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('chord', function (seriesModel: ChordSeriesModel) {
        chordLayout(seriesModel, api);
    });
}

function chordLayout(seriesModel: ChordSeriesModel, api: ExtensionAPI) {
    const nodeData = seriesModel.getData();
    const nodeGraph = nodeData.graph;
    const edgeData = seriesModel.getEdgeData();
    const edgeCount = edgeData.count();

    if (!edgeCount) {
        return;
    }

    const { cx, cy, r, r0 } = getCircleLayout(
        seriesModel as unknown as SeriesModel<CircleLayoutOptionMixin & SeriesOption<unknown>>,
        api
    );
    const padAngle = (seriesModel.get('padAngle') || 0) * RADIAN;
    const minAngle = (seriesModel.get('minAngle') || 0) * RADIAN;
    const totalAngle = Math.PI * 2;

    // Sum of each node's edge values
    const nodeValues: number[] = [];
    nodeGraph.eachEdge(function (edge) {
        const value = edge.getValue('value') as number;
        const node1Index = edge.node1.dataIndex;
        const node2Index = edge.node2.dataIndex;
        nodeValues[node1Index] = (nodeValues[node1Index] || 0) + value;
        nodeValues[node2Index] = (nodeValues[node2Index] || 0) + value;
    });

    let renderedNodeCount = minAngle
        // If mingAngle is set, node count is always the number in the option
        ? nodeData.count()
        // If not, node count is those with value > 0 to avoid padAngle
        // being rendered multiple times on void data
        : nodeValues.filter(val => val > 0).length;

    const edgeValueSum = edgeData.getSum('value');
    const unitAngle = (totalAngle - padAngle * renderedNodeCount)
        / (edgeValueSum * 2 || edgeCount); // / 2 for two edges for a pair of nodes

    let edgeAccAngle: number[] = [];
    let nonMinAngleAccAngle = 0;
    let minAngleCount = 0;

    const calculateNodeLayout = (scale: number = 1) => {
        let angle = -seriesModel.get('startAngle') * RADIAN;
        nonMinAngleAccAngle = 0;
        edgeAccAngle = [];
        minAngleCount = 0;
        nodeGraph.eachNode(node => {
            const value = nodeValues[node.dataIndex] || 0;
            let spanAngle = unitAngle * (edgeValueSum ? value : 1) * scale;
            let nodeScale = 1;

            if (spanAngle <= minAngle) {
                nodeScale = spanAngle ? minAngle / spanAngle * scale : 1;
                spanAngle = minAngle;
                minAngleCount++;
            }
            else {
                nonMinAngleAccAngle += spanAngle;
                nodeScale = scale;
            }

            node.setLayout({
                cx,
                cy,
                r0,
                r,
                startAngle: angle,
                endAngle: angle + spanAngle,
                scale: nodeScale
            });

            edgeAccAngle[node.dataIndex] = angle;

            angle += spanAngle + padAngle;
        });
    }
    calculateNodeLayout();

    // Total angle may exceed Math.PI * 2 due to mingAngle, scale down
    let scale = 1;
    const currentSpan = nonMinAngleAccAngle + minAngleCount * minAngle
        + padAngle * renderedNodeCount;
    if ((currentSpan > totalAngle) && nonMinAngleAccAngle) {
        const restAngle = totalAngle - minAngle * minAngleCount
            - padAngle * renderedNodeCount;
        scale = restAngle / nonMinAngleAccAngle;
        calculateNodeLayout(scale);
    }

    nodeGraph.eachEdge(function (edge) {
        const value = edge.getValue('value') as number;
        const spanAngle = unitAngle * (edgeValueSum ? value : 1);

        const node1Index = edge.node1.dataIndex;
        const sStartAngle = edgeAccAngle[node1Index] || 0;
        const sSpan = edge.node1.getLayout().scale * spanAngle;
        const sEndAngle = sStartAngle + sSpan;
        const s1 = [
            cx + r0 * Math.cos(sStartAngle),
            cy + r0 * Math.sin(sStartAngle)
        ];
        const s2 = [
            cx + r0 * Math.cos(sEndAngle),
            cy + r0 * Math.sin(sEndAngle)
        ];

        const node2Index = edge.node2.dataIndex;
        const tStartAngle = edgeAccAngle[node2Index] || 0;
        const tSpan = edge.node2.getLayout().scale * spanAngle;
        const tEndAngle = tStartAngle + tSpan;
        const t1 = [
            cx + r0 * Math.cos(tStartAngle),
            cy + r0 * Math.sin(tStartAngle)
        ];
        const t2 = [
            cx + r0 * Math.cos(tEndAngle),
            cy + r0 * Math.sin(tEndAngle)
        ];

        edge.setLayout({
            s1,
            s2,
            sStartAngle,
            sEndAngle,
            t1,
            t2,
            tStartAngle,
            tEndAngle,
            cx,
            cy,
            r: r0
        });

        edgeAccAngle[node1Index] = sEndAngle;
        edgeAccAngle[node2Index] = tEndAngle;
    });
}
