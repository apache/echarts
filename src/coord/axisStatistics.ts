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

import { assert, createHashMap, HashMap, retrieve2 } from 'zrender/src/core/util';
import type GlobalModel from '../model/Global';
import type SeriesModel from '../model/Series';
import {
    initExtentForUnion, makeCallOnlyOnce, makeInner,
} from '../util/model';
import { ComponentSubType, DimensionIndex, NullUndefined } from '../util/types';
import type Axis from './Axis';
import { asc, isNullableNumberFinite } from '../util/number';
import { parseSanitizationFilter, passesSanitizationFilter } from '../data/helper/dataValueHelper';
import type DataStore from '../data/DataStore';
import type { AxisBaseModel } from './AxisBaseModel';
import { tryEnsureTypedArray, Float64ArrayCtor } from '../util/vendor';
import { EChartsExtensionInstallRegisters } from '../extension';
import type ComponentModel from '../model/Component';
import {
    getCachePerECFullUpdate, getCachePerECPrepare, GlobalModelCachePerECFullUpdate,
    GlobalModelCachePerECPrepare
} from '../util/cycleCache';
import { CoordinateSystem } from './CoordinateSystem';


const callOnlyOnce = makeCallOnlyOnce();
// Ensure that it never appears in internal generated uid and pre-defined coordSysType.
export const AXIS_STAT_KEY_DELIMITER = '|&';

const ecModelCacheFullUpdateInner = makeInner<{

    // It stores all <axis, series> pairs, aggregated by axis, based on which axis scale extent is calculated.
    // NOTICE: series that has been filtered out are included.
    // It is unrelated to `AxisStatKeyedClient`.
    axSer: HashMap<SeriesModel[], AxisBaseModel['uid']>;

    // AxisStatKey based statistics records.
    // Only `AxisStatKeyedClient` concerned <axis, series> pairs are collected, based on which
    // statistics are calculated.
    keyed: AxisStatKeyed;
    // `keys` is only used to quick travel.
    keys: AxisStatKeys;

    // Only used in dev mode for duplication checking.
    axSerPairCheck?: HashMap<1, string>;

}, GlobalModelCachePerECFullUpdate>();

type AxisStatKeys = HashMap<AxisStatKey[], ComponentModel['uid']>;
type AxisStatKeyed = HashMap<AxisStatPerKey | NullUndefined, AxisStatKey>;
type AxisStatPerKey = HashMap<AxisStatPerKeyPerAxis | NullUndefined, AxisBaseModel['uid']>;
type AxisStatPerKeyPerAxis = {
    axis: Axis;
    // This is series use this axis as base axis and need to be laid out.
    // The order is determined by the client and must be respected.
    // Never be null/undefined.
    // series filtered out is included.
    sers: SeriesModel[];
    // For query. The array index is series index.
    serByIdx: SeriesModel[];
    // Minimal positive gap of values (in the linear space) of all relevant series (e.g. per `BaseBarSeriesSubType`)
    // on this axis.
    // Be `null`/`undefined` if this metric is not calculated.
    // Be `NaN` if no meaningful gap can be calculated, typically when only one item an no item.
    liPosMinGap?: number | NullUndefined;

    // metrics corresponds to this record.
    metrics?: AxisStatMetrics;
};

const ecModelCachePrepareInner = makeInner<{
    keyed: AxisStatECPrepareCacheKeyed | NullUndefined;
}, GlobalModelCachePerECPrepare>();

type AxisStatECPrepareCacheKeyed = HashMap<AxisStatECPrepareCachePerKey | NullUndefined, AxisStatKey>;
type AxisStatECPrepareCachePerKey = HashMap<AxisStatECPrepareCachePerKeyPerAxis | NullUndefined, AxisBaseModel['uid']>;
type AxisStatECPrepareCachePerKeyPerAxis =
    Pick<AxisStatPerKeyPerAxis, 'liPosMinGap'> & {
        // Used for cache validity.
        serUids?: HashMap<1, ComponentModel['uid']>
    };

