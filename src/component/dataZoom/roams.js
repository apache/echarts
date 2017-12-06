// Only create one roam controller for each coordinate system.
// one roam controller might be refered by two inside data zoom
// components (for example, one for x and one for y). When user
// pan or zoom, only dispatch one action for those data zoom
// components.

import * as zrUtil from 'zrender/src/core/util';
import RoamController from '../../component/helper/RoamController';
import * as throttleUtil from '../../util/throttle';

var curry = zrUtil.curry;

var ATTR = '\0_ec_dataZoom_roams';


/**
 * @public
 * @param {module:echarts/ExtensionAPI} api
 * @param {Object} dataZoomInfo
 * @param {string} dataZoomInfo.coordId
 * @param {Function} dataZoomInfo.containsPoint
 * @param {Array.<string>} dataZoomInfo.allCoordIds
 * @param {string} dataZoomInfo.dataZoomId
 * @param {number} dataZoomInfo.throttleRate
 * @param {Function} dataZoomInfo.panGetRange
 * @param {Function} dataZoomInfo.zoomGetRange
 * @param {boolean} [dataZoomInfo.zoomLock]
 * @param {boolean} [dataZoomInfo.disabled]
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
        dataZoomInfo.throttleRate,
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
export function shouldRecordRange(payload, dataZoomId) {
    if (payload && payload.type === 'dataZoom' && payload.batch) {
        for (var i = 0, len = payload.batch.length; i < len; i++) {
            if (payload.batch[i].dataZoomId === dataZoomId) {
                return false;
            }
        }
    }
    return true;
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
    controller.on('pan', curry(onPan, newRecord));
    controller.on('zoom', curry(onZoom, newRecord));

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

function onPan(record, dx, dy, oldX, oldY, newX, newY) {
    wrapAndDispatch(record, function (info) {
        return info.panGetRange(record.controller, dx, dy, oldX, oldY, newX, newY);
    });
}

function onZoom(record, scale, mouseX, mouseY) {
    wrapAndDispatch(record, function (info) {
        return info.zoomGetRange(record.controller, scale, mouseX, mouseY);
    });
}

function wrapAndDispatch(record, getRange) {
    var batch = [];

    zrUtil.each(record.dataZoomInfos, function (info) {
        var range = getRange(info);
        !info.disabled && range && batch.push({
            dataZoomId: info.dataZoomId,
            start: range[0],
            end: range[1]
        });
    });

    record.dispatchAction(batch);
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
    var opt = {};
    var typePriority = {
        'true': 2,
        'move': 1,
        'false': 0,
        'undefined': -1
    };
    zrUtil.each(dataZoomInfos, function (dataZoomInfo) {
        var oneType = dataZoomInfo.disabled ? false : dataZoomInfo.zoomLock ? 'move' : true;
        typePriority[oneType] > typePriority[controlType] && (controlType = oneType);
        // Do not support that different 'shift'/'ctrl'/'alt' setting used in one coord sys.
        zrUtil.extend(opt, dataZoomInfo.roamControllerOpt);
    });

    return {
        controlType: controlType,
        opt: opt
    };
}
