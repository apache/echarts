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

import Eventful, { EventCallback } from 'zrender/src/core/Eventful';
import SeriesModel from '../model/Series';
import GlobalModel from '../model/Global';
import { EChartsType } from './echarts';
import ExtensionAPI from './ExtensionAPI';
import { ModelFinderIdQuery, ModelFinderIndexQuery } from '../util/model';
import { DimensionLoose } from '../util/types';

export interface UpdateLifecycleTransitionSeriesFinder {
    seriesIndex?: ModelFinderIndexQuery,
    seriesId?: ModelFinderIdQuery
    dimension: DimensionLoose;
}

export interface UpdateLifecycleTransitionItem {
    // If `from` not given, it means that do not make series transition mandatorily.
    // There might be transition mapping dy default. Sometimes we do not need them,
    // which might bring about misleading.
    from?: UpdateLifecycleTransitionSeriesFinder | UpdateLifecycleTransitionSeriesFinder[];
    to: UpdateLifecycleTransitionSeriesFinder | UpdateLifecycleTransitionSeriesFinder[];
};

export type UpdateLifecycleTransitionOpt = UpdateLifecycleTransitionItem | UpdateLifecycleTransitionItem[];

export interface UpdateLifecycleParams {
    updatedSeries?: SeriesModel[]

    /**
     * If this update is from setOption and option is changed.
     */
    optionChanged?: boolean

    // Specify series to transition in this setOption.
    seriesTransition?: UpdateLifecycleTransitionOpt
}
interface LifecycleEvents {
    'afterinit': [EChartsType],
    'series:beforeupdate': [GlobalModel, ExtensionAPI, UpdateLifecycleParams],
    'series:layoutlabels': [GlobalModel, ExtensionAPI, UpdateLifecycleParams],
    'series:transition': [GlobalModel, ExtensionAPI, UpdateLifecycleParams],
    'series:afterupdate': [GlobalModel, ExtensionAPI, UpdateLifecycleParams]
    // 'series:beforeeachupdate': [GlobalModel, ExtensionAPI, SeriesModel]
    // 'series:aftereachupdate': [GlobalModel, ExtensionAPI, SeriesModel]
    'afterupdate': [GlobalModel, ExtensionAPI]
}

const lifecycle = new Eventful<{
    [key in keyof LifecycleEvents]: EventCallback<LifecycleEvents[key]>
}>();


export default lifecycle;

export {LifecycleEvents};