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

import {getPrecision, round, nice, quantityExponent} from '../util/number';
import { OrdinalNumber, ScaleBreak } from '../util/types';
import { warn } from '../util/log';
import IntervalScale from './Interval';
import LogScale from './Log';
import Scale from './Scale';
import { filter } from 'zrender/src/core/util';

type intervalScaleNiceTicksResult = {
    interval: number,
    intervalPrecision: number,
    niceTickExtent: [number, number]
};

export function isValueNice(val: number) {
    const exp10 = Math.pow(10, quantityExponent(Math.abs(val)));
    const f = Math.abs(val / exp10);
    return f === 0
        || f === 1
        || f === 2
        || f === 3
        || f === 5;
}

export function isIntervalOrLogScale(scale: Scale): scale is LogScale | IntervalScale {
    return scale.type === 'interval' || scale.type === 'log';
}
/**
 * @param extent Both extent[0] and extent[1] should be valid number.
 *               Should be extent[0] < extent[1].
 * @param splitNumber splitNumber should be >= 1.
 */
export function intervalScaleNiceTicks(
    extent: [number, number],
    spanWithoutBreaks: number,
    splitNumber: number,
    minInterval?: number,
    maxInterval?: number
): intervalScaleNiceTicksResult {

    const result = {} as intervalScaleNiceTicksResult;

    let interval = result.interval = nice(spanWithoutBreaks / splitNumber, true);
    if (minInterval != null && interval < minInterval) {
        interval = result.interval = minInterval;
    }
    if (maxInterval != null && interval > maxInterval) {
        interval = result.interval = maxInterval;
    }
    // Tow more digital for tick.
    const precision = result.intervalPrecision = getIntervalPrecision(interval);
    // Niced extent inside original extent
    const niceTickExtent = result.niceTickExtent = [
        round(Math.ceil(extent[0] / interval) * interval, precision),
        round(Math.floor(extent[1] / interval) * interval, precision)
    ];

    fixExtent(niceTickExtent, extent);

    return result;
}

export function increaseInterval(interval: number) {
    const exp10 = Math.pow(10, quantityExponent(interval));
    // Increase interval
    let f = interval / exp10;
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
    return round(f * exp10);
}

/**
 * @return interval precision
 */
export function getIntervalPrecision(interval: number): number {
    // Tow more digital for tick.
    return getPrecision(interval) + 2;
}

function clamp(
    niceTickExtent: [number, number], idx: number, extent: [number, number]
): void {
    niceTickExtent[idx] = Math.max(Math.min(niceTickExtent[idx], extent[1]), extent[0]);
}

// In some cases (e.g., splitNumber is 1), niceTickExtent may be out of extent.
export function fixExtent(
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

export function normalize(
    val: number,
    extent: [number, number],
    breaks?: ScaleBreak[]
): number {
    if (extent[1] === extent[0]) {
        return 0.5;
    }
    const unexpandedBreaks = filter(breaks || [], brk => !brk.isExpanded);
    if (unexpandedBreaks.length === 0) {
        // console.log(`val: ${val}, extent: ${extent} => ${val / (extent[1] - extent[0])}`);
        return (val - extent[0]) / (extent[1] - extent[0]);
    }

    let beforeBreakRange = 0;
    for (let i = 0; i < unexpandedBreaks.length; ++i) {
        const brk = unexpandedBreaks[i];
        if (!brk.isExpanded) {
            if (brk.gap < 0) {
                warn('Break axis gap should not be negative');
            }
            beforeBreakRange += brk.end - brk.start - brk.gap;
        }
    }
    const beforeValueRange = Math.max(0, extent[1] - extent[0] - beforeBreakRange);

    // If the value is in the break, return the normalized value in the break
    let elapsedVal = 0;
    let lastBreakEnd = extent[0];
    for (let i = 0; i < unexpandedBreaks.length; i++) {
        const brk = unexpandedBreaks[i];
        if (brk.isExpanded) {
            continue;
        }
        if (val <= brk.end) {
            if (val > brk.start) {
                elapsedVal += brk.start - lastBreakEnd
                    + (val - brk.start) / (brk.end - brk.start) * brk.gap;
            }
            else {
                elapsedVal += val - lastBreakEnd;
            }
            lastBreakEnd = brk.end;
            break;
        }
        elapsedVal += brk.start - lastBreakEnd + brk.gap;
        lastBreakEnd = brk.end;
    }
    const lastBreak = unexpandedBreaks[unexpandedBreaks.length - 1];
    if (val >= lastBreak.end) {
        elapsedVal += val - lastBreak.end;
    }
    return Math.min(1, elapsedVal / beforeValueRange);
}

export function scale(
    val: number,
    extent: [number, number],
    breaks?: ScaleBreak[]
): number {
    return val * getExtentSpanWithoutBreaks(extent, breaks) + extent[0];
}

export function getExtentSpanWithoutBreaks(extent: [number, number], breaks: ScaleBreak[]): number {
    // When breaks is defined, calculate the sum of break gaps
    let span = extent[1] - extent[0];
    if (!isFinite(span)) {
        return span;
    }
    for (let i = 0; i < breaks.length; i++) {
        const brk = breaks[i];
        if (!brk.isExpanded) {
            span -= breaks[i].end - breaks[i].start - breaks[i].gap;
        }
    }
    return span;
}

export function adjustInBreakPosition(
    normalizedData: OrdinalNumber,
    extent: [number, number],
    breaks: ScaleBreak[],
    breakIndex: number,
    inBreakPosition: 'start' | 'center' | 'end'
) {
    inBreakPosition = inBreakPosition || 'center';
    const span = getExtentSpanWithoutBreaks(extent, breaks);
    const brk = breaks[breakIndex];
    const bandWidth = 1 / span * brk.gap;

    // if (inBreakPosition === 'start') {
    //     // return normalizedData - bandWidth;
    //     return normalizedData;
    // }
    if (inBreakPosition === 'end') {
        return normalizedData + bandWidth;
    }
    if (inBreakPosition === 'center') {
        return normalizedData + bandWidth / 2;
    }
    // if (normalizedData === 1) {
    //     return normalizedData + bandWidth;
    // }
    return normalizedData;
}
