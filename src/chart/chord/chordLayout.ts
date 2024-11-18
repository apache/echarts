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
}
