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

import {registerRoamActionSimply} from '../../component/helper/roamHelper';
import { COMPONENT_MAIN_TYPE_SERIES, Payload } from '../../util/types';
import TreeSeriesModel, { SERIES_TYPE_TREE } from './TreeSeries';
import { EChartsExtensionInstallRegisters } from '../../extension';

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
            mainType: COMPONENT_MAIN_TYPE_SERIES, subType: SERIES_TYPE_TREE, query: payload
        }, function (seriesModel: TreeSeriesModel) {
            const dataIndex = payload.dataIndex;
            const tree = seriesModel.getData().tree;
            const node = tree.getNodeByDataIndex(dataIndex);
            node.isExpand = !node.isExpand;
        });
    });

    registerRoamActionSimply(registers, COMPONENT_MAIN_TYPE_SERIES, SERIES_TYPE_TREE);

}
