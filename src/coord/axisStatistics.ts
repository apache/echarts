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

import { assert, createHashMap, each, HashMap } from 'zrender/src/core/util';
import type GlobalModel from '../model/Global';
import type SeriesModel from '../model/Series';
import {
    getCachePerECFullUpdate, getCachePerECPrepare, GlobalModelCachePerECFullUpdate,
    GlobalModelCachePerECPrepare,
    initExtentForUnion, makeCallOnlyOnce, makeInner,
} from '../util/model';
import { DimensionIndex, NullUndefined } from '../util/types';
import type Axis from './Axis';
import { asc, isNullableNumberFinite } from '../util/number';
import { parseSanitizationFilter, passesSanitizationFilter } from '../data/helper/dataValueHelper';
import type DataStore from '../data/DataStore';
import type { AxisBaseModel } from './AxisBaseModel';
import { tryEnsureTypedArray, Float64ArrayCtor } from '../util/vendor';
import { EChartsExtensionInstallRegisters } from '../extension';
import type ComponentModel from '../model/Component';


const callOnlyOnce = makeCallOnlyOnce();

const ecModelCacheFullUpdateInner = makeInner<{
    all: AxisStatAll;
    keys: AxisStatKeys;
    axisMapForCheck?: HashMap<1, ComponentModel['uid']>; // Only used in dev mode
    seriesMapForCheck?: HashMap<1, ComponentModel['uid']>; // Only used in dev mode
}, GlobalModelCachePerECFullUpdate>();

type AxisStatKeys = HashMap<AxisStatKey[], ComponentModel['uid']>;
type AxisStatAll = HashMap<AxisStatPerKey | NullUndefined, AxisStatKey>;
type AxisStatPerKey = HashMap<AxisStatPerKeyPerAxis | NullUndefined, AxisBaseModel['uid']>;
type AxisStatPerKeyPerAxis = {
    axis: Axis;
    // This is series use this axis as base axis and need to be laid out.
    // The order is determined by the client and must be respected.
    sers: SeriesModel[];
    // For query. The array index is series index.
    serByIdx: SeriesModel[];
    // Minimal positive gap of values (in the linear space) of all relevant series (e.g. per `BaseBarSeriesSubType`)
    // on this axis.
    // Be `null`/`undefined` if this metric is not calculated.
    // Be `NaN` if no meaningful gap can be calculated, typically when only one item an no item.
    liPosMinGap?: number | NullUndefined;

    // metrics corresponds to this record.
    metrics?: AxisStatisticsMetrics;
    // ecPrepareCache corresponds to this record.
    ecPrepare?: AxisStatECPrepareCachePerKeyPerAxis;
};

const ecModelCachePrepareInner = makeInner<{
    all: AxisStatECPrepareCacheAll | NullUndefined;
}, GlobalModelCachePerECPrepare>();

type AxisStatECPrepareCacheAll = HashMap<AxisStatECPrepareCachePerKey | NullUndefined, AxisStatKey>;
type AxisStatECPrepareCachePerKey = HashMap<AxisStatECPrepareCachePerKeyPerAxis | NullUndefined, AxisBaseModel['uid']>;
type AxisStatECPrepareCachePerKeyPerAxis =
    Pick<AxisStatPerKeyPerAxis, 'liPosMinGap'> & {
        // Used for cache validity.
        serUids?: HashMap<1, ComponentModel['uid']>
    };

export type AxisStatisticsClient = {
    /**
     * NOTICE: It is called after series filtering.
     */
    collectAxisSeries: (
        ecModel: GlobalModel,
        saveAxisSeries: (axis: Axis | NullUndefined, series: SeriesModel) => void
    ) => void;
    getMetrics: (
        axis: Axis,
    ) => AxisStatisticsMetrics;
};

/**
 * Within each individual axis, different groups of relevant series and statistics are
 * designated by `AxisStatKey`. In most case `seriesType` is used as `AxisStatKey`.
 */
export type AxisStatKey = string & {_: 'AxisStatKey'}; // Nominal to avoid misusing.

