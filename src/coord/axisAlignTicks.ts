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
    getAcceptableTickPrecision,
    mathAbs, mathCeil, mathFloor, mathMax, nice, NICE_MODE_MIN, round
} from '../util/number';
import IntervalScale from '../scale/Interval';
import { adoptScaleExtentOptionAndPrepare } from './axisHelper';
import { AxisBaseModel } from './AxisBaseModel';
import LogScale from '../scale/Log';
import { warn } from '../util/log';
import {
    increaseInterval, isLogScale, getIntervalPrecision, intervalScaleEnsureValidExtent,
    logTransform,
} from '../scale/helper';
import { assert } from 'zrender/src/core/util';
import { NullUndefined } from '../util/types';


export function alignScaleTicks(
    targetScale: IntervalScale | LogScale,
    targetDataExtent: number[],
    targetAxisModel: AxisBaseModel,
    alignToScale: IntervalScale | LogScale
): void {
    const isTargetLogScale = isLogScale(targetScale);
    const alignToScaleLinear = isLogScale(alignToScale) ? alignToScale.linearStub : alignToScale;

    const alignToTicks = alignToScaleLinear.getTicks();
    const alignToExpNiceTicks = alignToScaleLinear.getTicks({expandToNicedExtent: true});
    const alignToSegCount = alignToTicks.length - 1;

    if (__DEV__) {
        // This is guards for future changes of `Interval#getTicks`.
        assert(!alignToScale.hasBreaks() && !targetScale.hasBreaks());
        assert(alignToSegCount > 0); // Ticks length >= 2 even on a blank scale.
        assert(alignToExpNiceTicks.length === alignToTicks.length);
        assert(alignToTicks[0].value <= alignToTicks[alignToSegCount].value);
        assert(
            alignToExpNiceTicks[0].value <= alignToTicks[0].value
            && alignToTicks[alignToSegCount].value <= alignToExpNiceTicks[alignToSegCount].value
        );
        if (alignToSegCount >= 2) {
            assert(alignToExpNiceTicks[1].value === alignToTicks[1].value);
            assert(alignToExpNiceTicks[alignToSegCount - 1].value === alignToTicks[alignToSegCount - 1].value);
        }
    }

    // The Current strategy: Find a proper interval and an extent for the target scale to derive ticks
    // matching exactly to ticks of `alignTo` scale.

    // Adjust min, max based on the extent of alignTo. When min or max is set in alignTo scale
    let t0: number; // diff ratio on min irregular segment. 0 <= t0 < 1
    let t1: number; // diff ratio on max irregular segment. 0 <= t1 < 1
    let alignToRegularSegCount: number; // >= 1
    // Consider ticks of `alignTo`, only these cases below may occur:
    if (alignToSegCount === 1) {
        // `alignToTicks` is like:
        //  |--|
        // In this case, we make the corresponding 2 target ticks "nice".
        t0 = t1 = 0;
        alignToRegularSegCount = 1;
    }
    else if (alignToSegCount === 2) {
        // `alignToTicks` is like:
        //  |-|-----| or
        //  |-----|-| or
        //  |-----|-----|
        // Notices that nice ticks do not necessarily exist in this case.
        // In this case, we choose the larger segment as the "regular segment" and
        // the corresponding target ticks are made "nice".
        const interval0 = mathAbs(alignToTicks[0].value - alignToTicks[1].value);
        const interval1 = mathAbs(alignToTicks[1].value - alignToTicks[2].value);
        t0 = t1 = 0;
        if (interval0 === interval1) {
            alignToRegularSegCount = 2;
        }
        else {
            alignToRegularSegCount = 1;
            if (interval0 < interval1) {
                t0 = interval0 / interval1;
            }
            else {
                t1 = interval1 / interval0;
            }
        }
    }
    else { // alignToSegCount >= 3
        // `alignToTicks` is like:
        //  |-|-----|-----|-| or
        //  |-----|-----|-| or
        //  |-|-----|-----| or ...
        // At least one regular segment is present, and irregular segments are only present on
        // the start and/or the end.
        // In this case, ticks corresponding to regular segments are made "nice".
        const alignToInterval = alignToScaleLinear.getInterval();
        t0 = (
            1 - (alignToTicks[0].value - alignToExpNiceTicks[0].value) / alignToInterval
        ) % 1;
        t1 = (
            1 - (alignToExpNiceTicks[alignToSegCount].value - alignToTicks[alignToSegCount].value) / alignToInterval
        ) % 1;
        alignToRegularSegCount = alignToSegCount - (t0 ? 1 : 0) - (t1 ? 1 : 0);
    }

    if (__DEV__) {
        assert(alignToRegularSegCount >= 1);
    }

    const targetExtentInfo = adoptScaleExtentOptionAndPrepare(targetScale, targetAxisModel, targetDataExtent);

    // NOTE: If `dataZoom` has either start/end not 0% or 100% (indicated by `min/maxDetermined`), we consider
    // both min and max fixed; otherwise the result is probably unexpected if we expand the extent out of
    // the original min/max, e.g., the expanded extent may cross zero.
    const hasMinMaxDetermined = targetExtentInfo.minDetermined || targetExtentInfo.maxDetermined;
    const targetMinFixed = targetExtentInfo.minFixed || hasMinMaxDetermined;
    const targetMaxFixed = targetExtentInfo.maxFixed || hasMinMaxDetermined;
    // MEMO:
    //  - When only `xxxAxis.min` or `xxxAxis.max` is fixed, even "nice" interval can be calculated, ticks
    //    accumulated based on `min`/`max` can be "nice" only if `min` or `max` is "nice".
    //  - Generating a "nice" interval in this case may cause the extent have both positive and negative ticks,
    //    which may be not preferable for all positive (very common) or all negative series data. But it can be
    //    simply resolved by specifying `xxxAxis.min: 0`/`xxxAxis.max: 0`, so we do not specially handle this
    //    case here.
    //  Therefore, we prioritize generating "nice" interval over preventing from crossing zero.
    //  e.g., if series data are all positive and the max data is `11739`,
    //      If setting `yAxis.max: 'dataMax'`, ticks may be like:
    //          `11739, 8739, 5739, 2739, -1739` (not "nice" enough)
    //      If setting `yAxis.max: 'dataMax', yAxis.min: 0`, ticks may be like:
    //          `11739, 8805, 5870, 2935, 0` (not "nice" enough but may be acceptable)
    //      If setting `yAxis.max: 12000, yAxis.min: 0`, ticks may be like:
    //          `12000, 9000, 6000, 3000, 0` ("nice")

    let targetExtent = [targetExtentInfo.min, targetExtentInfo.max];
    if (isTargetLogScale) {
        targetExtent = logTransform(targetScale.base, targetExtent);
    }
    targetExtent = intervalScaleEnsureValidExtent(targetExtent, {fixMax: targetMaxFixed});

    let min: number;
    let max: number;
    let interval: number;
    let intervalPrecision: number;
    let intervalCount: number | NullUndefined;
    let maxNice: number;
    let minNice: number;

    function loopIncreaseInterval(cb: () => boolean) {
        // Typically this loop runs less than 5 times. But we still
        // use a safeguard for future changes.
        const LOOP_MAX = 50;
        let loopGuard = 0;
        for (; loopGuard < LOOP_MAX; loopGuard++) {
            if (cb()) {
                break;
            }
            interval = isTargetLogScale
                // TODO: A guardcode to avoid infinite loop, but probably it
                // should be guranteed by `LogScale` itself.
                ? interval * mathMax(targetScale.base, 2)
                : increaseInterval(interval);
            intervalPrecision = getIntervalPrecision(interval);
        }
        if (__DEV__) {
            if (loopGuard >= LOOP_MAX) {
                warn('incorrect impl in `alignScaleTicks`.');
            }
        }
    }

    // NOTE: The new calculated `min`/`max` must NOT shrink the original extent; otherwise some series
    // data may be outside of the extent. They can expand the original extent slightly to align with
    // ticks of `alignTo`. In this case, more blank space is added but visually fine.

    if (targetMinFixed && targetMaxFixed) {
        // Both `min` and `max` are specified (via dataZoom or ec option; consider both Cartesian, radar and
        // other possible axes). In this case, "nice" ticks can hardly be calculated, but reasonable ticks should
        // still be calculated whenever possible, especially `intervalPrecision` should be tuned for better
        // appearance and lower cumulative error.

        min = targetExtent[0];
        max = targetExtent[1];
        intervalCount = alignToRegularSegCount;
        const rawInterval = (max - min) / (alignToRegularSegCount + t0 + t1);
        // Typically axis pixel extent is ready here. See `create` in `Grid.ts`.
        const axisPxExtent = targetAxisModel.axis.getExtent();
        // NOTICE: this pxSpan may be not accurate yet due to "outerBounds" logic, but acceptable so far.
        const pxSpan = mathAbs(axisPxExtent[1] - axisPxExtent[0]);
        // We imperically choose `pxDiffAcceptable` as `0.5 / alignToRegularSegCount` for reduce cumulative
        // error, otherwise a discernible misalign (> 1px) may occur.
        // PENDING: We do not find a acceptable precision for LogScale here.
        //  Theoretically it can be addressed but introduce more complexity. Is it necessary?
        intervalPrecision = getAcceptableTickPrecision(max - min, pxSpan, 0.5 / alignToRegularSegCount);
        interval = round(rawInterval, intervalPrecision);
        maxNice = t1 ? round(max - rawInterval * t1, intervalPrecision) : max;
        minNice = t0 ? round(min + rawInterval * t0, intervalPrecision) : min;
    }
    else {
        // Make a minimal enough `interval`, increase it later.
        // It is a similar logic as `IntervalScale#calcNiceTicks` and `LogScale#calcNiceTicks`.
        // Axis break is not supported, which is guranteed by the caller of this function.
        interval = nice((targetExtent[1] - targetExtent[0]) / alignToRegularSegCount, NICE_MODE_MIN);
        intervalPrecision = getIntervalPrecision(interval);

        if (targetMinFixed) {
            min = targetExtent[0];
            loopIncreaseInterval(function () {
                minNice = t0 ? round(min + interval * t0, intervalPrecision) : min;
                maxNice = round(minNice + interval * alignToRegularSegCount, intervalPrecision);
                max = round(maxNice + interval * t1, intervalPrecision);
                if (max >= targetExtent[1]) {
                    return true;
                }
            });
        }
        else if (targetMaxFixed) {
            max = targetExtent[1];
            loopIncreaseInterval(function () {
                maxNice = t1 ? round(max - interval * t1, intervalPrecision) : max;
                minNice = round(maxNice - interval * alignToRegularSegCount, intervalPrecision);
                min = round(minNice - interval * t0, intervalPrecision);
                if (min <= targetExtent[0]) {
                    return true;
                }
            });
        }
        else {
            // Currently we simply lay out ticks of the target scale to the "regular segments" of `alignTo`
            // scale for "nice". If unexpected cases occur in future, the strategy can be tuned precisely
            // (e.g., make use of irregular segments).
            loopIncreaseInterval(function () {
                // Consider cases that all positive or all negative, try not to cross zero, which is
                // preferable in most cases.
                if (targetExtent[1] <= 0) {
                    maxNice = round(mathCeil(targetExtent[1] / interval) * interval, intervalPrecision);
                    minNice = round(maxNice - interval * alignToRegularSegCount, intervalPrecision);
                    if (minNice <= targetExtent[0]) {
                        return true;
                    }
                }
                else {
                    minNice = round(mathFloor(targetExtent[0] / interval) * interval, intervalPrecision);
                    maxNice = round(minNice + interval * alignToRegularSegCount, intervalPrecision);
                    if (maxNice >= targetExtent[1]) {
                        return true;
                    }
                }
            });
            min = round(minNice - interval * t0, intervalPrecision);
            max = round(maxNice + interval * t1, intervalPrecision);
        }

        intervalPrecision = null; // Clear for the calling of `setInterval`.
    }

    if (isTargetLogScale) {
        min = targetScale.powTick(min, 0, null);
        max = targetScale.powTick(max, 1, null);
    }
    // NOTE: Must in setExtent -> setInterval order.
    targetScale.setExtent(min, max);
    targetScale.setInterval({
        // Even in LogScale, `interval` should not be in log space.
        interval,
        intervalCount,
        intervalPrecision,
        niceExtent: [minNice, maxNice]
    });
}
