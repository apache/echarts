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
    mathPow, mathLog,
} from '../util/number';

// Use some method of IntervalScale
import IntervalScale from './Interval';
import {
    DimensionLoose, DimensionName, AxisBreakOption,
    ScaleTick,
    NullUndefined,
    ScaleDataValue
} from '../util/types';
import {
    logScalePowTickPair, logScalePowTick, logScaleLogTickPair,
    getExtentPrecision,
    IntervalScaleGetLabelOpt,
    logScaleLogTick,
} from './helper';
import SeriesData from '../data/SeriesData';
import { getScaleBreakHelper } from './break';
import { getMinorTicks } from './minorTicks';


class LogScale extends Scale {

    static type = 'log';
    readonly type = 'log' as const;

    readonly base: number;

    // `_originalScale` is used to save some original info (before logarithm
    // applied, such as raw extent; but may be still invalid, and not sync
    // to the calculated ("nice") extent).
    private _originalScale: IntervalScale;
    // `linearStub` provides linear tick arrangement (logarithm applied).
    readonly linearStub: IntervalScale;

    constructor(logBase: number | NullUndefined, settings?: ScaleSettingDefault) {
        super();
        this._originalScale = new IntervalScale();
        this.linearStub = new IntervalScale(settings);
        this.base = zrUtil.retrieve2(logBase, 10);
    }

    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        const base = this.base;
        const originalScale = this._originalScale;
        const scaleBreakHelper = getScaleBreakHelper();
        const linearStub = this.linearStub;
        const extent = linearStub.getExtent();
        const extentPrecision = linearStub.getConfig().extentPrecision;

        return zrUtil.map(linearStub.getTicks(opt || {}), function (tick) {
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
                    originalScale.innerGetBreaks(),
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

    getMinorTicks(splitNumber: number): number[][] {
        return getMinorTicks(
            this,
            splitNumber,
            this._originalScale.innerGetBreaks(),
            // NOTE: minor ticks are in the log scale value to visually hint users "logarithm".
            this.linearStub.getConfig().interval
        );
    }

    getLabel(
        data: ScaleTick,
        opt?: IntervalScaleGetLabelOpt
    ) {
        return this.linearStub.getLabel(data, opt);
    }

    setExtent(start: number, end: number): void {
        // [CAVEAT]: If modifying this logic, must sync to `_initLinearStub`.
        this._originalScale.setExtent(start, end);
        const loggedExtent = logScaleLogTickPair([start, end], this.base);
        this.linearStub.setExtent(loggedExtent[0], loggedExtent[1]);
    }

    getExtent() {
        const linearStub = this.linearStub;
        return logScalePowTickPair(
            linearStub.getExtent(),
            this.base,
            linearStub.getConfig().extentPrecision
        );
    }

    isInExtent(value: number): boolean {
        return this.linearStub.isInExtent(logScaleLogTick(value, this.base));
    }

    unionExtentFromData(data: SeriesData, dim: DimensionName | DimensionLoose): void {
        this._originalScale.unionExtentFromData(data, dim);
        const loggedOther = logScaleLogTickPair(data.getApproximateExtent(dim), this.base, true);
        this.linearStub.innerUnionExtent(loggedOther);
    }

    parse(val: ScaleDataValue): number {
        return this.linearStub.parse(val);
    }

    contain(val: number): boolean {
        val = mathLog(val) / mathLog(this.base);
        return this.linearStub.contain(val);
    }

    normalize(val: number): number {
        val = mathLog(val) / mathLog(this.base);
        return this.linearStub.normalize(val);
    }

    scale(val: number): number {
        val = this.linearStub.scale(val);
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
        this._originalScale.innerSetBreak(parsedOriginal);
        this.linearStub.innerSetBreak(parsedLogged);
    }

}

Scale.registerClass(LogScale);

export default LogScale;
