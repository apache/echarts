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


import {round, mathRound, mathMin, getPrecision, mathCeil, mathFloor} from '../util/number';
import {addCommas} from '../util/format';
import Scale, { ScaleGetTicksOpt, ScaleSettingDefault } from './Scale';
import * as helper from './helper';
import {ScaleTick, ParsedAxisBreakList, ScaleDataValue, NullUndefined} from '../util/types';
import { getScaleBreakHelper } from './break';
import { assert, retrieve2 } from 'zrender/src/core/util';

class IntervalScale<SETTING extends ScaleSettingDefault = ScaleSettingDefault> extends Scale<SETTING> {

    static type = 'interval';
    type = 'interval';

    // Step is calculated in adjustExtent.
    protected _interval: number = 0;
    protected _intervalPrecision: number = 2;
    protected _extentPrecision: number[] = [];
    /**
     * `_intervalCount` effectively specifies the number of "nice segments". This is for special cases,
     * such as `alignTicks: true` and min max are fixed. In this case, `_interval` may be specified with
     * a "not-nice" value and needs to be rounded with `_intervalPrecision` for better appearance. Then
     * merely accumulating `_interval` may generate incorrect number of ticks due to cumulative errors.
     * So `_intervalCount` is required to specify the expected nice ticks number.
     * Should ensure `_intervalCount >= -1`,
     *  where `-1` means no nice tick (e.g., `_extent: [5.2, 5.8], _interval: 1`),
     *  and `0` means only one nice tick (e.g., `_extent: [5, 5.8], _interval: 1`).
     * @see setInterval
     */
    private _intervalCount: number | NullUndefined = undefined;
    /**
     * Should ensure:
     *  `_extent[0] <= _niceExtent[0] && _niceExtent[1] <= _extent[1]`
     * But NOTICE:
     *  `_niceExtent[0] - _niceExtent[1] <= _interval`, rather than always `< 0`,
     *  because `_niceExtent` is typically calculated by
     *  `[ Math.ceil(_extent[0] / _interval) * _interval, Math.floor(_extent[1] / _interval) * _interval ]`.
     *  e.g., `_extent: [5.2, 5.8]` with interval `1` will get `_niceExtent: [6, 5]`.
     *  e.g., `_extent: [5, 5.8]` with interval `1` will get `_niceExtent: [5, 5]`.
     * @see setInterval
     */
    protected _niceExtent: [number, number];


    parse(val: ScaleDataValue): number {
        // `Scale#parse` (and its overrids) are typically applied at the axis values input
        // in echarts option. e.g., `axis.min/max`, `dataZoom.min/max`, etc.
        // but `series.data` is not included, which uses `dataValueHelper.ts`#`parseDataValue`.
        // `Scale#parse` originally introduced in fb8c813215098b9d2458966229bb95c510883d5e
        // at 2016 for dataZoom start/end settings (See `parseAxisModelMinMax`).
        //
        // Historically `scale/Interval.ts` returns the input value directly. But numeric
        // values (such as a number-like string '123') effectively passed through here and
        // were involved in calculations, which was error-prone and inconsistent with the
        // declared TS return type. Previously such issues are fixed separately in different
        // places case by case (such as #2475).
        //
        // Now, we perform actual parse to ensure its `number` type here. The parsing rule
        // follows the series data parsing rule (`dataValueHelper.ts`#`parseDataValue`)
        // and maintains compatibility as much as possible (thus a more strict parsing
        // `number.ts`#`numericToNumber` is not used here.)
        //
        // FIXME: `ScaleDataValue` also need to be modified to include numeric string type,
        //  since it effectively does.
        return (val == null || val === '')
            ? NaN
            // If string (like '-'), using '+' parse to NaN
            // If object, also parse to NaN
            : Number(val);
    }

    contain(val: number): boolean {
        return helper.contain(val, this._extent);
    }

    normalize(val: number): number {
        return this._calculator.normalize(val, this._extent);
    }

    scale(val: number): number {
        return this._calculator.scale(val, this._extent);
    }

    getInterval(): number {
        return this._interval;
    }

    /**
     * @final override is DISALLOWED.
     */
    setInterval({interval, intervalCount, intervalPrecision, extentPrecision, niceExtent}: {
        interval?: number | NullUndefined;
        // See comments of `_intervalCount`.
        intervalCount?: number | NullUndefined;
        intervalPrecision?: number | NullUndefined;
        extentPrecision?: number[] | NullUndefined;
        niceExtent?: number[];
    }): void {
        const extent = this._extent;

        if (__DEV__) {
            assert(interval != null);
            if (intervalCount != null) {
                assert(
                    intervalCount >= -1
                    && intervalPrecision != null
                    // Do not support intervalCount on axis break currently.
                    && !this.hasBreaks()
                );
            }
            if (niceExtent != null) {
                assert(isFinite(niceExtent[0]) && isFinite(niceExtent[1]));
                assert(extent[0] <= niceExtent[0] && niceExtent[1] <= extent[1]);
                assert(round(niceExtent[0] - niceExtent[1], getPrecision(interval)) <= interval);
            }
        }

        // Set or clear
        this._niceExtent =
            niceExtent != null ? niceExtent.slice() as [number, number]
            // Dropped the auto calculated niceExtent and use user-set extent.
            // We assume users want to set both interval and extent to get a better result.
            : extent.slice() as [number, number];
        this._interval = interval;
        this._intervalCount = intervalCount;
        this._intervalPrecision = retrieve2(intervalPrecision, helper.getIntervalPrecision(interval));
        this._extentPrecision = extentPrecision || [];
    }

