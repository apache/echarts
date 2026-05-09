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

import { assert, createHashMap, each, HashMap, retrieve2 } from 'zrender/src/core/util';
import type GlobalModel from '../model/Global';
import type SeriesModel from '../model/Series';
import {
    makeCallOnlyOnce, makeInner,
} from '../util/model';
import { ComponentSubType, NullUndefined } from '../util/types';
import type Axis from './Axis';
import type { AxisBaseModel } from './AxisBaseModel';
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
export type AxisStatPerKeyPerAxis = {
    axis: Axis;

    // This is series use this axis as base axis and need to be laid out.
    // The order is determined by the client and must be respected.
    // Never be null/undefined; Never be length === 0;
    // series filtered out is included.
    sers: SeriesModel[];
    // For query. The array index is series index.
    serByIdx: SeriesModel[];

    // Minimal positive gap of values (in the linear space) of all relevant series (e.g. per `BaseBarSeriesSubType`)
    // on this axis.
    liPosMinGap?:
        // Can only be a positive number rather than zero.
        number
        // In this case a positive min gap can not be calculated.
        | typeof LINEAR_POSITIVE_MIN_GAP_NO_VALID_VALUE
        // In this case a positive min gap can not be calculated.
        | typeof LINEAR_POSITIVE_MIN_GAP_SINGLE_VALID_VALUE
        // Be `null`/`undefined` if this metric is not required.
        | NullUndefined;

    // metrics corresponds to this record.
    metrics?: AxisStatMetrics;
};

// In this case, there are one or multiple valid data value but all the same.
export const LINEAR_POSITIVE_MIN_GAP_SINGLE_VALID_VALUE = -2;
export const LINEAR_POSITIVE_MIN_GAP_NO_VALID_VALUE = -1;

const ecModelCachePrepareInner = makeInner<{
    keyed: AxisStatECPrepareCacheKeyed | NullUndefined;
}, GlobalModelCachePerECPrepare>();

type AxisStatECPrepareCacheKeyed = HashMap<AxisStatECPrepareCachePerKey | NullUndefined, AxisStatKey>;
type AxisStatECPrepareCachePerKey = HashMap<AxisStatECPrepareCachePerKeyPerAxis | NullUndefined, AxisBaseModel['uid']>;
export type AxisStatECPrepareCachePerKeyPerAxis =
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
 * designated by a `AxisStatKey`.
 *
 * `AxisStatKey` is a static definition.
 *  In most case a `seriesType` is used as a `AxisStatKey` (See `makeAxisStatKey`).
 *  Sometimes a `seriesType`+`coordSysType` is used as a `AxisStatKey` (See `makeAxisStatKey2`).
 *
 * A <axis, series> pair can only own to one `AxisStatKey`.
 */
export type AxisStatKey = string & {_: 'AxisStatKey'}; // Nominal to avoid misusing.

type ClientLookupKey = string & {_: 'ClientLookupKey'}; // Nominal to avoid misusing; internal usage.

export type AxisStatMetrics = {

    // NOTICE:
    //  May be time-consuming in large data due to some metrics requiring travel and sort of
    //  series data, especially when axis break is used, so it is performed only if required.
    liPosMinGap?: boolean
};

export type AxisStatisticsResult = Pick<AxisStatPerKeyPerAxis, 'liPosMinGap'>;

type AxisStatEachSeriesCb = (seriesModel: SeriesModel) => void;

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

export function eachSeriesOnAxis(
    axis: Axis,
    cb: AxisStatEachSeriesCb
): void {
    if (__DEV__) {
        validateInputAxis(axis);
    }
    const ecModel = axis.model.ecModel;
    const seriesOnAxisMap = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(ecModel)).axSer;
    seriesOnAxisMap && eachSeriesDealForAxisStat(ecModel, seriesOnAxisMap.get(axis.model.uid), cb);
}

/**
 * NOTE:
 *  - series declaration order is respected (some ec option precedence matters, e.g., bar series).
 *  - series filtered out are excluded.
 */
export function eachSeriesOnAxisOnKey(
    axis: Axis,
    axisStatKey: AxisStatKey,
    cb: AxisStatEachSeriesCb
): void {
    if (__DEV__) {
        assert(axisStatKey != null);
        validateInputAxis(axis);
    }
    const perKeyPerAxis = getAxisStatPerKeyPerAxis(axis, axisStatKey);
    perKeyPerAxis && eachSeriesDealForAxisStat(axis.model.ecModel, perKeyPerAxis.sers, cb);
}

