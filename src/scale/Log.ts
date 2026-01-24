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

// Use some method of IntervalScale
import IntervalScale from './Interval';
import {
    AxisBreakOption,
    ScaleTick,
    NullUndefined,
    ScaleDataValue
} from '../util/types';
import {
    logScalePowTick,
    IntervalScaleGetLabelOpt,
    contain,
    logScaleLogTick,
} from './helper';
import { getScaleBreakHelper } from './break';
import { getMinorTicks } from './minorTicks';


class LogScale extends Scale {

    static type = 'log';
    readonly type = 'log' as const;

    readonly base: number;

    /**
     * `powStub` is used to save original values, i.e., values before logarithm
     * applied, such as raw extent and raw breaks.
     * NOTE: Logarithm transform is probably not inversible by rounding error, which
     * may cause min/max tick is displayed like `5.999999999999999`. The extent in
     * powStub is used to get the original precise extent for this issue.
     *
     * [CAVEAT] `powStub` and `linearStub` should be modified synchronously.
     */
    readonly powStub: IntervalScale;
    /**
     * `linearStub` provides linear tick arrangement (logarithm applied).
     * @see {powStub}
     */
    readonly linearStub: IntervalScale;

    constructor(logBase: number | NullUndefined, settings?: ScaleSettingDefault) {
        super();
        this.powStub = new IntervalScale();
        this.linearStub = new IntervalScale(settings);
        this.base = zrUtil.retrieve2(logBase, 10);
    }

    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        const base = this.base;
        const powStub = this.powStub;
        const scaleBreakHelper = getScaleBreakHelper();
        const linearStub = this.linearStub;
        const linearExtent = linearStub.getExtent();
        const powExtent = powStub.getExtent();

        return zrUtil.map(linearStub.getTicks(opt || {}), function (tick) {
            const val = tick.value;
            let powVal = logScalePowTick(val, base, linearExtent, powExtent);

            let vBreak;
            if (scaleBreakHelper) {
                const brkPowResult = scaleBreakHelper.getTicksPowBreak(
                    tick,
                    base,
                    powStub.innerGetBreaks(),
                    linearExtent,
                    powExtent,
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
            this.powStub.innerGetBreaks(),
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
        this.powStub.setExtent(start, end);
        this.linearStub.setExtent(
            logScaleLogTick(start, this.base, false),
            logScaleLogTick(end, this.base, false)
        );
    }

    getExtent() {
        return this.powStub.getExtent();
    }

    parse(val: ScaleDataValue): number {
        return this.linearStub.parse(val);
    }

    contain(val: number): boolean {
        return contain(val, this.getExtent());
    }

    normalize(val: number): number {
        return this.linearStub.normalize(logScaleLogTick(val, this.base, true));
    }

    scale(val: number): number {
        // PENDING: Input `linearStub.getExtent()` and `powStub.getExtent()` may
        // break monotonicity. Do not do it until real problems found.
        return logScalePowTick(this.linearStub.scale(val), this.base, null, null);
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
        this.powStub.innerSetBreak(parsedOriginal);
        this.linearStub.innerSetBreak(parsedLogged);
    }

}

Scale.registerClass(LogScale);

export default LogScale;
