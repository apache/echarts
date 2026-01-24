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
import IntervalScale, { IntervalScaleConfigParsed } from '../scale/Interval';
import { mathCeil, mathFloor, mathMax, nice, quantity, round } from '../util/number';
import type { AxisBaseModel } from './AxisBaseModel';
import type { AxisScaleType, NumericAxisBaseOptionCommon } from './axisCommonTypes';
import {
    adoptScaleExtentOptionAndPrepare, retrieveAxisBreaksOption, updateIntervalOrLogScaleForNiceOrAligned
} from './axisHelper';
import { timeScaleCalcNice } from '../scale/Time';
import type LogScale from '../scale/Log';
import Scale from '../scale/Scale';


// ------ START: LinearIntervalScaleStub Nice ------

type LinearIntervalScaleStubCalcNiceTicks = (
    scale: IntervalScale,
    opt: Pick<ScaleCalcNiceMethodOpt, 'splitNumber' | 'minInterval' | 'maxInterval'>
) => {
    interval: IntervalScaleConfigParsed['interval'];
    intervalPrecision: IntervalScaleConfigParsed['intervalPrecision'];
    niceExtent: IntervalScaleConfigParsed['niceExtent'];
};

function intervalLogScaleCalcNice(
    scale: IntervalScale | LogScale,
    opt: ScaleCalcNiceMethodOpt,
): void {
    // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.

    const isTargetLogScale = isLogScale(scale);
    const linearStub = isTargetLogScale ? scale.linearStub : scale;

    const fixMinMax = opt.fixMinMax || [];
    const oldPowExtent = isTargetLogScale ? scale.getExtent() : null;
    const oldLinearExtent = linearStub.getExtent();

    let newLinearExtent = intervalScaleEnsureValidExtent(oldLinearExtent, fixMinMax);

    linearStub.setExtent(newLinearExtent[0], newLinearExtent[1]);
    newLinearExtent = linearStub.getExtent();

    let config: ReturnType<LinearIntervalScaleStubCalcNiceTicks>;
    if (isTargetLogScale) {
        config = logScaleCalcNiceTicks(linearStub, opt);
    }
    else {
        config = intervalScaleCalcNiceTicks(linearStub, opt);
    }
    const interval = config.interval;
    const intervalPrecision = config.intervalPrecision;

    if (!fixMinMax[0]) {
        newLinearExtent[0] = round(mathFloor(newLinearExtent[0] / interval) * interval, intervalPrecision);
    }
    if (!fixMinMax[1]) {
        newLinearExtent[1] = round(mathCeil(newLinearExtent[1] / interval) * interval, intervalPrecision);
    }

    updateIntervalOrLogScaleForNiceOrAligned(
        scale,
        fixMinMax,
        oldLinearExtent,
        newLinearExtent,
        oldPowExtent,
        config,
    );
}

// ------ END: LinearIntervalScaleStub Nice ------


// ------ START: IntervalScale Nice ------

const intervalScaleCalcNiceTicks: LinearIntervalScaleStubCalcNiceTicks = function (scale, opt) {
    const splitNumber = ensureValidSplitNumber(opt.splitNumber, 5);
    const extent = scale.getExtent();
    const span = scale.getBreaksElapsedExtentSpan();

    if (__DEV__) {
        assert(isFinite(span) && span > 0); // It should be ensured by `intervalScaleEnsureValidExtent`.
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
    // Nice extent inside original extent
    const niceExtent = [
        round(mathCeil(extent[0] / interval) * interval, intervalPrecision),
        round(mathFloor(extent[1] / interval) * interval, intervalPrecision)
    ];

    return {interval, intervalPrecision, niceExtent};
};

// ------ END: IntervalScale Nice ------


// ------ START: LogScale Nice ------

const logScaleCalcNiceTicks: LinearIntervalScaleStubCalcNiceTicks = function (
    linearStub: IntervalScale, opt
) {
    // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.

    const splitNumber = ensureValidSplitNumber(opt.splitNumber, 10);
    const extent = linearStub.getExtent();
    const span = linearStub.getBreaksElapsedExtentSpan();

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
    const niceExtent = [
        round(mathCeil(extent[0] / interval) * interval, intervalPrecision),
        round(mathFloor(extent[1] / interval) * interval, intervalPrecision)
    ] as [number, number];

    return {intervalPrecision, interval, niceExtent};
};

// ------ END: LogScale Nice ------


// ------ START: scaleCalcNice Entry ------

export type ScaleCalcNiceMethod = (
    scale: ScaleForCalcNice,
    opt: ScaleCalcNiceMethodOpt
) => void;

type ScaleForCalcNice = Pick<
    Scale,
    'type' | 'setExtent' | 'getExtent' | 'getBreaksElapsedExtentSpan'
>;

type ScaleCalcNiceMethodOpt = {
    splitNumber?: number;
    minInterval?: number;
    maxInterval?: number;
    // `[fixMin, fixMax]`. If `true`, the original `extent[0]`/`extent[1]`
    // will not be modified, except for an invalid extent.
    fixMinMax?: boolean[];
};

export function scaleCalcNice(opt: {
    scale: Scale,
    model: AxisBaseModel,
}): void {
    const scale = opt.scale;
    const model = opt.model as AxisBaseModel<NumericAxisBaseOptionCommon>;
    const extentInfo = adoptScaleExtentOptionAndPrepare(scale, model);

    const isInterval = isIntervalScale(scale);
    const isIntervalOrTime = isInterval || isTimeScale(scale);

    scale.setBreaksFromOption(retrieveAxisBreaksOption(model));
    scale.setExtent(extentInfo.min, extentInfo.max);

    scaleCalcNiceDirectly(scale, {
        splitNumber: model.get('splitNumber'),
        fixMinMax: [extentInfo.minFixed, extentInfo.maxFixed],
        minInterval: isIntervalOrTime ? model.get('minInterval') : null,
        maxInterval: isIntervalOrTime ? model.get('maxInterval') : null
    });

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
}

export function scaleCalcNiceDirectly(
    scale: ScaleForCalcNice,
    opt: ScaleCalcNiceMethodOpt
): void {
    scaleCalcNiceMethods[scale.type](scale, opt);
}

const scaleCalcNiceMethods: Record<AxisScaleType, ScaleCalcNiceMethod> = {
    interval: intervalLogScaleCalcNice,
    log: intervalLogScaleCalcNice,
    time: timeScaleCalcNice,
    ordinal: noop,
};

// ------ END: scaleCalcNice Entry ------
