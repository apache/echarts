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

import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import ChordSeriesModel from './ChordSeries';
import ChordPiece from './ChordPiece';

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
                const chordPiece = new ChordPiece(data, newIdx, 90);
                data.setItemGraphicEl(newIdx, chordPiece);
                group.add(chordPiece);
            })

            .update(function (newIdx, oldIdx) {
                const chordPiece = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                chordPiece.updateData(data, newIdx);
                group.add(chordPiece);
                data.setItemGraphicEl(newIdx, chordPiece);
            })

            .remove(function (oldIdx) {
                const chordPiece = oldData.getItemGraphicEl(oldIdx) as ChordPiece;
                group.remove(chordPiece);
            })

            .execute();

    }

    dispose() {

    }
}

export default ChordView;
