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

import {
    getPrecision, round, nice, quantityExponent,
    mathPow, mathMax, mathRound,
    mathLog, mathAbs, mathFloor, mathCeil
} from '../util/number';
import type IntervalScale from './Interval';
import type LogScale from './Log';
import type Scale from './Scale';
import type TimeScale from './Time';
import { NullUndefined } from '../util/types';
import type OrdinalScale from './Ordinal';
import type { ScaleExtentFixMinMax } from '../coord/scaleRawExtentInfo';
import { isValidNumberForExtent } from '../util/model';

type intervalScaleNiceTicksResult = {
    interval: number,
    intervalPrecision: number,
    niceTickExtent: [number, number]
};

export type IntervalScaleGetLabelOpt = {
    // If 'auto', use nice precision.
    precision?: 'auto' | number,
    // `true`: returns 1.50 but not 1.5 if precision is 2.
    pad?: boolean
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

export function isIntervalOrLogScale(scale: Scale): scale is (LogScale | IntervalScale) {
    return isIntervalScale(scale) || isLogScale(scale);
}

export function isIntervalOrTimeScale(scale: Scale): scale is (IntervalScale | TimeScale) {
    return isIntervalScale(scale) || isTimeScale(scale);
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

export function isOrdinalScale(scale: Scale): scale is OrdinalScale {
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
    result.niceTickExtent = [
        round(mathCeil(extent[0] / interval) * interval, precision),
        round(mathFloor(extent[1] / interval) * interval, precision)
    ];

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

/**
 * Lookup table to avoid rounding error - if the value before transformed is in `lookup.from[i]`,
 * return `lookup.to[i]` directly without transform.
 * Rounding errors typically arise in logarithm transform, which can cause the tick to be displayed
 * like `5.999999999999999` when it is expected to be `6`.
 */
export type ValueTransformLookupOpt = {
    lookup?: {
        from: number[];
        to: number[];
    } | NullUndefined;
};

/**
 * NOTE:
 *  - If `val` is `NaN`, return `NaN`.
 *  - If `val` is `0`, return `-Infinity`.
 *  - If `val` is negative, return `NaN`.
 *
 * @see {DataStore#getDataExtent} It handles non-positive values for logarithm scale.
 */
export function logScaleLogTick(
    val: number,
    base: number,
): number {
    // NOTE:
    //  - rounding error may happen above, typically expecting `log10(1000)` but actually
    //    getting `2.9999999999999996`, but generally it does not matter since they are not
    //    used to display.
    //  - Consider backward compatibility and other log bases, do not use `Math.log10`.
    return mathLog(val) / mathLog(base);
}

/**
 * Cumulative rounding errors cause the logarithm operation to become non-invertible by simply exponentiation.
 *  - `Math.pow(10, integer)` itself has no rounding error. But,
 *  - If `linearTickVal` is generated internally by `calcNiceTicks`, it may be still "not nice" (not an integer)
 *    when it is `extent[i]`.
 *  - If `linearTickVal` is generated outside (e.g., by `scaleCalcAlign`) and set by `setExtent`,
 *    `logScaleLogTick` may already have introduced rounding errors even for "nice" values.
 * But invertible is required when the original `extent[i]` need to be respected, or "nice" ticks need to be
 * displayed instead of something like `5.999999999999999`, which is addressed in this function.
 * See also `#4158`.
 *
 * [CAUTION]:
 *  Monotonicity may be broken on extent ends - callers must make sure it does not matter.
 */
export function logScalePowTick(
    // `tickVal` should be in the linear space.
    linearTickVal: number,
    base: number,
    opt: ValueTransformLookupOpt | NullUndefined
): number {
    const lookup = opt && opt.lookup;
    if (lookup) {
        for (let i = 0; i < lookup.from.length; i++) {
            if (linearTickVal === lookup.from[i]) {
                return lookup.to[i];
            }
        }
    }
    return mathPow(base, linearTickVal);
}

/**
 * For `IntervalScale`, convert `rawExtent` to:
 *  - Be no non-finite number.
 *  - Be `extent[0] < extent[1]`; no equal, which brings convenience to "nice" calculation.
 */
export function intervalScaleEnsureValidExtent(
    rawExtent: number[],
    fixMinMax: ScaleExtentFixMinMax,
): number[] {
    const extent = rawExtent.slice();
    // If extent start and end are same, expand them
    if (extent[0] === extent[1]) {
        if (extent[0] !== 0) {
            // Expand extent
            // Note that extents can be both negative. See #13154
            const expandSize = mathAbs(extent[0]);
            // In the fowllowing case
            //      Axis has been fixed max 100
            //      Plus data are all 100 and axis extent are [100, 100].
            // Extend to the both side will cause expanded max is larger than fixed max.
            // So only expand to the smaller side.
            if (!fixMinMax[1]) {
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
    // For example, if there are no series data, extent may be `[Infinity, -Infinity]` here.
    if (!isValidNumberForExtent(extent[0]) || !isValidNumberForExtent(extent[1])) {
        extent[0] = 0;
        extent[1] = 1;
    }
    if (extent[1] < extent[0]) {
        extent.reverse();
    }

    return extent;
}

export function extentDiffers(extent1: number[], extent2: number[]): boolean[] {
    return [extent1[0] !== extent2[0], extent1[1] !== extent2[1]];
}

export function ensureValidSplitNumber(
    rawSplitNumber: number | NullUndefined, defaultSplitNumber: number
): number {
    rawSplitNumber = rawSplitNumber || defaultSplitNumber;
    return mathRound(mathMax(rawSplitNumber, 1));
}
