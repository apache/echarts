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

/*
* A third-party license is embeded for some of the code in this file:
* The "scaleLevels" was originally copied from "d3.js" with some
* modifications made for this project.
* (See more details in the comment on the definition of "scaleLevels" below.)
* The use of the source code of this file is also subject to the terms
* and consitions of the license of "d3.js" (BSD-3Clause, see
* </licenses/LICENSE-d3>).
*/


// [About UTC and local time zone]:
// In most cases, `number.parseDate` will treat input data string as local time
// (except time zone is specified in time string). And `format.formateTime` returns
// local time by default. option.useUTC is false by default. This design have
// concidered these common case:
// (1) Time that is persistent in server is in UTC, but it is needed to be diplayed
// in local time by default.
// (2) By default, the input data string (e.g., '2011-01-02') should be displayed
// as its original time, without any time difference.

import * as numberUtil from '../util/number';
import * as formatUtil from '../util/format';
import * as scaleHelper from './helper';
import IntervalScale from './Interval';
import Scale from './Scale';


const mathCeil = Math.ceil;
const mathFloor = Math.floor;
const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

// FIXME 公用？
const bisect = function (
    a: [string, number][],
    x: number,
    lo: number,
    hi: number
): number {
    while (lo < hi) {
        const mid = lo + hi >>> 1;
        if (a[mid][1] < x) {
            lo = mid + 1;
        }
        else {
            hi = mid;
        }
    }
    return lo;
};


class TimeScale extends IntervalScale {

    static type = 'time';
    readonly type = 'time';

    private _stepLvl: [string, number];

    getLabel(val: number): string {
        const stepLvl = this._stepLvl;

        const labelFormatType = getLabelFormatType(val, this.getSetting('useUTC'), false);
        return formatUtil.formatTime(labelFormatType, val);
    }

    /**
     * @override
     * @param expandToNicedExtent Whether expand the ticks to niced extent.
     */
    getTicks(expandToNicedExtent?: boolean): number[] {
        const interval = this._interval;
        const extent = this._extent;
        const niceTickExtent = this._niceExtent;

        let ticks = [] as number[];
        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        const safeLimit = 10000;

        if (extent[0] < niceTickExtent[0]) {
            if (expandToNicedExtent) {
                ticks.push(numberUtil.round(niceTickExtent[0] - interval, 0));
            }
            else {
                ticks.push(extent[0]);
            }
        }

        const useUTC = this.getSetting('useUTC');

        const scaleLevelsLen = primaryScaleLevels.length;
        const idx = bisect(primaryScaleLevels, this._interval, 0, scaleLevelsLen);
        const level = primaryScaleLevels[Math.min(idx, scaleLevelsLen - 1)];

        const innerTicks = getLevelTicks(
            level[0] as TimeAxisLabelPrimaryLevel,
            useUTC,
            extent
        );
        console.log(innerTicks);
        ticks = ticks.concat(innerTicks);

        // Consider this case: the last item of ticks is smaller
        // than niceTickExtent[1] and niceTickExtent[1] === extent[1].
        const lastNiceTick = ticks.length ? ticks[ticks.length - 1] : niceTickExtent[1];
        if (extent[1] > lastNiceTick) {
            if (expandToNicedExtent) {
                ticks.push(numberUtil.round(lastNiceTick + interval, 0));
            }
            else {
                ticks.push(extent[1]);
            }
        }

        return ticks;
    }

    niceExtent(
        opt?: {
            splitNumber?: number,
            fixMin?: boolean,
            fixMax?: boolean,
            minInterval?: number,
            maxInterval?: number
        }
    ): void {
        const extent = this._extent;
        // If extent start and end are same, expand them
        if (extent[0] === extent[1]) {
            // Expand extent
            extent[0] -= ONE_DAY;
            extent[1] += ONE_DAY;
        }
        // If there are no data and extent are [Infinity, -Infinity]
        if (extent[1] === -Infinity && extent[0] === Infinity) {
            const d = new Date();
            extent[1] = +new Date(d.getFullYear(), d.getMonth(), d.getDate());
            extent[0] = extent[1] - ONE_DAY;
        }

        this.niceTicks(opt.splitNumber, opt.minInterval, opt.maxInterval);

        // let extent = this._extent;
        const interval = this._interval;

        const timezoneOffset = this.getSetting('useUTC')
            ? 0 : (new Date(+extent[0] || +extent[1])).getTimezoneOffset() * 60 * 1000;
        if (!opt.fixMin) {
            extent[0] = numberUtil.round(mathFloor((extent[0] - timezoneOffset) / interval) * interval) + timezoneOffset;
        }
        if (!opt.fixMax) {
            extent[1] = numberUtil.round(mathCeil((extent[1] - timezoneOffset) / interval) * interval) + timezoneOffset;
        }
    }

