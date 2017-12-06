import * as echarts from '../../echarts';

var ATTR = '\0_ec_interaction_mutex';

export function take(zr, resourceKey, userKey) {
    var store = getStore(zr);
    store[resourceKey] = userKey;
}

export function release(zr, resourceKey, userKey) {
    var store = getStore(zr);
    var uKey = store[resourceKey];

    if (uKey === userKey) {
        store[resourceKey] = null;
    }
}

export function isTaken(zr, resourceKey) {
    return !!getStore(zr)[resourceKey];
}

function getStore(zr) {
    return zr[ATTR] || (zr[ATTR] = {});
}

/**
 * payload: {
 *     type: 'takeGlobalCursor',
 *     key: 'dataZoomSelect', or 'brush', or ...,
 *         If no userKey, release global cursor.
 * }
 */
echarts.registerAction(
    {type: 'takeGlobalCursor', event: 'globalCursorTaken', update: 'update'},
    function () {}
);
