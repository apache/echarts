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

import RoamController, { RoamType } from '../../component/helper/RoamController';
import * as throttleUtil from '../../util/throttle';
import { makeInner } from '../../util/model';
import { Dictionary, ZRElementEvent } from '../../util/types';
import ExtensionAPI from '../../core/ExtensionAPI';
import InsideZoomModel from './InsideZoomModel';
import { each, curry, Curry1, HashMap, createHashMap } from 'zrender/src/core/util';
import {
    DataZoomPayloadBatchItem, collectReferCoordSysModelInfo,
    DataZoomCoordSysMainType, DataZoomReferCoordSysInfo
} from './helper';
import GlobalModel from '../../model/Global';
import { CoordinateSystemHostModel } from '../../coord/CoordinateSystem';
import { DataZoomGetRangeHandlers } from './InsideZoomView';
import { EChartsExtensionInstallRegisters } from '../../extension';


interface DataZoomInfo {
    getRange: DataZoomGetRangeHandlers;
    model: InsideZoomModel;
    dzReferCoordSysInfo: DataZoomReferCoordSysInfo
}

interface CoordSysRecord {
    // key: dataZoom.uid
    dataZoomInfoMap: HashMap<DataZoomInfo, string>;
    model: CoordinateSystemHostModel,
    // count: number
    // coordId: string
    controller: RoamController;
    containsPoint: (e: ZRElementEvent, x: number, y: number) => boolean;
    dispatchAction: Curry1<typeof dispatchAction, ExtensionAPI>;
}


const inner = makeInner<{
    // key: coordSysModel.uid
    coordSysRecordMap: HashMap<CoordSysRecord, string>;
}, ExtensionAPI>();

export function setViewInfoToCoordSysRecord(
    api: ExtensionAPI,
    dataZoomModel: InsideZoomModel,
    getRange: DataZoomGetRangeHandlers
): void {
    inner(api).coordSysRecordMap.each(function (coordSysRecord) {
        const dzInfo = coordSysRecord.dataZoomInfoMap.get(dataZoomModel.uid);
        if (dzInfo) {
            dzInfo.getRange = getRange;
        }
    });
}

export function disposeCoordSysRecordIfNeeded(api: ExtensionAPI, dataZoomModel: InsideZoomModel) {
    const coordSysRecordMap = inner(api).coordSysRecordMap;
    const coordSysKeyArr = coordSysRecordMap.keys();
    for (let i = 0; i < coordSysKeyArr.length; i++) {
        const coordSysKey = coordSysKeyArr[i];
        const coordSysRecord = coordSysRecordMap.get(coordSysKey);
        const dataZoomInfoMap = coordSysRecord.dataZoomInfoMap;
        if (dataZoomInfoMap) {
            const dzUid = dataZoomModel.uid;
            const dzInfo = dataZoomInfoMap.get(dzUid);
            if (dzInfo) {
                dataZoomInfoMap.removeKey(dzUid);
                if (!dataZoomInfoMap.keys().length) {
                    disposeCoordSysRecord(coordSysRecordMap, coordSysRecord);
                }
            }
        }
    }
}

function disposeCoordSysRecord(
    coordSysRecordMap: HashMap<CoordSysRecord, string>,
    coordSysRecord: CoordSysRecord
): void {
    if (coordSysRecord) {
        coordSysRecordMap.removeKey(coordSysRecord.model.uid);
        const controller = coordSysRecord.controller;
        controller && controller.dispose();
    }
}

function createCoordSysRecord(api: ExtensionAPI, coordSysModel: CoordinateSystemHostModel): CoordSysRecord {
    // These init props will never change after record created.
    const coordSysRecord: CoordSysRecord = {
        model: coordSysModel,
        containsPoint: curry(containsPoint, coordSysModel),
        dispatchAction: curry(dispatchAction, api),
        dataZoomInfoMap: null,
        controller: null
    };

    // Must not do anything depends on coordSysRecord outside the event handler here,
    // because coordSysRecord not completed yet.
    const controller = coordSysRecord.controller = new RoamController(api.getZr());

    each(['pan', 'zoom', 'scrollMove'] as const, function (eventName) {
        controller.on(eventName, function (event) {
            const batch: DataZoomPayloadBatchItem[] = [];

            coordSysRecord.dataZoomInfoMap.each(function (dzInfo) {
                // Check whether the behaviors (zoomOnMouseWheel, moveOnMouseMove,
                // moveOnMouseWheel, ...) enabled.
                if (!event.isAvailableBehavior(dzInfo.model.option)) {
                    return;
                }

                const method = (dzInfo.getRange || {} as DataZoomGetRangeHandlers)[eventName];
                const range = method && method(
                    dzInfo.dzReferCoordSysInfo,
                    coordSysRecord.model.mainType as DataZoomCoordSysMainType,
                    coordSysRecord.controller,
                    event as any
                );

                !dzInfo.model.get('disabled', true) && range && batch.push({
                    dataZoomId: dzInfo.model.id,
                    start: range[0],
                    end: range[1]
                });
            });

            batch.length && coordSysRecord.dispatchAction(batch);
        });
    });

    return coordSysRecord;
}

