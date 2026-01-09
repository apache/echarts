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

import * as zrUtil from 'zrender/src/core/util';
import Scale, { ScaleGetTicksOpt, ScaleSettingDefault } from './Scale';
import {
    mathFloor, mathCeil, mathPow, mathLog,
    round, quantity, getPrecision
} from '../util/number';

// Use some method of IntervalScale
import IntervalScale from './Interval';
import {
    DimensionLoose, DimensionName, ParsedAxisBreakList, AxisBreakOption,
    ScaleTick,
    NullUndefined
} from '../util/types';
import { ensureValidSplitNumber, fixNiceExtent, getIntervalPrecision, logTransform } from './helper';
import SeriesData from '../data/SeriesData';
import { getScaleBreakHelper } from './break';


const LINEAR_STUB_METHODS = [
    'getExtent', 'getTicks', 'getInterval'
    // Keep no setting method to mitigate vulnerability.
] as const;

/**
 * IMPL_MEMO:
 *  - The supper class (`IntervalScale`) and its member fields (such as `this._extent`,
 *    `this._interval`, `this._niceExtent`) provides linear tick arrangement (logarithm applied).
 *  - `_originalScale` (`IntervalScale`) is used to save some original info
 *    (before logarithm applied, such as raw extent).
 */
class LogScale extends IntervalScale {

    static type = 'log';
    readonly type = 'log';

    readonly base: number;

    private _originalScale = new IntervalScale();

    // `[fixMin, fixMax]`
    private _fixMinMax: boolean[] = [false, false];

    linearStub: Pick<IntervalScale, (typeof LINEAR_STUB_METHODS)[number]>;

    constructor(logBase: number | NullUndefined, settings?: ScaleSettingDefault) {
        super(settings);
        this.base = zrUtil.retrieve2(logBase, 10);
        this._initLinearStub();
    }

    private _initLinearStub(): void {
        // TODO: Refactor -- This impl is error-prone. And the use of `prototype` should be removed.
        const intervalScaleProto = IntervalScale.prototype;
        const logScale = this;
        const stub = logScale.linearStub = {} as LogScale['linearStub'];
        zrUtil.each(LINEAR_STUB_METHODS, function (methodName) {
            stub[methodName] = function () {
                return (intervalScaleProto[methodName] as any).apply(logScale, arguments);
            };
        });
    }

    /**
     * @param Whether expand the ticks to niced extent.
     */
    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        const extent = this._extent;
        const scaleBreakHelper = getScaleBreakHelper();

