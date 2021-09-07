
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

import { EChartsExtensionInstallRegisters } from '../extension';
import { makeInner } from '../util/model';
import LabelManager from './LabelManager';
import ExtensionAPI from '../core/ExtensionAPI';

const getLabelManager = makeInner<{ labelManager: LabelManager }, ExtensionAPI>();
export function installLabelLayout(registers: EChartsExtensionInstallRegisters) {
    registers.registerUpdateLifecycle('series:beforeupdate', (ecModel, api, params) => {
        // TODO api provide an namespace that can save stuff per instance
        let labelManager = getLabelManager(api).labelManager;
        if (!labelManager) {
            labelManager = getLabelManager(api).labelManager = new LabelManager();
        }
        labelManager.clearLabels();
    });

    registers.registerUpdateLifecycle('series:layoutlabels', (ecModel, api, params) => {
        const labelManager = getLabelManager(api).labelManager;

        params.updatedSeries.forEach(series => {
            labelManager.addLabelsOfSeries(api.getViewOfSeriesModel(series));
        });
        labelManager.updateLayoutConfig(api);
        labelManager.layout(api);
        labelManager.processLabelsOverall();
    });
}