/**
 * This action will be throttled.
 */
function dispatchAction(api: ExtensionAPI, batch: DataZoomPayloadBatchItem[]) {
    api.dispatchAction({
        type: 'dataZoom',
        animation: {
            easing: 'cubicOut',
            duration: 100
        },
        batch: batch
    });
}

function containsPoint(
    coordSysModel: CoordinateSystemHostModel, e: ZRElementEvent, x: number, y: number
): boolean {
    return coordSysModel.coordinateSystem.containPoint([x, y]);
}

/**
 * Merge roamController settings when multiple dataZooms share one roamController.
 */
function mergeControllerParams(dataZoomInfoMap: HashMap<{ model: InsideZoomModel }>) {
    let controlType: RoamType;
    // DO NOT use reserved word (true, false, undefined) as key literally. Even if encapsulated
    // as string, it is probably revert to reserved word by compress tool. See #7411.
    const prefix = 'type_';
    const typePriority: Dictionary<number> = {
        'type_true': 2,
        'type_move': 1,
        'type_false': 0,
        'type_undefined': -1
    };
    let preventDefaultMouseMove = true;

    dataZoomInfoMap.each(function (dataZoomInfo) {
        const dataZoomModel = dataZoomInfo.model;
        const oneType = dataZoomModel.get('disabled', true)
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

export function installDataZoomRoamProcessor(registers: EChartsExtensionInstallRegisters) {

    registers.registerProcessor(
        registers.PRIORITY.PROCESSOR.FILTER,
        function (ecModel: GlobalModel, api: ExtensionAPI): void {
            const apiInner = inner(api);
            const coordSysRecordMap = apiInner.coordSysRecordMap
                || (apiInner.coordSysRecordMap = createHashMap<CoordSysRecord, string>());

            coordSysRecordMap.each(function (coordSysRecord) {
                // `coordSysRecordMap` always exists (becuase it hold the `roam controller`, which should
                // better not re-create each time), but clear `dataZoomInfoMap` each round of the workflow.
                coordSysRecord.dataZoomInfoMap = null;
            });

            ecModel.eachComponent(
                { mainType: 'dataZoom', subType: 'inside' },
                function (dataZoomModel: InsideZoomModel) {
                    const dzReferCoordSysWrap = collectReferCoordSysModelInfo(dataZoomModel);

                    each(dzReferCoordSysWrap.infoList, function (dzCoordSysInfo) {

                        const coordSysUid = dzCoordSysInfo.model.uid;
                        const coordSysRecord = coordSysRecordMap.get(coordSysUid)
                            || coordSysRecordMap.set(coordSysUid, createCoordSysRecord(api, dzCoordSysInfo.model));

                        const dataZoomInfoMap = coordSysRecord.dataZoomInfoMap
                            || (coordSysRecord.dataZoomInfoMap = createHashMap<DataZoomInfo, string>());
                        // Notice these props might be changed each time for a single dataZoomModel.
                        dataZoomInfoMap.set(dataZoomModel.uid, {
                            dzReferCoordSysInfo: dzCoordSysInfo,
                            model: dataZoomModel,
                            getRange: null
                        });
                    });
                }
            );

            // (1) Merge dataZoom settings for each coord sys and set to the roam controller.
            // (2) Clear coord sys if not refered by any dataZoom.
            coordSysRecordMap.each(function (coordSysRecord) {
                const controller = coordSysRecord.controller;
                let firstDzInfo: DataZoomInfo;
                const dataZoomInfoMap = coordSysRecord.dataZoomInfoMap;

                if (dataZoomInfoMap) {
                    const firstDzKey = dataZoomInfoMap.keys()[0];
                    if (firstDzKey != null) {
                        firstDzInfo = dataZoomInfoMap.get(firstDzKey);
                    }
                }

                if (!firstDzInfo) {
                    disposeCoordSysRecord(coordSysRecordMap, coordSysRecord);
                    return;
                }

                const controllerParams = mergeControllerParams(dataZoomInfoMap);
                controller.enable(controllerParams.controlType, controllerParams.opt);

                controller.setPointerChecker(coordSysRecord.containsPoint);

                throttleUtil.createOrUpdate(
                    coordSysRecord,
                    'dispatchAction',
                    firstDzInfo.model.get('throttle', true),
                    'fixRate'
                );
            });
    });

}