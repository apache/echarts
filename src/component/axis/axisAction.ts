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
import {
    Payload, AxisBreakOptionIdentifierInAxis,
    ECActionRefinedEvent, ECActionRefinedEventContent
} from '../../util/types';
import { defaults, each } from 'zrender/src/core/util';
import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import type { EChartsExtensionInstallRegisters } from '../../extension';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';

export interface BaseAxisBreakPayload extends Payload {
    xAxisIndex?: ModelFinderIndexQuery;
    xAxisId?: ModelFinderIdQuery;
    xAxisName?: ModelFinderNameQuery;
    yAxisIndex?: ModelFinderIndexQuery;
    yAxisId?: ModelFinderIdQuery;
    yAxisName?: ModelFinderNameQuery;
    singleAxisIndex?: ModelFinderIndexQuery;
    singleAxisId?: ModelFinderIdQuery;
    singleAxisName?: ModelFinderNameQuery;

    breaks: AxisBreakOptionIdentifierInAxis[];
}
export interface ExpandAxisBreakPayload extends BaseAxisBreakPayload {
    type: typeof AXIS_BREAK_EXPAND_ACTION_TYPE;
}
export interface CollapseAxisBreakPayload extends BaseAxisBreakPayload {
    type: typeof AXIS_BREAK_COLLAPSE_ACTION_TYPE;
}
export interface ToggleAxisBreakPayload extends BaseAxisBreakPayload {
    type: typeof AXIS_BREAK_TOGGLE_ACTION_TYPE;
}

export type AxisBreakChangedEventBreak =
    AxisBreakOptionIdentifierInAxis
    & {
        xAxisIndex?: ModelFinderIndexQuery;
        yAxisIndex?: ModelFinderIndexQuery;
        singleAxisIndex?: ModelFinderIndexQuery;

        isExpanded: boolean;
        old: {
            isExpanded: boolean;
        }
    };

export interface AxisBreakChangedEvent extends ECActionRefinedEvent {
    type: typeof AXIS_BREAK_CHANGED_EVENT_TYPE;
    fromAction: typeof AXIS_BREAK_EXPAND_ACTION_TYPE
        | typeof AXIS_BREAK_COLLAPSE_ACTION_TYPE
        | typeof AXIS_BREAK_TOGGLE_ACTION_TYPE;
    fromActionPayload: ExpandAxisBreakPayload
        | CollapseAxisBreakPayload
        | ToggleAxisBreakPayload;
    // Only include specified breaks.
    breaks: AxisBreakChangedEventBreak[];
}

export const AXIS_BREAK_EXPAND_ACTION_TYPE = 'expandAxisBreak' as const;
export const AXIS_BREAK_COLLAPSE_ACTION_TYPE = 'collapseAxisBreak' as const;
export const AXIS_BREAK_TOGGLE_ACTION_TYPE = 'toggleAxisBreak' as const;

const AXIS_BREAK_CHANGED_EVENT_TYPE = 'axisbreakchanged' as const;

const expandAxisBreakActionInfo = {
    type: AXIS_BREAK_EXPAND_ACTION_TYPE,
    event: AXIS_BREAK_CHANGED_EVENT_TYPE,
    update: 'update',
    refineEvent: refineAxisBreakChangeEvent,
};
const collapseAxisBreakActionInfo = {
    type: AXIS_BREAK_COLLAPSE_ACTION_TYPE,
    event: AXIS_BREAK_CHANGED_EVENT_TYPE,
    update: 'update',
    refineEvent: refineAxisBreakChangeEvent,
};
const toggleAxisBreakActionInfo = {
    type: AXIS_BREAK_TOGGLE_ACTION_TYPE,
    event: AXIS_BREAK_CHANGED_EVENT_TYPE,
    update: 'update',
    refineEvent: refineAxisBreakChangeEvent,
};

function refineAxisBreakChangeEvent(
    actionResultBatch: {eventBreaks: AxisBreakChangedEventBreak[]}[],
    payload: BaseAxisBreakPayload,
    ecModel: GlobalModel,
    api: ExtensionAPI
): {
    eventContent: ECActionRefinedEventContent<AxisBreakChangedEvent>;
} {
    let breaks: AxisBreakChangedEventBreak[] = [];
    each(actionResultBatch, actionResult => {
        breaks = breaks.concat(actionResult.eventBreaks);
    });
    return {
        eventContent: {breaks}
    };
}

export function registerAction(registers: EChartsExtensionInstallRegisters) {
    registers.registerAction(expandAxisBreakActionInfo, actionHandler);
    registers.registerAction(collapseAxisBreakActionInfo, actionHandler);
    registers.registerAction(toggleAxisBreakActionInfo, actionHandler);

    function actionHandler(payload: BaseAxisBreakPayload, ecModel: GlobalModel) {
        const eventBreaks: AxisBreakChangedEventBreak[] = [];
        const finderResult = parseFinder(ecModel, payload);

        function dealUpdate(modelProp: string, indexProp: string) {
            each(finderResult[modelProp], (axisModel: AxisBaseModel) => {
                const result = axisModel.updateAxisBreaks(payload);
                each(result.breaks, item => {
                    eventBreaks.push(
                        defaults({[indexProp]: axisModel.componentIndex}, item)
                    );
                });
            });
        }

        dealUpdate('xAxisModels', 'xAxisIndex');
        dealUpdate('yAxisModels', 'yAxisIndex');
        dealUpdate('singleAxisModels', 'singleAxisIndex');

        return {eventBreaks};
    }
}
