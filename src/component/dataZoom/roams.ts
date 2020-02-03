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

import * as zrUtil from 'zrender/src/core/util';
import RoamController from '../../component/helper/RoamController';
import * as throttleUtil from '../../util/throttle';


var ATTR = '\0_ec_dataZoom_roams';


/**
 * @public
 * @param {module:echarts/ExtensionAPI} api
 * @param {Object} dataZoomInfo
 * @param {string} dataZoomInfo.coordId
 * @param {Function} dataZoomInfo.containsPoint
 * @param {Array.<string>} dataZoomInfo.allCoordIds
 * @param {string} dataZoomInfo.dataZoomId
 * @param {Object} dataZoomInfo.getRange
 * @param {Function} dataZoomInfo.getRange.pan
 * @param {Function} dataZoomInfo.getRange.zoom
 * @param {Function} dataZoomInfo.getRange.scrollMove
 * @param {boolean} dataZoomInfo.dataZoomModel
 */
export function register(api, dataZoomInfo) {
    var store = giveStore(api);
    var theDataZoomId = dataZoomInfo.dataZoomId;
    var theCoordId = dataZoomInfo.coordId;

    // Do clean when a dataZoom changes its target coordnate system.
    // Avoid memory leak, dispose all not-used-registered.
    zrUtil.each(store, function (record, coordId) {
        var dataZoomInfos = record.dataZoomInfos;
        if (dataZoomInfos[theDataZoomId]
            && zrUtil.indexOf(dataZoomInfo.allCoordIds, theCoordId) < 0
        ) {
            delete dataZoomInfos[theDataZoomId];
            record.count--;
        }
    });

    cleanStore(store);

    var record = store[theCoordId];
    // Create if needed.
    if (!record) {
        record = store[theCoordId] = {
            coordId: theCoordId,
            dataZoomInfos: {},
            count: 0
        };
        record.controller = createController(api, record);
        record.dispatchAction = zrUtil.curry(dispatchAction, api);
    }

    // Update reference of dataZoom.
    !(record.dataZoomInfos[theDataZoomId]) && record.count++;
    record.dataZoomInfos[theDataZoomId] = dataZoomInfo;

    var controllerParams = mergeControllerParams(record.dataZoomInfos);
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

/**
 * @public
 * @param {module:echarts/ExtensionAPI} api
 * @param {string} dataZoomId
 */
export function unregister(api, dataZoomId) {
    var store = giveStore(api);

    zrUtil.each(store, function (record) {
        record.controller.dispose();
        var dataZoomInfos = record.dataZoomInfos;
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
export function generateCoordId(coordModel) {
    return coordModel.type + '\0_' + coordModel.id;
}

/**
 * Key: coordId, value: {dataZoomInfos: [], count, controller}
 * @type {Array.<Object>}
 */
function giveStore(api) {
    // Mount store on zrender instance, so that we do not
    // need to worry about dispose.
    var zr = api.getZr();
    return zr[ATTR] || (zr[ATTR] = {});
}

function createController(api, newRecord) {
    var controller = new RoamController(api.getZr());

    zrUtil.each(['pan', 'zoom', 'scrollMove'], function (eventName) {
        controller.on(eventName, function (event) {
            var batch = [];

            zrUtil.each(newRecord.dataZoomInfos, function (info) {
                // Check whether the behaviors (zoomOnMouseWheel, moveOnMouseMove,
                // moveOnMouseWheel, ...) enabled.
                if (!event.isAvailableBehavior(info.dataZoomModel.option)) {
                    return;
                }

                var method = (info.getRange || {})[eventName];
                var range = method && method(newRecord.controller, event);

                !info.dataZoomModel.get('disabled', true) && range && batch.push({
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

function cleanStore(store) {
    zrUtil.each(store, function (record, coordId) {
        if (!record.count) {
            record.controller.dispose();
            delete store[coordId];
        }
    });
}

/**
 * This action will be throttled.
 */
function dispatchAction(api, batch) {
    api.dispatchAction({
        type: 'dataZoom',
        batch: batch
    });
}

/**
 * Merge roamController settings when multiple dataZooms share one roamController.
 */
function mergeControllerParams(dataZoomInfos) {
    var controlType;
    // DO NOT use reserved word (true, false, undefined) as key literally. Even if encapsulated
    // as string, it is probably revert to reserved word by compress tool. See #7411.
    var prefix = 'type_';
    var typePriority = {
        'type_true': 2,
        'type_move': 1,
        'type_false': 0,
        'type_undefined': -1
    };
    var preventDefaultMouseMove = true;

    zrUtil.each(dataZoomInfos, function (dataZoomInfo) {
        var dataZoomModel = dataZoomInfo.dataZoomModel;
        var oneType = dataZoomModel.get('disabled', true)
            ? false
            : dataZoomModel.get('zoomLock', true)
            ? 'move'
            : true;
        if (typePriority[prefix + oneType] > typePriority[prefix + controlType]) {
            controlType = oneType;
        }

        // Prevent default move event by default. If one false, do not prevent. Otherwise
        // users may be confused why it does not work when multiple insideZooms exist.
        preventDefaultMouseMove &= dataZoomModel.get('preventDefaultMouseMove', true);
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
