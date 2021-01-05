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
 * Parallel coordinate system creater.
 */

import Parallel from './Parallel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import ParallelModel from './ParallelModel';
import { CoordinateSystemMaster } from '../CoordinateSystem';
import ParallelSeriesModel from '../../chart/parallel/ParallelSeries';
import { SINGLE_REFERRING } from '../../util/model';

function createParallelCoordSys(ecModel: GlobalModel, api: ExtensionAPI): CoordinateSystemMaster[] {
    const coordSysList: CoordinateSystemMaster[] = [];

    ecModel.eachComponent('parallel', function (parallelModel: ParallelModel, idx: number) {
        const coordSys = new Parallel(parallelModel, ecModel, api);

        coordSys.name = 'parallel_' + idx;
        coordSys.resize(parallelModel, api);

        parallelModel.coordinateSystem = coordSys;
        coordSys.model = parallelModel;

        coordSysList.push(coordSys);
    });

    // Inject the coordinateSystems into seriesModel
    ecModel.eachSeries(function (seriesModel) {
        if ((seriesModel as ParallelSeriesModel).get('coordinateSystem') === 'parallel') {
            const parallelModel = seriesModel.getReferringComponents(
                'parallel', SINGLE_REFERRING
            ).models[0] as ParallelModel;
            seriesModel.coordinateSystem = parallelModel.coordinateSystem;
        }
    });

    return coordSysList;
}
const parallelCoordSysCreator = {
    create: createParallelCoordSys
};

export default parallelCoordSysCreator;
