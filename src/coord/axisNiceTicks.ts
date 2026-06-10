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

import { assert, map, noop } from 'zrender/src/core/util';
import {
    ensureValidSplitNumber, getIntervalPrecision,
    intervalScaleEnsureValidExtent,
    isIntervalScale, isLogScale, isTimeScale,
    asinhScaleForwardTick,
    symlogScaleForwardTick,
} from '../scale/helper';
import IntervalScale, { IntervalScaleConfig } from '../scale/Interval';
import { mathCeil, mathFloor, mathMax, nice, quantity, round } from '../util/number';
import type { AxisBaseModel } from './AxisBaseModel';
import type { AxisScaleType, NumericAxisBaseOptionCommon } from './axisCommonTypes';
import {
    updateIntervalOrLogScaleForNiceOrAligned
} from './axisHelper';
import { calcNiceForTimeScale } from '../scale/Time';
import type LogScale from '../scale/Log';
import Scale from '../scale/Scale';
import {
    adoptScaleExtentKindMapping, adoptScaleRawExtentInfoAndPrepare,
    ScaleExtentFixMinMax,
    ScaleRawExtentResultFinal
} from './scaleRawExtentInfo';
import { getScaleLinearSpanEffective } from '../scale/scaleMapper';
import { NullUndefined } from '../util/types';
import type GlobalModel from '../model/Global';
import type Axis from './Axis';


// ------ START: LinearIntervalScaleStub Nice ------

function calcNiceForIntervalOrLogScale(
    scale: (IntervalScale | LogScale) & Scale,
    opt: ScaleCalcNiceMethodOpt,
): void {
    // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.

    const isTargetLogScale = isLogScale(scale);
    const intervalStub = isTargetLogScale ? scale.intervalStub : scale;

    // For mapped-log axes (asinh/symlog), use the raw-space tick strategy.
    if (isTargetLogScale && (scale as LogScale).logMapping) {
        logMappingCalcNiceTicks(scale as LogScale, opt.splitNumber);
        return;
    }

    const fixMinMax = opt.fixMinMax || [];
    const oldOutermostExtent = isTargetLogScale ? scale.getExtent() : null;
    const oldIntervalExtent = intervalStub.getExtent();

    let newIntervalExtent = intervalScaleEnsureValidExtent(oldIntervalExtent, fixMinMax, opt.rawExtentResult);

    intervalStub.setExtent(newIntervalExtent[0], newIntervalExtent[1]);
    newIntervalExtent = intervalStub.getExtent();

    const config = isTargetLogScale
        ? logScaleCalcNiceTicks(intervalStub, opt)
        : intervalScaleCalcNiceTicks(intervalStub, opt);
    const autoIntervalPrecision = config.intervalPrecision;
    const autoInterval = config.interval;

    // When auto calculated interval is not preferable, users are allowed to explicity specify
    // `interval`, `min`, `max` to customize the axis. A typical case is, in angle axis with angle
    // 0 - 360, where the internally calculated interval is not 60-based.
    // NOTICE:
    //  - In `xxxAxis.type: 'log'`, ec option `xxxAxis.interval` requires a logarithm-applied
    //    value rather than a value in the raw scale.
    //  - Follow the historical behavior:
    //    - even `interval` is specified, the scale extent is still expanded based on the auto-calculated
    //      interval.
    //    - No validation to the specified `interval`.
    const userInterval = opt.userInterval;
    if (userInterval != null) {
        config.interval = userInterval;
        config.intervalPrecision = getIntervalPrecision(userInterval);
    }

    if (!fixMinMax[0]) {
        newIntervalExtent[0] = round(
            mathFloor(newIntervalExtent[0] / autoInterval) * autoInterval, autoIntervalPrecision
        );
    }
    if (!fixMinMax[1]) {
        newIntervalExtent[1] = round(
            mathCeil(newIntervalExtent[1] / autoInterval) * autoInterval, autoIntervalPrecision
        );
    }
    if (userInterval != null) { // Historical behavior.
        config.niceExtent = newIntervalExtent.slice();
    }

    updateIntervalOrLogScaleForNiceOrAligned(
        scale,
        fixMinMax,
        oldIntervalExtent,
        newIntervalExtent,
        oldOutermostExtent,
        config,
    );
}

// ------ END: LinearIntervalScaleStub Nice ------


// ------ START: IntervalScale Nice ------

