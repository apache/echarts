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

import * as zrUtil from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import { Dictionary } from '../../util/types';
import DataZoomModel from './DataZoomModel';
import { makeInner } from '../../util/model';
import { DataZoomPayloadBatchItem } from './helper';

var each = zrUtil.each;

type StoreSnapshot = Dictionary<DataZoomPayloadBatchItem>

type Store = {
    snapshots: StoreSnapshot[]
}

const inner = makeInner<Store, GlobalModel>();

/**
 * @param ecModel
 * @param newSnapshot key is dataZoomId
 */
export function push(ecModel: GlobalModel, newSnapshot: StoreSnapshot) {
    var storedSnapshots = getStoreSnapshots(ecModel);

    // If previous dataZoom can not be found,
    // complete an range with current range.
    each(newSnapshot, function (batchItem, dataZoomId) {
        var i = storedSnapshots.length - 1;
        for (; i >= 0; i--) {
            var snapshot = storedSnapshots[i];
            if (snapshot[dataZoomId]) {
                break;
            }
        }
        if (i < 0) {
            // No origin range set, create one by current range.
            var dataZoomModel = ecModel.queryComponents(
                {mainType: 'dataZoom', subType: 'select', id: dataZoomId}
            )[0] as DataZoomModel;
            if (dataZoomModel) {
                var percentRange = dataZoomModel.getPercentRange();
                storedSnapshots[0][dataZoomId] = {
                    dataZoomId: dataZoomId,
                    start: percentRange[0],
                    end: percentRange[1]
                };
            }
        }
    });

    storedSnapshots.push(newSnapshot);
}

export function pop(ecModel: GlobalModel) {
    var storedSnapshots = getStoreSnapshots(ecModel);
    var head = storedSnapshots[storedSnapshots.length - 1];
    storedSnapshots.length > 1 && storedSnapshots.pop();

    // Find top for all dataZoom.
    var snapshot: StoreSnapshot = {};
    each(head, function (batchItem, dataZoomId) {
        for (var i = storedSnapshots.length - 1; i >= 0; i--) {
            var batchItem = storedSnapshots[i][dataZoomId];
            if (batchItem) {
                snapshot[dataZoomId] = batchItem;
                break;
            }
        }
    });

    return snapshot;
}

export function clear(ecModel: GlobalModel) {
    inner(ecModel).snapshots = null;
}

export function count(ecModel: GlobalModel) {
    return getStoreSnapshots(ecModel).length;
}

/**
 * History length of each dataZoom may be different.
 * this._history[0] is used to store origin range.
 */
function getStoreSnapshots(ecModel: GlobalModel) {
    var store = inner(ecModel);
    if (!store.snapshots) {
        store.snapshots = [{}];
    }
    return store.snapshots;
}
