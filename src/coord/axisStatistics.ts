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

import { assert, clone, createHashMap, each, HashMap } from 'zrender/src/core/util';
import type GlobalModel from '../model/Global';
import type SeriesModel from '../model/Series';
import {
    extentHasValue, getCachePerECFullUpdate, GlobalModelCachePerECFullUpdate,
    initExtentForUnion, makeInner,
} from '../util/model';
import { NullUndefined } from '../util/types';
import type Axis from './Axis';
import { asc, isNullableNumberFinite, mathMin } from '../util/number';
import { registerPerformAxisStatistics } from '../core/CoordinateSystem';
import { parseSanitizationFilter, passesSanitizationFilter } from '../data/helper/dataValueHelper';


const ecModelCacheInner = makeInner<{
    axes: Axis[];
}, GlobalModelCachePerECFullUpdate>();
type AxisStatisticsStore = {
    stat: AxisStatisticsPerAxis | NullUndefined;
    // For duplication checking.
    added: boolean
};
const axisInner = makeInner<AxisStatisticsStore, Axis>();

export type AxisStatisticsClient = {
    collectAxisSeries: (
        ecModel: GlobalModel,
        saveAxisSeries: (axis: Axis, series: SeriesModel) => void
    ) => void;
    getMetrics: (
        axis: Axis,
    ) => AxisStatisticsMetrics;
};

/**
 * Nominal to avoid misusing.
 * Sample usage:
 *      function axisStatKey(seriesType: ComponentSubType): AxisStatisticsKey {
 *          return `xxx-${seriesType}` as AxisStatisticsKey;
 *      }
 */
export type AxisStatisticsKey = string & {_: 'AxisStatisticsKey'};

type AxisStatisticsMetrics = {
    // Currently only one metric is required.
    // NOTICE:
    //   May be time-consuming due to some metrics requiring travel and sort of series data,
    //   especially when axis break is used, so it is performed only if required.
    minGap?: boolean
};

type AxisStatisticsPerAxis = HashMap<AxisStatisticsPerAxisPerKey, AxisStatisticsKey>;

type AxisStatisticsPerAxisPerKey = {
    // Mark that any statistics has been performed in this record. Also for duplication checking.
    added?: boolean
    // This is series use this axis as base axis and need to be laid out.
    sers: SeriesModel[];
    // Minimal positive gap of values of all relevant series (e.g. per `BaseBarSeriesSubType`) on this axis.
    // Be `NaN` if no valid data item or only one valid data item.
    // Be `null`/`undefined` if this statistics is not performed.
    linearPositiveMinGap?: number | NullUndefined;
    // min/max of values of all relevant series (e.g. per `BaseBarSeriesSubType`) on this axis.
    // Be `null`/`undefined` if this statistics is not performed,
    // otherwise it is an array, but may contain `NaN` if no valid data.
    linearValueExtent?: number[] | NullUndefined;
};

export type AxisStatisticsResult = Pick<
    AxisStatisticsPerAxisPerKey,
    'linearPositiveMinGap' | 'linearValueExtent'
>;

function ensureAxisStatisticsPerAxisPerKey(
    axisStore: AxisStatisticsStore, axisStatKey: AxisStatisticsKey
): AxisStatisticsPerAxisPerKey {
    if (__DEV__) {
        assert(axisStatKey != null);
    }
    const stat = axisStore.stat || (axisStore.stat = createHashMap());
    return stat.get(axisStatKey)
        || stat.set(axisStatKey, {sers: []});
}

export function getAxisStatistics(
    axis: Axis,
    axisStatKey: AxisStatisticsKey
    // Never return null/undefined.
): AxisStatisticsResult {
    const record = ensureAxisStatisticsPerAxisPerKey(axisInner(axis), axisStatKey);
    return {
        linearPositiveMinGap: record.linearPositiveMinGap,
        linearValueExtent: clone(record.linearValueExtent),
    };
}

export function getAxisStatisticsKeys(
    axis: Axis
): AxisStatisticsKey[] {
    const stat = axisInner(axis).stat;
    return stat ? stat.keys() : [];
}

export function eachCollectedSeries(
    axis: Axis,
    axisStatKey: AxisStatisticsKey,
    cb: (series: SeriesModel) => void
): void {
    each(ensureAxisStatisticsPerAxisPerKey(axisInner(axis), axisStatKey).sers, cb);
}

export function getCollectedSeriesLength(
    axis: Axis,
    axisStatKey: AxisStatisticsKey,
): number {
    return ensureAxisStatisticsPerAxisPerKey(axisInner(axis), axisStatKey).sers.length;
}

