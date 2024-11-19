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
import { getViewRect, getCircleLayout } from '../../util/layout';
import SeriesModel from '../../model/Series';
import { CircleLayoutOptionMixin, SeriesOption } from '../../util/types';

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

    nodeGraph.eachEdge(function (edge) {
        const value = edge.getValue('value') as number;
        edge.node1.setLayout({
            value: edge.node1.getLayout().value + value
        });
        edge.node2.setLayout({
            value: edge.node2.getLayout().value + value
        });
    });

    let angle = -seriesModel.get('startAngle') * RADIAN;
    // * 2 for two edges for a pair of nodes
    const sum = edgeData.getSum('value') * 2;
    const unitAngle = Math.PI * 2 / (sum || edgeCount);
    nodeGraph.eachNode(node => {
        const value = node.getLayout().value as number;

        const radian = unitAngle * (sum ? value : 1);

        node.setLayout({
            cx,
            cy,
            r0,
            r,
            startAngle: angle,
            endAngle: angle + radian
        });
        angle += radian;
    });
}
