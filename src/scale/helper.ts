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

import {getPrecision, round, nice, quantityExponent, mathPow, mathMax, mathRound} from '../util/number';
import IntervalScale from './Interval';
import LogScale from './Log';
import type Scale from './Scale';
import { bind } from 'zrender/src/core/util';
import type { ScaleBreakContext } from './break';
import TimeScale from './Time';
import { NullUndefined } from '../util/types';

type intervalScaleNiceTicksResult = {
    interval: number,
    intervalPrecision: number,
    niceTickExtent: [number, number]
};

/**
 * See also method `nice` in `src/util/number.ts`.
 */
// export function isValueNice(val: number) {
//     const exp10 = Math.pow(10, quantityExponent(Math.abs(val)));
//     const f = Math.abs(round(val / exp10, 0));
//     return f === 0
//         || f === 1
//         || f === 2
//         || f === 3
//         || f === 5;
// }

export function isIntervalOrLogScale(scale: Scale): scale is LogScale | IntervalScale {
    return isIntervalScale(scale) || isLogScale(scale);
}

export function isIntervalScale(scale: Scale): scale is IntervalScale {
    return scale.type === 'interval';
}

export function isTimeScale(scale: Scale): scale is TimeScale {
    return scale.type === 'time';
}

export function isLogScale(scale: Scale): scale is LogScale {
    return scale.type === 'log';
}

export function isOrdinalScale(scale: Scale): boolean {
    return scale.type === 'ordinal';
}

/**
 * @param extent Both extent[0] and extent[1] should be valid number.
 *               Should be extent[0] < extent[1].
 * @param splitNumber splitNumber should be >= 1.
 */
export function intervalScaleNiceTicks(
    extent: [number, number],
    spanWithBreaks: number,
    splitNumber: number,
    minInterval?: number,
    maxInterval?: number
): intervalScaleNiceTicksResult {

    const result = {} as intervalScaleNiceTicksResult;

    let interval = result.interval = nice(spanWithBreaks / splitNumber, true);
    if (minInterval != null && interval < minInterval) {
        interval = result.interval = minInterval;
    }
    if (maxInterval != null && interval > maxInterval) {
        interval = result.interval = maxInterval;
    }
    const precision = result.intervalPrecision = getIntervalPrecision(interval);
    // Niced extent inside original extent
    const niceTickExtent = result.niceTickExtent = [
        round(Math.ceil(extent[0] / interval) * interval, precision),
        round(Math.floor(extent[1] / interval) * interval, precision)
    ];

    fixNiceExtent(niceTickExtent, extent);

    return result;
}

/**
 * The input `niceInterval` should be generated
 * from `nice` method in `src/util/number.ts`, or
 * from `increaseInterval` itself.
 */
export function increaseInterval(niceInterval: number) {
    const exponent = quantityExponent(niceInterval);
    // No rounding error in Math.pow(10, integer).
    const exp10 = mathPow(10, exponent);
    // Fix IEEE 754 float rounding error
    let f = mathRound(niceInterval / exp10);
    if (!f) {
        f = 1;
    }
    else if (f === 2) {
        f = 3;
    }
    else if (f === 3) {
        f = 5;
    }
    else { // f is 1 or 5
        f *= 2;
    }
    // Fix IEEE 754 float rounding error
    return round(f * exp10, -exponent);
}

export function getIntervalPrecision(niceInterval: number): number {
    // Tow more digital for tick.
    // NOTE: `2` was introduced in commit `af2a2a9f6303081d7c3b52f0a38add07b4c6e0c7`;
    // it works on "nice" interval, but seems not necessarily mathematically required.
    return getPrecision(niceInterval) + 2;
}


function clamp(
    niceTickExtent: [number, number], idx: number, extent: [number, number]
): void {
    niceTickExtent[idx] = Math.max(Math.min(niceTickExtent[idx], extent[1]), extent[0]);
}

