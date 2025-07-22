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
import Scale, { ScaleGetTicksOpt } from './Scale';
import * as numberUtil from '../util/number';

// Use some method of IntervalScale
import IntervalScale from './Interval';
import {
    DimensionLoose, DimensionName, ParsedAxisBreakList, AxisBreakOption,
    ScaleTick
} from '../util/types';
import { getIntervalPrecision, logTransform } from './helper';
import SeriesData from '../data/SeriesData';
import { getScaleBreakHelper } from './break';

const fixRound = numberUtil.round;
const mathFloor = Math.floor;
const mathCeil = Math.ceil;
const mathPow = Math.pow;
const mathLog = Math.log;

class LogScale extends IntervalScale {

    static type = 'log';
    readonly type = 'log';

    base = 10;

    private _originalScale = new IntervalScale();

    private _fixMin: boolean;
    private _fixMax: boolean;

    /**
     * @param Whether expand the ticks to niced extent.
     */
    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        opt = opt || {};
        const extent = this._extent.slice() as [number, number];
        const originalExtent = this._originalScale.getExtent();

        const ticks = super.getTicks(opt);
        const base = this.base;
        const originalBreaks = this._originalScale._innerGetBreaks();
        const scaleBreakHelper = getScaleBreakHelper();

        return zrUtil.map(ticks, function (tick) {
            const val = tick.value;
            let roundingCriterion = null;

            let powVal = mathPow(base, val);

            // Fix #4158
            if (val === extent[0] && this._fixMin) {
                roundingCriterion = originalExtent[0];
            }
            else if (val === extent[1] && this._fixMax) {
                roundingCriterion = originalExtent[1];
            }

            let vBreak;
            if (scaleBreakHelper) {
                const transformed = scaleBreakHelper.getTicksLogTransformBreak(
                    tick,
                    base,
                    originalBreaks,
                    fixRoundingError
                );
                vBreak = transformed.vBreak;
                if (roundingCriterion == null) {
                    roundingCriterion = transformed.brkRoundingCriterion;
                }
            }

            if (roundingCriterion != null) {
                powVal = fixRoundingError(powVal, roundingCriterion);
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
        this._originalScale.setExtent(start, end);
        const loggedExtent = logTransform(this.base, [start, end]);
        super.setExtent(loggedExtent[0], loggedExtent[1]);
    }

    /**
     * @return {number} end
     */
    getExtent() {
        const base = this.base;
        const extent = super.getExtent();
        extent[0] = mathPow(base, extent[0]);
        extent[1] = mathPow(base, extent[1]);

        // Fix #4158
        const originalExtent = this._originalScale.getExtent();
        this._fixMin && (extent[0] = fixRoundingError(extent[0], originalExtent[0]));
        this._fixMax && (extent[1] = fixRoundingError(extent[1], originalExtent[1]));

        return extent;
    }

    unionExtentFromData(data: SeriesData, dim: DimensionName | DimensionLoose): void {
        this._originalScale.unionExtentFromData(data, dim);
        const loggedOther = logTransform(this.base, data.getApproximateExtent(dim), true);
        this._innerUnionExtent(loggedOther);
    }

    /**
     * Update interval and extent of intervals for nice ticks
     * @param approxTickNum default 10 Given approx tick number
     */
    calcNiceTicks(approxTickNum: number): void {
        approxTickNum = approxTickNum || 10;
        const extent = this._extent.slice() as [number, number];
        const span = this._getExtentSpanWithBreaks();
        if (!isFinite(span) || span <= 0) {
            return;
        }

        let interval = numberUtil.quantity(span);
        const err = approxTickNum / span * interval;

        // Filter ticks to get closer to the desired count.
        if (err <= 0.5) {
            interval *= 10;
        }

        // Interval should be integer
        while (!isNaN(interval) && Math.abs(interval) < 1 && Math.abs(interval) > 0) {
            interval *= 10;
        }

        const niceExtent = [
            fixRound(mathCeil(extent[0] / interval) * interval),
            fixRound(mathFloor(extent[1] / interval) * interval)
        ] as [number, number];

        this._interval = interval;
        this._intervalPrecision = getIntervalPrecision(interval);
        this._niceExtent = niceExtent;
    }

    calcNiceExtent(opt: {
        splitNumber: number,
        fixMin?: boolean,
        fixMax?: boolean,
        minInterval?: number,
        maxInterval?: number
    }): void {
        super.calcNiceExtent(opt);

        this._fixMin = opt.fixMin;
        this._fixMax = opt.fixMax;
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
    return fixRound(val, numberUtil.getPrecision(originalVal));
}


Scale.registerClass(LogScale);

export default LogScale;
