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

import { NumericAxisBaseOptionCommon } from '../coord/axisCommonTypes';
import * as numberUtil from '../util/number';
import IntervalScale from './Interval';
import { parseAxisModelMinMax } from '../coord/scaleRawExtentInfo';
import { ScaleDataValue } from '../util/types';
import { getScaleExtent, niceScaleExtent } from '../coord/axisHelper';
import { AxisBaseModel } from '../coord/AxisBaseModel';
import LogScale from './Log';
import Scale from './Scale';
import { warn } from '../util/log';

const roundNumber = numberUtil.round;
const mathLog = Math.log;

type intervalScaleNiceTicksResult = {
    interval: number,
    intervalPrecision: number,
    niceTickExtent: [number, number]
};

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
    splitNumber: number,
    minInterval?: number,
    maxInterval?: number
): intervalScaleNiceTicksResult {

    const result = {} as intervalScaleNiceTicksResult;

    const span = extent[1] - extent[0];
    let interval = result.interval = numberUtil.nice(span / splitNumber, true);
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
        roundNumber(Math.ceil(extent[0] / interval) * interval, precision),
        roundNumber(Math.floor(extent[1] / interval) * interval, precision)
    ];

    fixExtent(niceTickExtent, extent);

    return result;
}

function increaseInterval(interval: number) {
    const exp10 = Math.pow(10, numberUtil.quantityExponent(interval));
    // Increase interval
    let f = interval / exp10;
    if (f === 2) {
        f = 3;
    }
    else if (f === 3) {
        f = 5;
    }
    else { // f is 1 or 5
        f *= 2;
    }
    return f * exp10;
}

export function alignScaleTicks(
    scale: IntervalScale | LogScale,
    axisModel: AxisBaseModel<Pick<NumericAxisBaseOptionCommon, 'min' | 'max'>>,
    alignToScale: IntervalScale | LogScale
) {

    const intervalScaleProto = IntervalScale.prototype;

    // NOTE: There is a precondition for log scale  here:
    // In log scale we store _interval and _extent of exponent value.
    // So if we use the method of InternalScale to set/get these data.
    // It process the exponent value, which is linear and what we want here.
    const alignToTicks = intervalScaleProto.getTicks.call(alignToScale);
    const alignToNicedTicks = intervalScaleProto.getTicks.call(alignToScale, true);
    const alignToSplitNumber = alignToTicks.length - 1;
    const alignToInterval = intervalScaleProto.getInterval.call(alignToScale);

    const fixedMin = parseAxisModelMinMax(scale, axisModel.get('min', true) as ScaleDataValue);
    const fixedMax = parseAxisModelMinMax(scale, axisModel.get('max', true) as ScaleDataValue);

    niceScaleExtent(scale, axisModel);
    const rawExtent = intervalScaleProto.getExtent.call(scale);
    const isMinFixed = fixedMin != null;
    const isMaxFixed = fixedMax != null;

    let interval = intervalScaleProto.getInterval.call(scale);
    let min: number = rawExtent[0];
    let max: number = rawExtent[1];

    if (isMinFixed && isMaxFixed) {
        // User set min, max, divide to get new interval
        interval = (max - min) / alignToSplitNumber;
    }
    else if (isMinFixed) {
        max = rawExtent[0] + interval * alignToSplitNumber;
        // User set min, expand extent on the other side
        while (max < rawExtent[1] && isFinite(max) && isFinite(rawExtent[1])) {
            interval = increaseInterval(interval);
            max = rawExtent[0] + interval * alignToSplitNumber;
        }
    }
    else if (isMaxFixed) {
        // User set max, expand extent on the other side
        min = rawExtent[1] - interval * alignToSplitNumber;
        while (min > rawExtent[0] && isFinite(min) && isFinite(rawExtent[0])) {
            interval = increaseInterval(interval);
            min = rawExtent[1] - interval * alignToSplitNumber;
        }
    }
    else {
        const nicedSplitNumber = scale.getTicks().length - 1;
        if (nicedSplitNumber > alignToSplitNumber) {
            interval = increaseInterval(interval);
        }
        // PENDING
        max = Math.ceil(rawExtent[1] / interval) * interval;
        min = numberUtil.round(max - interval * alignToSplitNumber);
    }

    // Adjust min, max based on the extent of alignTo. When min or max is set in alignTo scale
    const t0 = (alignToTicks[0].value - alignToNicedTicks[0].value) / alignToInterval;
    const t1 = (alignToTicks[alignToSplitNumber].value - alignToNicedTicks[alignToSplitNumber].value) / alignToInterval;

    // NOTE: Must in setExtent -> setInterval -> setNiceExtent order.
    intervalScaleProto.setExtent.call(scale, min + interval * t0, max + interval * t1);
    intervalScaleProto.setInterval.call(scale, interval);
    if (t0 || t1) {
        intervalScaleProto.setNiceExtent.call(scale, min + interval, max - interval);
    }

    if (__DEV__) {
        const ticks = intervalScaleProto.getTicks.call(scale);
        // if (ticks.length !== alignToScale.getTicks().length) {
        //     debugger
        // }
        if (ticks[1] && ticks[1].value % interval) {
            warn(
                // eslint-disable-next-line
                `The ticks may be not displayed nice if when set min: ${fixedMin}, max: ${fixedMax} and alignTicks: true`
            );
        }
    }
}

/**
 * @return interval precision
 */
export function getIntervalPrecision(interval: number): number {
    // Tow more digital for tick.
    return numberUtil.getPrecision(interval) + 2;
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

export function normalize(val: number, extent: [number, number]): number {
    if (extent[1] === extent[0]) {
        return 0.5;
    }
    return (val - extent[0]) / (extent[1] - extent[0]);
}

export function scale(val: number, extent: [number, number]): number {
    return val * (extent[1] - extent[0]) + extent[0];
}
