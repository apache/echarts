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
import AxisView from '../axis/AxisView';
import CartesianAxisPointer from './CartesianAxisPointer';
import AxisPointerModel from './AxisPointerModel';
import AxisPointerView from './AxisPointerView';
import { isArray } from 'zrender/src/core/util';
import { collect } from './modelHelper';
import axisTrigger from './axisTrigger';

export function install(registers: EChartsExtensionInstallRegisters) {
    // CartesianAxisPointer is not supposed to be required here. But consider
    // echarts.simple.js and online build tooltip, which only require gridSimple,
    // CartesianAxisPointer should be able to required somewhere.
    AxisView.registerAxisPointerClass('CartesianAxisPointer', CartesianAxisPointer);

    registers.registerComponentModel(AxisPointerModel);
    registers.registerComponentView(AxisPointerView);

    registers.registerPreprocessor(function (option) {
        // Always has a global axisPointerModel for default setting.
        if (option) {
            (!option.axisPointer || (option.axisPointer as []).length === 0)
                && (option.axisPointer = {});

            const link = (option.axisPointer as any).link;
            // Normalize to array to avoid object mergin. But if link
            // is not set, remain null/undefined, otherwise it will
            // override existent link setting.
            if (link && !isArray(link)) {
                (option.axisPointer as any).link = [link];
            }
        }
    });

    // This process should proformed after coordinate systems created
    // and series data processed. So put it on statistic processing stage.
    registers.registerProcessor(registers.PRIORITY.PROCESSOR.STATISTIC, function (ecModel, api) {
        // Build axisPointerModel, mergin tooltip.axisPointer model for each axis.
        // allAxesInfo should be updated when setOption performed.
        (ecModel.getComponent('axisPointer') as AxisPointerModel).coordSysAxesInfo =
            collect(ecModel, api);
    });

    // Broadcast to all views.
    registers.registerAction({
        type: 'updateAxisPointer',
        event: 'updateAxisPointer',
        update: ':updateAxisPointer'
    }, axisTrigger);


}