    /**
     * In ascending order.
     *
     * @override
     */
    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        opt = opt || {};
        const interval = this._interval;
        const extent = this._extent;
        const niceTickExtent = this._niceExtent;
        const intervalPrecision = this._intervalPrecision;
        const scaleBreakHelper = getScaleBreakHelper();

        const ticks = [] as ScaleTick[];
        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        if (opt.breakTicks === 'only_break' && scaleBreakHelper) {
            scaleBreakHelper.addBreaksToTicks(ticks, this._brkCtx!.breaks, this._extent);
            return ticks;
        }

        // [CAVEAT]: If changing this logic, must sync it to `axisAlignTicks.ts`.

        // Consider this case: using dataZoom toolbox, zoom and zoom.
        const safeLimit = 10000;

        if (extent[0] < niceTickExtent[0]) {
            if (opt.expandToNicedExtent) {
                ticks.push({
                    value: round(niceTickExtent[0] - interval, intervalPrecision)
                });
            }
            else {
                ticks.push({
                    value: extent[0]
                });
            }
        }

        const estimateNiceMultiple = (tickVal: number, targetTick: number) => {
            return mathRound((targetTick - tickVal) / interval);
        };

        const intervalCount = this._intervalCount;
        for (
            let tick = niceTickExtent[0], niceTickIdx = 0;
            ;
            niceTickIdx++
        ) {
            // Consider case `_extent: [5.2, 5.8], _niceExtent: [6, 5], interval: 1`,
            //  `_intervalCount` makes sense iff `-1`.
            // Consider case `_extent: [5, 5.8], _niceExtent: [5, 5], interval: 1`,
            //  `_intervalCount` makes sense iff `0`.
            if (intervalCount == null) {
                if (tick > niceTickExtent[1] || !isFinite(tick) || !isFinite(niceTickExtent[1])) {
                    break;
                }
            }
            else {
                if (niceTickIdx > intervalCount) { // nice ticks number should be `intervalCount + 1`
                    break;
                }
                // Consider cumulative error, especially caused by rounding, the last nice
                // `tick` may be less than or greater than `niceTickExtent[1]` slightly.
                tick = mathMin(tick, niceTickExtent[1]);
                if (niceTickIdx === intervalCount) {
                    tick = niceTickExtent[1];
                }
            }

            ticks.push({
                value: tick
            });

            // Avoid rounding error
            tick = round(tick + interval, intervalPrecision);

            if (this._brkCtx) {
                const moreMultiple = this._brkCtx.calcNiceTickMultiple(tick, estimateNiceMultiple);
                if (moreMultiple >= 0) {
                    tick = round(tick + moreMultiple * interval, intervalPrecision);
                }
            }

            if (ticks.length > 0 && tick === ticks[ticks.length - 1].value) {
                // Consider out of safe float point, e.g.,
                // -3711126.9907707 + 2e-10 === -3711126.9907707
                break;
            }
            if (ticks.length > safeLimit) {
                return [];
            }
        }

        // Consider this case: the last item of ticks is smaller
        // than niceTickExtent[1] and niceTickExtent[1] === extent[1].
        const lastNiceTick = ticks.length ? ticks[ticks.length - 1].value : niceTickExtent[1];
        if (extent[1] > lastNiceTick) {
            if (opt.expandToNicedExtent) {
                ticks.push({
                    value: round(lastNiceTick + interval, intervalPrecision)
                });
            }
            else {
                ticks.push({
                    value: extent[1]
                });
            }
        }

        if (scaleBreakHelper) {
            scaleBreakHelper.pruneTicksByBreak(
                opt.pruneByBreak,
                ticks,
                this._brkCtx!.breaks,
                item => item.value,
                this._interval,
                this._extent
            );
        }
        if (opt.breakTicks !== 'none' && scaleBreakHelper) {
            scaleBreakHelper.addBreaksToTicks(ticks, this._brkCtx!.breaks, this._extent);
        }

