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


// [About input values and time zones]:
// In most cases, `number.parseDate` will treat input data string as local time
// (except when a time zone is specified in the string). The resolved time zone
// affects tick calendar arithmetic and formatting, but does not reinterpret input.
// This design preserves these common cases:
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
    getUnitFromValue,
    primaryTimeUnits,
    roundTime,
    addTimeInTimeZone
} from '../util/time';
import { ensureValidSplitNumber } from './helper';
import Scale, { ScaleGetTicksOpt } from './Scale';
import {TimeScaleTick, ScaleTick, AxisBreakOption, NullUndefined} from '../util/types';
import {TimeAxisLabelFormatterParsed} from '../coord/axisCommonTypes';
import { warn } from '../util/log';
import { LocaleOption } from '../core/locale';
import Model from '../model/Model';
import { each, filter, indexOf, isNumber, map } from 'zrender/src/core/util';
import { BreakScaleMapper, getBreaksUnsafe, getScaleBreakHelper, simplyParseBreakOption } from './break';
import type { ScaleCalcNiceMethod } from '../coord/axisNiceTicks';
import { getMinorTicks } from './minorTicks';
import {
    getScaleLinearSpanEffective,
    getScaleExtentForTickUnsafe,
    initBreakOrLinearMapper, ScaleMapperGeneric
} from './scaleMapper';
import { removeDuplicates, removeDuplicatesGetKeyFromValueProp } from '../util/model';

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
    timeZone: string;
    breakOption: AxisBreakOption[] | NullUndefined;
};

/**
 * @final NEVER inherit me!
 */
interface TimeScale extends ScaleMapperGeneric<TimeScale> {}
class TimeScale extends Scale<TimeScale> {

    static type = 'time';
    readonly type = 'time' as const;

    private _locale: Model<LocaleOption>;
    private _timeZone: string;
    private _approxInterval: number;
    private _interval: number;

    private _minLevelUnit: TimeUnit;

    constructor(setting: TimeScaleSetting) {
        super();
        this.parse = TimeScale.parse;

        this._locale = setting.locale;
        this._timeZone = setting.timeZone;
        this._interval = 0;

        const breakParsed = simplyParseBreakOption(this, setting);

        const res = initBreakOrLinearMapper(this, breakParsed, null);
        // @ts-ignore
        this.brk = res.brk;
    }

    /**
     * Get label is mainly for other components like dataZoom, tooltip.
     */
    getLabel(tick: ScaleTick): string {
        return format(
            tick.value,
            fullLeveledFormatter[
                getDefaultFormatPrecisionOfInterval(getPrimaryTimeUnit(this._minLevelUnit))
            ] || fullLeveledFormatter.second,
            this._timeZone,
            this._locale
        );
    }

    getFormattedLabel(
        tick: ScaleTick,
        idx: number,
        labelFormatter: TimeAxisLabelFormatterParsed
    ): string {
        return leveledFormat(tick, idx, labelFormatter, this._locale, this._timeZone);
    }

