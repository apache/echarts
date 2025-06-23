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
import Scale from './Scale';
import * as numberUtil from '../util/number';
import * as scaleHelper from './helper';

// Use some method of IntervalScale
import IntervalScale from './Interval';
import SeriesData from '../data/SeriesData';
import { DimensionName, ScaleTick } from '../util/types';

const roundingErrorFix = numberUtil.round;

const mathFloor = Math.floor;
const mathCeil = Math.ceil;
const mathPow = Math.pow;
const mathMax = Math.max;
const mathRound = Math.round;

// LogScale does not have any specific settings
type LogScaleSetting = {};

/**
 * LogScale is a scale that maps values to a logarithmic range.
 *
 * Support for negative values is implemented by inverting the extents and first handling values as absolute values.
 * Then in tick generation, the tick values are multiplied by -1 back to the original values and the normalize function
 * uses a reverse extent to get the correct negative values in plot with smaller values at the top of Y axis.
 */
class LogScale extends IntervalScale<LogScaleSetting> {
    static type = 'log';
    readonly type = 'log';

    base = 10;

    private _originalScale: IntervalScale = new IntervalScale();

    /**
     * Whether the original input values are negative.
     *
     * @type {boolean}
     * @private
     */
    private _isNegative: boolean = false;

    private _fixMin: boolean;
    private _fixMax: boolean;

    /**
     * @param Whether expand the ticks to niced extent.
     */
    getTicks(expandToNicedExtent?: boolean): ScaleTick[] {
        const originalScale = this._originalScale;
        const extent = this._extent;
        const originalExtent = originalScale.getExtent();
        const negativeMultiplier = this._isNegative ? -1 : 1;

        const ticks = super.getTicks(expandToNicedExtent);


        // Ticks are created using the nice extent, but that can cause the first and last tick to be well outside the extent
        if (ticks[0].value < this._extent[0]) {
            ticks[0].value = this._extent[0];
        }
        if (ticks[ticks.length - 1].value > this._extent[1]) {
            ticks[ticks.length - 1].value = this._extent[1];
        }

        return zrUtil.map(ticks, function (tick) {
            const val = tick.value;
            let powVal = mathPow(this.base, val);

            // Fix #4158
            powVal = (val === extent[0] && this._fixMin)
                ? fixRoundingError(powVal, originalExtent[0])
                : powVal;
            powVal = (val === extent[1] && this._fixMax)
                ? fixRoundingError(powVal, originalExtent[1])
                : powVal;

            return {
                value: powVal * negativeMultiplier
            };
        }, this);
    }

    /**
     * Get minor ticks for log scale. Ticks are generated based on a decade so that 5 splits
     * between 1 and 10 would be 2, 4, 6, 8 and
     * between 5 and 10 would be 6, 8.
     * @param splitNumber Get minor ticks number.
     * @returns Minor ticks.
     */
    getMinorTicks(splitNumber: number): number[][] {
        const ticks = this.getTicks(true);
        const minorTicks = [];
        const negativeMultiplier = this._isNegative ? -1 : 1;

        for (let i = 1; i < ticks.length; i++) {
            const nextTick = ticks[i];
            const prevTick = ticks[i - 1];
            const logNextTick = Math.ceil(scaleHelper.absMathLog(nextTick.value, this.base));
            const logPrevTick = Math.round(scaleHelper.absMathLog(prevTick.value, this.base));

            const minorTicksGroup: number[] = [];
            const tickDiff = logNextTick - logPrevTick;
            const overDecade = tickDiff > 1;

            if (overDecade) {
                // For spans over a decade, generate evenly spaced ticks in log space
                // For example, between 1 and 100, generate a tick at 10
                const step = Math.ceil(tickDiff / splitNumber);

                let minorTickValue = Math.pow(this.base, logPrevTick + step);
                let j = 1;
                while (minorTickValue < nextTick.value) {
                    minorTicksGroup.push(minorTickValue);

                    j++;
                    minorTickValue = Math.pow(this.base, logPrevTick + j * step) * negativeMultiplier;
                }
            }
            else {
                // For spans within a decade, generate linear subdivisions
                // For example, between 1 and 10 with splitNumber=5, generate ticks at 2, 4, 6, 8
                const maxValue = Math.pow(this.base, logNextTick);

                // Divide the space linearly between min and max
                const step = maxValue / splitNumber;
                let minorTickValue = step;
                while (minorTickValue < nextTick.value) {
                    minorTicksGroup.push(minorTickValue * negativeMultiplier);
                    minorTickValue += step;
                }
            }

            minorTicks.push(minorTicksGroup);
        }

        return minorTicks;
    }

