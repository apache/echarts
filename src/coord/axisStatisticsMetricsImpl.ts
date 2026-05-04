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

import { createHashMap } from 'zrender/src/core/util';
import type GlobalModel from '../model/Global';
import type SeriesModel from '../model/Series';
import { DimensionIndex } from '../util/types';
import { asc, isNullableNumberFinite } from '../util/number';
import { parseSanitizationFilter, passesSanitizationFilter } from '../data/helper/dataValueHelper';
import type DataStore from '../data/DataStore';
import { tryEnsureTypedArray, Float64ArrayCtor } from '../util/vendor';
import {
    AxisStatECPrepareCachePerKeyPerAxis, AxisStatPerKeyPerAxis, eachSeriesDealForAxisStat,
    LINEAR_POSITIVE_MIN_GAP_NO_VALID_VALUE, LINEAR_POSITIVE_MIN_GAP_SINGLE_VALID_VALUE,
    registerMetricImpl
} from './axisStatistics';


export function registerMetricImplLiPosMinGap() {
    registerMetricImpl('liPosMinGap', metricLiPosMinGapImpl);
}

function metricLiPosMinGapImpl(
    ecModel: GlobalModel,
    perKeyPerAxis: AxisStatPerKeyPerAxis,
    ecPreparePerKeyPerAxis: AxisStatECPrepareCachePerKeyPerAxis
): void {
    const newSerUids: AxisStatECPrepareCachePerKeyPerAxis['serUids'] = createHashMap();
    const ecPrepareSerUids = ecPreparePerKeyPerAxis.serUids;
    const ecPrepareLiPosMinGap = ecPreparePerKeyPerAxis.liPosMinGap;
    let ecPrepareCacheMiss: boolean;

    const axis = perKeyPerAxis.axis;
    const scale = axis.scale;
    // const linearValueExtent = initExtentForUnion();
    const needTransform = scale.needTransform();
    const filter = scale.getFilter ? scale.getFilter() : null;
    const filterParsed = parseSanitizationFilter(filter);

    // const timeRetrieve: number[] = []; // _EC_PERF_
    // const timeSort: number[] = []; // _EC_PERF_
    // const timeAll: number[] = []; // _EC_PERF_
    // timeAll[0] = Date.now(); // _EC_PERF_

    function eachSeries(
        cb: (dimStoreIdx: DimensionIndex, seriesModel: SeriesModel, rawDataStore: DataStore) => void
    ) {
        eachSeriesDealForAxisStat(ecModel, perKeyPerAxis.sers, function (seriesModel) {
            const rawData = seriesModel.getRawData();
            // NOTE: Currently there is no series that a "base axis" can map to multiple dimensions.
            const dimStoreIdx = rawData.getDimensionIndex(rawData.mapDimension(axis.dim));
            if (dimStoreIdx >= 0) {
                cb(dimStoreIdx, seriesModel, rawData.getStore());
            }
        });
    }

    let bufferCapacity = 0;
    eachSeries(function (dimStoreIdx, seriesModel, rawDataStore) {
        newSerUids.set(seriesModel.uid, 1);
        if (!ecPrepareSerUids || !ecPrepareSerUids.hasKey(seriesModel.uid)) {
            ecPrepareCacheMiss = true;
        }
        bufferCapacity += rawDataStore.count();
    });

    if (!ecPrepareSerUids || ecPrepareSerUids.keys().length !== newSerUids.keys().length) {
        ecPrepareCacheMiss = true;
    }
    if (!ecPrepareCacheMiss && ecPrepareLiPosMinGap != null) {
        // Consider the fact in practice:
        //  - Series data can only be changed in EC_PREPARE.
        //  - The relationship between series and axes can only be changed in EC_PREPARE and
        //    SERIES_FILTER.
        //  (See EC_CYCLE for more info)
        // Therefore, some statistics results can be cached in `GlobalModelCachePerECPrepare` to avoid
        // repeated time-consuming calculation for large data (e.g., over 1e5 data items).
        perKeyPerAxis.liPosMinGap = ecPrepareLiPosMinGap;
        return;
    }

    tryEnsureTypedArray(tmpValueBuffer, bufferCapacity);

    // timeRetrieve[0] = Date.now(); // _EC_PERF_
    let writeIdx = 0;
    eachSeries(function (dimStoreIdx, seriesModel, store) {
        // NOTE: It appears to be optimized by traveling only in a specific window (e.g., the current window)
        // instead of the entire data, but that would likely generate inconsistent result and bring
        // jitter when dataZoom roaming.
        for (let i = 0, cnt = store.count(); i < cnt; ++i) {
            // Manually inline some code for performance, since no other optimization
            // (such as, progressive) can be applied here.
            let val = store.get(dimStoreIdx, i) as number;
            // NOTE: in most cases, filter does not exist.
            if (isFinite(val)
                && (!filter || passesSanitizationFilter(filterParsed, val))
            ) {
                if (needTransform) {
                    // PENDING: time-consuming if axis break is applied.
                    val = scale.transformIn(val, null);
                }
                tmpValueBuffer.arr[writeIdx++] = val;
                // val < linearValueExtent[0] && (linearValueExtent[0] = val);
                // val > linearValueExtent[1] && (linearValueExtent[1] = val);
            }
        }
    });
    // Indicatively, retrieving values above costs 40ms for 1e6 values in a certain platform.
    // timeRetrieve[1] = Date.now(); // _EC_PERF_

    const tmpValueBufferView = tmpValueBuffer.typed
        ? (tmpValueBuffer.arr as Float64Array).subarray(0, writeIdx)
        : ((tmpValueBuffer.arr as number[]).length = writeIdx, tmpValueBuffer.arr);

    // timeSort[0] = Date.now(); // _EC_PERF_
    // Sort axis values into ascending order to calculate gaps.
    if (tmpValueBuffer.typed) {
        // Indicatively, 5ms for 1e6 values in a certain platform.
        tmpValueBufferView.sort();
    }
    else {
        asc(tmpValueBufferView as number[]);
    }
    // timeAll[1] = timeSort[1] = Date.now(); // _EC_PERF_

    // console.log('axisStatistics_minGap_retrieve', timeRetrieve[1] - timeRetrieve[0]); // _EC_PERF_
    // console.log('axisStatistics_minGap_sort', timeSort[1] - timeSort[0]); // _EC_PERF_
    // console.log('axisStatistics_minGap_all', timeAll[1] - timeAll[0]); // _EC_PERF_

    let min = Infinity;
    for (let j = 1; j < writeIdx; ++j) {
        const delta = tmpValueBufferView[j] - tmpValueBufferView[j - 1];
        if (// - Different series normally have the same values (e.g., barA, barB, barC),
            //   which should be ignored.
            // - A single series with multiple same values is often not meaningful to
            //   create `bandWidth`, so it is also ignored.
            delta > 0
            && delta < min
        ) {
            min = delta;
        }
    }

    ecPreparePerKeyPerAxis.liPosMinGap = perKeyPerAxis.liPosMinGap =
        isNullableNumberFinite(min) ? min
        : writeIdx > 0 ? LINEAR_POSITIVE_MIN_GAP_SINGLE_VALID_VALUE
        : LINEAR_POSITIVE_MIN_GAP_NO_VALID_VALUE;
    ecPreparePerKeyPerAxis.serUids = newSerUids;
}

// For performance optimization.
const tmpValueBuffer = tryEnsureTypedArray(
    {ctor: Float64ArrayCtor},
    50 // An arbitrary initial capability.
);