    getTicks(opt?: ScaleGetTicksOpt): TimeScaleTick[] {
        opt = opt || {};

        const interval = this._interval;
        const extent = getScaleExtentForTickUnsafe(this);
        const scaleBreakHelper = getScaleBreakHelper();
        const brk = this.brk;
        const brkAvailable = scaleBreakHelper && brk;

        let ticks = [] as TimeScaleTick[];
        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        const timeZone = this._timeZone;

        if (brkAvailable && opt.breakTicks === 'only_break') {
            getScaleBreakHelper().addBreaksToTicks(ticks, brk.breaks, extent);
            return ticks;
        }

        ticks = createIntervalTicks(
            this._minLevelUnit,
            this._approxInterval,
            timeZone,
            extent,
            getScaleLinearSpanEffective(this),
            brk
        );

        let upperUnitIndex = primaryTimeUnits.length - 1;
        let maxLevel = 0;
        each(ticks, tick => {
            if (tick.time) {
                upperUnitIndex = Math.min(upperUnitIndex, indexOf(primaryTimeUnits, tick.time.upperTimeUnit));
                maxLevel = Math.max(maxLevel, tick.time.level);
            }
        });

        if (brkAvailable) {
            getScaleBreakHelper().pruneTicksByBreak(
                opt.pruneByBreak,
                ticks,
                brk.breaks,
                item => item.value,
                this._approxInterval,
                extent
            );
        }
        if (brkAvailable && opt.breakTicks !== 'none') {
            getScaleBreakHelper().addBreaksToTicks(ticks, brk.breaks, extent, trimmedBrk => {
                // @see `parseTimeAxisLabelFormatterDictionary`.
                const lowerBrkUnitIndex = Math.max(
                    indexOf(primaryTimeUnits, getUnitFromValue(trimmedBrk.vmin, timeZone)),
                    indexOf(primaryTimeUnits, getUnitFromValue(trimmedBrk.vmax, timeZone))
                );
                let upperBrkUnitIndex = 0;
                for (let unitIdx = 0; unitIdx < primaryTimeUnits.length; unitIdx++) {
                    if (!isPrimaryUnitValueAndGreaterSame(
                        primaryTimeUnits[unitIdx], trimmedBrk.vmin, trimmedBrk.vmax, timeZone
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

    getMinorTicks(splitNumber: number): number[][] {
        return getMinorTicks(
            this,
            splitNumber,
            getBreaksUnsafe(this),
            this._interval
        );
    }

    setTimeInterval(opt: {
        interval: number;
        approxInterval: number;
        minLevelUnit: TimeUnit;
    }): void {
        this._interval = opt.interval;
        this._approxInterval = opt.approxInterval;
        this._minLevelUnit = opt.minLevelUnit;
    }

    getTimeZone(): string {
        return this._timeZone;
    }

    static parse(val: number | string | Date): number {
        // `val` might be a float (e.g., calculated from percent), so call `round`.
        return isNumber(val) ? Math.round(val) : +numberUtil.parseDate(val);
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
    timeZone: string
): boolean {
    return roundTime(new Date(valueA), unit, timeZone).getTime()
        === roundTime(new Date(valueB), unit, timeZone).getTime();
}

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
    // If less than 1, the getTicks loop will inevitably deed loop and read safeLimit.
    return numberUtil.mathMax(numberUtil.nice(approxInterval, true), 1);
}

// e.g., if the input unit is 'day', start calculate ticks from the first day of
// that month to make ticks "nice".
function getFirstTimestampOfUnit(timestamp: number, unitName: TimeUnit, timeZone: string) {
    const upperUnitIdx = Math.max(0, indexOf(primaryTimeUnits, unitName) - 1);
    return roundTime(new Date(timestamp), primaryTimeUnits[upperUnitIdx], timeZone).getTime();
}

function createEstimateNiceMultiple(
    timeUnit: PrimaryTimeUnit,
    dateMethodInterval: number,
    timeZone: string
) {
    const tmpTime = addTimeInTimeZone(0, timeUnit, 1, timeZone);
    const approxTimeInterval = addTimeInTimeZone(
        tmpTime, timeUnit, dateMethodInterval, timeZone
    ) - tmpTime;

    return (tickVal: number, targetValue: number) => {
        // Only in month that accurate result can not get by division of
        // timestamp interval, but no need accurate here.
        return Math.max(
            0,
            Math.round((targetValue - tickVal) / approxTimeInterval)
        );
    };
}

function createIntervalTicks(
    bottomUnitName: TimeUnit,
    approxInterval: number,
    timeZone: string,
    extent: number[],
    innermostSpan: number,
    brk: BreakScaleMapper | NullUndefined,
): TimeScaleTick[] {
    // A fail-safe is required since `interval` can be user specified, or for the case
    // that using dataZoom toolbox and zoom repeatedly.
    const safeLimit = 3000;
    const unitNames = timeUnits;
    // const bottomPrimaryUnitName = getPrimaryTimeUnit(bottomUnitName);

    interface InnerTimeTick {
        value: TimeScaleTick['value']
        notAdd?: boolean
    }

    let iter = 0;

    function addTicksInSpan(
        interval: number,
        minTimestamp: number,
        maxTimestamp: number,
        timeUnit: PrimaryTimeUnit,
        out: InnerTimeTick[]
    ) {
        const estimateNiceMultiple = createEstimateNiceMultiple(timeUnit, interval, timeZone);

        let dateTime = minTimestamp;

        while (dateTime < maxTimestamp && dateTime <= extent[1]) {
            out.push({
                value: dateTime
            });

            if (iter++ > safeLimit) {
                if (__DEV__) {
                    warn('Exceed safe limit in TimeScale["getTicks"].');
                }
                break;
            }

            dateTime = addTimeInTimeZone(dateTime, timeUnit, interval, timeZone);

            if (brk) {
                const moreMultiple = brk.calcNiceTickMultiple(dateTime, estimateNiceMultiple);
                if (moreMultiple > 0) {
                    dateTime = addTimeInTimeZone(
                        dateTime, timeUnit, moreMultiple * interval, timeZone
                    );
                }
            }
        }

        // This extra tick is for calculating ticks of next level. Will not been added to the final result
        out.push({
            value: dateTime,
            // extent[1] should be added; deduplication will be performed later.
            notAdd: dateTime > extent[1]
        });
    }

    function addLevelTicks(
        unitName: TimeUnit,
        lastLevelTicks: InnerTimeTick[],
        levelTicks: InnerTimeTick[]
    ) {
        const newAddedTicks: ScaleTick[] = [];
        const isFirstLevel = !lastLevelTicks.length;

        if (isPrimaryUnitValueAndGreaterSame(
            getPrimaryTimeUnit(unitName), extent[0], extent[1], timeZone
        )) {
            return;
        }

        if (isFirstLevel) {
            lastLevelTicks = [{
                value: getFirstTimestampOfUnit(extent[0], unitName, timeZone)
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
            let timeUnit: PrimaryTimeUnit;

            switch (unitName) {
                case 'year':
                    interval = Math.max(1, Math.round(approxInterval / ONE_DAY / 365));
                    timeUnit = 'year';
                    break;
                case 'half-year':
                case 'quarter':
                case 'month':
                    interval = getMonthInterval(approxInterval);
                    timeUnit = 'month';
                    break;
                case 'week':    // PENDING If week is added. Ignore day.
                case 'half-week':
                case 'day':
                    interval = getDateInterval(approxInterval, 31); // Use 32 days and let interval been 16
                    timeUnit = 'day';
                    break;
                case 'half-day':
                case 'quarter-day':
                case 'hour':
                    interval = getHourInterval(approxInterval);
                    timeUnit = 'hour';
                    break;
                case 'minute':
                    interval = getMinutesAndSecondsInterval(approxInterval, true);
                    timeUnit = 'minute';
                    break;
                case 'second':
                    interval = getMinutesAndSecondsInterval(approxInterval, false);
                    timeUnit = 'second';
                    break;
                case 'millisecond':
                    interval = getMillisecondsInterval(approxInterval);
                    timeUnit = 'millisecond';
                    break;
            }

            // Notice: This expansion by `getFirstTimestampOfUnit` may cause too many ticks and
            // iteration. e.g., when three levels of ticks is displayed, which can be caused by
            // data zoom and axis breaks. Thus trim them here.
            if (endTick >= extent[0] && startTick <= extent[1]) {
                addTicksInSpan(
                    interval, startTick, endTick, timeUnit, newAddedTicks
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

                const targetTickNum = innermostSpan / approxInterval;
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

    const maxLevel = levelsTicksInExtent.length - 1;
    const ticks: TimeScaleTick[] = [];

    for (let i = 0; i < levelsTicksInExtent.length; ++i) {
        const levelTicks = levelsTicksInExtent[i];
        for (let k = 0; k < levelTicks.length; ++k) {
            const unit = getUnitFromValue(levelTicks[k].value, timeZone);
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

    // Remove duplicates, which may cause jitter of `splitArea` and other bad cases.
    removeDuplicates(ticks, removeDuplicatesGetKeyFromValueProp, null);

    ticks.sort((a, b) => a.value - b.value);

    const currMinTick = ticks[0];
    const currMaxTick = ticks[ticks.length - 1];
    const extent0Unit = getUnitFromValue(extent[0], timeZone);
    const extent1Unit = getUnitFromValue(extent[1], timeZone);
    if (!currMinTick || currMinTick.value > extent[0]) {
        ticks.unshift({
            value: extent[0],
            time: {level: 0, upperTimeUnit: extent0Unit, lowerTimeUnit: extent0Unit},
            notNice: true,
        });
    }
    if (!currMaxTick || currMaxTick.value < extent[1]) {
        ticks.push({
            value: extent[1],
            time: {level: 0, upperTimeUnit: extent1Unit, lowerTimeUnit: extent1Unit},
            notNice: true,
        });
    }

    return ticks;
}

export const calcNiceForTimeScale: ScaleCalcNiceMethod = function (scale: TimeScale, opt) {
    const extent = scale.getExtent();
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
    scale.setExtent(extent[0], extent[1]);

    const splitNumber = ensureValidSplitNumber(opt.splitNumber, 10);
    let approxInterval = getScaleLinearSpanEffective(scale) / splitNumber;

    const minInterval = opt.minInterval;
    const maxInterval = opt.maxInterval;
    if (minInterval != null && approxInterval < minInterval) {
        approxInterval = minInterval;
    }
    if (maxInterval != null && approxInterval > maxInterval) {
        approxInterval = maxInterval;
    }

    const scaleIntervalsLen = scaleIntervals.length;
    const idx = Math.min(
        bisect(scaleIntervals, approxInterval, 0, scaleIntervalsLen),
        scaleIntervalsLen - 1
    );

    // Interval that can be used to calculate ticks
    const interval = scaleIntervals[idx][1];
    // Min level used when picking ticks from top down.
    // We check one more level to avoid the ticks are to sparse in some case.
    const minLevelUnit = scaleIntervals[Math.max(idx - 1, 0)][0];

    scale.setTimeInterval({
        approxInterval,
        interval,
        minLevelUnit
    });
};

Scale.registerClass(TimeScale);

export default TimeScale;
