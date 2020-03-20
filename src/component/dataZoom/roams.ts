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

// Only create one roam controller for each coordinate system.
// one roam controller might be refered by two inside data zoom
// components (for example, one for x and one for y). When user
// pan or zoom, only dispatch one action for those data zoom
// components.

import RoamController, { RoamType, RoamEventParams } from '../../component/helper/RoamController';
import * as throttleUtil from '../../util/throttle';
import { makeInner } from '../../util/model';
import { Dictionary, ZRElementEvent } from '../../util/types';
import ExtensionAPI from '../../ExtensionAPI';
import InsideZoomModel from './InsideZoomModel';
import { each, indexOf, curry, Curry1 } from 'zrender/src/core/util';
import ComponentModel from '../../model/Component';
import { DataZoomPayloadBatchItem } from './helper';

interface DataZoomInfo {
    coordId: string
    containsPoint: (e: ZRElementEvent, x: number, y: number) => boolean
    allCoordIds: string[]
    dataZoomId: string
    getRange: {
        pan: (controller: RoamController, e: RoamEventParams['pan']) => [number, number]
        zoom: (controller: RoamController, e: RoamEventParams['zoom']) => [number, number]
        scrollMove: (controller: RoamController, e: RoamEventParams['scrollMove']) => [number, number]
    }
    dataZoomModel: InsideZoomModel
}
interface Record {
    // key is dataZoomId
    dataZoomInfos: Dictionary<DataZoomInfo>
    count: number
    coordId: string
    controller: RoamController
    dispatchAction: Curry1<typeof dispatchAction, ExtensionAPI>
}

interface PayloadBatch {
    dataZoomId: string
}

type Store = Dictionary<Record>;

const inner = makeInner<Store, ExtensionAPI>();

export function register(api: ExtensionAPI, dataZoomInfo: DataZoomInfo) {
    let store = inner(api);
    let theDataZoomId = dataZoomInfo.dataZoomId;
    let theCoordId = dataZoomInfo.coordId;

    // Do clean when a dataZoom changes its target coordnate system.
    // Avoid memory leak, dispose all not-used-registered.
    each(store, function (record, coordId) {
        let dataZoomInfos = record.dataZoomInfos;
        if (dataZoomInfos[theDataZoomId]
            && indexOf(dataZoomInfo.allCoordIds, theCoordId) < 0
        ) {
            delete dataZoomInfos[theDataZoomId];
            record.count--;
        }
    });

    cleanStore(store);

    let record = store[theCoordId];
    // Create if needed.
    if (!record) {
        record = store[theCoordId] = {
            coordId: theCoordId,
            dataZoomInfos: {},
            count: 0,
            controller: null,
            dispatchAction: curry(dispatchAction, api)
        };
        record.controller = createController(api, record);
    }

    // Update reference of dataZoom.
    !(record.dataZoomInfos[theDataZoomId]) && record.count++;
    record.dataZoomInfos[theDataZoomId] = dataZoomInfo;

    let controllerParams = mergeControllerParams(record.dataZoomInfos);
    record.controller.enable(controllerParams.controlType, controllerParams.opt);

    // Consider resize, area should be always updated.
    record.controller.setPointerChecker(dataZoomInfo.containsPoint);

    // Update throttle.
    throttleUtil.createOrUpdate(
        record,
        'dispatchAction',
        dataZoomInfo.dataZoomModel.get('throttle', true),
        'fixRate'
    );
}

export function unregister(api: ExtensionAPI, dataZoomId: string) {
    let store = inner(api);

    each(store, function (record) {
        record.controller.dispose();
        let dataZoomInfos = record.dataZoomInfos;
        if (dataZoomInfos[dataZoomId]) {
            delete dataZoomInfos[dataZoomId];
            record.count--;
        }
    });

    cleanStore(store);
}

/**
 * @public
 */
export function generateCoordId(coordModel: ComponentModel) {
    return coordModel.type + '\0_' + coordModel.id;
}

function createController(api: ExtensionAPI, newRecord: Record) {
    let controller = new RoamController(api.getZr());

    each(['pan', 'zoom', 'scrollMove'] as const, function (eventName) {
        controller.on(eventName, function (event) {
            let batch: DataZoomPayloadBatchItem[] = [];

            each(newRecord.dataZoomInfos, function (info) {
                // Check whether the behaviors (zoomOnMouseWheel, moveOnMouseMove,
                // moveOnMouseWheel, ...) enabled.
                if (!event.isAvailableBehavior(info.dataZoomModel.option)) {
                    return;
                }

                let method = (info.getRange || {} as DataZoomInfo['getRange'])[eventName];
                let range = method && method(newRecord.controller, event as any);

                !(info.dataZoomModel as InsideZoomModel).get('disabled', true) && range && batch.push({
                    dataZoomId: info.dataZoomId,
                    start: range[0],
                    end: range[1]
                });
            });

            batch.length && newRecord.dispatchAction(batch);
        });
    });

    return controller;
}

function cleanStore(store: Store) {
    each(store, function (record, coordId) {
        if (!record.count) {
            record.controller.dispose();
            delete store[coordId];
        }
    });
}

/**
 * This action will be throttled.
 */
function dispatchAction(api: ExtensionAPI, batch: DataZoomPayloadBatchItem[]) {
    api.dispatchAction({
        type: 'dataZoom',
        batch: batch
    });
}

/**
 * Merge roamController settings when multiple dataZooms share one roamController.
 */
function mergeControllerParams(dataZoomInfos: Dictionary<DataZoomInfo>) {
    let controlType: RoamType;
    // DO NOT use reserved word (true, false, undefined) as key literally. Even if encapsulated
    // as string, it is probably revert to reserved word by compress tool. See #7411.
    let prefix = 'type_';
    let typePriority: Dictionary<number> = {
        'type_true': 2,
        'type_move': 1,
        'type_false': 0,
        'type_undefined': -1
    };
    let preventDefaultMouseMove = true;

    each(dataZoomInfos, function (dataZoomInfo) {
        let dataZoomModel = dataZoomInfo.dataZoomModel as InsideZoomModel;
        let oneType = dataZoomModel.get('disabled', true)
            ? false
            : dataZoomModel.get('zoomLock', true)
            ? 'move' as const
            : true;
        if (typePriority[prefix + oneType] > typePriority[prefix + controlType]) {
            controlType = oneType;
        }

        // Prevent default move event by default. If one false, do not prevent. Otherwise
        // users may be confused why it does not work when multiple insideZooms exist.
        preventDefaultMouseMove = preventDefaultMouseMove
            && dataZoomModel.get('preventDefaultMouseMove', true);
    });

    return {
        controlType: controlType,
        opt: {
            // RoamController will enable all of these functionalities,
            // and the final behavior is determined by its event listener
            // provided by each inside zoom.
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: true,
            preventDefaultMouseMove: !!preventDefaultMouseMove
        }
    };
}