type AxisStatisticsMetrics = {
    // Currently only one metric is required.

    // NOTICE:
    //  May be time-consuming in large data due to some metrics requiring travel and sort of
    //  series data, especially when axis break is used, so it is performed only if required,
    //  and stop calculation if the iteration is over `MIN_GAP_FOR_BAND_CALCULATION_LIMIT`.
    liPosMinGap?: boolean
};

export type AxisStatisticsResult = Pick<
    AxisStatPerKeyPerAxis,
    'liPosMinGap'
>;

let validateInputAxis: ((axis: Axis) => void) | NullUndefined;
if (__DEV__) {
    validateInputAxis = function (axis) {
        assert(axis && axis.model && axis.model.uid && axis.model.ecModel);
    };
}

function getAxisStatPerKeyPerAxis(
    axis: Axis,
    axisStatKey: AxisStatKey
): AxisStatPerKeyPerAxis | NullUndefined {
    const axisModel = axis.model;
    const all = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(axisModel.ecModel)).all;
    const perKey = all && all.get(axisStatKey);
    return perKey && perKey.get(axisModel.uid);
}

export function getAxisStat(
    axis: Axis,
    axisStatKey: AxisStatKey
    // Return: Never return null/undefined.
): AxisStatisticsResult {
    if (__DEV__) {
        assert(axisStatKey != null);
        validateInputAxis(axis);
    }
    return wrapStatResult(getAxisStatPerKeyPerAxis(axis, axisStatKey));
}

export function getAxisStatBySeries(
    axis: Axis,
    seriesList: (SeriesModel | NullUndefined)[]
    // Return: Never be null/undefined; never contain null/undefined.
): AxisStatisticsResult[] {
    if (__DEV__) {
        validateInputAxis(axis);
    }
    const result: AxisStatisticsResult[] = [];
    eachPerKeyPerAxis(axis.model.ecModel, function (perKeyPerAxis) {
        for (let idx = 0; idx < seriesList.length; idx++) {
            if (seriesList[idx] && perKeyPerAxis.serByIdx[seriesList[idx].seriesIndex]) {
                result.push(wrapStatResult(perKeyPerAxis));
            }
        }
    });
    return result;
}

function eachPerKeyPerAxis(
    ecModel: GlobalModel,
    cb: (
        perKeyPerAxis: AxisStatPerKeyPerAxis,
        axisStatKey: AxisStatKey,
        axisModelUid: AxisBaseModel['uid']
    ) => void
): void {
    const all = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel)).all;
    all && all.each(function (perKey, axisStatKey) {
        perKey.each(function (perKeyPerAxis, axisModelUid) {
            cb(perKeyPerAxis, axisStatKey, axisModelUid);
        });
    });
}

function wrapStatResult(record: AxisStatPerKeyPerAxis | NullUndefined): AxisStatisticsResult {
    return {
        liPosMinGap: record ? record.liPosMinGap : undefined,
    };
}

export function eachCollectedSeries(
    axis: Axis,
    axisStatKey: AxisStatKey,
    cb: (series: SeriesModel, idx: number) => void
): void {
    if (__DEV__) {
        validateInputAxis(axis);
    }
    const perKeyPerAxis = getAxisStatPerKeyPerAxis(axis, axisStatKey);
    perKeyPerAxis && each(perKeyPerAxis.sers, cb);
}

export function getCollectedSeriesLength(
    axis: Axis,
    axisStatKey: AxisStatKey,
): number {
    if (__DEV__) {
        assert(axisStatKey != null);
        validateInputAxis(axis);
    }
    const perKeyPerAxis = getAxisStatPerKeyPerAxis(axis, axisStatKey);
    return perKeyPerAxis ? perKeyPerAxis.sers.length : 0;
}

export function eachCollectedAxis(
    ecModel: GlobalModel,
    axisStatKey: AxisStatKey,
    cb: (axis: Axis) => void
): void {
    if (__DEV__) {
        assert(axisStatKey != null);
    }
    const all = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel)).all;
    const perKey = all && all.get(axisStatKey);
    perKey && perKey.each(function (perKeyPerAxis) {
        cb(perKeyPerAxis.axis);
    });
}

