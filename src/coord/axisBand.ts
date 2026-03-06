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

import { assert, each } from 'zrender/src/core/util';
import { NullUndefined } from '../util/types';
import type Axis from './Axis';
import type Scale from '../scale/Scale';
import { isOrdinalScale } from '../scale/helper';
import { isNullableNumberFinite, mathAbs, mathMax } from '../util/number';
import {
    AxisStatKey, getAxisStat, getAxisStatBySeries,
} from './axisStatistics';
import { getScaleLinearSpanForMapping } from '../scale/scaleMapper';
import type SeriesModel from '../model/Series';


// Arbitrary, leave some space to avoid overflowing when dataZoom moving.
const FALLBACK_BAND_WIDTH_RATIO = 0.8;

export type AxisBandWidthResult = {
    // The result `bandWidth`. In pixel.
    // Never be null/undefined.
    // May be NaN if no meaningfull `bandWidth`. But it's unlikely to be NaN, since edge cases
    // are handled internally whenever possible.
    w: number;
    // Exists if `bandWidth` is calculated by `fromStat`.
    fromStat?: {
        // This is a ratio from pixel span to data span; The conversion can not be performed
        // if it is not valid, typically when only one or no series data item exists on the axis.
        invRatio?: number | NullUndefined;
    };
};

/**
 * PENDING: Should the `bandWidth` strategy be chosen by users, or auto-determined basesd on
 * performance?
 */
type CalculateBandWidthOpt = {
    // Only used on non-'category' axes. Calculate `bandWidth` based on statistics.
    // Require `requireAxisStatistics` to be called.
    fromStat?: {
        // Either `axisStatKey` or `series` is required.
        // If multiple axis statistics can be queried by `series`, currently we only support to return a
        // maximum `bandWidth`, which is suitable for cases like "axis pointer shadow".
        sers?: (SeriesModel | NullUndefined)[] | NullUndefined;
        key?: AxisStatKey;
    };
    // It also act as a fallback for NaN/null/undefined result.
    min?: number;
};

/**
 * NOTICE:
 *  - Require the axis pixel extent and the scale extent as inputs. But they
 *    can be not precise for approximation.
 *  - Can only be called after "data processing" stage.
 *
 * PENDING:
 *  Currently `bandWidth` can not be specified by users explicitly. But if we
 *  allow that in future, these issues must be considered:
 *    - Can only allow specifying a band width in data scale rather than pixel.
 *    - LogScale needs to be considered - band width can only be specified on linear
 *      (but before break) scale, similar to `axis.interval`.
 *
 * A band is required on:
 *  - series group band width in bar/boxplot/candlestick/...;
 *  - tooltip axisPointer type "shadow";
 *  - etc.
 */
export function calcBandWidth(
    axis: Axis,
    opt?: CalculateBandWidthOpt | NullUndefined
): AxisBandWidthResult {
    opt = opt || {};
    const out: AxisBandWidthResult = {w: NaN};
    const scale = axis.scale;
    const fromStat = opt.fromStat;
    const min = opt.min;

    if (isOrdinalScale(scale)) {
        calcBandWidthForCategoryAxis(out, axis, scale);
    }
    else if (fromStat) {
        calcBandWidthForNumericAxis(out, axis, scale, fromStat);
    }
    else if (min == null) {
        if (__DEV__) {
            assert(false);
        }
    }

    if (min != null) {
        out.w = isNullableNumberFinite(out.w)
            ? mathMax(min, out.w) : min;
    }

    return out;
}

/**
 * Only reasonable on 'category'.
 *
 * It can be used as a fallback, as it does not produce a significant negative impact
 * on non-category axes.
 *
 * @see CalculateBandWidthOpt
 */
function calcBandWidthForCategoryAxis(
    out: AxisBandWidthResult,
    axis: Axis,
    scale: Scale
): void {
    const axisExtent = axis.getExtent();
    const dataExtent = scale.getExtent();

    let len = dataExtent[1] - dataExtent[0] + (axis.onBand ? 1 : 0);
    // Fix #2728, avoid NaN when only one data.
    len === 0 && (len = 1);

    out.w = mathAbs(axisExtent[1] - axisExtent[0]) / len;
}

/**
 * @see CalculateBandWidthOpt
 */
function calcBandWidthForNumericAxis(
    out: AxisBandWidthResult,
    axis: Axis,
    scale: Scale,
    fromStat: CalculateBandWidthOpt['fromStat'],
): void {

    let bandWidth = NaN;
    let invRatio: number | NullUndefined;

    if (__DEV__) {
        assert(fromStat);
    }

    let allSingularOrNone: boolean | NullUndefined;
    let bandWidthInData = -Infinity;
    each(
        fromStat.key
            ? [getAxisStat(axis, fromStat.key)]
            : getAxisStatBySeries(axis, fromStat.sers || []),
        function (stat) {
            const liPosMinGap = stat.liPosMinGap;
            // `liPosMinGap == null` may indicate that `requireAxisStatistics`
            // is not used by the relevant series. We conservatively do not
            // consider it as a "singular" case.
            if (liPosMinGap != null && allSingularOrNone == null) {
                allSingularOrNone = true;
            }
            if (isNullableNumberFinite(liPosMinGap)) {
                if (liPosMinGap > bandWidthInData) {
                    bandWidthInData = liPosMinGap;
                }
                allSingularOrNone = false;
            }
        }
    );

    const axisExtent = axis.getExtent();
    // Always use a new pxSpan because it may be changed in `grid` contain label calculation.
    const pxSpan = mathAbs(axisExtent[1] - axisExtent[0]);
    const linearScaleSpan = getScaleLinearSpanForMapping(scale);
    // `linearScaleSpan` may be `0` or `Infinity` or `NaN`, since normalizers like
    // `intervalScaleEnsureValidExtent` may not have been called yet.
    if (isNullableNumberFinite(linearScaleSpan) && linearScaleSpan > 0
        && isNullableNumberFinite(bandWidthInData)
    ) {
        // NOTE: even when the `bandWidth` is far smaller than `1`, we should still preserve the
        // precision, because it is required to convert back to data space by `invRatio` for
        // displaying of zoomed ticks and band.
        bandWidth = pxSpan / linearScaleSpan * bandWidthInData;
        invRatio = linearScaleSpan / pxSpan;
    }
    else if (allSingularOrNone) {
        bandWidth = pxSpan * FALLBACK_BAND_WIDTH_RATIO;
    }

    out.w = bandWidth;
    out.fromStat = {invRatio};
}