export type AxisStatKeyedClient = {

    // A key for retrieving result.
    key: AxisStatKey;

    // Only the specific `seriesType` is covered.
    seriesType: ComponentSubType;
    // `true` by default - the <axis, series> pair is collected only if series's base axis is that axis.
    baseAxis?: boolean | NullUndefined;
    // `NullUndefined` by default - all coordinate systems are covered.
    coordSysType?: CoordinateSystem['type'] | NullUndefined;

    // `NullUndefined` return indicates this axis should be omitted.
    getMetrics: (axis: Axis) => AxisStatMetrics | NullUndefined;
};

/**
 * Within each individual axis, different groups of relevant series and statistics are
 * designated by `AxisStatKey`. In most case `seriesType` is used as `AxisStatKey`.
 */
export type AxisStatKey = string & {_: 'AxisStatKey'}; // Nominal to avoid misusing.
type ClientQueryKey = string & {_: 'ClientQueryKey'}; // Nominal to avoid misusing; internal usage.

export type AxisStatMetrics = {

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

type AxisStatEachSeriesCb = (seriesModel: SeriesModel, travelIdx: number) => void;

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
    const keyed = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(axisModel.ecModel)).keyed;
    const perKey = keyed && keyed.get(axisStatKey);
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
    eachKeyEachAxis(axis.model.ecModel, function (perKeyPerAxis) {
        for (let idx = 0; idx < seriesList.length; idx++) {
            if (seriesList[idx] && perKeyPerAxis.serByIdx[seriesList[idx].seriesIndex]) {
                result.push(wrapStatResult(perKeyPerAxis));
            }
        }
    });
    return result;
}

function eachKeyEachAxis(
    ecModel: GlobalModel,
    cb: (
        perKeyPerAxis: AxisStatPerKeyPerAxis,
        axisStatKey: AxisStatKey,
        axisModelUid: AxisBaseModel['uid']
    ) => void
): void {
    const keyed = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel)).keyed;
    keyed && keyed.each(function (perKey, axisStatKey) {
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

/**
 * NOTE:
 *  - series declaration order is respected.
 *  - series filtered out are excluded.
 */
export function eachSeriesOnAxis(
    axis: Axis,
    cb: AxisStatEachSeriesCb
): void {
    if (__DEV__) {
        validateInputAxis(axis);
    }
    const ecModel = axis.model.ecModel;
    const seriesOnAxisMap = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel)).axSer;
    seriesOnAxisMap && seriesOnAxisMap.each(function (seriesList) {
        eachSeriesDeal(ecModel, seriesList, cb);
    });
}

export function eachSeriesOnAxisOnKey(
    axis: Axis,
    axisStatKey: AxisStatKey,
    cb: (series: SeriesModel, idx: number) => void
): void {
    if (__DEV__) {
        assert(axisStatKey != null);
        validateInputAxis(axis);
    }
    const perKeyPerAxis = getAxisStatPerKeyPerAxis(axis, axisStatKey);
    perKeyPerAxis && eachSeriesDeal(axis.model.ecModel, perKeyPerAxis.sers, cb);
}

function eachSeriesDeal(
    ecModel: GlobalModel,
    seriesList: SeriesModel[],
    cb: AxisStatEachSeriesCb
): void {
    for (let i = 0; i < seriesList.length; i++) {
        const seriesModel = seriesList[i];
        // Legend-filtered series need to be ignored since series are registered before `legendFilter`.
        if (!ecModel.isSeriesFiltered(seriesModel)) {
            cb(seriesModel, i);
        }
    }
}

/**
 * NOTE:
 *  - series filtered out are excluded.
 */
export function countSeriesOnAxisOnKey(
    axis: Axis,
    axisStatKey: AxisStatKey,
): number {
    if (__DEV__) {
        assert(axisStatKey != null);
        validateInputAxis(axis);
    }
    const perKeyPerAxis = getAxisStatPerKeyPerAxis(axis, axisStatKey);
    if (!perKeyPerAxis || !perKeyPerAxis.sers.length) {
        return 0;
    }
    let count = 0;
    eachSeriesDeal(axis.model.ecModel, perKeyPerAxis.sers, function () {
        count++;
    });
    return count;
}

