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
* A third-party license is embedded for some of the code in this file:
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
// local time by default. option.useUTC is false by default. This design has
// considered these common cases:
// (1) Time that is persistent in server is in UTC, but it is needed to be displayed
// in local time by default.
// (2) By default, the input data string (e.g., '2011-01-02') should be displayed
// as its original time, without any time difference.

import * as numberUtil from '../util/number';
import {
    ONE_SECOND,
    ONE_MINUTE,
    ONE_HOUR,
    ONE_DAY,
    format,
    leveledFormat,
    PrimaryTimeUnit,
    TimeUnit,
    getUnitValue,
    timeUnits,
    fullLeveledFormatter,
    getPrimaryTimeUnit,
    isPrimaryTimeUnit,
    getDefaultFormatPrecisionOfInterval,
    fullYearGetterName,
    monthSetterName,
    fullYearSetterName,
    dateSetterName,
    hoursGetterName,
    hoursSetterName,
    minutesSetterName,
    secondsSetterName,
    millisecondsSetterName,
    monthGetterName,
    dateGetterName,
    minutesGetterName,
    secondsGetterName,
    millisecondsGetterName,
    scaleIntervals,
    getIndexByInterval,
    getUnitByInterval,
    ONE_LEAP_YEAR,
    ONE_MONTH
} from '../util/time';
import * as scaleHelper from './helper';
import IntervalScale, { SPLIT_NUMBER_DEFAULT } from './Interval';
import Scale from './Scale';
import {TimeScaleTick, ScaleTick} from '../util/types';
import {TimeAxisLabelFormatterOption} from '../coord/axisCommonTypes';
import { warn } from '../util/log';
import { LocaleOption } from '../core/locale';
import Model from '../model/Model';
import { filter, isNumber, map } from 'zrender/src/core/util';

const roundNumber = numberUtil.round;

