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
    ONE_YEAR,
    format,
    leveledFormat,
    PrimaryTimeUnit,
    TimeUnit,
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
    JSDateGetterNames,
    JSDateSetterNames,
    getUnitFromValue,
    primaryTimeUnits,
    roundTime,
    getZonedParts,
    zonedPartsToUtcMs,
    addZonedParts,
    ZonedParts
} from '../util/time';
import * as scaleHelper from './helper';
import IntervalScale from './Interval';
import Scale, { ScaleGetTicksOpt } from './Scale';
import {TimeScaleTick, ScaleTick, AxisBreakOption, NullUndefined} from '../util/types';
import {TimeAxisLabelFormatterParsed} from '../coord/axisCommonTypes';
import { warn } from '../util/log';
import { LocaleOption } from '../core/locale';
import Model from '../model/Model';
import { each, filter, indexOf, isNumber, map } from 'zrender/src/core/util';
import { ScaleBreakContext, getScaleBreakHelper } from './break';

// FIXME 公用？
const bisect = function (
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
    timezone?: string; // IANA timezone (e.g. "Europe/London")
    modelAxisBreaks?: AxisBreakOption[];
};

class TimeScale extends IntervalScale<TimeScaleSetting> {

    static type = 'time';
    readonly type = 'time';

    private _approxInterval: number;

    private _minLevelUnit: TimeUnit;

    constructor(settings?: TimeScaleSetting) {
        super(settings);
    }

    /**
     * Get label is mainly for other components like dataZoom, tooltip.
     */
    getLabel(tick: TimeScaleTick): string {
        const useUTC = this.getSetting('useUTC');
        const timeZone = this.getSetting('timezone');
        return format(
            tick.value,
            fullLeveledFormatter[
                getDefaultFormatPrecisionOfInterval(getPrimaryTimeUnit(this._minLevelUnit))
            ] || fullLeveledFormatter.second,
            useUTC,
            this.getSetting('locale'),
            timeZone
        );
    }

    getFormattedLabel(
        tick: ScaleTick,
        idx: number,
        labelFormatter: TimeAxisLabelFormatterParsed
    ): string {
        const isUTC = this.getSetting('useUTC');
        const lang = this.getSetting('locale');
        const timeZone = this.getSetting('timezone');
        return leveledFormat(tick, idx, labelFormatter, lang, isUTC, timeZone);
    }

