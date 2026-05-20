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

import { graphEdgeVisualStageHandler } from './edgeVisual';
import { graphSimpleLayoutStageHandler } from './simpleLayout';
import { graphCircularLayoutStageHandler } from './circularLayout';
import { graphForceLayoutStageHandler } from './forceLayout';
import createView from './createView';
import View from '../../coord/View';
import GraphView from './GraphView';
import GraphSeriesModel, { SERIES_TYPE_GRAPH } from './GraphSeries';
import {registerRoamActionSimply} from '../../component/helper/roamHelper';
import { noop } from 'zrender/src/core/util';
import { graphCategoryFilterStageHandler } from './categoryFilter';
import { graphCategoryVisualStageHandler } from './categoryVisual';
import { COMPONENT_MAIN_TYPE_SERIES } from '../../util/types';


export function install(registers: EChartsExtensionInstallRegisters) {

    registers.registerChartView(GraphView);
    registers.registerSeriesModel(GraphSeriesModel);

    registers.registerProcessor(graphCategoryFilterStageHandler);

    registers.registerVisual(graphCategoryVisualStageHandler);
    registers.registerVisual(graphEdgeVisualStageHandler);

    registers.registerLayout(graphSimpleLayoutStageHandler);
    registers.registerLayout(registers.PRIORITY.VISUAL.POST_CHART_LAYOUT, graphCircularLayoutStageHandler);
    registers.registerLayout(graphForceLayoutStageHandler);

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

    registerRoamActionSimply(registers, COMPONENT_MAIN_TYPE_SERIES, SERIES_TYPE_GRAPH);

}
