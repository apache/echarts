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
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import ChordSeriesModel from './ChordSeries';
import ChordPiece from './ChordPiece';
import { Polygon } from '../../util/graphic';
import { ChordEdge } from './ChordEdge';

class ChordView extends ChartView {

    static readonly type = 'chord';
    readonly type: string = ChordView.type;

    private _data: SeriesData;
    private _edgeGroup: Group;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        this._edgeGroup = new Group();
        this.group.add(this._edgeGroup);
    }

    render(seriesModel: ChordSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();

        const oldData = this._data;
        const group = this.group;

        data.diff(oldData)
            .add(function (newIdx) {
                const chordPiece = new ChordPiece(data, newIdx, 90);
                data.setItemGraphicEl(newIdx, chordPiece);
                group.add(chordPiece);
            })

            .update(function (newIdx, oldIdx) {
                const chordPiece = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                chordPiece.updateData(data, newIdx);
                data.setItemGraphicEl(newIdx, chordPiece);
            })

            .remove(function (oldIdx) {
                const chordPiece = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                group.remove(chordPiece);
            })

            .execute();

        this.renderEdges(seriesModel);

        this._data = data;
    }

    renderEdges(seriesModel: ChordSeriesModel) {
        this._edgeGroup.removeAll();

        const nodeData = seriesModel.getData();
        const nodeGraph = nodeData.graph;

        const edgeGroup = this._edgeGroup;
        nodeGraph.eachEdge(function (edge, index) {
            // if (index > 0) {
            //     return;
            // }
            const layout = edge.getLayout();
            const itemModel = edge.node1.getModel();

            const style = nodeData.getItemVisual(edge.node1.dataIndex, 'style');
            console.log();
            const edgeShape = new ChordEdge({
                shape: layout,
                style: {
                    fill: style.fill,
                    // fill: 'rgba(200,0,0,0.2)',
                    // stroke: '#f00',
                    opacity: 0.5
                }
            });
            edgeGroup.add(edgeShape);
        });
    }

    dispose() {

    }
}

export default ChordView;