    setExtent(start: number, end: number): void {
        // Assume the start and end can be infinity
        // log(-Infinity) is NaN, so safe guard here
        if (start < Infinity) {
            start = scaleHelper.absMathLog(start, this.base);
        }
        if (end > -Infinity) {
            end = scaleHelper.absMathLog(end, this.base);
        }

        super.setExtent(start, end);
    }

    getExtent(): [number, number] {
        const extent = super.getExtent();
        extent[0] = mathPow(this.base, extent[0]);
        extent[1] = mathPow(this.base, extent[1]);

        // Fix #4158
        const originalScale = this._originalScale;
        const originalExtent = originalScale.getExtent();
        this._fixMin && (extent[0] = fixRoundingError(extent[0], originalExtent[0]));
        this._fixMax && (extent[1] = fixRoundingError(extent[1], originalExtent[1]));

        return extent;
    }

    unionExtent(extent: [number, number]): void {
        this._originalScale.unionExtent(extent);

        if (extent[0] < 0 && extent[1] < 0) {
            // If both extent are negative, switch to plotting negative values.
            // If there are only some negative values, they will be plotted incorrectly as positive values.
            this._isNegative = true;
        }

        const [logStart, logEnd] = this.getLogExtent(extent[0], extent[1]);

        extent[0] = logStart;
        extent[1] = logEnd;

        extent[0] < this._extent[0] && (this._extent[0] = extent[0]);
        extent[1] > this._extent[1] && (this._extent[1] = extent[1]);
    }

    unionExtentFromData(data: SeriesData, dim: DimensionName): void {
        // TODO
        // filter value that <= 0
        this.unionExtent(data.getApproximateExtent(dim));
    }

    /**
     * Update interval and extent of intervals for nice ticks
     * @param approxTickNum default 10 Given approx tick number
     */
    calcNiceTicks(approxTickNum: number): void {
        approxTickNum = approxTickNum || 10;

        const span = this._extent[1] - this._extent[0];

        if (span === Infinity || span <= 0) {
            return;
        }

        let interval = mathMax(
            1,
            mathRound(span / approxTickNum)
        );

        const err = approxTickNum / span * interval;

        // Filter ticks to get closer to the desired count.
        if (err <= 0.5) {
            interval *= 10;
        }

        // Interval should be integer
        while (!isNaN(interval) && Math.abs(interval) < 1 && Math.abs(interval) > 0) {
            interval *= 10;
        }

        const niceExtent: [number, number] = [
            mathFloor(this._extent[0] / interval) * interval,
            mathCeil(this._extent[1] / interval) * interval
        ];

        this._interval = interval;
        this._niceExtent = niceExtent;
    }

    calcNiceExtent(opt: {
        splitNumber: number, // By default 5.
        fixMin?: boolean,
        fixMax?: boolean,
        minInterval?: number,
        maxInterval?: number
    }): void {
        super.calcNiceExtent(opt);

        this._fixMin = opt.fixMin;
        this._fixMax = opt.fixMax;
    }

    parse(val: any): number {
        return val;
    }

    contain(val: number): boolean {
        val = scaleHelper.absMathLog(val, this.base);
        return scaleHelper.contain(val, this._extent);
    }

    normalize(inputVal: number): number {
        const val = scaleHelper.absMathLog(inputVal, this.base);
        let ex: [number, number] = [this._extent[0], this._extent[1]];

        if (this._isNegative) {
            // Invert the extent for normalize calculations as the extent is inverted for negative values.
            ex = [this._extent[1], this._extent[0]];
        }
        return scaleHelper.normalize(val, ex);
    }

    scale(val: number): number {
        val = scaleHelper.scale(val, this._extent);
        return mathPow(this.base, val);
    }

    /**
     * Get the extent of the log scale.
     * @param start - The start value of the extent.
     * @param end - The end value of the extent.
     * @returns The extent of the log scale. The extent is reversed for negative values.
     */
    getLogExtent(start: number, end: number): [number, number] {
        // Invert the extent but use absolute values
        if (this._isNegative) {
            const logStart = scaleHelper.absMathLog(Math.abs(end), this.base);
            const logEnd = scaleHelper.absMathLog(Math.abs(start), this.base);
            return [logStart, logEnd];
        }
        else {
            const logStart = scaleHelper.absMathLog(start, this.base);
            const logEnd = scaleHelper.absMathLog(end, this.base);
            return [logStart, logEnd];
        }
    }
}

function fixRoundingError(val: number, originalVal: number): number {
    return roundingErrorFix(val, numberUtil.getPrecision(originalVal));
}


Scale.registerClass(LogScale);

export default LogScale;
