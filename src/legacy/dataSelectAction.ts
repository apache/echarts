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

import { Payload, SelectChangedPayload } from '../util/types';
import SeriesModel from '../model/Series';
import { extend, each, isArray, isString } from 'zrender/src/core/util';
import GlobalModel from '../model/Global';
import { deprecateReplaceLog, deprecateLog } from '../util/log';
import Eventful from 'zrender/src/core/Eventful';
import type { EChartsType, registerAction } from '../core/echarts';
import { queryDataIndex } from '../util/model';
import ExtensionAPI from '../core/ExtensionAPI';

// Legacy data selection action.
// Includes: pieSelect, pieUnSelect, pieToggleSelect, mapSelect, mapUnSelect, mapToggleSelect
export function createLegacyDataSelectAction(seriesType: string, ecRegisterAction: typeof registerAction) {

    function getSeriesIndices(ecModel: GlobalModel, payload: Payload) {
        const seriesIndices: number[] = [];
        ecModel.eachComponent({
            mainType: 'series', subType: seriesType, query: payload
        }, function (seriesModel: SeriesModel) {
            seriesIndices.push(seriesModel.seriesIndex);
        });
        return seriesIndices;
    }

    each([
        [seriesType + 'ToggleSelect', 'toggleSelect'],
        [seriesType + 'Select', 'select'],
        [seriesType + 'UnSelect', 'unselect']
    ], function (eventsMap) {
        ecRegisterAction(eventsMap[0], function (payload, ecModel, api) {
            payload = extend({}, payload);

            if (__DEV__) {
                deprecateReplaceLog(payload.type, eventsMap[1]);
            }

            api.dispatchAction(extend(payload, {
                type: eventsMap[1],
                seriesIndex: getSeriesIndices(ecModel, payload)
            }));
        });
    });
}

function handleSeriesLegacySelectEvents(
    type: 'map' | 'pie',
    eventPostfix: 'selectchanged' | 'selected' | 'unselected',
    ecIns: EChartsType,
    ecModel: GlobalModel,
    payload: SelectChangedPayload
) {
    const legacyEventName = type + eventPostfix;
    if (!ecIns.isSilent(legacyEventName)) {
        if (__DEV__) {
            deprecateLog(`event ${legacyEventName} is deprecated.`);
        }
        ecModel.eachComponent({
            mainType: 'series', subType: 'pie'
        }, function (seriesModel: SeriesModel) {
            const seriesIndex = seriesModel.seriesIndex;
            const selectedMap = seriesModel.option.selectedMap;
            const selected = payload.selected;
            for (let i = 0; i < selected.length; i++) {
                if (selected[i].seriesIndex === seriesIndex) {
                    const data = seriesModel.getData();
                    const dataIndex = queryDataIndex(data, payload.fromActionPayload);
                    ecIns.trigger(legacyEventName, {
                        type: legacyEventName,
                        seriesId: seriesModel.id,
                        name: isArray(dataIndex) ? data.getName(dataIndex[0]) : data.getName(dataIndex),
                        selected: isString(selectedMap) ? selectedMap : extend({}, selectedMap)
                    });
                }
            }
        });
    }
}

export function handleLegacySelectEvents(messageCenter: Eventful, ecIns: EChartsType, api: ExtensionAPI) {
    messageCenter.on('selectchanged', function (params: SelectChangedPayload) {
        const ecModel = api.getModel();
        if (params.isFromClick) {
            handleSeriesLegacySelectEvents('map', 'selectchanged', ecIns, ecModel, params);
            handleSeriesLegacySelectEvents('pie', 'selectchanged', ecIns, ecModel, params);
        }
        else if (params.fromAction === 'select') {
            handleSeriesLegacySelectEvents('map', 'selected', ecIns, ecModel, params);
            handleSeriesLegacySelectEvents('pie', 'selected', ecIns, ecModel, params);
        }
        else if (params.fromAction === 'unselect') {
            handleSeriesLegacySelectEvents('map', 'unselected', ecIns, ecModel, params);
            handleSeriesLegacySelectEvents('pie', 'unselected', ecIns, ecModel, params);
        }
    });
}