    niceTicks(approxTickNum: number, minInterval: number, maxInterval: number): void {
        approxTickNum = approxTickNum || 10;

        const extent = this._extent;
        const span = extent[1] - extent[0];
        let approxInterval = span / approxTickNum;

        if (minInterval != null && approxInterval < minInterval) {
            approxInterval = minInterval;
        }
        if (maxInterval != null && approxInterval > maxInterval) {
            approxInterval = maxInterval;
        }

        const scaleLevelsLen = scaleLevels.length;
        const idx = bisect(scaleLevels, approxInterval, 0, scaleLevelsLen);

        const level = scaleLevels[Math.min(idx, scaleLevelsLen - 1)];
        let interval = level[1];
        // Same with interval scale if span is much larger than 1 year
        if (level[0] === 'year') {
            const yearSpan = span / interval;

            // From "Nice Numbers for Graph Labels" of Graphic Gems
            // let niceYearSpan = numberUtil.nice(yearSpan, false);
            const yearStep = numberUtil.nice(yearSpan / approxTickNum, true);

            interval *= yearStep;
        }

        const timezoneOffset = this.getSetting('useUTC')
            ? 0 : (new Date(+extent[0] || +extent[1])).getTimezoneOffset() * 60 * 1000;
        const niceExtent = [
            Math.round(mathCeil((extent[0] - timezoneOffset) / interval) * interval + timezoneOffset),
            Math.round(mathFloor((extent[1] - timezoneOffset) / interval) * interval + timezoneOffset)
        ] as [number, number];

        scaleHelper.fixExtent(niceExtent, extent);

        this._stepLvl = level;
        // Interval will be used in getTicks
        this._interval = interval;
        this._niceExtent = niceExtent;
    }

    parse(val: number | string | Date): number {
        // val might be float.
        return +numberUtil.parseDate(val);
    }

    contain(val: number): boolean {
        return scaleHelper.contain(this.parse(val), this._extent);
    }

    normalize(val: number): number {
        return scaleHelper.normalize(this.parse(val), this._extent);
    }

    scale(val: number): number {
        return scaleHelper.scale(val, this._extent);
    }

}


/**
 * This implementation was originally copied from "d3.js"
 * <https://github.com/d3/d3/blob/b516d77fb8566b576088e73410437494717ada26/src/time/scale.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 */
const scaleLevels = [
    // Format              interval
    ['hh:mm:ss', ONE_SECOND],          // 1s
    ['hh:mm:ss', ONE_SECOND * 5],      // 5s
    ['hh:mm:ss', ONE_SECOND * 10],     // 10s
    ['hh:mm:ss', ONE_SECOND * 15],     // 15s
    ['hh:mm:ss', ONE_SECOND * 30],     // 30s
    ['hh:mm\nMM-dd', ONE_MINUTE],      // 1m
    ['hh:mm\nMM-dd', ONE_MINUTE * 5],  // 5m
    ['hh:mm\nMM-dd', ONE_MINUTE * 10], // 10m
    ['hh:mm\nMM-dd', ONE_MINUTE * 15], // 15m
    ['hh:mm\nMM-dd', ONE_MINUTE * 30], // 30m
    ['hh:mm\nMM-dd', ONE_HOUR],        // 1h
    ['hh:mm\nMM-dd', ONE_HOUR * 2],    // 2h
    ['hh:mm\nMM-dd', ONE_HOUR * 6],    // 6h
    ['hh:mm\nMM-dd', ONE_HOUR * 12],   // 12h
    ['MM-dd\nyyyy', ONE_DAY],          // 1d
    ['MM-dd\nyyyy', ONE_DAY * 2],      // 2d
    ['MM-dd\nyyyy', ONE_DAY * 3],      // 3d
    ['MM-dd\nyyyy', ONE_DAY * 4],      // 4d
    ['MM-dd\nyyyy', ONE_DAY * 5],      // 5d
    ['MM-dd\nyyyy', ONE_DAY * 6],      // 6d
    ['week', ONE_DAY * 7],             // 7d
    ['MM-dd\nyyyy', ONE_DAY * 10],     // 10d
    ['week', ONE_DAY * 14],            // 2w
    ['week', ONE_DAY * 21],            // 3w
    ['month', ONE_DAY * 31],           // 1M
    ['week', ONE_DAY * 42],            // 6w
    ['month', ONE_DAY * 62],           // 2M
    ['week', ONE_DAY * 70],            // 10w
    ['quarter', ONE_DAY * 95],         // 3M
    ['month', ONE_DAY * 31 * 4],       // 4M
    ['month', ONE_DAY * 31 * 5],       // 5M
    ['half-year', ONE_DAY * 380 / 2],  // 6M
    ['month', ONE_DAY * 31 * 8],       // 8M
    ['month', ONE_DAY * 31 * 10],      // 10M
    ['year', ONE_DAY * 380]            // 1Y
] as [string, number][];

