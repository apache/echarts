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
import * as timeUtil from '../util/time';
import * as scaleHelper from './helper';
import IntervalScale from './Interval';
import Scale from './Scale';
import {TimeScaleTick} from '../util/types';
import {TimeAxisLabelFormatterOption} from '../coord/axisCommonTypes';


const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_YEAR = ONE_DAY * 365;

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

    getLabel(tick: TimeScaleTick): string {
        // const stepLvl = this._stepLvl;

        const labelFormatType = timeUtil.getUnitFromValue(
            tick.value,
            this.getSetting('useUTC'),
            false
        );
        return formatUtil.formatTime(labelFormatType, tick.value);
    }

    getFormattedLabel(
        tick: TimeScaleTick,
        idx: number,
        labelFormatter: TimeAxisLabelFormatterOption
    ): string {
        const isUTC = this.getSetting('useUTC');
        return timeUtil.leveledFormat(tick, idx, labelFormatter, isUTC);
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
            level: -1 // TODO:
        });

        const useUTC = this.getSetting('useUTC');

        const unitLen = scaleIntervals.length;
        const idx = bisect(scaleIntervals, this._interval, 0, unitLen);
        const intervals = scaleIntervals[Math.min(idx, unitLen - 1)];

        const innerTicks = getIntervalTicks(
            intervals[0] as timeUtil.PrimaryTimeUnit,
            this._approxInterval,
            useUTC,
            extent
        );

        ticks = ticks.concat(innerTicks);

        ticks.push({
            value: extent[1],
            level: -1
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
        const idx = bisect(scaleIntervals, this._approxInterval, 0, scaleIntervalsLen);

        const intervals = scaleIntervals[Math.min(idx, scaleIntervalsLen - 1)];
        let interval = intervals[1];

        // Interval will be used in getTicks
        this._interval = interval;
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
const scaleIntervals: [timeUtil.TimeUnit, number][] = [
    // Format                           interval
    ['second', ONE_SECOND],             // 1s
    ['minute', ONE_MINUTE],             // 1m
    ['hour', ONE_HOUR],                 // 1h
    ['half-day', ONE_HOUR * 12],        // 12h
    ['day', ONE_DAY * 1.2],             // 1d
    ['week', ONE_DAY * 7],              // 7d
    ['month', ONE_DAY * 31],            // 1M
    ['quarter', ONE_DAY * 95],          // 3M
    ['half-year', ONE_YEAR / 2],        // 6M
    ['year', ONE_YEAR]                  // 1Y
];

function isUnitValueSame(
    unit: timeUtil.PrimaryTimeUnit,
    valueA: number,
    valueB: number,
    isUTC: boolean
): boolean {
    const dateA = numberUtil.parseDate(valueA) as any;
    const dateB = numberUtil.parseDate(valueB) as any;

    const isSame = (unit: timeUtil.PrimaryTimeUnit) => {
        return timeUtil.getUnitValue(dateA, unit, isUTC)
            === timeUtil.getUnitValue(dateB, unit, isUTC);
    };
    const isSameYear = () => isSame('year');
    const isSameHalfYear = () => isSameYear() && isSame('half-year');
    const isSameQuater = () => isSameYear() && isSame('quarter');
    const isSameMonth = () => isSameYear() && isSame('month');
    const isSameDay = () => isSameMonth() && isSame('day');
    const isSameHalfDay = () => isSameDay && isSame('half-day');
    const isSameHour = () => isSameDay() && isSame('hour');
    const isSameMinute = () => isSameHour() && isSame('minute');
    const isSameSecond = () => isSameMinute() && isSame('second');
    const isSameMilliSecond = () => isSameSecond() && isSame('millisecond');

    switch (unit) {
        case 'year':
            return isSameYear();
        case 'half-year':
            return isSameHalfYear();
        case 'quarter':
            return isSameQuater();
        case 'month':
            return isSameMonth();
        case 'day':
            return isSameDay();
        case 'half-day':
            return isSameHalfDay();
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
    unitName: timeUtil.TimeUnit,
    approxInterval: number,
    isUTC: boolean,
    extent: number[]
): TimeScaleTick[] {
    const utc = isUTC ? 'UTC' : '';
    const ticks: TimeScaleTick[] = [];
    const unitNames = timeUtil.timeUnits;
    for (let i = 0, levelId = 0; i < unitNames.length; ++i) {
        let date = new Date(extent[0]) as any;

        if (unitNames[i] === 'week') {
            date['set' + utc + 'Hours'](0);
            date['set' + utc + 'Minutes'](0);
            date['set' + utc + 'Seconds'](0);
            date['set' + utc + 'Milliseconds'](0);

            if (extent[0] === date.getTime()) {
                ticks.push({
                    value: extent[0],
                    level: levelId
                });
            }

            let isDateWithinExtent = true;
            while (isDateWithinExtent) {
                const dates = date['get' + utc + 'Month']() + 1 === 2
                    ? [8, 15, 22]
                    : [8, 16, 24];
                for (let d = 0; d < dates.length; ++d) {
                    date['set' + utc + 'Date'](dates[d]);
                    const dateTime = (date as Date).getTime();
                    if (dateTime > extent[1]) {
                        isDateWithinExtent = false;
                        break;
                    }
                    else if (dateTime >= extent[0]) {
                        ticks.push({
                            value: dateTime,
                            level: levelId
                        });
                    }
                }
                date['set' + utc + 'Month'](date['get' + utc + 'Month']() + 1);
            }
        }
        else if (!isUnitValueSame(
            unitNames[i] as timeUtil.PrimaryTimeUnit,
            extent[0], extent[1], isUTC
        )) {
            // Level value changes within extent
            let isFirst = true;
            while (true) {
                switch (unitNames[i] as timeUtil.PrimaryTimeUnit) {
                    case 'year':
                    case 'half-year':
                    case 'quarter':
                        if (isFirst) {
                            date['set' + utc + 'Month'](0);
                            date['set' + utc + 'Date'](1);
                            date['set' + utc + 'Hours'](0);
                            date['set' + utc + 'Minutes'](0);
                            date['set' + utc + 'Seconds'](0);
                        }
                        else {
                            const months = unitNames[i] === 'year'
                                ? 12 : (unitNames[i] === 'half-year' ? 6 : 3);
                            if (date['get' + utc + 'Month']() + 1 + months < 12) {
                                date['set' + utc + 'Month'](date['get' + utc + 'Month']() + months);
                            }
                            else {
                                const yearSpan = Math.max(1, Math.round(approxInterval / ONE_DAY / 365));
                                date['set' + utc + 'FullYear'](date['get' + utc + 'FullYear']() + yearSpan);
                                if (date.getTime() > extent[1] && yearSpan > 1) {
                                    // For the last data
                                    date['set' + utc + 'FullYear'](date['get' + utc + 'FullYear']() - yearSpan + 1);
                                    if (date.getTime() < extent[1]) {
                                        // The last data is not in year unit, make it invalid by larger than extent[1]
                                        date['set' + utc + 'FullYear'](date['get' + utc + 'FullYear']() + yearSpan);
                                    }
                                }
                            }
                        }
                        break;

                    case 'month':
                        if (isFirst) {
                            date['set' + utc + 'Date'](1);
                            date['set' + utc + 'Hours'](0);
                            date['set' + utc + 'Minutes'](0);
                            date['set' + utc + 'Seconds'](0);
                        }
                        else {
                            date['set' + utc + 'Month'](date['get' + utc + 'Month']() + 1);
                        }
                        break;

                    case 'day':
                    case 'half-day':
                        if (isFirst) {
                            date['set' + utc + 'Hours'](0);
                            date['set' + utc + 'Minutes'](0);
                            date['set' + utc + 'Seconds'](0);
                        }
                        else if (unitNames[i] === 'half-day') {
                            date['set' + utc + 'Hours'](date['get' + utc + 'Hours']() + 12);
                        }
                        else {
                            date['set' + utc + 'Date'](date['get' + utc + 'Date']() + 1);
                        }
                        break;

                    case 'hour':
                        if (isFirst) {
                            date['set' + utc + 'Minutes'](0);
                            date['set' + utc + 'Seconds'](0);
                        }
                        else {
                            date['set' + utc + 'Hours'](date['get' + utc + 'Hours']() + 1);
                        }
                        break;

                    case 'minute':
                        if (isFirst) {
                            date['set' + utc + 'Minutes'](0);
                            date['set' + utc + 'Seconds'](0);
                        }
                        else {
                            date['set' + utc + 'Minutes'](date['get' + utc + 'Minutes']() + 1);
                        }
                        break;

                    case 'second':
                        if (!isFirst) {
                            date['set' + utc + 'Seconds'](date['get' + utc + 'Seconds']() + 1);
                        }
                        break;
                }
                date['set' + utc + 'Milliseconds'](0);

                const dateValue = (date as Date).getTime();
                if (dateValue >= extent[0] && dateValue <= extent[1]) {
                    ticks.push({
                        value: dateValue,
                        level: levelId
                    });
                }
                else if (dateValue > extent[1]) {
                    break;
                }
                isFirst = false;
            }
            ++levelId;
        }

        if (unitNames[i] === unitName) {
            break;
        }
    }

    ticks.sort((a, b) => a.value - b.value);
    if (ticks.length <= 1) {
        return ticks;
    }

    // Remove duplicates
    const result = ticks.length ? [ticks[0]] : [];
    for (let i = 1; i < ticks.length; ++i) {
        if (ticks[i] !== ticks[i - 1]) {
            result.push(ticks[i]);
        }
    }
    return result;
}


Scale.registerClass(TimeScale);

export default TimeScale;
