import * as zrUtil from 'zrender/src/core/util';

var each = zrUtil.each;

var ATTR = '\0_ec_hist_store';

/**
 * @param {module:echarts/model/Global} ecModel
 * @param {Object} newSnapshot {dataZoomId, batch: [payloadInfo, ...]}
 */
export function push(ecModel, newSnapshot) {
    var store = giveStore(ecModel);

    // If previous dataZoom can not be found,
    // complete an range with current range.
    each(newSnapshot, function (batchItem, dataZoomId) {
        var i = store.length - 1;
        for (; i >= 0; i--) {
            var snapshot = store[i];
            if (snapshot[dataZoomId]) {
                break;
            }
        }
        if (i < 0) {
            // No origin range set, create one by current range.
            var dataZoomModel = ecModel.queryComponents(
                {mainType: 'dataZoom', subType: 'select', id: dataZoomId}
            )[0];
            if (dataZoomModel) {
                var percentRange = dataZoomModel.getPercentRange();
                store[0][dataZoomId] = {
                    dataZoomId: dataZoomId,
                    start: percentRange[0],
                    end: percentRange[1]
                };
            }
        }
    });

    store.push(newSnapshot);
}

/**
 * @param {module:echarts/model/Global} ecModel
 * @return {Object} snapshot
 */
export function pop(ecModel) {
    var store = giveStore(ecModel);
    var head = store[store.length - 1];
    store.length > 1 && store.pop();

    // Find top for all dataZoom.
    var snapshot = {};
    each(head, function (batchItem, dataZoomId) {
        for (var i = store.length - 1; i >= 0; i--) {
            var batchItem = store[i][dataZoomId];
            if (batchItem) {
                snapshot[dataZoomId] = batchItem;
                break;
            }
        }
    });

    return snapshot;
}

/**
 * @param {module:echarts/model/Global} ecModel
 */
export function clear(ecModel) {
    ecModel[ATTR] = null;
}

/**
 * @param {module:echarts/model/Global} ecModel
 * @return {number} records. always >= 1.
 */
export function count(ecModel) {
    return giveStore(ecModel).length;
}

/**
 * [{key: dataZoomId, value: {dataZoomId, range}}, ...]
 * History length of each dataZoom may be different.
 * this._history[0] is used to store origin range.
 * @type {Array.<Object>}
 */
function giveStore(ecModel) {
    var store = ecModel[ATTR];
    if (!store) {
        store = ecModel[ATTR] = [{}];
    }
    return store;
}