const primaryScaleLevels = [
    // Format              interval
    ['second', ONE_SECOND],          // 1s
    ['minute', ONE_MINUTE],      // 1m
    ['hour', ONE_HOUR],        // 1h
    ['day', ONE_DAY],          // 1d
    ['week', ONE_DAY * 7],             // 7d
    ['month', ONE_DAY * 31],           // 1M
    ['year', ONE_DAY * 380]            // 1Y
] as [string, number][];


type TimeAxisLabelPrimaryLevel = 'millisecond'
    | 'second' | 'minute' | 'hour'
    | 'day' | 'month' | 'year';
type TimeAxisLabelLevel = TimeAxisLabelPrimaryLevel
    | 'week' | 'quarter' | 'half-year';

const primaryLevels = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

function getLabelFormatType(
    value: number | string | Date,
    isUTC: boolean,
    primaryOnly: boolean
): TimeAxisLabelLevel {
    const date = numberUtil.parseDate(value);
    const utc = isUTC ? 'UTC' : '';
    const M = (date as any)['get' + utc + 'Month']() + 1;
    const w = (date as any)['get' + utc + 'Day']();
    const d = (date as any)['get' + utc + 'Date']();
    const h = (date as any)['get' + utc + 'Hours']();
    const m = (date as any)['get' + utc + 'Minutes']();
    const s = (date as any)['get' + utc + 'Seconds']();
    const S = (date as any)['get' + utc + 'Milliseconds']();

    const isSecond = S === 0;
    const isMinute = isSecond && s === 0;
    const isHour = isMinute && m === 0;
    const isDay = isHour && h === 0;
    const isWeek = isDay && w === 0; // TODO: first day to be configured
    const isMonth = isDay && d === 1;
    const isQuarter = isMonth && (M % 3 === 1);
    const isHalfYear = isMonth && (M % 6 === 1);
    const isYear = isMonth && M === 1;

    if (isYear) {
        return 'year';
    }
    else if (isHalfYear && !primaryOnly) {
        return 'half-year';
    }
    else if (isQuarter && !primaryOnly) {
        return 'quarter';
    }
    else if (isMonth) {
        return 'month';
    }
    else if (isWeek && !primaryOnly) {
        return 'week';
    }
    else if (isDay) {
        return 'day';
    }
    else if (isHour) {
        return 'hour';
    }
    else if (isMinute) {
        return 'minute';
    }
    else if (isSecond) {
        return 'second';
    }
    else {
        return 'millisecond';
    }
}


function getLabelFormatValueFromLevel(value: number | Date, isUTC: boolean, level?: TimeAxisLabelLevel) : number {
    const date = typeof value === 'number'
        ? numberUtil.parseDate(value) as any
        : value;
    level = level || getLabelFormatType(value, isUTC, true);
    const utc = isUTC ? 'UTC' : '';

    switch (level) {
        case 'millisecond':
            return date['get' + utc + 'Milliseconds']();
        case 'second':
            return date['get' + utc + 'Seconds']();
        case 'minute':
            return date['get' + utc + 'Minutes']();
        case 'hour':
            return date['get' + utc + 'Hours']();
        case 'day':
            return date['get' + utc + 'Date']();
        case 'month':
            return date['get' + utc + 'Month']();
        case 'year':
            return date['get' + utc + 'FullYear']();
    }
}


function isLevelValueSame(level: TimeAxisLabelPrimaryLevel, valueA: number, valueB: number, isUTC: boolean): boolean {
    const dateA = numberUtil.parseDate(valueA) as any;
    const dateB = numberUtil.parseDate(valueB) as any;
    const utc = isUTC ? 'UTC' : '';
    const isSame = (compareLevel: TimeAxisLabelPrimaryLevel) => {
        console.log(getLabelFormatValueFromLevel(dateA, isUTC, compareLevel), getLabelFormatValueFromLevel(dateB, isUTC, compareLevel), dateA, dateB);
        return getLabelFormatValueFromLevel(dateA, isUTC, compareLevel)
            === getLabelFormatValueFromLevel(dateB, isUTC, compareLevel);
    };

    switch (level) {
        case 'year':
            return isSame('year');
        case 'month':
            return isSame('year') && isSame('month');
        case 'day':
            return isSame('year') && isSame('month') && isSame('day');
        case 'hour':
            return isSame('year') && isSame('month') && isSame('day')
                && isSame('hour');
        case 'minute':
            return isSame('year') && isSame('month') && isSame('day')
                && isSame('hour') && isSame('minute');
        case 'second':
            return isSame('year') && isSame('month') && isSame('day')
                && isSame('hour') && isSame('minute') && isSame('second');
        case 'millisecond':
            return isSame('year') && isSame('month') && isSame('day')
                && isSame('hour') && isSame('minute') && isSame('second')
                && isSame('millisecond');
    }
}