export function eachSeriesDealForAxisStat(
    ecModel: GlobalModel,
    seriesList: SeriesModel[] | NullUndefined,
    cb: AxisStatEachSeriesCb
): void {
    if (!seriesList) {
        return;
    }
    for (let i = 0; i < seriesList.length; i++) {
        const seriesModel = seriesList[i];
        // Legend-filtered series need to be ignored since series are registered before `legendFilter`.
        if (!ecModel.isSeriesFiltered(seriesModel)) {
            cb(seriesModel);
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
    eachSeriesDealForAxisStat(axis.model.ecModel, perKeyPerAxis.sers, function () {
        count++;
    });
    return count;
}

/**
 * NOTICE: Available after `CoordinateSystem['create']` (not included).
 *
 * Query all axes that have at least one associated series (via `associateSeriesWithAxis`)
 * by the given key.
 */
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
        if (__DEV__) {
            assert(perKeyPerAxis.sers.length > 0); // This is to avoid irrelevant axes to enter `cb`.
        }
        cb(perKeyPerAxis.axis);
    });
}

/**
 * NOTICE: Available after `CoordinateSystem['create']` (not included).
 *
 * Query all `AxisStatKey`s that have at least one associated series (via `associateSeriesWithAxis`)
 * by the given axis.
 */
export function eachKeyOnAxis(
    axis: Axis,
    cb: (axisStatKey: AxisStatKey) => void
): void {
    if (__DEV__) {
        validateInputAxis(axis);
    }
    const model = axis.model;
    const keysByAxisModelUid = ecModelCacheFullUpdateInner(getCachePerECFullUpdate(model.ecModel)).keys;
    keysByAxisModelUid && each(keysByAxisModelUid.get(model.uid), function (axisStatKey) {
        if (__DEV__) {
            const stat = getAxisStatPerKeyPerAxis(axis, axisStatKey);
            assert(stat && stat.sers.length > 0); // This is to avoid irrelevant `AxisStatKey` to enter `cb`.
        }
        cb(axisStatKey);
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

        if (perKeyPerAxis.metrics.liPosMinGap) {
            // We should assert the impl exists -- fail-fast if missing `registerMetricImpl`.
            _metricImpl.liPosMinGap(ecModel, perKeyPerAxis, ecPreparePerKeyPerAxis);
        }
    });
}

// To reduce code size from unnecessary metrics.
export function registerMetricImpl(metricType: keyof AxisStatMetrics, impl: AxisStateMetricImpl): void {
    _metricImpl[metricType] = impl;
}
const _metricImpl: Partial<Record<keyof AxisStatMetrics, AxisStateMetricImpl>> = {};
type AxisStateMetricImpl = (
    ecModel: GlobalModel,
    perKeyPerAxis: AxisStatPerKeyPerAxis,
    ecPreparePerKeyPerAxis: AxisStatECPrepareCachePerKeyPerAxis
) => void;

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

    const client = clientsForLookup.get(makeClientLookupKey(seriesType, isBaseAxis, coordSysType))
        || clientsForLookup.get(makeClientLookupKey(seriesType, isBaseAxis, null));
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
function makeClientLookupKey(
    seriesType: ComponentSubType,
    isBaseAxis: boolean | NullUndefined,
    coordSysType: CoordinateSystem['type'] | NullUndefined
): ClientLookupKey {
    return (
        seriesType
        + AXIS_STAT_KEY_DELIMITER + retrieve2(isBaseAxis, true)
        + AXIS_STAT_KEY_DELIMITER + (coordSysType || '')
    ) as ClientLookupKey;
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
    const clientKey = makeClientLookupKey(client.seriesType, client.baseAxis, client.coordSysType);

    if (__DEV__) {
        assert(client.seriesType
            && client.key
            && !clientsForCheckingStatKey.get(client.key)
            && !clientsForLookup.get(clientKey)
        ); // More checking is performed in `axSerPairCheck`.
        clientsForCheckingStatKey.set(client.key, 1);
    }

    clientsForLookup.set(clientKey, client);

    callOnlyOnce(registers, function () {
        registers.registerProcessor(registers.PRIORITY.PROCESSOR.AXIS_STATISTICS, {
            // NOTE: Theoretically, `appendData` requires `dirtyOnOverallProgress: true` here to re-calculate them.
            // But this OVERALL_STAGE_TASK is applied to all series (no `getTargetSeries` specified),
            // `dirtyOnOverallProgress: true` can cause irrelevant series (e.g., series on geo)
            // to be re-rendered when `appendData` is called, which cause `appendData` meaningless,
            // thereby not setting `dirtyOnOverallProgress: true`.
            overallReset: performAxisStatisticsOnOverallReset
        });
    });
}

let clientsForCheckingStatKey: HashMap<1, AxisStatKey>;
if (__DEV__) {
    clientsForCheckingStatKey = createHashMap();
}
const clientsForLookup: HashMap<AxisStatKeyedClient, ClientLookupKey> = createHashMap();
