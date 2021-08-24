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

/**
 * Single coordinate system creator.
 */

import Single, { singleDimensions } from './Single';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SingleAxisModel from './AxisModel';
import SeriesModel from '../../model/Series';
import { SeriesOption } from '../../util/types';
import { SINGLE_REFERRING } from '../../util/model';

/**
 * Create single coordinate system and inject it into seriesModel.
 */
function create(ecModel: GlobalModel, api: ExtensionAPI) {
    const singles: Single[] = [];

    ecModel.eachComponent('singleAxis', function (axisModel: SingleAxisModel, idx: number) {

        const single = new Single(axisModel, ecModel, api);
        single.name = 'single_' + idx;
        single.resize(axisModel, api);
        axisModel.coordinateSystem = single;
        singles.push(single);

    });

    ecModel.eachSeries(function (seriesModel: SeriesModel<SeriesOption & {
        singleAxisIndex?: number
        singleAxisId?: string
    }>) {
        if (seriesModel.get('coordinateSystem') === 'singleAxis') {
            const singleAxisModel = seriesModel.getReferringComponents(
                'singleAxis', SINGLE_REFERRING
            ).models[0] as SingleAxisModel;
            seriesModel.coordinateSystem = singleAxisModel && singleAxisModel.coordinateSystem;
        }
    });

    return singles;
}

const singleCreator = {
    create: create,
    dimensions: singleDimensions
};

export default singleCreator;