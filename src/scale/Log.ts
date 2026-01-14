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
    round, quantity, getPrecision,
    mathMax,
} from '../util/number';

// Use some method of IntervalScale
import IntervalScale from './Interval';
import {
    DimensionLoose, DimensionName, ParsedAxisBreakList, AxisBreakOption,
    ScaleTick,
    NullUndefined
} from '../util/types';
import {
    ensureValidSplitNumber, getIntervalPrecision,
    logScalePowTickPair, logScalePowTick, logScaleLogTickPair,
    getExtentPrecision
} from './helper';
import SeriesData from '../data/SeriesData';
import { getScaleBreakHelper } from './break';


const LINEAR_STUB_METHODS = [
    'getExtent', 'getTicks', 'getInterval',
    'setExtent', 'setInterval',
] as const;

/**
 * IMPL_MEMO:
 *  - The supper class (`IntervalScale`) and its member fields (such as `this._extent`,
 *    `this._interval`, `this._niceExtent`) provides linear tick arrangement (logarithm applied).
 *  - `_originalScale` (`IntervalScale`) is used to save some original info
 *    (before logarithm applied, such as raw extent; but may be still invalid, and not sync to the
 *     calculated ("nice") extent).
 */
class LogScale extends IntervalScale {

    static type = 'log';
    readonly type = 'log';

    readonly base: number;

    private _originalScale = new IntervalScale();

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
        const base = this.base;
        const originalScale = this._originalScale;
        const scaleBreakHelper = getScaleBreakHelper();
        const extent = this._extent;
        const extentPrecision = this._extentPrecision;

        return zrUtil.map(super.getTicks(opt || {}), function (tick) {
            const val = tick.value;
            let powVal = logScalePowTick(
                val,
                base,
                getExtentPrecision(val, extent, extentPrecision)
            );

            let vBreak;
            if (scaleBreakHelper) {
                const brkPowResult = scaleBreakHelper.getTicksPowBreak(
                    tick,
                    base,
                    originalScale._innerGetBreaks(),
                    extent,
                    extentPrecision
                );
                if (brkPowResult) {
                    vBreak = brkPowResult.vBreak;
                    powVal = brkPowResult.tickPowValue;
                }
            }

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
        const loggedExtent = logScaleLogTickPair([start, end], this.base);
        super.setExtent(loggedExtent[0], loggedExtent[1]);
    }

    getExtent() {
        const extent = super.getExtent();
        return logScalePowTickPair(
            extent,
            this.base,
            this._extentPrecision
        );
    }

    unionExtentFromData(data: SeriesData, dim: DimensionName | DimensionLoose): void {
        this._originalScale.unionExtentFromData(data, dim);
        const loggedOther = logScaleLogTickPair(data.getApproximateExtent(dim), this.base, true);
        this._innerUnionExtent(loggedOther);
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

        this._interval = interval;
        this._intervalPrecision = intervalPrecision;
        this._niceExtent = niceExtent;

        // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.
    }

    calcNiceExtent(opt: {
        splitNumber: number,
        fixMinMax?: boolean[],
        minInterval?: number,
        maxInterval?: number
    }): void {
        const oldExtent = this._extent.slice() as [number, number];
        super.calcNiceExtent(opt);
        const newExtent = this._extent;

        this._extentPrecision = [
            (opt.fixMinMax && opt.fixMinMax[0] && oldExtent[0] === newExtent[0])
                ? getPrecision(newExtent[0]) : null,
            (opt.fixMinMax && opt.fixMinMax[1] && oldExtent[1] === newExtent[1])
                ? getPrecision(newExtent[1]) : null
        ];
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

Scale.registerClass(LogScale);

export default LogScale;
