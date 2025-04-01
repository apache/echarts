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

import { ModelFinderIdQuery, ModelFinderIndexQuery, ModelFinderNameQuery, parseFinder } from '../../util/model';
import { Payload, AxisBreakOption, AxisBreakOptionIdentifier } from '../../util/types';
import { each } from 'zrender/src/core/util';
import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import type { EChartsExtensionInstallRegisters } from '../../extension';

export interface AxisBreakPayload extends Payload {
    xAxisIndex?: ModelFinderIndexQuery,
    xAxisId?: ModelFinderIdQuery,
    xAxisName?: ModelFinderNameQuery
    yAxisIndex?: ModelFinderIndexQuery,
    yAxisId?: ModelFinderIdQuery,
    yAxisName?: ModelFinderNameQuery,
    singleAxisIndex?: ModelFinderIndexQuery,
    singleAxisId?: ModelFinderIdQuery,
    singleAxisName?: ModelFinderNameQuery,

    breaks: AxisBreakPayloadBreak[];
}
export type AxisBreakPayloadBreak = AxisBreakOptionIdentifier & Pick<AxisBreakOption, 'isExpanded'>;

export const axisBreakUpdateActionInfo = {
    type: 'updateAxisBreak',
    event: 'axisBreakUpdated',
    update: 'update'
};

export function registerAction(registers: EChartsExtensionInstallRegisters) {
    registers.registerAction(axisBreakUpdateActionInfo, function (payload: AxisBreakPayload, ecModel) {
        const finderResult = parseFinder(ecModel, payload);
        each(finderResult.xAxisModels, (axisModel: AxisBaseModel) => axisModel.updateAxisBreaks(payload.breaks));
        each(finderResult.yAxisModels, (axisModel: AxisBaseModel) => axisModel.updateAxisBreaks(payload.breaks));
        each(finderResult.singleAxisModels, (axisModel: AxisBaseModel) => axisModel.updateAxisBreaks(payload.breaks));
    });
}