export function eachAxisOnKey(
    ecModel: GlobalModel,
    axisStatKey: AxisStatKey,
    cb: (axis: Axis) => void
): void {
    if (__DEV__) {
        assert(axisStatKey != null);
    }
    const keyed = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel)).keyed;
    const perKey = keyed && keyed.get(axisStatKey);
    perKey && perKey.each(function (perKeyPerAxis) {
        cb(perKeyPerAxis.axis);
    });
}

/**
 * NOTICE: Available after `CoordinateSystem['create']` (not included).
 */
export function eachKeyOnAxis(
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

/**
 * NOTICE: this processor may be omitted - it is registered only if required.
 */
function performAxisStatisticsOnOverallReset(ecModel: GlobalModel): void {
    const ecPrepareCache = ecModelCachePrepareInner(getCachePerECPrepare(ecModel));
    const ecPrepareCacheKeyed = ecPrepareCache.keyed || (ecPrepareCache.keyed = createHashMap());

    eachKeyEachAxis(ecModel, function (perKeyPerAxis, axisStatKey, axisModelUid) {
        const ecPrepareCachePerKey = ecPrepareCacheKeyed.get(axisStatKey)
            || ecPrepareCacheKeyed.set(axisStatKey, createHashMap());
        const ecPreparePerKeyPerAxis = ecPrepareCachePerKey.get(axisModelUid)
            || ecPrepareCachePerKey.set(axisModelUid, {});

        performStatisticsForRecord(ecModel, perKeyPerAxis, ecPreparePerKeyPerAxis);
    });
}

function performStatisticsForRecord(
    ecModel: GlobalModel,
    perKeyPerAxis: AxisStatPerKeyPerAxis,
    ecPreparePerKeyPerAxis: AxisStatECPrepareCachePerKeyPerAxis
): void {
    if (!perKeyPerAxis.metrics.liPosMinGap) {
        return;
    }

    const newSerUids: AxisStatECPrepareCachePerKeyPerAxis['serUids'] = createHashMap();
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
        cb: (dimStoreIdx: DimensionIndex, seriesModel: SeriesModel, rawDataStore: DataStore) => void
    ) {
        eachSeriesDeal(ecModel, perKeyPerAxis.sers, function (seriesModel) {
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
        //  - Series data can only be changed in EC_PREPARE_UPDATE.
        //  - The relationship between series and axes can only be changed in EC_PREPARE_UPDATE and
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
 * NOTICE:
 *  - It must be called in `CoordinateSystem['create']`, before series filtering.
 *  - It must be called in `seriesIndex` ascending order (series declaration order).
 *    i.e., iterated by `ecModel.eachSeries`.
 *  - Every <axis, series> pair can only call this method once.
 *
 * @see scaleRawExtentInfoCreate in `scaleRawExtentInfo.ts`
 */
export function associateSeriesWithAxis(
    axis: Axis | NullUndefined,
    seriesModel: SeriesModel,
    coordSysType: CoordinateSystem['type']
): void {
    if (!axis) {
        return;
    }

    const ecModel = seriesModel.ecModel;
    const ecFullUpdateCache = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel));
    const axisModelUid = axis.model.uid;

    if (__DEV__) {
        validateInputAxis(axis);
        // - An axis can be associated with multiple `axisStatKey`s. For example, if `axisStatKey`s are
        //   "candlestick" and "bar", they can be associated with the same "xAxis".
        // - Within an individual axis, it is a typically incorrect usage if a <axis, series> pair is
        //   associated with multiple `perKeyPerAxis`, which may cause repeated calculation and
        //   performance degradation, had hard to be found without the checking below. For example, If
        //   `axisStatKey` are "grid-bar" (see `barGrid.ts`) and "polar-bar" (see `barPolar.ts`), and
        //   a <xAxis-series> pair is wrongly associated with both "polar-bar" and "grid-bar", the
        //   relevant statistics will be computed twice.
        const axSerPairCheck = ecFullUpdateCache.axSerPairCheck
            || (ecFullUpdateCache.axSerPairCheck = createHashMap());
        const pairKey = `${axisModelUid}${AXIS_STAT_KEY_DELIMITER}${seriesModel.uid}`;
        assert(!axSerPairCheck.get(pairKey));
        axSerPairCheck.set(pairKey, 1);
    }

    const seriesOnAxisMap = ecFullUpdateCache.axSer || (ecFullUpdateCache.axSer = createHashMap());
    const seriesListPerAxis = seriesOnAxisMap.get(axisModelUid) || (seriesOnAxisMap.set(axisModelUid, []));
    if (__DEV__) {
        const lastSeries = seriesListPerAxis[seriesListPerAxis.length - 1];
        if (lastSeries) {
            // Series order should respect to the input order, since it matters in some cases
            // (e.g., see `barGrid.ts` and `barPolar.ts` - ec option declaration order matters).
            assert(lastSeries.seriesIndex < seriesModel.seriesIndex);
        }
    }
    seriesListPerAxis.push(seriesModel);

    const seriesType = seriesModel.subType;
    const isBaseAxis = seriesModel.getBaseAxis() === axis;

    const client = clientsByQueryKey.get(makeClientQueryKey(seriesType, isBaseAxis, coordSysType))
        || clientsByQueryKey.get(makeClientQueryKey(seriesType, isBaseAxis, null));
    if (!client) {
        return;
    }

    const keyed: AxisStatKeyed = ecFullUpdateCache.keyed || (ecFullUpdateCache.keyed = createHashMap());
    const keys: AxisStatKeys = ecFullUpdateCache.keys || (ecFullUpdateCache.keys = createHashMap());

    const axisStatKey = client.key;
    const perKey = keyed.get(axisStatKey) || keyed.set(axisStatKey, createHashMap());
    let perKeyPerAxis = perKey.get(axisModelUid);
    if (!perKeyPerAxis) {
        perKeyPerAxis = perKey.set(axisModelUid, {axis, sers: [], serByIdx: []});
        // They should only be executed for each <key, axis> pair once:
        perKeyPerAxis.metrics = client.getMetrics(axis);
        (keys.get(axisModelUid) || keys.set(axisModelUid, []))
            .push(axisStatKey);
    }

    // series order should respect to the input order.
    perKeyPerAxis.sers.push(seriesModel);
    perKeyPerAxis.serByIdx[seriesModel.seriesIndex] = seriesModel;
}

/**
 * NOTE: Currently, the scenario is simple enough to look up clients by hash map.
 * Otherwise, a caller-provided `filter` may be an alternative if more complex requirements arise.
 */
function makeClientQueryKey(
    seriesType: ComponentSubType,
    isBaseAxis: boolean | NullUndefined,
    coordSysType: CoordinateSystem['type'] | NullUndefined
): ClientQueryKey {
    return (
        seriesType
        + AXIS_STAT_KEY_DELIMITER + retrieve2(isBaseAxis, true)
        + AXIS_STAT_KEY_DELIMITER + (coordSysType || '')
    ) as ClientQueryKey;
}

/**
 * NOTICE: Can only be called in "install" stage.
 *
 * See `axisSnippets.ts` for some commonly used clients.
 */
export function requireAxisStatistics(
    registers: EChartsExtensionInstallRegisters,
    client: AxisStatKeyedClient
): void {
    const queryKey = makeClientQueryKey(client.seriesType, client.baseAxis, client.coordSysType);

    if (__DEV__) {
        assert(client.seriesType
            && client.key
            && !clientsCheckStatKey.get(client.key)
            && !clientsByQueryKey.get(queryKey)
        ); // More checking is performed in `axSerPairCheck`.
        clientsCheckStatKey.set(client.key, 1);
    }

    clientsByQueryKey.set(queryKey, client);

    callOnlyOnce(registers, function () {
        registers.registerProcessor(registers.PRIORITY.PROCESSOR.AXIS_STATISTICS, {
            // Theoretically, `appendData` requires to re-calculate them.
            dirtyOnOverallProgress: true,
            overallReset: performAxisStatisticsOnOverallReset
        });
    });
}

let clientsCheckStatKey: HashMap<1, AxisStatKey>;
if (__DEV__) {
    clientsCheckStatKey = createHashMap();
}
const clientsByQueryKey: HashMap<AxisStatKeyedClient, ClientQueryKey> = createHashMap();
