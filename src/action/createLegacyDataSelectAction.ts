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

import * as echarts from '../echarts';
import { Payload } from '../util/types';
import SeriesModel from '../model/Series';
import { extend } from 'zrender/src/core/util';
import GlobalModel from '../model/Global';
import { __DEV__ } from '../config';
import { deprecateReplaceLog } from '../util/log';


// Legacy data selection action.
// Inlucdes: pieSelect, pieUnSelect, pieToggleSelect, mapSelect, mapUnSelect, mapToggleSelect
export default function (seriesType: string) {

    function getSeriesIndices(ecModel: GlobalModel, payload: Payload) {
        const seriesIndices: number[] = [];
        ecModel.eachComponent({
            mainType: 'series', subType: seriesType, query: payload
        }, function (seriesModel: SeriesModel) {
            seriesIndices.push(seriesModel.seriesIndex);
        });
        return seriesIndices;
    }

    echarts.registerAction(seriesType + 'ToggleSelect', function (payload, ecModel, api) {
        payload = extend({}, payload);

        if (__DEV__) {
            deprecateReplaceLog(payload.type, 'toggleSelect');
        }

        api.dispatchAction(extend(payload, {
            type: 'toggleSelect',
            seriesIndex: getSeriesIndices(ecModel, payload)
        }));
    });

    echarts.registerAction(seriesType + 'Select', function (payload, ecModel, api) {
        payload = extend({}, payload);

        if (__DEV__) {
            deprecateReplaceLog(payload.type, 'select');
        }

        api.dispatchAction(extend(payload, {
            type: 'select',
            seriesIndex: getSeriesIndices(ecModel, payload)
        }));
    });

    echarts.registerAction(seriesType + 'UnSelect', function (payload, ecModel, api) {
        payload = extend({}, payload);

        if (__DEV__) {
            deprecateReplaceLog(payload.type, 'unselect');
        }

        api.dispatchAction(extend(payload, {
            type: 'unselect',
            seriesIndex: getSeriesIndices(ecModel, payload)
        }));
    });
}