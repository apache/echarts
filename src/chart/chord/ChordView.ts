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

import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import ChordSeriesModel from './ChordSeries';
import ChordPiece from './ChordPiece';
import { ChordEdge } from './ChordEdge';
import { parsePercent } from '../../util/number';
import { getECData } from '../../util/innerStore';

const RADIAN = Math.PI / 180;

class ChordView extends ChartView {

    static readonly type = 'chord';
    readonly type: string = ChordView.type;

    private _data: SeriesData;
    private _edgeData: SeriesData;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
    }

    render(seriesModel: ChordSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const oldData = this._data;
        const group = this.group;

        const startAngle = -seriesModel.get('startAngle') * RADIAN;

        data.diff(oldData)
            .add((newIdx) => {
                /* Consider the case when there are only two nodes A and B,
                 * and there is a link between A and B.
                 * At first, they are both disselected from legend. And then
                 * when A is selected, A will go into `add` method. But since
                 * there are no edges to be displayed, A should not be added.
                 * So we should only add A when layout is defined.
                 */

                const layout = data.getItemLayout(newIdx);
                if (layout) {
                    const el = new ChordPiece(data, newIdx, startAngle);
                    getECData(el).dataIndex = newIdx;
                    group.add(el);
                }
            })

            .update((newIdx, oldIdx) => {
                let el = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                const layout = data.getItemLayout(newIdx);

                /* Consider the case when there are only two nodes A and B,
                 * and there is a link between A and B.
                 * and when A is disselected from legend, there should be
                 * nothing to display. But in the `data.diff` method, B will go
                 * into `update` method and having no layout.
                 * In this case, we need to remove B.
                 */
                if (!layout) {
                    el && graphic.removeElementWithFadeOut(el, seriesModel, oldIdx);
                    return;
                }

                if (!el) {
                    el = new ChordPiece(data, newIdx, startAngle);
                }
                else {
                    el.updateData(data, newIdx, startAngle);
                }
                group.add(el);
            })

            .remove(oldIdx => {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                el && graphic.removeElementWithFadeOut(el, seriesModel, oldIdx);
            })

            .execute();

        if (!oldData) {
            const center = seriesModel.get('center');
            this.group.scaleX = 0.01;
            this.group.scaleY = 0.01;
            this.group.originX = parsePercent(center[0], api.getWidth());
            this.group.originY = parsePercent(center[1], api.getHeight());
            graphic.initProps(this.group, {
                scaleX: 1,
                scaleY: 1
            }, seriesModel);
        }

        this._data = data;

        this.renderEdges(seriesModel, startAngle);
    }

    renderEdges(seriesModel: ChordSeriesModel, startAngle: number) {
        const nodeData = seriesModel.getData();
        const edgeData = seriesModel.getEdgeData();
        const oldData = this._edgeData;
        const group = this.group;

        edgeData.diff(oldData)
            .add(function (newIdx) {
                const el = new ChordEdge(nodeData, edgeData, newIdx, startAngle);
                getECData(el).dataIndex = newIdx;
                group.add(el);
            })

            .update(function (newIdx, oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as ChordEdge;
                el.updateData(nodeData, edgeData, newIdx, startAngle);
                group.add(el);
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
