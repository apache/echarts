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
    mathAbs, mathCeil, mathFloor, mathMax, mathRound, nice, NICE_MODE_MIN, quantity, round
} from '../util/number';
import IntervalScale from '../scale/Interval';
import { adoptScaleExtentOptionAndPrepare, updateIntervalOrLogScaleForNiceOrAligned } from './axisHelper';
import { AxisBaseModel } from './AxisBaseModel';
import LogScale from '../scale/Log';
import { warn } from '../util/log';
import {
    increaseInterval, isLogScale, getIntervalPrecision, intervalScaleEnsureValidExtent,
    logScaleLogTick,
} from '../scale/helper';
import { assert } from 'zrender/src/core/util';


export function alignScaleTicks(
    targetScale: IntervalScale | LogScale,
    targetAxisModel: AxisBaseModel,
    alignToScale: IntervalScale | LogScale
): void {
    const isTargetLogScale = isLogScale(targetScale);
    const alignToScaleLinear = isLogScale(alignToScale) ? alignToScale.linearStub : alignToScale;

    const targetLogScaleBase = (targetScale as LogScale).base;
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
    let t0: number; // diff ratio on min not-nice segment. 0 <= t0 < 1
    let t1: number; // diff ratio on max not-nice segment. 0 <= t1 < 1
    let alignToNiceSegCount: number; // >= 1
    // Consider ticks of `alignTo`, only these cases below may occur:
    if (alignToSegCount === 1) {
        // `alignToTicks` is like:
        //  |--|
        // In this case, we make the corresponding 2 target ticks "nice".
        t0 = t1 = 0;
        alignToNiceSegCount = 1;
    }
    else if (alignToSegCount === 2) {
        // `alignToTicks` is like:
        //  |-|-----| or
        //  |-----|-| or
        //  |-----|-----|
        // Notices that nice ticks do not necessarily exist in this case.
        // In this case, we choose the larger segment as the "nice segment" and
        // the corresponding target ticks are made "nice".
        const interval0 = mathAbs(alignToTicks[0].value - alignToTicks[1].value);
        const interval1 = mathAbs(alignToTicks[1].value - alignToTicks[2].value);
        t0 = t1 = 0;
        if (interval0 === interval1) {
            alignToNiceSegCount = 2;
        }
        else {
            alignToNiceSegCount = 1;
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
        // At least one nice segment is present, and not-nice segments are only present on
        // the start and/or the end.
        // In this case, ticks corresponding to nice segments are made "nice".
        const alignToInterval = alignToScaleLinear.getConfig().interval;
        t0 = (
            1 - (alignToTicks[0].value - alignToExpNiceTicks[0].value) / alignToInterval
        ) % 1;
        t1 = (
            1 - (alignToExpNiceTicks[alignToSegCount].value - alignToTicks[alignToSegCount].value) / alignToInterval
        ) % 1;
        alignToNiceSegCount = alignToSegCount - (t0 ? 1 : 0) - (t1 ? 1 : 0);
    }

    if (__DEV__) {
        assert(alignToNiceSegCount >= 1);
    }

    const targetExtentInfo = adoptScaleExtentOptionAndPrepare(targetScale, targetAxisModel);

    // NOTE:
    //  Consider a case:
    //      dataZoom controls all Y axes;
    //      dataZoom end is 90% (maxFixed: true, maxDetermined: true);
    //      but dataZoom start is 0% (minFixed: false, minDetermined: false);
    //  In this case,
    //      `Interval#calcNiceTicks` only uses `targetExtentInfo.max` as the upper bound but may expand the
    //      lower bound to a "nice" tick and can get an acceptable result.
    //      But `alignScaleTicks` has to use both `targetExtentInfo.min/max` as the bounds without any expansion,
    //      otherwise the lower bound may become negative unexpectedly for all positive series data.
    const hasMinMaxDetermined = targetExtentInfo.minDetermined || targetExtentInfo.maxDetermined;
    const targetMinMaxFixed = [
        targetExtentInfo.minFixed || hasMinMaxDetermined,
        targetExtentInfo.maxFixed || hasMinMaxDetermined
    ];
    // MEMO: When only `xxxAxis.min` or `xxxAxis.max` is fixed,
    //  - Even a "nice" interval can be calculated, ticks accumulated based on `min`/`max` can be "nice" only if
    //    `min` or `max` is a "nice" number.
    //  - Generating a "nice" interval may cause the extent have both positive and negative ticks, which may be
    //    not preferable for all positive (very common) or all negative series data. But it can be simply resolved
    //    by specifying `xxxAxis.min: 0`/`xxxAxis.max: 0`, so we do not specially handle this case here.
    //  Therefore, we prioritize generating "nice" interval over preventing from crossing zero.
    //  e.g., if series data are all positive and the max data is `11739`,
    //      If setting `yAxis.max: 'dataMax'`, ticks may be like:
    //          `11739, 8739, 5739, 2739, -1739` (not "nice" enough)
    //      If setting `yAxis.max: 'dataMax', yAxis.min: 0`, ticks may be like:
    //          `11739, 8805, 5870, 2935, 0` (not "nice" enough but may be acceptable)
    //      If setting `yAxis.max: 12000, yAxis.min: 0`, ticks may be like:
    //          `12000, 9000, 6000, 3000, 0` ("nice")

    let targetRawExtent = [targetExtentInfo.min, targetExtentInfo.max];
    const targetRawPowExtent = targetRawExtent;
    if (isTargetLogScale) {
        targetRawExtent = [
            logScaleLogTick(targetRawExtent[0], targetLogScaleBase),
            logScaleLogTick(targetRawExtent[1], targetLogScaleBase)
        ];
    }
    const targetExtent = intervalScaleEnsureValidExtent(targetRawExtent, targetMinMaxFixed);

    let min: number;
    let max: number;
    let interval: number;
    let intervalPrecision: number;
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
                // TODO: `mathMax(base, 2)` is a guardcode to avoid infinite loop,
                // but probably it should be guranteed by `LogScale` itself.
                ? interval * mathMax(targetLogScaleBase, 2)
                : increaseInterval(interval);
            intervalPrecision = getIntervalPrecision(interval);
        }
        if (__DEV__) {
            if (loopGuard >= LOOP_MAX) {
                warn('incorrect impl in `alignScaleTicks`.');
            }
        }
    }

    function updateMinFromMinNice() {
        min = round(minNice - interval * t0, intervalPrecision);
    }
    function updateMaxFromMaxNice() {
        max = round(maxNice + interval * t1, intervalPrecision);
    }
    function updateMinNiceFromMinT0Interval() {
        minNice = t0 ? round(min + interval * t0, intervalPrecision) : min;
    }
    function updateMaxNiceFromMaxT1Interval() {
        maxNice = t1 ? round(max - interval * t1, intervalPrecision) : max;
    }

    // NOTE: The new calculated `min`/`max` must NOT shrink the original extent; otherwise some series
    // data may be outside of the extent. They can expand the original extent slightly to align with
    // ticks of `alignTo`. In this case, more blank space is added but visually fine.

    if (targetMinMaxFixed[0] && targetMinMaxFixed[1]) {
        // Both `min` and `max` are specified (via dataZoom or ec option; consider both Cartesian, radar and
        // other possible axes). In this case, "nice" ticks can hardly be calculated, but reasonable ticks should
        // still be calculated whenever possible, especially `intervalPrecision` should be tuned for better
        // appearance and lower cumulative error.

        min = targetExtent[0];
        max = targetExtent[1];
        interval = (max - min) / (alignToNiceSegCount + t0 + t1);
        // Typically axis pixel extent is ready here. See `create` in `Grid.ts`.
        const axisPxExtent = targetAxisModel.axis.getExtent();
        // NOTICE: this pxSpan may be not accurate yet due to "outerBounds" logic, but acceptable so far.
        const pxSpan = mathAbs(axisPxExtent[1] - axisPxExtent[0]);
        // We imperically choose `pxDiffAcceptable` as `0.5 / alignToNiceSegCount` for reduce cumulative
        // error, otherwise a discernible misalign (> 1px) may occur.
        // PENDING: We do not find a acceptable precision for LogScale here.
        //  Theoretically it can be addressed but introduce more complexity. Is it necessary?
        intervalPrecision = getAcceptableTickPrecision(max - min, pxSpan, 0.5 / alignToNiceSegCount);
        updateMinNiceFromMinT0Interval();
        updateMaxNiceFromMaxT1Interval();
        interval = round(interval, intervalPrecision);
    }
    else {
        // Make a minimal enough `interval`, increase it later.
        // It is a similar logic as `IntervalScale#calcNiceTicks` and `LogScale#calcNiceTicks`.
        // Axis break is not supported, which is guranteed by the caller of this function.
        const targetSpan = targetExtent[1] - targetExtent[0];
        interval = isTargetLogScale
            ? mathMax(quantity(targetSpan), 1)
            : nice(targetSpan / alignToNiceSegCount, NICE_MODE_MIN);
        intervalPrecision = getIntervalPrecision(interval);

        if (targetMinMaxFixed[0]) {
            min = targetExtent[0];
            loopIncreaseInterval(function () {
                updateMinNiceFromMinT0Interval();
                maxNice = round(minNice + interval * alignToNiceSegCount, intervalPrecision);
                updateMaxFromMaxNice();
                if (max >= targetExtent[1]) {
                    return true;
                }
            });
        }
        else if (targetMinMaxFixed[1]) {
            max = targetExtent[1];
            loopIncreaseInterval(function () {
                updateMaxNiceFromMaxT1Interval();
                minNice = round(maxNice - interval * alignToNiceSegCount, intervalPrecision);
                updateMinFromMinNice();
                if (min <= targetExtent[0]) {
                    return true;
                }
            });
        }
        else {
            loopIncreaseInterval(function () {
                minNice = round(mathCeil(targetExtent[0] / interval) * interval, intervalPrecision);
                maxNice = round(mathFloor(targetExtent[1] / interval) * interval, intervalPrecision);
                // NOTE:
                //  - `maxNice - minNice >= -interval` here.
                //  - While `interval` increases, `currIntervalCount` decreases, minimum `-1`.
                const currIntervalCount = mathRound((maxNice - minNice) / interval);
                if (currIntervalCount <= alignToNiceSegCount) {
                    const moreCount = alignToNiceSegCount - currIntervalCount;
                    // Consider cases that negative tick do not make sense (or vice versa), users can simply
                    // specify `xxxAxis.min/max: 0` to avoid negative. But we still automatically handle it
                    // for some common cases whenever possible:
                    //  - When ec option is `xxxAxis.scale: false` (the default), it is usually unexpected if
                    //    negative (or positive) ticks are introduced.
                    //  - In LogScale, series data are usually either all > 1 or all < 1, rather than both,
                    //    that is, logarithm result is typically either all positive or all negative.
                    let moreCountPair: number[];
                    const mayEnhanceZero = targetExtentInfo.needCrossZero || isTargetLogScale;
                    // `bounds < 0` or `bounds > 0` may require more complex handling, so we only auto handle
                    // `bounds === 0`.
                    if (mayEnhanceZero && targetExtent[0] === 0) {
                        // 0 has been included in extent and all positive.
                        moreCountPair = [0, moreCount];
                    }
                    else if (mayEnhanceZero && targetExtent[1] === 0) {
                        // 0 has been included in extent and all negative.
                        moreCountPair = [moreCount, 0];
                    }
                    else {
                        // Try to center ticks in axis space whenever possible, which is especially preferable
                        // in `LogScale`.
                        const lessHalfCount = mathFloor(moreCount / 2);
                        moreCountPair = moreCount % 2 === 0 ? [lessHalfCount, lessHalfCount]
                            : (min + max) < (targetExtent[0] + targetExtent[1]) ? [lessHalfCount, lessHalfCount + 1]
                            : [lessHalfCount + 1, lessHalfCount];
                    }
                    minNice = round(minNice - interval * moreCountPair[0], intervalPrecision);
                    maxNice = round(maxNice + interval * moreCountPair[1], intervalPrecision);
                    updateMinFromMinNice();
                    updateMaxFromMaxNice();
                    if (min <= targetExtent[0] && max >= targetExtent[1]) {
                        return true;
                    }
                }
            });
        }
    }

    updateIntervalOrLogScaleForNiceOrAligned(
        targetScale,
        targetMinMaxFixed,
        targetRawExtent,
        [min, max],
        targetRawPowExtent,
        {
            // NOTE: Even in LogScale, `interval` should not be in log space.
            interval,
            // Force ticks count, otherwise cumulative error may cause more unexpected ticks to be generated.
            // Though the overlapping tick labels may be auto-ignored, but probably unexpected, e.g., the min
            // tick label is ignored but the secondary min tick label is shown, which is unexpected when
            // `axis.min` is user-specified or dataZoom-specified.
            intervalCount: alignToNiceSegCount,
            intervalPrecision,
            niceExtent: [minNice, maxNice],
        },
    );
}
