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


import {round, mathRound, mathMin, getPrecision} from '../util/number';
import {addCommas} from '../util/format';
import Scale, { ScaleGetTicksOpt, ScaleSettingDefault } from './Scale';
import * as helper from './helper';
import {ScaleTick, ScaleDataValue, NullUndefined} from '../util/types';
import { getScaleBreakHelper } from './break';
import { assert, clone } from 'zrender/src/core/util';
import { getMinorTicks } from './minorTicks';


type IntervalScaleConfig = {
    interval: IntervalScaleConfigParsed['interval'];
    intervalPrecision?: IntervalScaleConfigParsed['intervalPrecision'] | NullUndefined;
    extentPrecision?: IntervalScaleConfigParsed['extentPrecision'] | NullUndefined;
    intervalCount?: IntervalScaleConfigParsed['intervalCount'] | NullUndefined;
    niceExtent?: IntervalScaleConfigParsed['niceExtent'] | NullUndefined;
};

type IntervalScaleConfigParsed = {
    /**
     * Step of ticks.
     */
    interval: number;
    intervalPrecision: number;
    /**
     * Precisions of `_extent[0]` and `_extent[1]`.
     */
    extentPrecision: (number | NullUndefined)[];
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
    intervalCount: number | NullUndefined;
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
    niceExtent: number[] | NullUndefined;
};


class IntervalScale<SETTING extends ScaleSettingDefault = ScaleSettingDefault> extends Scale<SETTING> {

    static type = 'interval';
    type = 'interval' as const;

    private _cfg: IntervalScaleConfigParsed;


    constructor(setting?: SETTING) {
        super(setting);
        this._cfg = {
            interval: 0,
            intervalPrecision: 2,
            extentPrecision: [],
            intervalCount: undefined,
            niceExtent: undefined,
        };
    }

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

    getConfig(): IntervalScaleConfigParsed {
        return clone(this._cfg);
    }

    /**
     * @final override is DISALLOWED.
     */
    setConfig(cfg: IntervalScaleConfig): void {
        const extent = this._extent;

        if (__DEV__) {
            assert(cfg.interval != null);
            if (cfg.intervalCount != null) {
                assert(
                    cfg.intervalCount >= -1
                    && cfg.intervalPrecision != null
                    // Do not support intervalCount on axis break currently.
                    && !this.hasBreaks()
                );
            }
            if (cfg.niceExtent != null) {
                assert(isFinite(cfg.niceExtent[0]) && isFinite(cfg.niceExtent[1]));
                assert(extent[0] <= cfg.niceExtent[0] && cfg.niceExtent[1] <= extent[1]);
                assert(round(cfg.niceExtent[0] - cfg.niceExtent[1], getPrecision(cfg.interval)) <= cfg.interval);
            }
        }

        // Reset all.
        this._cfg = cfg = clone(cfg) as IntervalScaleConfigParsed;
        if (cfg.niceExtent == null) {
            // Dropped the auto calculated niceExtent and use user-set extent.
            // We assume users want to set both interval and extent to get a better result.
            cfg.niceExtent = extent.slice() as [number, number];
        }
        if (cfg.intervalPrecision == null) {
            cfg.intervalPrecision = helper.getIntervalPrecision(cfg.interval);
        }
        cfg.extentPrecision = cfg.extentPrecision || [];
    }

    /**
     * In ascending order.
     *
     * @final override is DISALLOWED.
     */
    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        opt = opt || {};
        const cfg = this._cfg;
        const interval = cfg.interval;
        const extent = this._extent;
        const niceExtent = cfg.niceExtent;
        const intervalPrecision = cfg.intervalPrecision;
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

        if (__DEV__) {
            assert(niceExtent != null);
        }

        // [CAVEAT]: If changing this logic, must sync it to `axisAlignTicks.ts`.

        // Consider this case: using dataZoom toolbox, zoom and zoom.
        const safeLimit = 10000;

        if (extent[0] < niceExtent[0]) {
            if (opt.expandToNicedExtent) {
                ticks.push({
                    value: round(niceExtent[0] - interval, intervalPrecision)
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

        const intervalCount = cfg.intervalCount;
        for (
            let tick = niceExtent[0], niceTickIdx = 0;
            ;
            niceTickIdx++
        ) {
            // Consider case `_extent: [5.2, 5.8], _niceExtent: [6, 5], interval: 1`,
            //  `_intervalCount` makes sense iff `-1`.
            // Consider case `_extent: [5, 5.8], _niceExtent: [5, 5], interval: 1`,
            //  `_intervalCount` makes sense iff `0`.
            if (intervalCount == null) {
                if (tick > niceExtent[1] || !isFinite(tick) || !isFinite(niceExtent[1])) {
                    break;
                }
            }
            else {
                if (niceTickIdx > intervalCount) { // nice ticks number should be `intervalCount + 1`
                    break;
                }
                // Consider cumulative error, especially caused by rounding, the last nice
                // `tick` may be less than or greater than `niceExtent[1]` slightly.
                tick = mathMin(tick, niceExtent[1]);
                if (niceTickIdx === intervalCount) {
                    tick = niceExtent[1];
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
        // than niceExtent[1] and niceExtent[1] === extent[1].
        const lastNiceTick = ticks.length ? ticks[ticks.length - 1].value : niceExtent[1];
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
                cfg.interval,
                this._extent
            );
        }
        if (opt.breakTicks !== 'none' && scaleBreakHelper) {
            scaleBreakHelper.addBreaksToTicks(ticks, this._brkCtx!.breaks, this._extent);
        }

        return ticks;
    }

    /**
     * @final override is DISALLOWED.
     */
    getMinorTicks(splitNumber: number): number[][] {
        return getMinorTicks(
            this,
            splitNumber,
            this.innerGetBreaks(),
            this._cfg.interval
        );
    }

    /**
     * @final override is DISALLOWED.
     */
    getLabel(
        data: ScaleTick,
        opt?: helper.IntervalScaleGetLabelOpt
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
            precision = this._cfg.intervalPrecision;
        }

        // (1) If `precision` is set, 12.005 should be display as '12.00500'.
        // (2) Use `round` (toFixed) to avoid scientific notation like '3.5e-7'.
        const dataNum = round(data.value, precision as number, true);

        return addCommas(dataNum);
    }

}

Scale.registerClass(IntervalScale);

export default IntervalScale;
