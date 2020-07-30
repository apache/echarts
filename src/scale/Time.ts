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
import {
    ONE_SECOND,
    ONE_MINUTE,
    ONE_HOUR,
    ONE_DAY,
    ONE_YEAR,
    format,
    leveledFormat,
    PrimaryTimeUnit,
    TimeUnit,
    getUnitValue,
    timeUnits,
    fullLeveledFormatter,
    getPrimaryTimeUnit,
    isPrimaryTimeUnit,
    getDefaultFormatPrecisionOfInterval
} from '../util/time';
import * as scaleHelper from './helper';
import IntervalScale from './Interval';
import Scale from './Scale';
import {TimeScaleTick} from '../util/types';
import {TimeAxisLabelFormatterOption} from '../coord/axisCommonTypes';
import { log, warn } from '../util/log';
import { isForInStatement } from '@babel/types';
import { getDataItemValue } from '../util/model';

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

    _approxInterval: number;

    _intervalUnit: TimeUnit;

    /**
     * Get label is mainly for other components like dataZoom, tooltip.
     */
    getLabel(tick: TimeScaleTick): string {
        const useUTC = this.getSetting('useUTC');
        return format(
            tick.value,
            fullLeveledFormatter[
                getDefaultFormatPrecisionOfInterval(getPrimaryTimeUnit(this._intervalUnit))
            ] || fullLeveledFormatter.second,
            useUTC
        );
    }

    getFormattedLabel(
        tick: TimeScaleTick,
        idx: number,
        labelFormatter: TimeAxisLabelFormatterOption
    ): string {
        const isUTC = this.getSetting('useUTC');
        return leveledFormat(tick, idx, labelFormatter, isUTC);
    }

    /**
     * @override
     * @param expandToNicedExtent Whether expand the ticks to niced extent.
     */
    getTicks(expandToNicedExtent?: boolean): TimeScaleTick[] {
        const interval = this._interval;
        const extent = this._extent;

        let ticks = [] as TimeScaleTick[];
        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        ticks.push({
            value: extent[0],
            level: 0
        });

        const useUTC = this.getSetting('useUTC');

        const innerTicks = getIntervalTicks(
            this._intervalUnit,
            this._approxInterval,
            this._interval,
            useUTC,
            extent
        );

        ticks = ticks.concat(innerTicks);

        ticks.push({
            value: extent[1],
            level: 0
        });

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
    }

    niceTicks(approxTickNum: number, minInterval: number, maxInterval: number): void {
        approxTickNum = approxTickNum || 10;

        const extent = this._extent;
        const span = extent[1] - extent[0];
        this._approxInterval = span / approxTickNum;

        if (minInterval != null && this._approxInterval < minInterval) {
            this._approxInterval = minInterval;
        }
        if (maxInterval != null && this._approxInterval > maxInterval) {
            this._approxInterval = maxInterval;
        }

        const scaleIntervalsLen = scaleIntervals.length;
        const idx = bisect(scaleIntervals, this._approxInterval, 0, scaleIntervalsLen) - 1;

        const intervals = scaleIntervals[
            Math.max(Math.min(idx, scaleIntervalsLen - 1), 0
        )];

        // Interval will be used in getTicks
        this._interval = intervals[1];
        this._intervalUnit = intervals[0];
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
const scaleIntervals: [TimeUnit, number][] = [
    // Format                           interval
    ['second', ONE_SECOND],             // 1s
    ['minute', ONE_MINUTE],             // 1m
    ['hour', ONE_HOUR],                 // 1h
    ['quarter-day', ONE_HOUR * 6],      // 6h
    ['half-day', ONE_HOUR * 12],        // 12h
    ['day', ONE_DAY * 1.2],             // 1d
    ['half-week', ONE_DAY * 3.5],       // 3.5d
    ['week', ONE_DAY * 7],              // 7d
    ['month', ONE_DAY * 31],            // 1M
    ['quarter', ONE_DAY * 95],          // 3M
    ['half-year', ONE_YEAR / 2],        // 6M
    ['year', ONE_YEAR]                  // 1Y
];

function isUnitValueSame(
    unit: PrimaryTimeUnit,
    valueA: number,
    valueB: number,
    isUTC: boolean
): boolean {
    const dateA = numberUtil.parseDate(valueA) as any;
    const dateB = numberUtil.parseDate(valueB) as any;

    const isSame = (unit: PrimaryTimeUnit) => {
        return getUnitValue(dateA, unit, isUTC)
            === getUnitValue(dateB, unit, isUTC);
    };
    const isSameYear = () => isSame('year');
    // const isSameHalfYear = () => isSameYear() && isSame('half-year');
    // const isSameQuater = () => isSameYear() && isSame('quarter');
    const isSameMonth = () => isSameYear() && isSame('month');
    const isSameDay = () => isSameMonth() && isSame('day');
    // const isSameHalfDay = () => isSameDay() && isSame('half-day');
    const isSameHour = () => isSameDay() && isSame('hour');
    const isSameMinute = () => isSameHour() && isSame('minute');
    const isSameSecond = () => isSameMinute() && isSame('second');
    const isSameMilliSecond = () => isSameSecond() && isSame('millisecond');

    switch (unit) {
        case 'year':
            return isSameYear();
        case 'month':
            return isSameMonth();
        case 'day':
            return isSameDay();
        case 'hour':
            return isSameHour();
        case 'minute':
            return isSameMinute();
        case 'second':
            return isSameSecond();
        case 'millisecond':
            return isSameMilliSecond();
    }
}

function getIntervalTicks(
    unitName: TimeUnit,
    approxInterval: number,
    interval: number,
    isUTC: boolean,
    extent: number[]
): TimeScaleTick[] {
    const safeLimit = 10000;
    const utc = isUTC ? 'UTC' : '';
    const ticks: TimeScaleTick[] = [];
    const unitNames = timeUnits;
    let levelId = 0;

    const setFullYearMethodName = 'set' + utc + 'FullYear' as 'setFullYear' | 'setUTCFullYear';
    const setMonthMethodName = 'set' + utc + 'Month' as 'setMonth' | 'setUTCMonth';
    const setDateMethodName = 'set' + utc + 'Date' as 'setDate' | 'setUTCDate';
    const setHoursMethodName = 'set' + utc + 'Hours' as 'setHours' | 'setUTCHours';
    const setMinutesMethodName = 'set' + utc + 'Minutes' as 'setMinutes' | 'setUTCMinutes';
    const setSecondsMethodName = 'set' + utc + 'Seconds' as 'setSeconds' | 'setUTCSeconds';
    const setMillisecondsMethodName = 'set' + utc + 'Milliseconds' as 'setMilliseconds' | 'setUTCMilliseconds';

    const getFullYearMethodName = 'get' + utc + 'FullYear' as 'getFullYear' | 'getUTCFullYear';
    const getMonthMethodName = 'get' + utc + 'Month' as 'getMonth' | 'getUTCMonth';
    const getDateMethodName = 'get' + utc + 'Date' as 'getDate' | 'getUTCDate';
    const getHoursMethodName = 'get' + utc + 'Hours' as 'getHours' | 'getUTCHours';
    const getMinutesMethodName = 'get' + utc + 'Minutes' as 'getMinutes' | 'getUTCMinutes';
    const getSecondsMethodName = 'get' + utc + 'Seconds' as 'getSeconds' | 'getUTCSeconds';
    const getMillisecondsMethodName = 'get' + utc + 'Milliseconds' as 'getMilliseconds' | 'getUTCMilliseconds';

    let iter = 0;

    for (let i = 0, hasTickInLevel = false; i < unitNames.length && iter++ < safeLimit; ++i) {
        const date = new Date(extent[0]);

        if (unitNames[i] === 'week' || unitNames[i] === 'half-week') {
            date[setHoursMethodName](0);
            date[setMinutesMethodName](0);
            date[setSecondsMethodName](0);
            date[setMillisecondsMethodName](0);

            if (extent[0] === date.getTime()) {
                ticks.push({
                    value: extent[0],
                    level: levelId
                });
                hasTickInLevel = true;
            }

            outer: while (iter++ < safeLimit) {
                const dateInterval = approxInterval > ONE_DAY * 16 ? 15
                    : approxInterval > ONE_DAY * 8 ? 8
                        : approxInterval > ONE_DAY * 3.5 ? 4
                            : approxInterval > ONE_DAY * 1.5 ? 2 : 1;

                // const dates = approxInterval > ONE_DAY * 8 ? [15]
                //     : (approxInterval > ONE_DAY * 3.5 ? [8, 16, 24] : [4, 8, 12, 16, 20, 24, 28]);

                const tmpDate = new Date(date);
                tmpDate[setMonthMethodName](tmpDate[getMonthMethodName]() + 2);
                tmpDate[setDateMethodName](0);  // Set day to 0 to return the last day of last month.
                const daysInMonth = tmpDate.getDate();

                for (let d = dateInterval; d < daysInMonth; d += dateInterval) {

                    date[setDateMethodName](d);
                    const dateTime = date.getTime();
                    if (dateTime > extent[1]) {
                        break outer;
                    }
                    else if (dateTime >= extent[0]) {
                        ticks.push({
                            value: dateTime,
                            level: levelId
                        });
                        hasTickInLevel = true;
                    }
                }

                // Reset date to 0. The date may be 30, and days of next month may be 29. Which will excced
                date[setDateMethodName](1);

                // Move to next month. Add 2 because getMonth starts with 0, setMonth starts with 1.
                date[setMonthMethodName](date[getMonthMethodName]() + 1);
            }
        }
        else if (!isUnitValueSame(
            getPrimaryTimeUnit(unitNames[i]),
            extent[0], extent[1], isUTC
        )) {
            // Level value changes within extent
            let isFirst = true;
            while (iter++ < safeLimit) {
                switch (unitNames[i]) {
                    case 'year':
                    case 'half-year':
                    case 'quarter':
                        if (isFirst) {
                            date[setMonthMethodName](0);
                            date[setDateMethodName](1);
                            date[setHoursMethodName](0);
                            date[setMinutesMethodName](0);
                            date[setSecondsMethodName](0);
                        }
                        else {
                            const months = unitNames[i] === 'year'
                                ? 12 : (unitNames[i] === 'half-year' ? 6 : 3);
                            if (unitNames[i] === 'half-year' || unitNames[i] === 'quarter') {
                                date[setMonthMethodName](date[getMonthMethodName]() + months);
                            }
                            else {
                                const yearSpan = Math.max(1, Math.round(approxInterval / ONE_DAY / 365));
                                date[setFullYearMethodName](date[getFullYearMethodName]() + yearSpan);
                                if (date.getTime() > extent[1] && yearSpan > 1) {
                                    // For the last data
                                    date[setFullYearMethodName](date[getFullYearMethodName]() - yearSpan + 1);
                                    if (date.getTime() < extent[1]) {
                                        // The last data is not in year unit, make it invalid by larger than extent[1]
                                        date[setFullYearMethodName](date[getFullYearMethodName]() + yearSpan);
                                    }
                                }
                            }
                        }
                        break;

                    case 'month':
                        if (isFirst) {
                            date[setDateMethodName](1);
                            date[setHoursMethodName](0);
                            date[setMinutesMethodName](0);
                            date[setSecondsMethodName](0);
                        }
                        else {
                            date[setMonthMethodName](date[getMonthMethodName]() + 1);
                        }
                        break;

                    case 'day':
                    case 'half-day':
                    case 'quarter-day':
                        if (isFirst) {
                            date[setHoursMethodName](0);
                            date[setMinutesMethodName](0);
                            date[setSecondsMethodName](0);
                        }
                        else if (unitNames[i] === 'half-day') {
                            date[setHoursMethodName](date[getHoursMethodName]() + 12);
                        }
                        else if (unitNames[i] === 'quarter-day') {
                            date[setHoursMethodName](date[getHoursMethodName]() + 6);
                        }
                        else {
                            date[setDateMethodName](date[getDateMethodName]() + 1);
                        }
                        break;

                    case 'hour':
                        if (isFirst) {
                            date[setMinutesMethodName](0);
                            date[setSecondsMethodName](0);
                        }
                        else {
                            // date = new Date(+date + interval);
                            date[setHoursMethodName](date[getHoursMethodName]() + 1);
                        }
                        break;

                    case 'minute':
                        if (isFirst) {
                            date[setMinutesMethodName](0);
                            date[setSecondsMethodName](0);
                        }
                        else {
                            // date = new Date(+date + interval);
                            date[setMinutesMethodName](date[getMinutesMethodName]() + 1);
                        }
                        break;

                    case 'second':
                        if (!isFirst) {
                            // date = new Date(+date + interval);
                            date[setSecondsMethodName](date[getSecondsMethodName]() + 1);
                        }
                        break;

                    case 'millisecond':
                        if (isFirst) {
                            date[setMillisecondsMethodName](0);
                        }
                        else {
                            // date = new Date(+date + interval);
                            date[setMillisecondsMethodName](date[getMillisecondsMethodName]() + 100);
                        }
                        break;
                }
                if (isFirst && unitNames[i] !== 'millisecond') {
                    date[setMillisecondsMethodName](0);
                }

                const dateValue = date.getTime();
                if (dateValue >= extent[0] && dateValue <= extent[1]) {
                    ticks.push({
                        value: dateValue,
                        level: levelId
                    });
                    hasTickInLevel = true;
                }
                else if (dateValue > extent[1]) {
                    break;
                }
                isFirst = false;
            }
            if (hasTickInLevel
                && isPrimaryTimeUnit(unitNames[i])
            ) {
                ++levelId;
            }
        }

        if (__DEV__) {
            if (iter >= safeLimit) {
                warn('Exceed safe limit.');
            }
        }

        // Remove the duplicate so the tick count can be precisely.
        ticks.sort((a, b) => a.value - b.value);
        let tickCount = 0;
        const tickLen = ticks.length;
        if (tickLen) {
            let prev = ticks[0].value;
            for (let i = 1; i < tickLen; ++i) {
                if (prev !== ticks[i].value) {
                    prev = ticks[i].value;
                    tickCount++;
                }
            }
        }

        if (tickCount > (extent[1] - extent[0]) / approxInterval || unitNames[i] === unitName) {
            break;
        }
        // if (unitNames[i] === unitName) {
        //     break;
        // }
    }

    let maxLevel = -Number.MAX_VALUE;
    for (let i = 0; i < ticks.length; ++i) {
        maxLevel = Math.max(maxLevel, ticks[i].level);
    }

    // Remove duplicates
    const result = [];
    for (let i = 0; i < ticks.length; ++i) {
        if (i === 0 || ticks[i].value !== ticks[i - 1].value) {
            result.push({
                value: ticks[i].value,
                level: maxLevel - ticks[i].level
            });
        }
    }


    return result;
}


Scale.registerClass(TimeScale);

export default TimeScale;