export function eachAxisStatKey(
    axis: Axis,
    cb: (axisStatKey: AxisStatKey) => void
): void {
    if (__DEV__) {
        validateInputAxis(axis);
    }
    const keys = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(axis.model.ecModel)).keys;
    keys && keys.each(function (axisStatKeyList) {
        for (let i = 0; i < axisStatKeyList.length; i++) {
            cb(axisStatKeyList[i]);
        }
    });
}

function performAxisStatistics(ecModel: GlobalModel): void {
    const ecFullUpdateCache = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel));
    const axisStatAll: AxisStatAll = ecFullUpdateCache.all = createHashMap();

    const ecPrepareCache = ecModelCachePrepareInner(getCachePerECPrepare(ecModel));
    const ecPrepareCacheAll = ecPrepareCache.all || (ecPrepareCache.all = createHashMap());

    axisStatisticsClients.each(function (client, axisStatKey) {
        client.collectAxisSeries(ecModel, function saveAxisSeries(axis, series) {
            if (!axis) {
                return;
            }

            if (__DEV__) {
                validateInputAxis(axis);
                // - An axis can be associated with multiple `axisStatKey`s. For example, if `axisStatKey`s are
                //   "candlestick" and "bar", they can be associated with the same "xAxis".
                // - Within an individual axis, it is a typically incorrect usage if a <series-axis> pair is
                //   associated with multiple `perKeyPerAxis`, which may cause repeated calculation and
                //   performance degradation, had hard to be found without the checking below. For example, If
                //   `axisStatKey` are "grid-bar" (see `barGrid.ts`) and "polar-bar" (see `barPolar.ts`), and
                //   a <xAxis-series> pair is wrongly associated with both "polar-bar" and "grid-bar", the
                //   relevant statistics will be computed twice.
                const axisMapForCheck = ecFullUpdateCache.axisMapForCheck
                    || (ecFullUpdateCache.axisMapForCheck = createHashMap());
                const seriesMapForCheck = ecFullUpdateCache.seriesMapForCheck
                    || (ecFullUpdateCache.seriesMapForCheck = createHashMap());
                assert(!axisMapForCheck.get(axis.model.uid) || !seriesMapForCheck.get(series.uid));
                axisMapForCheck.set(axis.model.uid, 1);
                seriesMapForCheck.set(series.uid, 1);
            }

            const perKey = axisStatAll.get(axisStatKey) || axisStatAll.set(axisStatKey, createHashMap());

            const axisModelUid = axis.model.uid;
            let perKeyPerAxis = perKey.get(axisModelUid);
            if (!perKeyPerAxis) {
                perKeyPerAxis = perKey.set(axisModelUid, {axis, sers: [], serByIdx: []});
                perKeyPerAxis.metrics = client.getMetrics(axis) || {};

                const ecPrepareCachePerKey = ecPrepareCacheAll.get(axisStatKey)
                    || ecPrepareCacheAll.set(axisStatKey, createHashMap());
                perKeyPerAxis.ecPrepare = ecPrepareCachePerKey.get(axisModelUid)
                    || ecPrepareCachePerKey.set(axisModelUid, {});
            }
            // NOTICE: series order should respect to the input order, since it
            // matters in some cases (see `axisSnippets.ts` for more details).
            perKeyPerAxis.sers.push(series);
            perKeyPerAxis.serByIdx[series.seriesIndex] = series;
        });
    });

    const axisStatKeys: AxisStatKeys = ecFullUpdateCache.keys = createHashMap();
    eachPerKeyPerAxis(ecModel, function (perKeyPerAxis, axisStatKey, axisModelUid) {
        (axisStatKeys.get(axisModelUid) || axisStatKeys.set(axisModelUid, []))
            .push(axisStatKey);
        performStatisticsForRecord(perKeyPerAxis);
    });
}

