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

import { assert, noop } from 'zrender/src/core/util';
import {
    ensureValidSplitNumber, getIntervalPrecision,
    intervalScaleEnsureValidExtent,
    isIntervalScale, isLogScale, isTimeScale,
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
    ScaleExtentFixMinMax
} from './scaleRawExtentInfo';
import { getScaleLinearSpanEffective } from '../scale/scaleMapper';
import { NullUndefined } from '../util/types';
import type GlobalModel from '../model/Global';
import type Axis from './Axis';


// ------ START: LinearIntervalScaleStub Nice ------

function calcNiceForIntervalOrLogScale(
    scale: IntervalScale | LogScale,
    opt: ScaleCalcNiceMethodOpt,
): void {
    // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.

    const isTargetLogScale = isLogScale(scale);
    const intervalStub = isTargetLogScale ? scale.intervalStub : scale;

    const fixMinMax = opt.fixMinMax || [];
    const oldOutermostExtent = isTargetLogScale ? scale.getExtent() : null;
    const oldIntervalExtent = intervalStub.getExtent();

    let newIntervalExtent = intervalScaleEnsureValidExtent(oldIntervalExtent, fixMinMax);

    intervalStub.setExtent(newIntervalExtent[0], newIntervalExtent[1]);
    newIntervalExtent = intervalStub.getExtent();

    const config = isTargetLogScale
        ? logScaleCalcNiceTicks(intervalStub, opt)
        : intervalScaleCalcNiceTicks(intervalStub, opt);
    const interval = config.interval;
    const intervalPrecision = config.intervalPrecision;

    if (!fixMinMax[0]) {
        newIntervalExtent[0] = round(mathFloor(newIntervalExtent[0] / interval) * interval, intervalPrecision);
    }
    if (!fixMinMax[1]) {
        newIntervalExtent[1] = round(mathCeil(newIntervalExtent[1] / interval) * interval, intervalPrecision);
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
    opt: Pick<ScaleCalcNiceMethodOpt, 'splitNumber' | 'minInterval' | 'maxInterval'>
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
    opt: Pick<ScaleCalcNiceMethodOpt, 'splitNumber' | 'minInterval' | 'maxInterval'>
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


// ------ START: scaleCalcNice Entry ------

export type ScaleCalcNiceMethod = (
    scale: Scale,
    opt: ScaleCalcNiceMethodOpt
) => void;

type ScaleCalcNiceMethodOpt = {
    splitNumber?: number;
    minInterval?: number;
    maxInterval?: number;
    fixMinMax?: ScaleExtentFixMinMax;
};

/**
 * NOTE: See the summary of the process of extent determination in the comment of `scaleMapper.setExtent`.
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

    // If some one specified the min, max. And the default calculated interval
    // is not good enough. He can specify the interval. It is often appeared
    // in angle axis with angle 0 - 360. Interval calculated in interval scale is hard
    // to be 60.
    // In `xxxAxis.type: 'log'`, ec option `xxxAxis.interval` requires a logarithm-applied
    // value rather than a value in the raw scale.
    const interval = model.get('interval');
    if (interval != null && (scale as IntervalScale).setConfig) {
        (scale as IntervalScale).setConfig({interval});
    }
    else {
        const isIntervalOrTime = isIntervalScale(scale) || isTimeScale(scale);
        scaleCalcNiceDirectly(scale, {
            splitNumber: model.get('splitNumber'),
            fixMinMax: rawExtentResult.fixMM,
            minInterval: isIntervalOrTime ? model.get('minInterval') : null,
            maxInterval: isIntervalOrTime ? model.get('maxInterval') : null
        });
    }

    if (axis && ecModel) {
        adoptScaleExtentKindMapping(scale, rawExtentResult);
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