function intervalScaleCalcNiceTicks(
    scale: IntervalScale,
    opt: Pick<ScaleCalcNiceMethodOpt, 'splitNumber' | 'minInterval' | 'maxInterval' | 'userInterval'>
): IntervalScaleConfig {
    const splitNumber = ensureValidSplitNumber(opt.splitNumber, 5);
    // Use the span in the innermost linear space to calculate nice ticks.
    const span = getScaleLinearSpanEffective(scale);

    if (__DEV__) {
        assert(isFinite(span) && span > 0); // It should have been ensured by `intervalScaleEnsureValidExtent`.
    }

    const minInterval = opt.minInterval;
    const maxInterval = opt.maxInterval;

    let interval = nice(span / splitNumber, true);
    if (minInterval != null && interval < minInterval) {
        interval = minInterval;
    }
    if (maxInterval != null && interval > maxInterval) {
        interval = maxInterval;
    }

    const intervalPrecision = getIntervalPrecision(interval);
    const extent = scale.getExtent();
    // By design, the `niceExtent` is inside the original extent
    const niceExtent = [
        round(mathCeil(extent[0] / interval) * interval, intervalPrecision),
        round(mathFloor(extent[1] / interval) * interval, intervalPrecision)
    ];

    return {interval, intervalPrecision, niceExtent};
};

// ------ END: IntervalScale Nice ------


// ------ START: LogScale Nice ------

function logScaleCalcNiceTicks(
    intervalStub: IntervalScale,
    opt: Pick<
        ScaleCalcNiceMethodOpt,
        'splitNumber' | 'minInterval' | 'maxInterval' | 'userInterval'
    >
): IntervalScaleConfig {
    // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.

    const splitNumber = ensureValidSplitNumber(opt.splitNumber, 10);
    // Find nice ticks in the "logarithmic space". Notice that "logarithmic space" is a middle space
    // rather than the innermost linear space when axis breaks exist.
    const intervalExtent = intervalStub.getExtent();
    // But use the span in the innermost linear space to calculate nice ticks.
    const span = getScaleLinearSpanEffective(intervalStub);

    if (__DEV__) {
        assert(isFinite(span) && span > 0); // It should be ensured by `intervalScaleEnsureValidExtent`.
    }

    // Interval should be integer
    let interval = mathMax(quantity(span), 1);
    const err = splitNumber / span * interval;
    // Filter ticks to get closer to the desired count.
    if (err <= 0.5) {
        // TODO: support other bases other than 10?
        interval *= 10;
    }

    const intervalPrecision = getIntervalPrecision(interval);
    // For LogScale, we use a `niceExtent` in the "logarithmic space" rather than
    // the original "pow space", because it is used in `intervalStub.getTicks()` thereafter.
    const niceExtent = [
        round(mathCeil(intervalExtent[0] / interval) * interval, intervalPrecision),
        round(mathFloor(intervalExtent[1] / interval) * interval, intervalPrecision)
    ] as [number, number];

    return {intervalPrecision, interval, niceExtent};
};

// ------ END: LogScale Nice ------


// ------ START: logMapping Nice ------

/**
 * Tick strategy for `logMapping: 'asinh' | 'symlog'` axes.
 *
 * Standard log ticking assumes integer intervals in transformed space (integer
 * log_b values = powers of b in raw space). For asinh/symlog the candidates
 * `0, ±a0, ±b*a0, ...` are non-uniformly spaced in transformed space, so a
 * single integer interval does not work.
 *
 * Strategy: choose candidates in raw-value space, store as `_mappedLogTicks`,
 * then set `intervalStub` extent to the transformed range so that
 * `normalize`/`scale` pixel mapping remains correct.
 */
export function logMappingCalcNiceTicks(
    scale: LogScale, splitNumber?: number | NullUndefined
): void {
    const base = scale.base;
    const a0 = scale.linearWidth || 1;
    const [rawMin, rawMax] = scale.getExtent();
    const maxTicks = ensureValidSplitNumber(splitNumber, 5) + 1;

    const forward = scale.logMapping === 'asinh'
        ? (v: number) => asinhScaleForwardTick(v, a0)
        : (v: number) => symlogScaleForwardTick(v, a0);

    // Count how many powers of `base` span the extent so we can decide
    // whether to step by base^1, base^2, … to stay within `splitNumber`.
    const absMax = Math.max(Math.abs(rawMin), Math.abs(rawMax));
    const totalSteps = absMax > a0 ? Math.ceil(Math.log(absMax / a0) / Math.log(base)) : 0;
    // Account for both positive and negative sides plus zero.
    const hasNeg = rawMin < 0;
    const hasPos = rawMax > 0;
    const sidesMultiplier = (hasNeg && hasPos) ? 2 : 1;
    const estimatedTicks = totalSteps * sidesMultiplier + 1; // +1 for zero

    // Raise the effective base so tick count stays within splitNumber.
    let stride = 1;
    if (estimatedTicks > maxTicks && totalSteps > 0) {
        stride = Math.ceil(totalSteps * sidesMultiplier / (maxTicks - 1));
    }
    const effectiveBase = Math.pow(base, stride);

    // Candidates: 0, ±a0, ±a0·effectiveBase, ±a0·effectiveBase², ...
    const candidates: number[] = [0];
    let v = a0;
    while (v <= absMax * 1.0001) {
        candidates.push(v, -v);
        v *= effectiveBase;
    }

    // Filter to data extent and sort ascending.
    // Candidates are distinct by construction (0 once, then ±v pairs with v > 0),
    // so no deduplication is needed.
    const filtered: number[] = [];
    candidates.sort((a, b) => a - b);
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (c >= rawMin && c <= rawMax) {
            filtered.push(c);
        }
    }
    const ticks = map(filtered, value => ({ value }));

    // Degenerate extent: ensure at least one tick.
    if (ticks.length === 0) {
        ticks.push({ value: (rawMin + rawMax) / 2 });
    }

    scale._mappedLogTicks = ticks;

    // Align intervalStub extent to the transformed data range so that
    // `normalize`/`scale` (pixel mapping) covers the full data extent.
    // Use the data min/max rather than the tick min/max, because the
    // outermost ticks may fall inside the data range when thinning skips
    // intermediate powers.
    const intervalStub = scale.intervalStub;
    intervalStub.setExtent(forward(rawMin), forward(rawMax));
    intervalStub.setConfig({ interval: 1 });
}