// FIXME 公用？
export const bisect = function (
    a: [string | number, number][],
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

type TimeScaleSetting = {
    locale: Model<LocaleOption>;
    useUTC: boolean;
};

class TimeScale extends IntervalScale<TimeScaleSetting> {

    static type = 'time';
    readonly type = 'time';

    _approxInterval: number;

    _minLevelUnit: TimeUnit;

    constructor(settings?: TimeScaleSetting) {
        super(settings);
    }

    /**
     * Get label is mainly for other components like dataZoom, tooltip.
     */
    getLabel(tick: TimeScaleTick): string {
        const useUTC = this.getSetting('useUTC');
        return format(
            tick.value,
            fullLeveledFormatter[
                getDefaultFormatPrecisionOfInterval(getPrimaryTimeUnit(this._minLevelUnit))
            ] || fullLeveledFormatter.second,
            useUTC,
            this.getSetting('locale')
        );
    }

    getFormattedLabel(
        tick: TimeScaleTick,
        idx: number,
        labelFormatter: TimeAxisLabelFormatterOption
    ): string {
        const isUTC = this.getSetting('useUTC');
        const lang = this.getSetting('locale');
        return leveledFormat(tick, idx, labelFormatter, lang, isUTC);
    }

    /**
     * @override
     */
    // onlyMaxLevel is used in minor ticks for filtering
    getTicks(expandToNicedExtent?: boolean, onlyMaxLevel?: boolean): TimeScaleTick[] {
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
            this._minLevelUnit,
            this._approxInterval,
            this._isIntervalCustom ? interval : null,
            useUTC,
            extent,
            onlyMaxLevel
        );

        ticks = ticks.concat(innerTicks);

        ticks.push({
            value: extent[1],
            level: 0
        });

        return ticks;
    }

    getMinorTicks(): number[][] {
        const ticks = this.getTicks(true, true);
        const minorTicks = [];
        const extent = this.getExtent();

        for (let i = 1; i < ticks.length; i++) {
            const nextTick = ticks[i];
            const prevTick = ticks[i - 1];
            let count = 0;
            const minorTicksGroup = [];
            const interval = nextTick.value - prevTick.value;
            const minorSplits = this.getMinorSplits(interval);
            const splitNumber = minorSplits > 10 ? Math.ceil(minorSplits / 2) : minorSplits; // reduce too many splits
            const minorInterval = interval / splitNumber;
            const unit = getUnitByInterval(this._interval);
            const currentUnit = getUnitByInterval(interval);

            if (getPrimaryTimeUnit(currentUnit) !== getPrimaryTimeUnit(unit)) {
                continue;
            }

            while (count < splitNumber - 1) {
                const minorTick = roundNumber(prevTick.value + (count + 1) * minorInterval);

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

    getMinorSplits(interval: number): number {
        if (interval <= 0) {
            return 0;
        }
        const unit = getUnitByInterval(interval);
        const unitMap: Partial<Record<TimeUnit, number>> = {
            'second': ONE_SECOND,
            'minute': ONE_MINUTE,
            'hour': ONE_HOUR,
            'half-day': ONE_HOUR,
            'quarter-day': ONE_HOUR,
            'day': ONE_DAY,
            'half-week': ONE_DAY,
            'week': ONE_DAY,
            'month': ONE_DAY,
            'quarter': ONE_MONTH,
            'half-year': ONE_MONTH,
            'year': ONE_LEAP_YEAR
        };
        const getSplit = (period: number) => Math.ceil(interval / period);

        return unit in unitMap ? getSplit(unitMap[unit]) : SPLIT_NUMBER_DEFAULT;
    }

    calcNiceExtent(
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

        this.calcNiceTicks(opt.splitNumber, opt.minInterval, opt.maxInterval);
    }

    calcNiceTicks(approxTickNum: number, minInterval: number, maxInterval: number): void {
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

        const idx = getIndexByInterval(this._approxInterval);

        // Interval that can be used to calculate ticks
        this._interval = scaleIntervals[idx][1];
        // Min level used when picking ticks from top down.
        // We check one more level to avoid the ticks are to sparse in some case.
        this._minLevelUnit = scaleIntervals[Math.max(idx - 1, 0)][0];
    }

    parse(val: number | string | Date): number {
        // val might be float.
        return isNumber(val) ? val : +numberUtil.parseDate(val);
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

// const primaryUnitGetters = {
//     year: fullYearGetterName(),
//     month: monthGetterName(),
//     day: dateGetterName(),
//     hour: hoursGetterName(),
//     minute: minutesGetterName(),
//     second: secondsGetterName(),
//     millisecond: millisecondsGetterName()
// };

// const primaryUnitUTCGetters = {
//     year: fullYearGetterName(true),
//     month: monthGetterName(true),
//     day: dateGetterName(true),
//     hour: hoursGetterName(true),
//     minute: minutesGetterName(true),
//     second: secondsGetterName(true),
//     millisecond: millisecondsGetterName(true)
// };

// function moveTick(date: Date, unitName: TimeUnit, step: number, isUTC: boolean) {
//     step = step || 1;
//     switch (getPrimaryTimeUnit(unitName)) {
//         case 'year':
//             date[fullYearSetterName(isUTC)](date[fullYearGetterName(isUTC)]() + step);
//             break;
//         case 'month':
//             date[monthSetterName(isUTC)](date[monthGetterName(isUTC)]() + step);
//             break;
//         case 'day':
//             date[dateSetterName(isUTC)](date[dateGetterName(isUTC)]() + step);
//             break;
//         case 'hour':
//             date[hoursSetterName(isUTC)](date[hoursGetterName(isUTC)]() + step);
//             break;
//         case 'minute':
//             date[minutesSetterName(isUTC)](date[minutesGetterName(isUTC)]() + step);
//             break;
//         case 'second':
//             date[secondsSetterName(isUTC)](date[secondsGetterName(isUTC)]() + step);
//             break;
//         case 'millisecond':
//             date[millisecondsSetterName(isUTC)](date[millisecondsGetterName(isUTC)]() + step);
//             break;
//     }
//     return date.getTime();
// }

// const DATE_INTERVALS = [[8, 7.5], [4, 3.5], [2, 1.5]];
// const MONTH_INTERVALS = [[6, 5.5], [3, 2.5], [2, 1.5]];
// const MINUTES_SECONDS_INTERVALS = [[30, 30], [20, 20], [15, 15], [10, 10], [5, 5], [2, 2]];

function getDateInterval(approxInterval: number, daysInMonth: number) {
    approxInterval /= ONE_DAY;
    return approxInterval > 16 ? 16
                // Math.floor(daysInMonth / 2) + 1  // In this case we only want one tick between two months.
            : approxInterval > 7.5 ? 7  // TODO week 7 or day 8?
            : approxInterval > 3.5 ? 4
            : approxInterval > 1.5 ? 2 : 1;
}

function getMonthInterval(approxInterval: number) {
    const APPROX_ONE_MONTH = 30 * ONE_DAY;
    approxInterval /= APPROX_ONE_MONTH;
    return approxInterval > 6 ? 6
            : approxInterval > 3 ? 3
            : approxInterval > 2 ? 2 : 1;
}

function getHourInterval(approxInterval: number) {
    approxInterval /= ONE_HOUR;
    return approxInterval > 12 ? 12
            : approxInterval > 6 ? 6
            : approxInterval > 3.5 ? 4
            : approxInterval > 2 ? 2 : 1;
}

function getMinutesAndSecondsInterval(approxInterval: number, isMinutes?: boolean) {
    approxInterval /= isMinutes ? ONE_MINUTE : ONE_SECOND;
    return approxInterval > 30 ? 30
            : approxInterval > 20 ? 20
            : approxInterval > 15 ? 15
            : approxInterval > 10 ? 10
            : approxInterval > 5 ? 5
            : approxInterval > 2 ? 2 : 1;
}

function getMillisecondsInterval(approxInterval: number) {
    return numberUtil.nice(approxInterval, true);
}

function getFirstTimestampOfUnit(date: Date, unitName: TimeUnit, isUTC: boolean) {
    const outDate = new Date(date);
    switch (getPrimaryTimeUnit(unitName)) {
        case 'year':
        case 'month':
            outDate[monthSetterName(isUTC)](0);
        case 'day':
            outDate[dateSetterName(isUTC)](1);
        case 'hour':
            outDate[hoursSetterName(isUTC)](0);
        case 'minute':
            outDate[minutesSetterName(isUTC)](0);
        case 'second':
            outDate[secondsSetterName(isUTC)](0);
            outDate[millisecondsSetterName(isUTC)](0);
    }
    return outDate.getTime();
}

function getIntervalTicks(
    bottomUnitName: TimeUnit,
    approxInterval: number,
    customInterval: number | null,
    isUTC: boolean,
    extent: number[],
    onlyMaxLevel: boolean
): TimeScaleTick[] {
    const safeLimit = 10000;
    const unitNames = timeUnits;
    // const bottomPrimaryUnitName = getPrimaryTimeUnit(bottomUnitName);

    interface InnerTimeTick extends TimeScaleTick {
        // The notAdd field has been replaced with startDate so that the countdown does not start over with
        // the start of a new higher level unit
        // notAdd?: boolean;
        startDate?: boolean;
    }

    let iter = 0;

    function addTicksInSpan(
        interval: number,
        minTimestamp: number, maxTimestamp: number,
        getMethodName: string,
        setMethodName: string,
        isDate: boolean,
        out: InnerTimeTick[]
    ) {
        const date = new Date(minTimestamp) as any;
        let dateTime = minTimestamp;
        let d = date[getMethodName]();

        // if (isDate) {
        //     d -= 1; // Starts with 0;   PENDING
        // }

        while (dateTime < maxTimestamp && dateTime <= extent[1]) {
            out.push({
                value: dateTime
            });

            d += interval;
            date[setMethodName](d);
            dateTime = date.getTime();
        }

        // This extra tick is for calcuating ticks of next level. Will not been added to the final result
        out.push({
            value: dateTime,
            // The notAdd field has been replaced with startDate so that the countdown does not start over with
            // the start of a new higher level unit
            // notAdd: true,
            startDate: true
        });
    }

    function getCustomInterval(divisor: number = 1) {
        return customInterval ? customInterval / divisor : null;
    }

    function addLevelTicks(
        unitName: TimeUnit,
        lastLevelTicks: InnerTimeTick[],
        levelTicks: InnerTimeTick[]
    ) {
        const newAddedTicks: ScaleTick[] = [];
        const isFirstLevel = !lastLevelTicks.length;

        if (isUnitValueSame(getPrimaryTimeUnit(unitName), extent[0], extent[1], isUTC)) {
            return;
        }

        if (isFirstLevel) {
            lastLevelTicks = [{
                // TODO Optimize. Not include so may ticks.
                value: getFirstTimestampOfUnit(new Date(extent[0]), unitName, isUTC)
            }, {
                value: extent[1]
            }];
        }

        for (let i = 0; i < lastLevelTicks.length - 1; i++) {
            const startTick = lastLevelTicks[i].value;
            const endTick = lastLevelTicks[i + 1].value > extent[1] ? extent[1] : lastLevelTicks[i + 1].value;
            if (startTick === endTick) {
                continue;
            }
            let interval: number;
            let getterName;
            let setterName;
            let isDate = false;

            switch (unitName) {
                case 'year':
                    interval = Math.max(1, Math.round(approxInterval / ONE_DAY / 365));
                    getterName = fullYearGetterName(isUTC);
                    setterName = fullYearSetterName(isUTC);
                    break;
                case 'half-year':
                case 'quarter':
                case 'month':
                    interval = getCustomInterval(30 * ONE_DAY) ?? getMonthInterval(approxInterval);
                    getterName = monthGetterName(isUTC);
                    setterName = monthSetterName(isUTC);
                    break;
                case 'week':    // PENDING If week is added. Ignore day.
                case 'half-week':
                case 'day':
                    interval = getCustomInterval(ONE_DAY) ?? getDateInterval(approxInterval, 31); // Use 32 days and let interval been 16
                    getterName = dateGetterName(isUTC);
                    setterName = dateSetterName(isUTC);
                    isDate = true;
                    break;
                case 'half-day':
                case 'quarter-day':
                case 'hour':
                    interval = getCustomInterval(ONE_HOUR) ?? getHourInterval(approxInterval);
                    getterName = hoursGetterName(isUTC);
                    setterName = hoursSetterName(isUTC);
                    break;
                case 'minute':
                    interval = getCustomInterval(ONE_MINUTE) ?? getMinutesAndSecondsInterval(approxInterval, true);
                    getterName = minutesGetterName(isUTC);
                    setterName = minutesSetterName(isUTC);
                    break;
                case 'second':
                    interval = getCustomInterval(ONE_SECOND) ?? getMinutesAndSecondsInterval(approxInterval, false);
                    getterName = secondsGetterName(isUTC);
                    setterName = secondsSetterName(isUTC);
                    break;
                case 'millisecond':
                    interval = getCustomInterval() ?? getMillisecondsInterval(approxInterval);
                    getterName = millisecondsGetterName(isUTC);
                    setterName = millisecondsSetterName(isUTC);
                    break;
            }

            const noAddedTicks = newAddedTicks
                .filter((tick) => tick.startDate === true)
                .map(tick => tick.value);
            const newStartTick = noAddedTicks.slice(-1)?.[0] ?? startTick;

            addTicksInSpan(
                interval, newStartTick, endTick, getterName, setterName, isDate, newAddedTicks
            );

            if (unitName === 'year' && levelTicks.length > 1 && i === 0) {
                // Add nearest years to the left extent.
                levelTicks.unshift({
                    value: levelTicks[0].value - interval
                });
            }
        }

        for (let i = 0; i < newAddedTicks.length; i++) {
            levelTicks.push(newAddedTicks[i]);
        }
        // newAddedTicks.length && console.log(unitName, newAddedTicks);
        return newAddedTicks;
    }

    const levelsTicks: InnerTimeTick[][] = [];
    let currentLevelTicks: InnerTimeTick[] = [];

    let tickCount = 0;
    let lastLevelTickCount = 0;
    for (let i = 0; i < unitNames.length && iter++ < safeLimit; ++i) {
        const primaryTimeUnit = getPrimaryTimeUnit(unitNames[i]);
        if (!isPrimaryTimeUnit(unitNames[i])) { // TODO
            continue;
        }
        addLevelTicks(unitNames[i], levelsTicks[levelsTicks.length - 1] || [], currentLevelTicks);

        const nextPrimaryTimeUnit: PrimaryTimeUnit = unitNames[i + 1] ? getPrimaryTimeUnit(unitNames[i + 1]) : null;
        if (primaryTimeUnit !== nextPrimaryTimeUnit) {
            if (currentLevelTicks.length) {
                lastLevelTickCount = tickCount;
                // Remove the duplicate so the tick count can be precisely.
                currentLevelTicks.sort((a, b) => a.value - b.value);
                const levelTicksRemoveDuplicated = [];
                for (let i = 0; i < currentLevelTicks.length; ++i) {
                    const tickValue = currentLevelTicks[i].value;
                    if (i === 0 || currentLevelTicks[i - 1].value !== tickValue) {
                        levelTicksRemoveDuplicated.push(currentLevelTicks[i]);
                        if (tickValue >= extent[0] && tickValue <= extent[1]) {
                            tickCount++;
                        }
                    }
                }

                const targetTickNum = (extent[1] - extent[0]) / approxInterval;
                // Added too much in this level and not too less in last level
                if (tickCount > targetTickNum * 1.5 && lastLevelTickCount > targetTickNum / 1.5) {
                    break;
                }

                // Only treat primary time unit as one level.
                levelsTicks.push(levelTicksRemoveDuplicated);

                if (tickCount > targetTickNum || bottomUnitName === unitNames[i]) {
                    break;
                }

            }
            // Reset if next unitName is primary
            currentLevelTicks = [];
        }

    }

    if (__DEV__) {
        if (iter >= safeLimit) {
            warn('Exceed safe limit.');
        }
    }

    const levelsTicksInExtent = filter(map(levelsTicks, levelTicks => {
        return filter(levelTicks, tick => tick.value >= extent[0] && tick.value <= extent[1]);
    }), levelTicks => levelTicks.length > 0);

    let ticks: TimeScaleTick[] = [];
    const maxLevel = levelsTicksInExtent.length - 1;
    if (onlyMaxLevel) {
        const levelTicks = levelsTicksInExtent[maxLevel];
        ticks = getLevelTicks(levelTicks);
    }
    else {
        for (let i = 0; i < levelsTicksInExtent.length; ++i) {
            const levelTicks = levelsTicksInExtent[i];
            ticks.push(...getLevelTicks(levelTicks, i));
        }
    }

    function getLevelTicks(levelTicks: InnerTimeTick[], level: number = 0): TimeScaleTick[] {
        const ticks: TimeScaleTick[] = [];

        for (let k = 0; k < levelTicks.length; ++k) {
            ticks.push({
                value: levelTicks[k].value,
                level: maxLevel - level
            });
        }

        return ticks;
    }

    ticks.sort((a, b) => a.value - b.value);
    // Remove duplicates
    const result: TimeScaleTick[] = [];
    for (let i = 0; i < ticks.length; ++i) {
        if (i === 0 || ticks[i].value !== ticks[i - 1].value) {
            result.push(ticks[i]);
        }
    }

    return result;
}


Scale.registerClass(TimeScale);

export default TimeScale;