    /**
     * @override
     */
    getTicks(opt?: ScaleGetTicksOpt): TimeScaleTick[] {
        opt = opt || {};

        const interval = this._interval;
        const extent = this._extent;
        const scaleBreakHelper = getScaleBreakHelper();

        let ticks = [] as TimeScaleTick[];
        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        const useUTC = this.getSetting('useUTC');
        const timeZone = this.getSetting('timezone');

        if (scaleBreakHelper && opt.breakTicks === 'only_break') {
            getScaleBreakHelper().addBreaksToTicks(ticks, this._brkCtx!.breaks, this._extent);
            return ticks;
        }

        const extent0Unit = getUnitFromValue(extent[1], useUTC, timeZone);
        ticks.push({
            value: extent[0],
            time: {
                level: 0,
                upperTimeUnit: extent0Unit,
                lowerTimeUnit: extent0Unit,
            }
        });

        const innerTicks = getIntervalTicks(
            this._minLevelUnit,
            this._approxInterval,
            useUTC,
            extent,
            this._getExtentSpanWithBreaks(),
            this._brkCtx,
            timeZone
        );

        ticks = ticks.concat(innerTicks);

        const extent1Unit = getUnitFromValue(extent[1], useUTC, timeZone);
        ticks.push({
            value: extent[1],
            time: {
                level: 0,
                upperTimeUnit: extent1Unit,
                lowerTimeUnit: extent1Unit,
            }
        });

        const isUTC = this.getSetting('useUTC');
        let upperUnitIndex = primaryTimeUnits.length - 1;
        let maxLevel = 0;
        each(ticks, tick => {
            if (tick.time) {
                upperUnitIndex = Math.min(upperUnitIndex, indexOf(primaryTimeUnits, tick.time.upperTimeUnit));
                maxLevel = Math.max(maxLevel, tick.time.level);
            }
        });

        if (scaleBreakHelper) {
            getScaleBreakHelper().pruneTicksByBreak(
                opt.pruneByBreak,
                ticks,
                this._brkCtx!.breaks,
                item => item.value,
                this._approxInterval,
                this._extent
            );
        }
        if (scaleBreakHelper && opt.breakTicks !== 'none') {
            getScaleBreakHelper().addBreaksToTicks(ticks, this._brkCtx!.breaks, this._extent, trimmedBrk => {
                // @see `parseTimeAxisLabelFormatterDictionary`.
                const lowerBrkUnitIndex = Math.max(
                    indexOf(primaryTimeUnits, getUnitFromValue(trimmedBrk.vmin, isUTC, timeZone)),
                    indexOf(primaryTimeUnits, getUnitFromValue(trimmedBrk.vmax, isUTC, timeZone)),
                );
                let upperBrkUnitIndex = 0;
                for (let unitIdx = 0; unitIdx < primaryTimeUnits.length; unitIdx++) {
                    if (!isPrimaryUnitValueAndGreaterSame(
                        primaryTimeUnits[unitIdx], trimmedBrk.vmin, trimmedBrk.vmax, isUTC, timeZone
                    )) {
                        upperBrkUnitIndex = unitIdx;
                        break;
                    }
                }
                const upperIdx = Math.min(upperBrkUnitIndex, upperUnitIndex);
                const lowerIdx = Math.max(upperIdx, lowerBrkUnitIndex);
                return {
                    level: maxLevel,
                    lowerTimeUnit: primaryTimeUnits[lowerIdx],
                    upperTimeUnit: primaryTimeUnits[upperIdx],
                };
            });
        }

        return ticks;
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
        const extent = this.getExtent();
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
        this._innerSetExtent(extent[0], extent[1]);

        this.calcNiceTicks(opt.splitNumber, opt.minInterval, opt.maxInterval);
    }

    calcNiceTicks(approxTickNum: number, minInterval: number, maxInterval: number): void {
        approxTickNum = approxTickNum || 10;

        const span = this._getExtentSpanWithBreaks();
        this._approxInterval = span / approxTickNum;

        if (minInterval != null && this._approxInterval < minInterval) {
            this._approxInterval = minInterval;
        }
        if (maxInterval != null && this._approxInterval > maxInterval) {
            this._approxInterval = maxInterval;
        }

        const scaleIntervalsLen = scaleIntervals.length;
        const idx = Math.min(
            bisect(scaleIntervals, this._approxInterval, 0, scaleIntervalsLen),
            scaleIntervalsLen - 1
        );

        // Interval that can be used to calculate ticks
        this._interval = scaleIntervals[idx][1];
        this._intervalPrecision = scaleHelper.getIntervalPrecision(this._interval);
        // Min level used when picking ticks from top down.
        // We check one more level to avoid the ticks are to sparse in some case.
        this._minLevelUnit = scaleIntervals[Math.max(idx - 1, 0)][0];
    }

    parse(val: number | string | Date): number {
        // val might be float.
        return isNumber(val) ? val : +numberUtil.parseDate(val);
    }

    contain(val: number): boolean {
        return scaleHelper.contain(val, this._extent);
    }

    normalize(val: number): number {
        return this._calculator.normalize(val, this._extent);
    }

