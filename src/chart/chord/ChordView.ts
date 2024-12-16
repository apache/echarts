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

import Group from 'zrender/src/graphic/Group';
import type { PathStyleProps } from 'zrender/src/graphic/Path';
import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import ChordSeriesModel, { ChordEdgeItemOption, ChordEdgeLineStyleOption, ChordNodeItemOption } from './ChordSeries';
import ChordPiece from './ChordPiece';
import { ChordEdge } from './ChordEdge';
import type { GraphEdge } from '../../data/Graph';
import { isString } from 'zrender/src/core/util';

class ChordView extends ChartView {

    static readonly type = 'chord';
    readonly type: string = ChordView.type;

    private _data: SeriesData;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
    }

    render(seriesModel: ChordSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();

        const oldData = this._data;
        const group = this.group;

        data.diff(oldData)
            .add(function (newIdx) {
                const el = new ChordPiece(data, newIdx, 90);
                data.setItemGraphicEl(newIdx, el);
                group.add(el);
            })

            .update(function (newIdx, oldIdx) {
                let el = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                if (!el) {
                    el = new ChordPiece(data, newIdx, 90);
                }

                el.updateData(data, newIdx);
                group.add(el);
                data.setItemGraphicEl(newIdx, el);
            })

            .remove(function (oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                el && graphic.removeElementWithFadeOut(el, seriesModel, oldIdx);
            })

            .execute();

        this.renderEdges(seriesModel);

        this._data = data;
    }

    renderEdges(seriesModel: ChordSeriesModel) {
        const edgeGroup = new Group();
        this.group.add(edgeGroup);

        const nodeData = seriesModel.getData();
        const nodeGraph = nodeData.graph;

        const edgeData = seriesModel.getEdgeData();
        nodeGraph.eachEdge(function (edge) {
            const layout = edge.getLayout();
            const itemModel = edge.node1.getModel<ChordNodeItemOption>();
            const borderRadius = itemModel.get(['itemStyle', 'borderRadius']);
            const edgeModel = edgeData.getItemModel<ChordEdgeItemOption>(edge.dataIndex);
            const lineStyle = edgeModel.getModel('lineStyle');
            const lineColor = lineStyle.get('color');

            let el = edgeData.getItemGraphicEl(edge.dataIndex) as ChordEdge;
            if (!el) {
                el = new ChordEdge({
                    shape: {
                        r: borderRadius,
                        ...layout
                    },
                    style: lineStyle.getItemStyle()
                });
            }
            applyEdgeFill(el, edge, nodeData, lineColor);
            edgeGroup.add(el);

            edgeData.setItemGraphicEl(edge.dataIndex, el);
        });
    }

    dispose() {

    }
}

function applyEdgeFill(
    edgeShape: ChordEdge,
    edge: GraphEdge,
    nodeData: SeriesData<ChordSeriesModel>,
    color: ChordEdgeLineStyleOption['color']
) {
    const node1 = edge.node1;
    const node2 = edge.node2;
    const edgeStyle = edgeShape.style as PathStyleProps;
    switch (color) {
        case 'source':
            // TODO: use visual and node1.getVisual('color');
            edgeStyle.fill = nodeData.getItemVisual(edge.node1.dataIndex, 'style').fill;
            edgeStyle.decal = edge.node1.getVisual('style').decal;
            break;
        case 'target':
            edgeStyle.fill = nodeData.getItemVisual(edge.node2.dataIndex, 'style').fill;
            edgeStyle.decal = edge.node2.getVisual('style').decal;
            break;
        case 'gradient':
            const sourceColor = nodeData.getItemVisual(edge.node1.dataIndex, 'style').fill;
            const targetColor = nodeData.getItemVisual(edge.node2.dataIndex, 'style').fill;
            if (isString(sourceColor) && isString(targetColor)) {
                // Gradient direction is perpendicular to the mid-angles
                // of source and target nodes.
                const shape = edgeShape.shape;
                const sMidX = (shape.s1[0] + shape.s2[0]) / 2;
                const sMidY = (shape.s1[1] + shape.s2[1]) / 2;
                const tMidX = (shape.t1[0] + shape.t2[0]) / 2;
                const tMidY = (shape.t1[1] + shape.t2[1]) / 2;
                edgeStyle.fill = new graphic.LinearGradient(
                    sMidX, sMidY, tMidX, tMidY,
                    [
                        { offset: 0, color: sourceColor },
                        { offset: 1, color: targetColor }
                    ],
                    true
                );
            }
            break;
    }
}

export default ChordView;