// In some cases (e.g., splitNumber is 1), niceTickExtent may be out of extent.
export function fixNiceExtent(
    niceTickExtent: [number, number], extent: [number, number]
): void {
    !isFinite(niceTickExtent[0]) && (niceTickExtent[0] = extent[0]);
    !isFinite(niceTickExtent[1]) && (niceTickExtent[1] = extent[1]);
    clamp(niceTickExtent, 0, extent);
    clamp(niceTickExtent, 1, extent);
    if (niceTickExtent[0] > niceTickExtent[1]) {
        niceTickExtent[0] = niceTickExtent[1];
    }
}

export function contain(val: number, extent: [number, number]): boolean {
    return val >= extent[0] && val <= extent[1];
}

export class ScaleCalculator {

    normalize: (val: number, extent: [number, number]) => number = normalize;
    scale: (val: number, extent: [number, number]) => number = scale;

    updateMethods(brkCtx: ScaleBreakContext) {
        if (brkCtx.hasBreaks()) {
            this.normalize = bind(brkCtx.normalize, brkCtx);
            this.scale = bind(brkCtx.scale, brkCtx);
        }
        else {
            this.normalize = normalize;
            this.scale = scale;
        }
    }
}

function normalize(
    val: number,
    extent: [number, number],
    // Dont use optional arguments for performance consideration here.
): number {
    if (extent[1] === extent[0]) {
        return 0.5;
    }
    return (val - extent[0]) / (extent[1] - extent[0]);
}

function scale(
    val: number,
    extent: [number, number],
): number {
    return val * (extent[1] - extent[0]) + extent[0];
}

export function logTransform(base: number, extent: number[], noClampNegative?: boolean): [number, number] {
    const loggedBase = Math.log(base);
    return [
        // log(negative) is NaN, so safe guard here.
        // PENDING: But even getting a -Infinity still does not make sense in extent.
        //  Just keep it as is, getting a NaN to make some previous cases works by coincidence.
        Math.log(noClampNegative ? extent[0] : Math.max(0, extent[0])) / loggedBase,
        Math.log(noClampNegative ? extent[1] : Math.max(0, extent[1])) / loggedBase
    ];
}

/**
 * A valid extent is:
 *  - No non-finite number.
 *  - `extent[0] < extent[1]`.
 *
 * [NOTICE]: The input `rawExtent` can only be:
 *  - All non-finite numbers or `NaN`; or
 *  - `[Infinity, -Infinity]` (A typical initial extent with no data.)
 *  (Improve it when needed.)
 */
export function intervalScaleEnsureValidExtent(
    rawExtent: number[],
    opt: {
        fixMax?: boolean
    }
): number[] {
    const extent = rawExtent.slice();
    // If extent start and end are same, expand them
    if (extent[0] === extent[1]) {
        if (extent[0] !== 0) {
            // Expand extent
            // Note that extents can be both negative. See #13154
            const expandSize = Math.abs(extent[0]);
            // In the fowllowing case
            //      Axis has been fixed max 100
            //      Plus data are all 100 and axis extent are [100, 100].
            // Extend to the both side will cause expanded max is larger than fixed max.
            // So only expand to the smaller side.
            if (!opt.fixMax) {
                extent[1] += expandSize / 2;
                extent[0] -= expandSize / 2;
            }
            else {
                extent[0] -= expandSize / 2;
            }
        }
        else {
            extent[1] = 1;
        }
    }
    const span = extent[1] - extent[0];
    // If there are no data and extent are [Infinity, -Infinity]
    if (!isFinite(span)) {
        extent[0] = 0;
        extent[1] = 1;
    }
    else if (span < 0) {
        extent.reverse();
    }

    return extent;
}

export function ensureValidSplitNumber(
    rawSplitNumber: number | NullUndefined, defaultSplitNumber: number
): number {
    rawSplitNumber = rawSplitNumber || defaultSplitNumber;
    return mathRound(mathMax(rawSplitNumber, 1));
}
