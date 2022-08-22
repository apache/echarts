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

import {updateCenterAndZoom, RoamPayload} from '../../action/roamHelper';
import { Payload } from '../../util/types';
import TreeSeriesModel from './TreeSeries';
import GlobalModel from '../../model/Global';
import { EChartsExtensionInstallRegisters } from '../../extension';
import type ExtensionAPI from '../../core/ExtensionAPI';

export interface TreeExpandAndCollapsePayload extends Payload {
    dataIndex: number
}

export function installTreeAction(registers: EChartsExtensionInstallRegisters) {
    registers.registerAction({
        type: 'treeExpandAndCollapse',
        event: 'treeExpandAndCollapse',
        update: 'update'
    }, function (payload: TreeExpandAndCollapsePayload, ecModel) {
        ecModel.eachComponent({
            mainType: 'series', subType: 'tree', query: payload
        }, function (seriesModel: TreeSeriesModel) {
            const dataIndex = payload.dataIndex;
            const tree = seriesModel.getData().tree;
            const node = tree.getNodeByDataIndex(dataIndex);
            node.isExpand = !node.isExpand;
        });
    });

    registers.registerAction({
        type: 'treeRoam',
        event: 'treeRoam',
        // Here we set 'none' instead of 'update', because roam action
        // just need to update the transform matrix without having to recalculate
        // the layout. So don't need to go through the whole update process, such
        // as 'dataPrcocess', 'coordSystemUpdate', 'layout' and so on.
        update: 'none'
    }, function (payload: RoamPayload, ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachComponent({
            mainType: 'series', subType: 'tree', query: payload
        }, function (seriesModel: TreeSeriesModel) {
            const coordSys = seriesModel.coordinateSystem;
            const res = updateCenterAndZoom(coordSys, payload, undefined, api);

            seriesModel.setCenter
                && seriesModel.setCenter(res.center);

            seriesModel.setZoom
                && seriesModel.setZoom(res.zoom);
        });
    });

}