export function eachCollectedAxis(
    ecModel: GlobalModel,
    cb: (axis: Axis) => void
): void {
    each(ecModelCacheInner(getCachePerECFullUpdate(ecModel)).axes, cb);
}

/**
 * Perform statistics if required.
 */
function performAxisStatisticsImpl(ecModel: GlobalModel): void {
    const ecCache = ecModelCacheInner(getCachePerECFullUpdate(ecModel));
    const distinctAxes: Axis[] = ecCache.axes = [];

    const records: AxisStatisticsPerAxisPerKey[] = [];
    const recordAxes: Axis[] = [];
    const recordMetricsList: AxisStatisticsMetrics[] = [];

    axisStatisticsClients.each(function (client, axisStatKey) {
        client.collectAxisSeries(
            ecModel,
            function saveAxisSeries(axis, series): void {
                const axisStore = axisInner(axis);
                if (!axisStore.added) {
                    axisStore.added = true;
                    distinctAxes.push(axis);
                }
                const record = ensureAxisStatisticsPerAxisPerKey(axisStore, axisStatKey);
                if (!record.added) {
                    record.added = true;
                    records.push(record);
                    recordAxes.push(axis);
                    recordMetricsList.push(client.getMetrics(axis) || {});
                }
                // NOTICE: series order should respect to the input order,
                // since it matters in some cases (see `barGrid`).
                record.sers.push(series);
            }
        );
    });

    each(records, function (record, idx) {
        performStatisticsForRecord(record, recordMetricsList[idx], recordAxes[idx]);
    });
}

function performStatisticsForRecord(
    record: AxisStatisticsPerAxisPerKey,
    metrics: AxisStatisticsMetrics,
    axis: Axis,
): void {
    if (!metrics.minGap) {
        return;
    }

    const linearValueExtent = initExtentForUnion();
    const scale = axis.scale;
    const needTransform = scale.needTransform();
    const filter = scale.getFilter ? scale.getFilter() : null;
    const filterParsed = parseSanitizationFilter(filter);
    let valIdx = 0;

    each(record.sers, function (seriesModel) {
        const data = seriesModel.getData();
        const dimIdx = data.getDimensionIndex(data.mapDimension(axis.dim));
        const store = data.getStore();

        for (let i = 0, cnt = store.count(); i < cnt; ++i) {
            // Manually inline some code for performance, since no other optimization
            // (such as, progressive) can be applied here.
            let val = store.get(dimIdx, i) as number;
            // NOTE: in most cases, filter does not exist.
            if (isFinite(val)
                && (!filter || passesSanitizationFilter(filterParsed, val))
            ) {
                if (needTransform) {
                    // PENDING: time-consuming if axis break is applied.
                    val = scale.transformIn(val, null);
                }
                tmpStaticPSFRValues[valIdx++] = val;
                val < linearValueExtent[0] && (linearValueExtent[0] = val);
                val > linearValueExtent[1] && (linearValueExtent[1] = val);
            }
        }
    });
    tmpStaticPSFRValues.length = valIdx;

    // Sort axis values into ascending order to calculate gaps
    asc(tmpStaticPSFRValues);

    let min = Infinity;
    for (let j = 1; j < valIdx; ++j) {
        const delta = tmpStaticPSFRValues[j] - tmpStaticPSFRValues[j - 1];
        if (// - Different series normally have the same values, which should be ignored.
            // - A single series with multiple same values is often not meaningful to
            //   create `bandWidth`, so it is also ignored.
            delta > 0
        ) {
            min = mathMin(min, delta);
        }
    }

    record.linearPositiveMinGap = isNullableNumberFinite(min)
        ? min
        : NaN; // No valid data item or single valid data item.
    if (!extentHasValue(linearValueExtent)) {
        linearValueExtent[0] = linearValueExtent[1] = NaN; // No valid data.
    }
    record.linearValueExtent = linearValueExtent;
}
const tmpStaticPSFRValues: number[] = []; // A quick performance optimization.

export function requireAxisStatistics(
    axisStatKey: AxisStatisticsKey,
    client: AxisStatisticsClient
): void {
    if (__DEV__) {
        assert(!axisStatisticsClients.get(axisStatKey));
    }

    registerPerformAxisStatistics(performAxisStatisticsImpl);
    axisStatisticsClients.set(axisStatKey, client);
}

const axisStatisticsClients: HashMap<AxisStatisticsClient, AxisStatisticsKey> = createHashMap();
