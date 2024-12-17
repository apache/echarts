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
import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import ChordSeriesModel from './ChordSeries';
import ChordPiece from './ChordPiece';
import { ChordEdge } from './ChordEdge';
import { normalizeArcAngles } from 'zrender/src/core/PathProxy';

const PI2 = Math.PI * 2;
const RADIAN = Math.PI / 180;

class ChordView extends ChartView {

    static readonly type = 'chord';
    readonly type: string = ChordView.type;

    private _data: SeriesData;
    private _edgeData: SeriesData;
    private _edgeGroup: Group;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
    }

    render(seriesModel: ChordSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const oldData = this._data;
        const group = this.group;

        const startAngle = -seriesModel.get('startAngle') * RADIAN;

        data.diff(oldData)
            .add(function (newIdx) {
                const el = new ChordPiece(data, newIdx, startAngle);
                data.setItemGraphicEl(newIdx, el);
                group.add(el);
            })

            .update(function (newIdx, oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                el.updateData(data, newIdx, startAngle);
                data.setItemGraphicEl(newIdx, el);
                group.add(el);
            })

            .remove(function (oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                el && graphic.removeElementWithFadeOut(el, seriesModel, oldIdx);
            })

            .execute();

        this._data = data;

        this.renderEdges(seriesModel, startAngle);
    }

    renderEdges(seriesModel: ChordSeriesModel, startAngle: number) {
        if (!this._edgeGroup) {
            this._edgeGroup = new Group();
            this.group.add(this._edgeGroup);
        }

        const edgeGroup = this._edgeGroup;
        edgeGroup.removeAll();

        const nodeData = seriesModel.getData();
        const edgeData = seriesModel.getEdgeData();
        const oldData = this._edgeData;

        edgeData.diff(oldData)
            .add(function (newIdx) {
                const el = new ChordEdge(nodeData, edgeData, newIdx, startAngle);
                edgeData.setItemGraphicEl(newIdx, el);
                edgeGroup.add(el);
            })

            .update(function (newIdx, oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordEdge;
                el.updateData(nodeData, edgeData, newIdx, startAngle);
                edgeData.setItemGraphicEl(newIdx, el);
                edgeGroup.add(el);
            })

            .remove(function (oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordEdge;
                el && graphic.removeElementWithFadeOut(el, seriesModel, oldIdx);
            })

            .execute();

        this._edgeData = edgeData;
    }

    dispose() {

    }
}


export default ChordView;
