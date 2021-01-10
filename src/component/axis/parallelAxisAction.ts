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


import { Payload } from '../../util/types';
import ParallelAxisModel, { ParallelAxisInterval } from '../../coord/parallel/AxisModel';
import GlobalModel from '../../model/Global';
import ParallelModel from '../../coord/parallel/ParallelModel';
import { EChartsExtensionInstallRegisters } from '../../extension';

interface ParallelAxisAreaSelectPayload extends Payload {
    parallelAxisId: string;
    intervals: ParallelAxisInterval[]
}

const actionInfo = {
    type: 'axisAreaSelect',
    event: 'axisAreaSelected'
    // update: 'updateVisual'
};

export interface ParallelAxisExpandPayload extends Payload {
    axisExpandWindow?: number[];
}

export function installParallelActions(registers: EChartsExtensionInstallRegisters) {

    registers.registerAction(actionInfo, function (payload: ParallelAxisAreaSelectPayload, ecModel: GlobalModel) {
        ecModel.eachComponent(
            {mainType: 'parallelAxis', query: payload},
            function (parallelAxisModel: ParallelAxisModel) {
                parallelAxisModel.axis.model.setActiveIntervals(payload.intervals);
            }
        );
    });

    /**
     * @payload
     */
    registers.registerAction('parallelAxisExpand', function (payload: ParallelAxisExpandPayload, ecModel) {
        ecModel.eachComponent(
            {mainType: 'parallel', query: payload},
            function (parallelModel: ParallelModel) {
                parallelModel.setAxisExpand(payload);
            }
        );
    });


}