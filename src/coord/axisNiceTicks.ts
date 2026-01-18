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
    isIntervalScale, isTimeScale
} from '../scale/helper';
import IntervalScale from '../scale/Interval';
import { getPrecision, mathCeil, mathFloor, mathMax, nice, quantity, round } from '../util/number';
import type { AxisBaseModel } from './AxisBaseModel';
import type { AxisScaleType, LogAxisBaseOption } from './axisCommonTypes';
import { adoptScaleExtentOptionAndPrepare, retrieveAxisBreaksOption } from './axisHelper';
import { timeScaleCalcNice } from '../scale/Time';
import type LogScale from '../scale/Log';
import { NullUndefined } from '../util/types';
import Scale from '../scale/Scale';


// ------ START: LinearIntervalScaleStub Nice ------

type LinearIntervalScaleStubCalcNiceTicks = (
    scale: IntervalScale,
    opt: Pick<ScaleCalcNiceMethodOpt, 'splitNumber' | 'minInterval' | 'maxInterval'>
) => {
    intervalPrecision: number;
    interval: number;
    niceExtent: number[];
};

type LinearIntervalScaleStubCalcExtentPrecision = (
    oldExtent: number[],
    newExtent: number[],
    opt: Pick<ScaleCalcNiceMethodOpt, 'fixMinMax'>
) => (
    (number | NullUndefined)[] | NullUndefined
);

function linearIntervalScaleStubCalcNice(
    linearIntervalScaleStub: IntervalScale,
    opt: ScaleCalcNiceMethodOpt,
    opt2: {
        calcNiceTicks: LinearIntervalScaleStubCalcNiceTicks;
        calcExtentPrecision: LinearIntervalScaleStubCalcExtentPrecision;
    }
): void {
    // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.

    const fixMinMax = opt.fixMinMax || [];
    const oldExtent = linearIntervalScaleStub.getExtent();

    let extent = intervalScaleEnsureValidExtent(oldExtent.slice(), fixMinMax);

    linearIntervalScaleStub.setExtent(extent[0], extent[1]);
    extent = linearIntervalScaleStub.getExtent();

    const {
        interval,
        intervalPrecision,
        niceExtent,
    } = opt2.calcNiceTicks(linearIntervalScaleStub, opt);

    if (!fixMinMax[0]) {
        extent[0] = round(mathFloor(extent[0] / interval) * interval, intervalPrecision);
    }
    if (!fixMinMax[1]) {
        extent[1] = round(mathCeil(extent[1] / interval) * interval, intervalPrecision);
    }

    const extentPrecision = opt2.calcExtentPrecision(oldExtent, extent, opt);

    linearIntervalScaleStub.setExtent(extent[0], extent[1]);
    linearIntervalScaleStub.setConfig({
        interval,
        intervalPrecision,
        niceExtent,
        extentPrecision
    });
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

const intervalScaleCalcNice: ScaleCalcNiceMethod = function (
    scale: IntervalScale, opt
) {
    linearIntervalScaleStubCalcNice(scale, opt, {
        calcNiceTicks: intervalScaleCalcNiceTicks,
        calcExtentPrecision: noop as unknown as LinearIntervalScaleStubCalcExtentPrecision,
    });
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

const logScaleCalcExtentPrecision: LinearIntervalScaleStubCalcExtentPrecision = function (
    oldExtent, newExtent, opt
) {
    return [
        (opt.fixMinMax && opt.fixMinMax[0] && oldExtent[0] === newExtent[0])
            ? getPrecision(newExtent[0]) : null,
        (opt.fixMinMax && opt.fixMinMax[1] && oldExtent[1] === newExtent[1])
            ? getPrecision(newExtent[1]) : null
    ];
};

const logScaleCalcNice: ScaleCalcNiceMethod = function (scale: LogScale, opt): void {
    // NOTE: Calculate nice only on linearStub of LogScale.
    linearIntervalScaleStubCalcNice(scale.linearStub, opt, {
        calcNiceTicks: logScaleCalcNiceTicks,
        calcExtentPrecision: logScaleCalcExtentPrecision,
    });
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

export function scaleCalcNice(
    scale: Scale,
    // scale: Scale,
    inModel: AxisBaseModel,
    // Typically: data extent from all series on this axis, which can be obtained by
    //  `scale.unionExtentFromData(...); scale.getExtent();`.
    dataExtent: number[],
): void {
    const model = inModel as AxisBaseModel<LogAxisBaseOption>;
    const extentInfo = adoptScaleExtentOptionAndPrepare(scale, model, dataExtent);

    const isInterval = isIntervalScale(scale);
    const isIntervalOrTime = isInterval || isTimeScale(scale);

    scale.setBreaksFromOption(retrieveAxisBreaksOption(model));
    scale.setExtent(extentInfo.min, extentInfo.max);

    scaleCalcNiceReal(scale, {
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

export function scaleCalcNiceReal(
    scale: ScaleForCalcNice,
    opt: ScaleCalcNiceMethodOpt
): void {
    scaleCalcNiceMethods[scale.type](scale, opt);
}

const scaleCalcNiceMethods: Record<AxisScaleType, ScaleCalcNiceMethod> = {
    interval: intervalScaleCalcNice,
    log: logScaleCalcNice,
    time: timeScaleCalcNice,
    ordinal: noop,
};

// ------ END: scaleCalcNice Entry ------