function getLevelTicks(level: TimeAxisLabelLevel, isUTC: boolean, extent: number[]) {
    const utc = isUTC ? 'UTC' : '';
    const ticks: number[] = [];
    for (let i = 0; i < primaryLevels.length; ++i) {
        let date = new Date(extent[0]) as any;

        if (primaryLevels[i] === 'week') {
            date['set' + utc + 'Hours'](0);
            date['set' + utc + 'Minutes'](0);
            date['set' + utc + 'Seconds'](0);
            date['set' + utc + 'Milliseconds'](0);

            let isDateWithinExtent = true;
            while (isDateWithinExtent) {
                const dates = date['get' + utc + 'Month']() + 1 === 2
                    ? [8, 15, 22]
                    : [8, 16, 23];
                for (let d = 0; d < dates.length; ++d) {
                    date['set' + utc + 'Date'](dates[d]);
                    const dateTime = (date as Date).getTime();
                    if (dateTime > extent[1]) {
                        isDateWithinExtent = false;
                        break;
                    }
                    else if (dateTime >= extent[0]) {
                        ticks.push(dateTime);
                    }
                }
                date['set' + utc + 'Month'](date['get' + utc + 'Month']() + 1);
            }
        }
        else if (!isLevelValueSame(level as TimeAxisLabelPrimaryLevel, extent[0], extent[1], isUTC)) {
            // Level value changes within extent
            while (true) {
                if (primaryLevels[i] === 'year') {
                    date['set' + utc + 'FullYear'](date['get' + utc + 'FullYear']() + 1);
                    date['set' + utc + 'Month'](0);
                    date['set' + utc + 'Date'](1);
                    date['set' + utc + 'Hours'](0);
                    date['set' + utc + 'Minutes'](0);
                    date['set' + utc + 'Seconds'](0);
                }
                else if (primaryLevels[i] === 'month') {
                    // This also works with Dec.
                    date['set' + utc + 'Month'](date['get' + utc + 'Month']() + 1);
                    date['set' + utc + 'Date'](1);
                    date['set' + utc + 'Hours'](0);
                    date['set' + utc + 'Minutes'](0);
                    date['set' + utc + 'Seconds'](0);
                }
                else if (primaryLevels[i] === 'day') {
                    date['set' + utc + 'Date'](date['get' + utc + 'Day']() + 1);
                    date['set' + utc + 'Hours'](0);
                    date['set' + utc + 'Minutes'](0);
                    date['set' + utc + 'Seconds'](0);
                }
                else if (primaryLevels[i] === 'hour') {
                    date['set' + utc + 'Hours'](date['get' + utc + 'Hours']() + 1);
                    date['set' + utc + 'Minutes'](0);
                    date['set' + utc + 'Seconds'](0);
                }
                else if (primaryLevels[i] === 'minute') {
                    date['set' + utc + 'Minutes'](date['get' + utc + 'Minutes']() + 1);
                    date['set' + utc + 'Minutes'](0);
                    date['set' + utc + 'Seconds'](0);
                }
                else if (primaryLevels[i] === 'second') {
                    date['set' + utc + 'Seconds'](date['get' + utc + 'Seconds']() + 1);
                }
                date['set' + utc + 'Milliseconds'](0); // TODO: not sure

                const dateValue = (date as Date).getTime();
                if (dateValue < extent[1]) {
                    ticks.push(dateValue);
                }
                else {
                    break;
                }
            }
        }

        if (primaryLevels[i] === level) {
            break;
        }
    }

    ticks.sort((a, b) => a - b);
    if (ticks.length <= 1) {
        return ticks;
    }

    // Remove duplicates
    const result = [];
    for (let i = 1; i < ticks.length; ++i) {
        if (ticks[i] !== ticks[i - 1]) {
            result.push(ticks[i]);
        }
    }
    return result;
}


Scale.registerClass(TimeScale);

export default TimeScale;