        return zrUtil.map(super.getTicks(opt || {}), function (tick) {
            let vBreak;
            let brkRoundingCriterion;
            if (scaleBreakHelper) {
                const transformed = scaleBreakHelper.getTicksLogTransformBreak(
                    tick,
                    this.base,
                    this._originalScale._innerGetBreaks(),
                    fixRoundingError
                );
                vBreak = transformed.vBreak;
                brkRoundingCriterion = transformed.brkRoundingCriterion;
            }

            const val = tick.value;
            const powVal = this.powTick(
                val,
                val === extent[1] ? 1 : val === extent[0] ? 0 : null,
                brkRoundingCriterion
            );

            return {
                value: powVal,
                break: vBreak,
            };
        }, this);
    }

    protected _getNonTransBreaks(): ParsedAxisBreakList {
        return this._originalScale._innerGetBreaks();
    }

    setExtent(start: number, end: number): void {
        // [CAVEAT]: If modifying this logic, must sync to `_initLinearStub`.
        this._originalScale.setExtent(start, end);
        const loggedExtent = logTransform(this.base, [start, end]);
        super.setExtent(loggedExtent[0], loggedExtent[1]);
    }

    getExtent() {
        const extent = super.getExtent();
        return [
            this.powTick(extent[0], 0, null),
            this.powTick(extent[1], 1, null)
        ] as [number, number];
    }

    unionExtentFromData(data: SeriesData, dim: DimensionName | DimensionLoose): void {
        this._originalScale.unionExtentFromData(data, dim);
        const loggedOther = logTransform(this.base, data.getApproximateExtent(dim), true);
        this._innerUnionExtent(loggedOther);
    }

    /**
     * fixMin/Max and rounding error are addressed.
     */
    powTick(
        // `val` should be in the linear space.
        val: number,
        // `0`: `value` is `min`;
        // `1`: `value` is `max`;
        // `NullUndefined`: others.
        extentIdx: 0 | 1 | NullUndefined,
        fallbackRoundingCriterion: number | NullUndefined
    ): number {
        // NOTE: `Math.pow(10, integer)` has no rounding error.
        // PENDING: other base?
        let powVal = mathPow(this.base, val);

        // Fix #4158
        // NOTE: Even when `fixMin/Max` is `true`, `pow(base, this._extent[0]/[1])` may be still
        // not equal to `this._originalScale.getExtent()[0]`/`[1]` in invalid extent case.
        // So we always call `Math.pow`.
        const roundingCriterion = this._fixMinMax[extentIdx]
            ? this._originalScale.getExtent()[extentIdx]
            : fallbackRoundingCriterion;

        if (roundingCriterion != null) {
            powVal = fixRoundingError(powVal, roundingCriterion);
        }

        return powVal;
    }

    /**
     * Update interval and extent of intervals for nice ticks
     * @param splitNumber default 10 Given approx tick number
     */
    calcNiceTicks(splitNumber: number): void {
        splitNumber = ensureValidSplitNumber(splitNumber, 10);
        const extent = this._extent.slice() as [number, number];
        const span = this._getExtentSpanWithBreaks();
        if (!isFinite(span) || span <= 0) {
            return;
        }

        let interval = quantity(span);
        const err = splitNumber / span * interval;

        // Filter ticks to get closer to the desired count.
        if (err <= 0.5) {
            // TODO: support other bases other than 10?
            interval *= 10;
        }

        // Interval should be integer
        while (!isNaN(interval) && Math.abs(interval) < 1 && Math.abs(interval) > 0) {
            interval *= 10;
        }

        const intervalPrecision = getIntervalPrecision(interval);
        const niceExtent = [
            round(mathCeil(extent[0] / interval) * interval, intervalPrecision),
            round(mathFloor(extent[1] / interval) * interval, intervalPrecision)
        ] as [number, number];

        fixNiceExtent(niceExtent, extent);

        this._interval = interval;
        this._intervalPrecision = intervalPrecision;
        this._niceExtent = niceExtent;

        // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.
    }

    calcNiceExtent(opt: {
        splitNumber: number,
        fixMin?: boolean,
        fixMax?: boolean,
        minInterval?: number,
        maxInterval?: number
    }): void {
        super.calcNiceExtent(opt);

        this._fixMinMax = [!!opt.fixMin, !!opt.fixMax];
    }

    contain(val: number): boolean {
        val = mathLog(val) / mathLog(this.base);
        return super.contain(val);
    }

    normalize(val: number): number {
        val = mathLog(val) / mathLog(this.base);
        return super.normalize(val);
    }

    scale(val: number): number {
        val = super.scale(val);
        return mathPow(this.base, val);
    }

    setBreaksFromOption(
        breakOptionList: AxisBreakOption[],
    ): void {
        const scaleBreakHelper = getScaleBreakHelper();
        if (!scaleBreakHelper) {
            return;
        }
        const { parsedOriginal, parsedLogged } = scaleBreakHelper.logarithmicParseBreaksFromOption(
            breakOptionList,
            this.base,
            zrUtil.bind(this.parse, this)
        );
        this._originalScale._innerSetBreak(parsedOriginal);
        this._innerSetBreak(parsedLogged);
    }

}

function fixRoundingError(val: number, originalVal: number): number {
    return round(val, getPrecision(originalVal));
}


Scale.registerClass(LogScale);

export default LogScale;