// ------ END: logMapping Nice ------


// ------ START: scaleCalcNice Entry ------

export type ScaleCalcNiceMethod = (
    scale: Scale,
    opt: ScaleCalcNiceMethodOpt
) => void;

type ScaleCalcNiceMethodOpt = {
    splitNumber?: number | NullUndefined;
    minInterval?: number | NullUndefined;
    maxInterval?: number | NullUndefined;
    userInterval?: number | NullUndefined;
    userIntervalUseLegacy?: boolean | NullUndefined;
    fixMinMax?: ScaleExtentFixMinMax | NullUndefined;
    rawExtentResult?: ScaleRawExtentResultFinal | NullUndefined;
};

/**
 * NOTE: See the summary of the process of extent determination in the comment of `scaleMapper.setExtent`.
 *
 * Calculate a "nice" extent and "nice" ticks configs based on the current scale extent and ec options.
 * scale extent will be modified, and config may be set to the scale.
 *
 * @see SCALE_EXTENT_CONSTRUCTION for the full processing flow.
 */
export function scaleCalcNice(
    axisLike: {
        scale: Scale,
        model: AxisBaseModel,
    },
): void {
    const scale = axisLike.scale;
    const model = axisLike.model as AxisBaseModel<NumericAxisBaseOptionCommon>;

    const axis = model.axis;
    const ecModel = model.ecModel;
    if (__DEV__) {
        assert(axis && ecModel);
    }

    scaleCalcNice2(scale, model, axis, ecModel, null);
}

/**
 * @see SCALE_EXTENT_CONSTRUCTION for the full processing flow.
 */
export function scaleCalcNice2(
    scale: Scale,
    model: AxisBaseModel<NumericAxisBaseOptionCommon>,
    // Some call from external source, such as echarts-gl, may have no `axis` and `ecModel`,
    // but has `externalDataExtent`.
    axis: Axis | NullUndefined,
    ecModel: GlobalModel | NullUndefined,
    externalDataExtent: number[] | NullUndefined
): void {

    const rawExtentResult = adoptScaleRawExtentInfoAndPrepare(scale, model, ecModel, axis, externalDataExtent);

    const isIntervalOrTime = isIntervalScale(scale) || isTimeScale(scale);
    scaleCalcNiceDirectly(scale, {
        splitNumber: model.get('splitNumber'), // Backward compat - not get('xxx', true).
        fixMinMax: rawExtentResult.fixMM,
        userInterval: model.get('interval'), // Backward compat - not get('xxx', true).
        minInterval: isIntervalOrTime ? model.get('minInterval') : null,
        maxInterval: isIntervalOrTime ? model.get('maxInterval') : null,
        rawExtentResult
    });

    if (axis && ecModel) {
        adoptScaleExtentKindMapping(axis, scale, rawExtentResult, ecModel);
    }

    if (__DEV__) {
        scale.freeze();
    }
}

export function scaleCalcNiceDirectly(
    scale: Scale,
    opt: ScaleCalcNiceMethodOpt
): void {
    scaleCalcNiceMethods[scale.type](scale, opt);
}

const scaleCalcNiceMethods: Record<AxisScaleType, ScaleCalcNiceMethod> = {
    interval: calcNiceForIntervalOrLogScale,
    log: calcNiceForIntervalOrLogScale,
    time: calcNiceForTimeScale,
    ordinal: noop,
};

// ------ END: scaleCalcNice Entry ------