    scale(val: number): number {
        return this._calculator.scale(val, this._extent);
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

function isPrimaryUnitValueAndGreaterSame(
    unit: PrimaryTimeUnit,
    valueA: number,
    valueB: number,
    isUTC: boolean,
    timeZone?: string
): boolean {
    return roundTime(new Date(valueA), unit, isUTC, timeZone).getTime()
        === roundTime(new Date(valueB), unit, isUTC, timeZone).getTime();
}

function getDateInterval(approxInterval: number, daysInMonth: number) {
    approxInterval /= ONE_DAY;
    return approxInterval > 16 ? 16
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

// e.g., if the input unit is 'day', start calculate ticks from the first day of
// that month to make ticks "nice".
function getFirstTimestampOfUnit(timestamp: number, unitName: TimeUnit, isUTC: boolean, timeZone?: string) {
    const upperUnitIdx = Math.max(0, indexOf(primaryTimeUnits, unitName) - 1);
    return roundTime(new Date(timestamp), primaryTimeUnits[upperUnitIdx], isUTC, timeZone).getTime();
}

function createEstimateNiceMultiple(
    setMethodName: JSDateSetterNames,
    dateMethodInterval: number,
) {
    const tmpDate = new Date(0);
    tmpDate[setMethodName](1);
    const tmpTime = tmpDate.getTime();
    tmpDate[setMethodName](1 + dateMethodInterval);
    const approxTimeInterval = tmpDate.getTime() - tmpTime;

    return (tickVal: number, targetValue: number) => {
        // Only in month that accurate result can not get by division of
        // timestamp interval, but no need accurate here.
        return Math.max(
            0,
            Math.round((targetValue - tickVal) / approxTimeInterval)
        );
    };
}

function getIntervalTicks(
    bottomUnitName: TimeUnit,
    approxInterval: number,
    isUTC: boolean,
    extent: number[],
    extentSpanWithBreaks: number,
    brkCtx: ScaleBreakContext | NullUndefined,
    timeZone?: string
): TimeScaleTick[] {
    const safeLimit = 10000;
    const unitNames = timeUnits;

    interface InnerTimeTick {
        value: TimeScaleTick['value']
        notAdd?: boolean
    }

    let iter = 0;

    function stepInTimeZone(dateTime: number, unitName: TimeUnit, interval: number): number {
        // Step by *wall clock* in the specified timezone.
        const p = getZonedParts(timeZone!, dateTime);

        let nextParts: ZonedParts;
        switch (getPrimaryTimeUnit(unitName)) {
            case 'year':
                nextParts = addZonedParts(p, { year: interval });
                break;
            case 'month':
                nextParts = addZonedParts(p, { month: interval });
                break;
            case 'day':
                nextParts = addZonedParts(p, { day: interval });
                break;
            case 'hour':
                nextParts = addZonedParts(p, { hour: interval });
                break;
            case 'minute':
                nextParts = addZonedParts(p, { minute: interval });
                break;
            case 'second':
                nextParts = addZonedParts(p, { second: interval });
                break;
            case 'millisecond':
                nextParts = addZonedParts(p, { millisecond: interval });
                break;
        }
        return zonedPartsToUtcMs(timeZone!, nextParts);
    }

    function addTicksInSpan(
        interval: number,
        minTimestamp: number,
        maxTimestamp: number,
        getMethodName: JSDateGetterNames,
        setMethodName: JSDateSetterNames,
        isDate: boolean,
        out: InnerTimeTick[],
        unitName: TimeUnit
    ) {
        const estimateNiceMultiple = timeZone
            ? (tickVal: number, targetValue: number) => {
                const next = stepInTimeZone(tickVal, unitName, interval);
                const stepMs = Math.max(1, next - tickVal);
                return Math.max(0, Math.round((targetValue - tickVal) / stepMs));
            }
            : createEstimateNiceMultiple(setMethodName, interval);

        let dateTime = minTimestamp;
        const date = new Date(dateTime);

        while (dateTime < maxTimestamp && dateTime <= extent[1]) {
            out.push({ value: dateTime });

            if (iter++ > safeLimit) {
                if (__DEV__) {
                    warn('Exceed safe limit in time scale.');
                }
                break;
            }

            if (timeZone) {
                dateTime = stepInTimeZone(dateTime, unitName, interval);

                if (brkCtx) {
                    const moreMultiple = brkCtx.calcNiceTickMultiple(dateTime, estimateNiceMultiple);
                    if (moreMultiple > 0) {
                        dateTime = stepInTimeZone(dateTime, unitName, moreMultiple * interval);
                    }
                }
            }
            else {
                date[setMethodName](date[getMethodName]() + interval);
                dateTime = date.getTime();

                if (brkCtx) {
                    const moreMultiple = brkCtx.calcNiceTickMultiple(dateTime, estimateNiceMultiple);
                    if (moreMultiple > 0) {
                        date[setMethodName](date[getMethodName]() + moreMultiple * interval);
                        dateTime = date.getTime();
                    }
                }
            }
        }

        // This extra tick is for calcuating ticks of next level. Will not been added to the final result
        out.push({
            value: dateTime,
            notAdd: true
        });
    }

    function addLevelTicks(
        unitName: TimeUnit,
        lastLevelTicks: InnerTimeTick[],
        levelTicks: InnerTimeTick[]
    ) {
        const newAddedTicks: ScaleTick[] = [];
        const isFirstLevel = !lastLevelTicks.length;

        if (isPrimaryUnitValueAndGreaterSame(getPrimaryTimeUnit(unitName), extent[0], extent[1], isUTC, timeZone)) {
            return;
        }

        if (isFirstLevel) {
            lastLevelTicks = [{
                value: getFirstTimestampOfUnit(extent[0], unitName, isUTC, timeZone),
            }, {
                value: extent[1]
            }];
        }

        for (let i = 0; i < lastLevelTicks.length - 1; i++) {
            const startTick = lastLevelTicks[i].value;
            const endTick = lastLevelTicks[i + 1].value;
            if (startTick === endTick) {
                continue;
            }

            let interval: number;
            let getterName: JSDateGetterNames;
            let setterName: JSDateSetterNames;
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
                    interval = getMonthInterval(approxInterval);
                    getterName = monthGetterName(isUTC);
                    setterName = monthSetterName(isUTC);
                    break;
                case 'week':    // PENDING If week is added. Ignore day.
                case 'half-week':
                case 'day':
                    interval = getDateInterval(approxInterval, 31); // Use 32 days and let interval been 16
                    getterName = dateGetterName(isUTC);
                    setterName = dateSetterName(isUTC);
                    isDate = true;
                    break;
                case 'half-day':
                case 'quarter-day':
                case 'hour':
                    interval = getHourInterval(approxInterval);
                    getterName = hoursGetterName(isUTC);
                    setterName = hoursSetterName(isUTC);
                    break;
                case 'minute':
                    interval = getMinutesAndSecondsInterval(approxInterval, true);
                    getterName = minutesGetterName(isUTC);
                    setterName = minutesSetterName(isUTC);
                    break;
                case 'second':
                    interval = getMinutesAndSecondsInterval(approxInterval, false);
                    getterName = secondsGetterName(isUTC);
                    setterName = secondsSetterName(isUTC);
                    break;
                case 'millisecond':
                    interval = getMillisecondsInterval(approxInterval);
                    getterName = millisecondsGetterName(isUTC);
                    setterName = millisecondsSetterName(isUTC);
                    break;
            }

            // Notice: This expansion by `getFirstTimestampOfUnit` may cause too many ticks and
            // iteration. e.g., when three levels of ticks is displayed, which can be caused by
            // data zoom and axis breaks. Thus trim them here.
            if (endTick >= extent[0] && startTick <= extent[1]) {
                addTicksInSpan(
                    interval, startTick, endTick, getterName, setterName, isDate, newAddedTicks, unitName
                );
            }

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
    }

    const levelsTicks: InnerTimeTick[][] = [];
    let currentLevelTicks: InnerTimeTick[] = [];

    let tickCount = 0;
    let lastLevelTickCount = 0;
    for (let i = 0; i < unitNames.length; ++i) {
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

                const targetTickNum = extentSpanWithBreaks / approxInterval;
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

    const levelsTicksInExtent = filter(map(levelsTicks, levelTicks => {
        return filter(levelTicks, tick => tick.value >= extent[0] && tick.value <= extent[1] && !tick.notAdd);
    }), levelTicks => levelTicks.length > 0);

    const ticks: TimeScaleTick[] = [];
    const maxLevel = levelsTicksInExtent.length - 1;
    for (let i = 0; i < levelsTicksInExtent.length; ++i) {
        const levelTicks = levelsTicksInExtent[i];
        for (let k = 0; k < levelTicks.length; ++k) {
            const unit = getUnitFromValue(levelTicks[k].value, isUTC, timeZone);
            ticks.push({
                value: levelTicks[k].value,
                time: {
                    level: maxLevel - i,
                    upperTimeUnit: unit,
                    lowerTimeUnit: unit,
                },
            });
        }
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
