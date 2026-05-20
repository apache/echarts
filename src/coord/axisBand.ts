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
import { isOrdinalScale } from '../scale/helper';
import { isNullableNumberFinite, mathAbs, mathMax } from '../util/number';
import {
    AxisStatKey, getAxisStat, getAxisStatBySeries,
    LINEAR_POSITIVE_MIN_GAP_SINGLE_VALID_VALUE,
} from './axisStatistics';
import { getScaleLinearSpanForMapping } from '../scale/scaleMapper';
import type SeriesModel from '../model/Series';


// Arbitrary, leave some space to avoid overflowing when dataZoom moving.
const FALLBACK_BAND_WIDTH_RATIO = 0.8;

export type AxisBandWidthResult = {
    // bandWidth in pixel.
    // Never be null/undefined.
    // May be NaN if no meaningfull value. But it's unlikely to be NaN, since edge cases
    // are handled internally whenever possible.
    w: number;
    // bandWidth in data space.
    // Never be null/undefined.
    // May be NaN if no meaningfull value, typically when no valid series data item.
    w2: number;
};

type CalculateBandWidthOpt = {
    // Only used on non-'category' axes. Calculate `bandWidth` based on statistics.
    // Require `requireAxisStatistics` to be called.
    fromStat?: {
        // Either `key` or `sers` is required.
        //  - `key`: Calculate `bandWidth` based on a series collection defined by the `AxisStatKey`.
        key?: AxisStatKey;
        //  - `sers`: Query all keys by the given series collection and union the corresponding bandWidth.
        //    PENDING: If multiple axis statistics can be queried by `series`, currently we only support
        //    to return a maximum `bandWidth`, which is suitable for cases like "axis pointer shadow".
        sers?: (SeriesModel | NullUndefined)[] | NullUndefined;
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
    const out: AxisBandWidthResult = {w: NaN, w2: NaN};
    const scale = axis.scale;
    const fromStat = opt.fromStat;
    const min = opt.min;

    // [BAND_WIDTH_USED_SCALE_LINEAR_SPAN]
    //  - Band width should always respect to the currently specified extent, and `SCALE_EXTENT_KIND_MAPPING`
    //    should be used if specified.
    //    Otherwise, the result may incorrect, especially when data count is small.
    //    For example, when "containShape" is calculating, no `SCALE_EXTENT_KIND_MAPPING` is set, so here only
    //    `SCALE_EXTENT_KIND_EFFECTIVE` is returned, say, `[3, 5]`, based on which a `SCALE_EXTENT_KIND_MAPPING`
    //    is calculated, say `[2.5, 5.5]` (expanded by `0.5`). Then when rendering, that `SCALE_EXTENT_KIND_MAPPING`
    //    is returned here.
    //    See AXIS_CONTAIN_SHAPE_COMMON_STRATEGY for more details.
    //  - The span should be in the linear space (typically, the innermost space).
    //  - We use the scale extent after being zoommed and `intervalScaleEnsureValidExtent`-ish applied and
    //    "nice"/"align" applied, because:
    //    - For OrdinalScale, fine;
    //    - For numeric scale, `scaleLinearSpan` is normally not used for a consistent result when `dataZoom`
    //      is applied, but used when none or single data item case.
    let scaleLinearSpan = getScaleLinearSpanForMapping(scale);
    if (!isNullableNumberFinite(scaleLinearSpan)) { // scale may be `[Infinity, -Infinity]`.
        scaleLinearSpan = NaN;
    }
    const axisExtent = axis.getExtent();
    // Always use a new pxSpan because it may be changed in `grid` contain label calculation.
    const pxSpan = mathAbs(axisExtent[1] - axisExtent[0]);

    if (isOrdinalScale(scale)) {
        calcBandWidthForCategoryAxis(out, axis, scaleLinearSpan, pxSpan);
    }
    else if (fromStat) {
        calcBandWidthForNumericAxis(out, axis, scaleLinearSpan, pxSpan, fromStat);
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

function calcBandWidthForCategoryAxis(
    out: AxisBandWidthResult,
    axis: Axis,
    scaleLinearSpan: number,
    pxSpan: number,
): void {
    const onBand = axis.onBand;

    let len = scaleLinearSpan + (onBand ? 1 : 0);
    // Fix #2728, avoid NaN when only one data.
    len === 0 && (len = 1);

    out.w = pxSpan / len;
    // NOTE:
    //  - When `scaleLinearSpan === 0`, no need to expand extent.
    //  - `onBand: true` (`boundaryGap: true`) does not need to support `containShape`,
    //    thereby no `invRatio`.
    if (!onBand && scaleLinearSpan && pxSpan) {
        out.w2 = out.w * scaleLinearSpan / pxSpan;
    }
}

function calcBandWidthForNumericAxis(
    out: AxisBandWidthResult,
    axis: Axis,
    scaleLinearSpan: number,
    pxSpan: number,
    fromStat: CalculateBandWidthOpt['fromStat'],
): void {

    if (__DEV__) {
        assert(fromStat);
    }

    let onlySingular = false;
    let bandWidthInData = -Infinity;
    each(
        fromStat.key
            ? [getAxisStat(axis, fromStat.key)]
            : getAxisStatBySeries(axis, fromStat.sers || []),
        function (stat) {
            const liPosMinGap = stat.liPosMinGap;
            // NOTE: `liPosMinGap == null` may indicate that `requireAxisStatistics`
            // is not used by any series on this axis. We should not make `bandWidth`
            // for this case.
            if (liPosMinGap != null) {
                if (liPosMinGap > 0) {
                    if (liPosMinGap > bandWidthInData) {
                        bandWidthInData = liPosMinGap;
                    }
                    onlySingular = false;
                }
                else if (liPosMinGap === LINEAR_POSITIVE_MIN_GAP_SINGLE_VALID_VALUE) {
                    onlySingular = true;
                }
            }
        }
    );

    if (isNullableNumberFinite(scaleLinearSpan) && scaleLinearSpan > 0
        && isNullableNumberFinite(bandWidthInData)
    ) {
        out.w = pxSpan / scaleLinearSpan * bandWidthInData;
        out.w2 = bandWidthInData;
    }
    else if (onlySingular) {
        // This is the special handing for single value case, where min gap can not
        // be calculated, but `w` and `w2` (for "containShape") are still needed.
        out.w = pxSpan * FALLBACK_BAND_WIDTH_RATIO;
        out.w2 = out.w * scaleLinearSpan / pxSpan;
        // Consider an axis has both candlestick and bar series, where candlestick has multiple data
        // but the bar series has no data. In this case, that bar series should be ignored; otherwise,
        // the axis will be significantly expanded by "containShape" but no bar shape displayed.
    }
}
