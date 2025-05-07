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

import { EChartsExtensionInstallRegisters } from '../../extension';

import categoryFilter from './categoryFilter';
import categoryVisual from './categoryVisual';
import edgeVisual from './edgeVisual';
import simpleLayout from './simpleLayout';
import circularLayout from './circularLayout';
import forceLayout from './forceLayout';
import createView from './createView';
import View from '../../coord/View';
import GraphView from './GraphView';
import GraphSeriesModel from './GraphSeries';
import { RoamPayload, updateCenterAndZoom } from '../../action/roamHelper';
import GlobalModel from '../../model/Global';
import { noop } from 'zrender/src/core/util';
import type ExtensionAPI from '../../core/ExtensionAPI';

const actionInfo = {
    type: 'graphRoam',
    event: 'graphRoam',
    update: 'none'
};

export function install(registers: EChartsExtensionInstallRegisters) {

    registers.registerChartView(GraphView);
    registers.registerSeriesModel(GraphSeriesModel);

    registers.registerProcessor(categoryFilter);

    registers.registerVisual(categoryVisual);
    registers.registerVisual(edgeVisual);

    registers.registerLayout(simpleLayout);
    registers.registerLayout(registers.PRIORITY.VISUAL.POST_CHART_LAYOUT, circularLayout);
    registers.registerLayout(forceLayout);

    registers.registerCoordinateSystem('graphView', {
        dimensions: View.dimensions,
        create: createView
    });

    // Register legacy focus actions
    registers.registerAction({
        type: 'focusNodeAdjacency',
        event: 'focusNodeAdjacency',
        update: 'series:focusNodeAdjacency'
    }, noop);

    registers.registerAction({
        type: 'unfocusNodeAdjacency',
        event: 'unfocusNodeAdjacency',
        update: 'series:unfocusNodeAdjacency'
    }, noop);

    // Register roam action.
    registers.registerAction(actionInfo, function (payload: RoamPayload, ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachComponent({
            mainType: 'series', query: payload
        }, function (seriesModel: GraphSeriesModel) {
            const coordSys = seriesModel.coordinateSystem as View;

            const res = updateCenterAndZoom(coordSys, payload, undefined, api);

            seriesModel.setCenter
                && seriesModel.setCenter(res.center);

            seriesModel.setZoom
                && seriesModel.setZoom(res.zoom);
        });
    });


}