function performStatisticsForRecord(
    perKeyPerAxis: AxisStatPerKeyPerAxis,
): void {
    if (!perKeyPerAxis.metrics.liPosMinGap) {
        return;
    }

    const newSerUids: AxisStatECPrepareCachePerKeyPerAxis['serUids'] = createHashMap();
    const ecPreparePerKeyPerAxis = perKeyPerAxis.ecPrepare;
    const ecPrepareSerUids = ecPreparePerKeyPerAxis.serUids;
    const ecPrepareLiPosMinGap = ecPreparePerKeyPerAxis.liPosMinGap;
    let ecPrepareCacheMiss: boolean;

    const axis = perKeyPerAxis.axis;
    const scale = axis.scale;
    const linearValueExtent = initExtentForUnion();
    const needTransform = scale.needTransform();
    const filter = scale.getFilter ? scale.getFilter() : null;
    const filterParsed = parseSanitizationFilter(filter);

    // const timeRetrieve: number[] = []; // _EC_PERF_
    // const timeSort: number[] = []; // _EC_PERF_
    // const timeAll: number[] = []; // _EC_PERF_
    // timeAll[0] = Date.now(); // _EC_PERF_

    function eachSeries(
        cb: (dimStoreIdx: DimensionIndex, seriesModel: SeriesModel, store: DataStore) => void
    ) {
        for (let i = 0; i < perKeyPerAxis.sers.length; i++) {
            const seriesModel = perKeyPerAxis.sers[i];
            const data = seriesModel.getData();
            // NOTE: Currently there is no series that a "base axis" can map to multiple dimensions.
            const dimStoreIdx = data.getDimensionIndex(data.mapDimension(axis.dim));
            if (dimStoreIdx >= 0) {
                cb(dimStoreIdx, seriesModel, data.getStore());
            }
        }
    }

    let bufferCapacity = 0;
    eachSeries(function (dimStoreIdx, seriesModel, store) {
        newSerUids.set(seriesModel.uid, 1);
        if (!ecPrepareSerUids || !ecPrepareSerUids.hasKey(seriesModel.uid)) {
            ecPrepareCacheMiss = true;
        }
        bufferCapacity += store.count();
    });

    if (!ecPrepareSerUids || ecPrepareSerUids.keys().length !== newSerUids.keys().length) {
        ecPrepareCacheMiss = true;
    }
    if (!ecPrepareCacheMiss && ecPrepareLiPosMinGap != null) {
        // Consider the fact in practice:
        //  - Series data can only be changed in the "ec prepare" stage.
        //  - The relationship between series and axes can only be changed in "ec prepare" stage and
        //    `SERIES_FILTER`.
        //  (NOTE: "ec prepare" stage can be typically considered as `chart.setOption`, and "ec updated"
        //  stage can be typically considered as `dispatchAction`.)
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
                val < linearValueExtent[0] && (linearValueExtent[0] = val);
                val > linearValueExtent[1] && (linearValueExtent[1] = val);
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
        if (// - Different series normally have the same values, which should be ignored.
            // - A single series with multiple same values is often not meaningful to
            //   create `bandWidth`, so it is also ignored.
            delta > 0
            && delta < min
        ) {
            min = delta;
        }
    }

    ecPreparePerKeyPerAxis.liPosMinGap = perKeyPerAxis.liPosMinGap = isNullableNumberFinite(min)
        ? min
        : NaN; // No valid data item or single valid data item.
    ecPreparePerKeyPerAxis.serUids = newSerUids;
}

// For performance optimization.
const tmpValueBuffer = tryEnsureTypedArray(
    {ctor: Float64ArrayCtor},
    50 // arbitrary. May be expanded if needed.
);

/**
 * NOTICE: Can only be called in "install" stage.
 *
 * See `axisSnippets.ts` for some commonly used clients.
 */
export function requireAxisStatistics(
    registers: EChartsExtensionInstallRegisters,
    axisStatKey: AxisStatKey,
    client: AxisStatisticsClient
): void {
    if (__DEV__) {
        assert(!axisStatisticsClients.get(axisStatKey));
    }

    axisStatisticsClients.set(axisStatKey, client);

    callOnlyOnce(registers, function () {
        registers.registerProcessor(registers.PRIORITY.PROCESSOR.AXIS_STATISTICS, {
            overallReset: performAxisStatistics
        });
    });
}

const axisStatisticsClients: HashMap<AxisStatisticsClient, AxisStatKey> = createHashMap();
