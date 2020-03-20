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


import * as numberUtil from '../util/number';
import * as formatUtil from '../util/format';
import Scale from './Scale';
import * as helper from './helper';

const roundNumber = numberUtil.round;

class IntervalScale extends Scale {

    static type = 'interval';
    type = 'interval';

    // Step is calculated in adjustExtent.
    protected _interval: number = 0;
    protected _niceExtent: [number, number];
    private _intervalPrecision: number = 2;


    parse(val: number): number {
        return val;
    }

    contain(val: number): boolean {
        return helper.contain(val, this._extent);
    }

    normalize(val: number): number {
        return helper.normalize(val, this._extent);
    }

    scale(val: number): number {
        return helper.scale(val, this._extent);
    }

    setExtent(start: number | string, end: number | string): void {
        let thisExtent = this._extent;
        // start,end may be a Number like '25',so...
        if (!isNaN(start as any)) {
            thisExtent[0] = parseFloat(start as any);
        }
        if (!isNaN(end as any)) {
            thisExtent[1] = parseFloat(end as any);
        }
    }

    unionExtent(other: [number, number]): void {
        let extent = this._extent;
        other[0] < extent[0] && (extent[0] = other[0]);
        other[1] > extent[1] && (extent[1] = other[1]);

        // unionExtent may called by it's sub classes
        this.setExtent(extent[0], extent[1]);
    }

    getInterval(): number {
        return this._interval;
    }

    setInterval(interval: number): void {
        this._interval = interval;
        // Dropped auto calculated niceExtent and use user setted extent
        // We assume user wan't to set both interval, min, max to get a better result
        this._niceExtent = this._extent.slice() as [number, number];

        this._intervalPrecision = helper.getIntervalPrecision(interval);
    }

    /**
     * @param expandToNicedExtent Whether expand the ticks to niced extent.
     */
    getTicks(expandToNicedExtent?: boolean): number[] {
        let interval = this._interval;
        let extent = this._extent;
        let niceTickExtent = this._niceExtent;
        let intervalPrecision = this._intervalPrecision;

        let ticks = [] as number[];
        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        // Consider this case: using dataZoom toolbox, zoom and zoom.
        let safeLimit = 10000;

        if (extent[0] < niceTickExtent[0]) {
            if (expandToNicedExtent) {
                ticks.push(roundNumber(niceTickExtent[0] - interval, intervalPrecision));
            }
            else {
                ticks.push(extent[0]);
            }
        }
        let tick = niceTickExtent[0];

        while (tick <= niceTickExtent[1]) {
            ticks.push(tick);
            // Avoid rounding error
            tick = roundNumber(tick + interval, intervalPrecision);
            if (tick === ticks[ticks.length - 1]) {
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
        let lastNiceTick = ticks.length ? ticks[ticks.length - 1] : niceTickExtent[1];
        if (extent[1] > lastNiceTick) {
            if (expandToNicedExtent) {
                ticks.push(roundNumber(lastNiceTick + interval, intervalPrecision));
            }
            else {
                ticks.push(extent[1]);
            }
        }

        return ticks;
    }

    getMinorTicks(splitNumber: number): number[][] {
        let ticks = this.getTicks(true);
        let minorTicks = [];
        let extent = this.getExtent();

        for (let i = 1; i < ticks.length; i++) {
            let nextTick = ticks[i];
            let prevTick = ticks[i - 1];
            let count = 0;
            let minorTicksGroup = [];
            let interval = nextTick - prevTick;
            let minorInterval = interval / splitNumber;

            while (count < splitNumber - 1) {
                let minorTick = roundNumber(prevTick + (count + 1) * minorInterval);

                // For the first and last interval. The count may be less than splitNumber.
                if (minorTick > extent[0] && minorTick < extent[1]) {
                    minorTicksGroup.push(minorTick);
                }
                count++;
            }
            minorTicks.push(minorTicksGroup);
        }

        return minorTicks;
    }

    /**
     * @param opt.precision If 'auto', use nice presision.
     * @param opt.pad returns 1.50 but not 1.5 if precision is 2.
     */
    getLabel(
        data: number,
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
            precision = numberUtil.getPrecisionSafe(data) || 0;
        }
        else if (precision === 'auto') {
            // Should be more precise then tick.
            precision = this._intervalPrecision;
        }

        // (1) If `precision` is set, 12.005 should be display as '12.00500'.
        // (2) Use roundNumber (toFixed) to avoid scientific notation like '3.5e-7'.
        let dataNum = roundNumber(data, precision as number, true);

        return formatUtil.addCommas(dataNum);
    }

    /**
     * @param splitNumber By default `5`.
     */
    niceTicks(splitNumber?: number, minInterval?: number, maxInterval?: number): void {
        splitNumber = splitNumber || 5;
        let extent = this._extent;
        let span = extent[1] - extent[0];
        if (!isFinite(span)) {
            return;
        }
        // User may set axis min 0 and data are all negative
        // FIXME If it needs to reverse ?
        if (span < 0) {
            span = -span;
            extent.reverse();
        }

        let result = helper.intervalScaleNiceTicks(
            extent, splitNumber, minInterval, maxInterval
        );

        this._intervalPrecision = result.intervalPrecision;
        this._interval = result.interval;
        this._niceExtent = result.niceTickExtent;
    }

    niceExtent(opt: {
        splitNumber: number, // By default 5.
        fixMin?: boolean,
        fixMax?: boolean,
        minInterval?: number,
        maxInterval?: number
    }): void {
        let extent = this._extent;
        // If extent start and end are same, expand them
        if (extent[0] === extent[1]) {
            if (extent[0] !== 0) {
                // Expand extent
                let expandSize = extent[0];
                // In the fowllowing case
                //      Axis has been fixed max 100
                //      Plus data are all 100 and axis extent are [100, 100].
                // Extend to the both side will cause expanded max is larger than fixed max.
                // So only expand to the smaller side.
                if (!opt.fixMax) {
                    extent[1] += expandSize / 2;
                    extent[0] -= expandSize / 2;
                }
                else {
                    extent[0] -= expandSize / 2;
                }
            }
            else {
                extent[1] = 1;
            }
        }
        let span = extent[1] - extent[0];
        // If there are no data and extent are [Infinity, -Infinity]
        if (!isFinite(span)) {
            extent[0] = 0;
            extent[1] = 1;
        }

        this.niceTicks(opt.splitNumber, opt.minInterval, opt.maxInterval);

        // let extent = this._extent;
        let interval = this._interval;

        if (!opt.fixMin) {
            extent[0] = roundNumber(Math.floor(extent[0] / interval) * interval);
        }
        if (!opt.fixMax) {
            extent[1] = roundNumber(Math.ceil(extent[1] / interval) * interval);
        }
    }

}

Scale.registerClass(IntervalScale);

export default IntervalScale;
