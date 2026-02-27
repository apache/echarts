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

import { each } from 'zrender/src/core/util';
import { NullUndefined } from '../util/types';
import type Axis from './Axis';
import type Scale from '../scale/Scale';
import { isOrdinalScale } from '../scale/helper';
import { isNullableNumberFinite, mathAbs } from '../util/number';
import { getAxisStatistics, getAxisStatisticsKeys } from './axisStatistics';
import { getScaleLinearSpanForMapping } from '../scale/scaleMapper';


// Arbitrary, leave some space to avoid overflowing when dataZoom moving.
const SINGULAR_BAND_WIDTH_RATIO = 0.7;

export type AxisBandWidthResult = {
    // In px. May be NaN/null/undefined if no meaningfull bandWidth.
    bandWidth?: number | NullUndefined;
    kind?: AxisBandWidthKind;
    // If `AXIS_BAND_WIDTH_KIND_NORMAL`, this is a ratio from px span to data span, exists only if not singular.
    // If `AXIS_BAND_WIDTH_KIND_SINGULAR`, no need any ratio.
    ratio?: number | NullUndefined;
};

export type AxisBandWidthKind =
    // NullUndefined means no bandWidth, typically due to no series data.
    NullUndefined
    | typeof AXIS_BAND_WIDTH_KIND_SINGULAR
    | typeof AXIS_BAND_WIDTH_KIND_NORMAL;
export const AXIS_BAND_WIDTH_KIND_SINGULAR = 1;
export const AXIS_BAND_WIDTH_KIND_NORMAL = 2;

/**
 * NOTICE:
 *  Require the axis pixel extent and the scale extent as inputs. But they
 *  can be not precise for approximation.
 *
 * PENDING:
 *  Currently `bandWidth` can not be specified by users explicitly. But if we
 *  allow that in future, these issues must be considered:
 *    - Can only allow specifying a band width in data scale rather than pixel.
 *    - LogScale needs to be considered - band width can only be specified on linear
 *      (but before break) scale, similar to `axis.interval`.
 *
 * A band is required on:
 *  - bar series group band width;
 *  - tooltip axisPointer type "shadow";
 *  - etc.
 */
export function calcBandWidth(
    out: AxisBandWidthResult,
    axis: Axis
): void {
    // Clear out.
    out.bandWidth = out.ratio = out.kind = undefined;

    const scale = axis.scale;

    if (isOrdinalScale(scale)
        || !calcBandWidthForNumericAxisIfPossible(out, axis, scale)
    ) {
        calcBandWidthForCategoryAxisOrFallback(out, axis, scale);
    }
}

/**
 * Only reasonable on 'category'.
 *
 * It can be used as a fallback, as it does not produce a significant negative impact
 * on non-category axes.
 */
function calcBandWidthForCategoryAxisOrFallback(
    out: AxisBandWidthResult,
    axis: Axis,
    scale: Scale
): void {
    const axisExtent = axis.getExtent();
    const dataExtent = scale.getExtent();

    let len = dataExtent[1] - dataExtent[0] + (axis.onBand ? 1 : 0);
    // Fix #2728, avoid NaN when only one data.
    len === 0 && (len = 1);

    const size = Math.abs(axisExtent[1] - axisExtent[0]);

    out.bandWidth = Math.abs(size) / len;
}

function calcBandWidthForNumericAxisIfPossible(
    out: AxisBandWidthResult,
    axis: Axis,
    scale: Scale,
    // A falsy return indicates this method is not applicable - a fallback is needed.
): boolean {
    // PENDING: Theoretically, for 'value'/'time'/'log' axis, `bandWidth` should be derived from
    // series data and may vary per data items. However, we currently only derive `bandWidth`
    // per serise, regardless of individual data items, until concrete requirements arise.
    // Therefore, we arbitrarily choose a minimal `bandWidth` to avoid overlap if multiple
    // irrelevant series reside on one axis.
    let hasStat: boolean;
    let linearPositiveMinGap = Infinity;
    each(getAxisStatisticsKeys(axis), function (axisStatKey) {
        const liMinGap = getAxisStatistics(axis, axisStatKey).linearPositiveMinGap;
        if (liMinGap != null) {
            hasStat = true;
            if (isNullableNumberFinite(liMinGap) && liMinGap < linearPositiveMinGap) {
                linearPositiveMinGap = liMinGap;
            }
        }
    });
    if (!hasStat) {
        return false;
    }

    let bandWidth: number | NullUndefined;
    let kind: AxisBandWidthKind | NullUndefined;
    let ratio: number | NullUndefined;

    const axisExtent = axis.getExtent();
    // Always use a new pxSpan because it may be changed in `grid` contain label calculation.
    const pxSpan = mathAbs(axisExtent[1] - axisExtent[0]);
    const linearScaleSpan = getScaleLinearSpanForMapping(scale);
    // `linearScaleSpan` may be `0` or `Infinity` or `NaN`, since normalizers like
    // `intervalScaleEnsureValidExtent` may not have been called yet.
    if (isNullableNumberFinite(linearScaleSpan) && linearScaleSpan > 0
        && isNullableNumberFinite(linearPositiveMinGap)
    ) {
        bandWidth = pxSpan / linearScaleSpan * linearPositiveMinGap;
        ratio = linearScaleSpan / pxSpan;
        kind = AXIS_BAND_WIDTH_KIND_NORMAL;
    }
    else {
        bandWidth = pxSpan * SINGULAR_BAND_WIDTH_RATIO;
        kind = AXIS_BAND_WIDTH_KIND_SINGULAR;
    }

    out.bandWidth = bandWidth;
    out.kind = kind;
    out.ratio = ratio;

    return true;
}