        return ticks;
    }

    getMinorTicks(splitNumber: number): number[][] {
        const ticks = this.getTicks({
            expandToNicedExtent: true,
        });
        // NOTE: In log-scale, do not support minor ticks when breaks exist.
        //  because currently log-scale minor ticks is calculated based on raw values
        //  rather than log-transformed value, due to an odd effect when breaks exist.
        const minorTicks = [];
        const extent = this.getExtent();

        for (let i = 1; i < ticks.length; i++) {
            const nextTick = ticks[i];
            const prevTick = ticks[i - 1];

            if (prevTick.break || nextTick.break) {
                // Do not build minor ticks to the adjacent ticks to breaks ticks,
                // since the interval might be irregular.
                continue;
            }

            let count = 0;
            const minorTicksGroup = [];
            const interval = nextTick.value - prevTick.value;
            const minorInterval = interval / splitNumber;
            const minorIntervalPrecision = helper.getIntervalPrecision(minorInterval);

            while (count < splitNumber - 1) {
                const minorTick = round(prevTick.value + (count + 1) * minorInterval, minorIntervalPrecision);

                // For the first and last interval. The count may be less than splitNumber.
                if (minorTick > extent[0] && minorTick < extent[1]) {
                    minorTicksGroup.push(minorTick);
                }
                count++;
            }

            const scaleBreakHelper = getScaleBreakHelper();
            scaleBreakHelper && scaleBreakHelper.pruneTicksByBreak(
                'auto',
                minorTicksGroup,
                this._getNonTransBreaks(),
                value => value,
                this._interval,
                extent
            );
            minorTicks.push(minorTicksGroup);
        }

        return minorTicks;
    }

    protected _getNonTransBreaks(): ParsedAxisBreakList {
        return this._brkCtx ? this._brkCtx.breaks : [];
    }

    /**
     * @param opt.precision If 'auto', use nice presision.
     * @param opt.pad returns 1.50 but not 1.5 if precision is 2.
     */
    getLabel(
        data: ScaleTick,
        opt?: {
            precision?: 'auto' | number,
            pad?: boolean
        }
    ): string {
        if (data == null) {
            return '';
        }

        let precision = opt && opt.precision;

        if (precision == null) {
            precision = getPrecision(data.value) || 0;
        }
        else if (precision === 'auto') {
            // Should be more precise then tick.
            precision = this._intervalPrecision;
        }

        // (1) If `precision` is set, 12.005 should be display as '12.00500'.
        // (2) Use `round` (toFixed) to avoid scientific notation like '3.5e-7'.
        const dataNum = round(data.value, precision as number, true);

        return addCommas(dataNum);
    }

    /**
     * FIXME: refactor - disallow override, use composition instead.
     *
     * The override of `calcNiceTicks` should ensure these members are provided:
     *  this._intervalPrecision
     *  this._interval
     *
     * @param splitNumber By default `5`.
     */
    calcNiceTicks(splitNumber?: number, minInterval?: number, maxInterval?: number): void {
        splitNumber = helper.ensureValidSplitNumber(splitNumber, 5);
        let extent = this._extent.slice() as [number, number];
        let span = this._getExtentSpanWithBreaks();

        if (!isFinite(span)) {
            // FIXME: Check and refactor this branch -- this return should never happen;
            //  otherwise the subsequent logic may be incorrect.
            return;
        }

        // User may set axis min 0 and data are all negative
        // FIXME If it needs to reverse ?
        if (span < 0) {
            span = -span;
            extent.reverse();
            this._innerSetExtent(extent[0], extent[1]);
            extent = this._extent.slice() as [number, number];
        }

        const result = helper.intervalScaleNiceTicks(
            extent, span, splitNumber, minInterval, maxInterval
        );

        this._intervalPrecision = result.intervalPrecision;
        this._interval = result.interval;
        this._niceExtent = result.niceTickExtent;
    }

    /**
     * FIXME: refactor - disallow override for readability; use composition instead.
     *  `calcNiceExtent` and `alignScaleTicks` both implement tick arrangement (for
     *  two scenarios), but they are implemented in two different code styles.
     */
    calcNiceExtent(opt: {
        splitNumber: number, // By default 5.
        // Do not modify the original extent[0]/extent[1] except for an invalid extent.
        fixMinMax?: boolean[], // [fixMin, fixMax]
        minInterval?: number,
        maxInterval?: number
    }): void {
        const fixMinMax = opt.fixMinMax || [];

        let extent = helper.intervalScaleEnsureValidExtent(this._extent, fixMinMax);

        this._innerSetExtent(extent[0], extent[1]);
        extent = this._extent.slice() as [number, number];

        this.calcNiceTicks(opt.splitNumber, opt.minInterval, opt.maxInterval);
        const interval = this._interval;
        const intervalPrecition = this._intervalPrecision;

        if (!fixMinMax[0]) {
            extent[0] = round(mathFloor(extent[0] / interval) * interval, intervalPrecition);
        }
        if (!fixMinMax[1]) {
            extent[1] = round(mathCeil(extent[1] / interval) * interval, intervalPrecition);
        }
        this._innerSetExtent(extent[0], extent[1]);

        // [CAVEAT]: If updating this impl, need to sync it to `axisAlignTicks.ts`.
    }

}

Scale.registerClass(IntervalScale);

export default IntervalScale;
