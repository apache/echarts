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

import ExtensionAPI from '../../core/ExtensionAPI';
import Group from 'zrender/src/graphic/Group';
import RoamController, { RoamOption } from './RoamController';
import View, {
    getOwnRoamViewCoordSys,
    ownRoamModelCoordSysUpdateInAction, ownRoamViewUpdateDirectlyInAction,
    viewCoordSysSetBoundingRect,
    viewCoordSysSetViewRect,
    useLegacyViewCoordSysCenterBase,
    viewCoordSysSetRoamOptionFromModel,
} from '../../coord/View';
import {
    NullUndefined, COMPONENT_MAIN_TYPE_SERIES, ComponentMainType,
    ComponentSubType,
    RoamPayload,
    ROAM_ACTION_TYPE_SUFFIX,
    RoamHostComponentOrSeries,
    RoamOptionMixin,
    Payload,
} from '../../util/types';
import { BoundingRect, payloadDisableAnimation } from '../../util/graphic';
import { EChartsExtensionInstallRegisters } from '../../extension';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { makeQueryConditionKindA } from '../../util/model';
import { defaults, retrieve2 } from 'zrender/src/core/util';

/**
 * An abstraction for some similar impl in roaming.
 *
 * Require action like `registerRoamActionSimply`.
 */
export function updateRoamControllerSimply(
    componentOrSeries: RoamHostComponentOrSeries,
    api: ExtensionAPI,
    controller: RoamController,

    // Can use `createIsInSelfByPointerCheckerEl`
    isInSelf: RoamOption['triggerInfo']['isInSelf'],
    clipRect: BoundingRect | NullUndefined,

    extraOnRoam?: ((roamOp: 'zoom' | 'pan') => void) | NullUndefined,
    roamTypeDefault?: RoamOptionMixin['roam'],
    geoBackwardCompat?: boolean
) {
    const coordSys = getOwnRoamViewCoordSys(componentOrSeries);
    if (!coordSys) {
        controller.disable();
        return;
    }

    controller.enable(
        // NOTE:
        //  If roamTypeDefault is null/undefined, roamType will be set as true.
        // PENDING:
        //  In MapSeries case, it has long been retrieving `roam` option from the first MapSeries
        //  that are not filtered out by a legend. But that requires `roam: true` to be set in all
        //  MapSeries option, otherwise if a legend hides the `roam: true` MapSeries, the map can
        //  not be roamed unexpectedly.
        retrieve2(componentOrSeries.get('roam'), roamTypeDefault),
        {
            api,
            zInfo: {component: componentOrSeries},
            triggerInfo: {
                roamTrigger: componentOrSeries.get('roamTrigger'),
                isInSelf,
                isInClip: function (e, x, y) {
                    return !clipRect || clipRect.contain(x, y);
                }
            }
        }
    );

    function dispatchAction(extra: Partial<RoamPayload>): void {
        const mainType = componentOrSeries.mainType;
        const payload = payloadDisableAnimation(defaults({
            type: makeViewCoordSysActionType(mainType, componentOrSeries.subType, ROAM_ACTION_TYPE_SUFFIX),
        }, extra)) as RoamPayload;
        if (geoBackwardCompat) {
            payload.componentType = mainType;
        }
        // Like `seriesId`, `geoId`.
        payload[`${mainType}Id`] = componentOrSeries.id;

        api.dispatchAction(payload);
    }

    controller
        .off('pan')
        .off('zoom')
        // NOTICE: 'pan' and 'zoom' listener should do nothing except `api.dispatchAction`,
        // the rest logic should be performed in the action handler and `updateTransform`;
        // otherwise, it can cause inconsistency if users trigger this action explicitly.
        .on('pan', function (event) {
            extraOnRoam && extraOnRoam('pan');
            dispatchAction({
                dx: event.dx,
                dy: event.dy,
            });
        })
        .on('zoom', function (event) {
            extraOnRoam && extraOnRoam('zoom');
            dispatchAction({
                zoom: event.scale,
                originX: event.originX,
                originY: event.originY,
            });
        });
}

export function createIsInSelfByPointerCheckerEl(
    pointerCheckerEl: Group
): RoamOption['triggerInfo']['isInSelf'] {
    return function (e, x, y) {
        tmpRectCII.copy(pointerCheckerEl.getBoundingRect());
        tmpRectCII.applyTransform(pointerCheckerEl.getComputedTransform());
        return tmpRectCII.contain(x, y);
    };
}
const tmpRectCII = new BoundingRect(0, 0, 0, 0);

export function registerRoamActionSimply(
    registers: EChartsExtensionInstallRegisters,
    mainType: ComponentMainType,
    subType: ComponentSubType | NullUndefined
): void {
    const actionType = makeViewCoordSysActionType(mainType, subType, ROAM_ACTION_TYPE_SUFFIX);

    registers.registerAction({
        type: actionType,
        event: actionType,
        // If `mainType` is a coord sys, 'update:' should be 'updateTransform' to
        // broadcast the update. But currently there is no such case required.
        // If 'updateTransform' is used, the owner of VIEW_COORD_SYS update firstly
        // in the action handler as follows, and then series and components laid
        // out on this VIEW_COORD_SYS update in `View['updateTransform']`.
        update: 'none',
    }, function (payload: RoamPayload, ecModel, api) {
        ecModel.eachComponent(
            makeQueryConditionKindA(payload, mainType, subType),
            function (componentOrSeries: RoamHostComponentOrSeries) {
                ownRoamModelCoordSysUpdateInAction(payload, componentOrSeries);
                ownRoamViewUpdateDirectlyInAction(payload, componentOrSeries, ecModel, api);
        });
    });
}

function makeViewCoordSysActionType<TPayload extends Payload>(
    mainType: ComponentMainType,
    subType: ComponentSubType | NullUndefined,
    suffix: string
): TPayload['type'] {
    // e.g. 'treeRoam', 'sankeyRoam', 'geoRoam'
    return (
        (
            mainType !== COMPONENT_MAIN_TYPE_SERIES ? mainType
            : subType === 'map' ? 'geo' // Historical setting.
            : subType
        )
        + suffix
    ) as TPayload['type'];
}

export function isRoamPayloadHasZoom(payload: RoamPayload): boolean {
    return payload.zoom != null;
}

export function createViewCoordSysSimply(
    componentOrSeries: RoamHostComponentOrSeries,
    api: ExtensionAPI,
    // VIEW_COORD_SYS DataRect init:
    x: number,
    y: number,
    width: number,
    height: number,
    // VIEW_COORD_SYS ViewRect init:
    // Use DataRect by default, which means DataRect is in pixel space.
    viewRect?: RectLike | NullUndefined
): View {
    const viewCoordSys = new View(
        null,
        useLegacyViewCoordSysCenterBase(componentOrSeries.ecModel, api)
    );

    viewCoordSysSetBoundingRect(viewCoordSys, x, y, width, height);

    viewRect
        ? viewCoordSysSetViewRect(viewCoordSys, viewRect.x, viewRect.y, viewRect.width, viewRect.height)
        : viewCoordSysSetViewRect(viewCoordSys, x, y, width, height);

    viewCoordSysSetRoamOptionFromModel(viewCoordSys, componentOrSeries);

    return viewCoordSys;
}
