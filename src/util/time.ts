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
import {
    TimeAxisLabelFormatterDictionary,
    TimeAxisLabelFormatterDictionaryOption,
    TimeAxisLabelFormatterExtraParams,
    TimeAxisLabelFormatterOption,
    TimeAxisLabelFormatterParsed,
    TimeAxisLabelFormatterUpperDictionary,
    TimeAxisLabelLeveledFormatterOption,
} from './../coord/axisCommonTypes';
import * as numberUtil from './number';
import {NullUndefined, ScaleTick} from './types';
import { getDefaultLocaleModel, getLocaleModel, SYSTEM_LANG, LocaleOption } from '../core/locale';
import Model from '../model/Model';
import { getScaleBreakHelper } from '../scale/break';

export const ONE_SECOND = 1000;
export const ONE_MINUTE = ONE_SECOND * 60;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const ONE_YEAR = ONE_DAY * 365;


const primaryTimeUnitFormatterMatchers: {[key in PrimaryTimeUnit]: RegExp} = {
    year: /({yyyy}|{yy})/,
    month: /({MMMM}|{MMM}|{MM}|{M})/,
    day: /({dd}|{d})/,
    hour: /({HH}|{H}|{hh}|{h})/,
    minute: /({mm}|{m})/,
    second: /({ss}|{s})/,
    millisecond: /({SSS}|{S})/,
} as const;

const defaultFormatterSeed: {[key in PrimaryTimeUnit]: string} = {
    year: '{yyyy}',
    month: '{MMM}',
    day: '{d}',
    hour: '{HH}:{mm}',
    minute: '{HH}:{mm}',
    second: '{HH}:{mm}:{ss}',
    millisecond: '{HH}:{mm}:{ss} {SSS}',
} as const;

const defaultFullFormatter = '{yyyy}-{MM}-{dd} {HH}:{mm}:{ss} {SSS}';
const fullDayFormatter = '{yyyy}-{MM}-{dd}';

export const fullLeveledFormatter = {
    year: '{yyyy}',
    month: '{yyyy}-{MM}',
    day: fullDayFormatter,
    hour: fullDayFormatter + ' ' + defaultFormatterSeed.hour,
    minute: fullDayFormatter + ' ' + defaultFormatterSeed.minute,
    second: fullDayFormatter + ' ' + defaultFormatterSeed.second,
    millisecond: defaultFullFormatter
};

export type JSDateGetterNames =
    'getUTCFullYear' | 'getFullYear'
    | 'getUTCMonth' | 'getMonth'
    | 'getUTCDate' | 'getDate'
    | 'getUTCHours' | 'getHours'
    | 'getUTCMinutes' | 'getMinutes'
    | 'getUTCSeconds' | 'getSeconds'
    | 'getUTCMilliseconds' | 'getMilliseconds'
;
export type JSDateSetterNames =
    'setUTCFullYear' | 'setFullYear'
    | 'setUTCMonth' | 'setMonth'
    | 'setUTCDate' | 'setDate'
    | 'setUTCHours' | 'setHours'
    | 'setUTCMinutes' | 'setMinutes'
    | 'setUTCSeconds' | 'setSeconds'
    | 'setUTCMilliseconds' | 'setMilliseconds'
;

export type PrimaryTimeUnit = (typeof primaryTimeUnits)[number];

export type TimeUnit = (typeof timeUnits)[number];

// Order must be ensured from big to small.
export const primaryTimeUnits = [
    'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'
] as const;
export const timeUnits = [
    'year', 'half-year', 'quarter', 'month', 'week', 'half-week', 'day',
    'half-day', 'quarter-day', 'hour', 'minute', 'second', 'millisecond'
] as const;


export function parseTimeAxisLabelFormatter(
    formatter: TimeAxisLabelFormatterOption
): TimeAxisLabelFormatterParsed {
    // Keep the logic the same with function `leveledFormat`.
    return (!zrUtil.isString(formatter) && !zrUtil.isFunction(formatter))
        ? parseTimeAxisLabelFormatterDictionary(formatter)
        : formatter;
}

/**
 * The final generated dictionary is like:
 *  generated_dict = {
 *      year: {
 *          year: ['{yyyy}', ...<higher_levels_if_any>]
 *      },
 *      month: {
 *          year: ['{yyyy} {MMM}', ...<higher_levels_if_any>],
 *          month: ['{MMM}', ...<higher_levels_if_any>]
 *      },
 *      day: {
 *          year: ['{yyyy} {MMM} {d}', ...<higher_levels_if_any>],
 *          month: ['{MMM} {d}', ...<higher_levels_if_any>],
 *          day: ['{d}', ...<higher_levels_if_any>]
 *      },
 *      ...
 *  }
 *
 * In echarts option, users can specify the entire dictionary or typically just:
 *  {formatter: {
 *      year: '{yyyy}', // Or an array of leveled templates: `['{yyyy}', '{bold1|{yyyy}}', ...]`,
 *                      // corresponding to `[level0, level1, level2, ...]`.
 *      month: '{MMM}',
 *      day: '{d}',
 *      hour: '{HH}:{mm}',
 *      second: '{HH}:{mm}',
 *      ...
 *  }}
 *  If any time unit is not specified in echarts option, the default template is used,
 *  such as `['{yyyy}', {primary|{yyyy}']`.
 *
 * The `tick.level` is only used to read string from each array, meaning the style type.
 *
 * Let `lowerUnit = getUnitFromValue(tick.value)`.
 * The non-break axis ticks only use `generated_dict[lowerUnit][lowerUnit][level]`.
 * The break axis ticks may use `generated_dict[lowerUnit][upperUnit][level]`, because:
 *  Consider the case: the non-break ticks are `16th, 23th, Feb, 7th, ...`, where `Feb` is in the break
 *  range and pruned by breaks, and the break ends might be in lower time unit than day. e.g., break start
 *  is `Jan 25th 18:00`(in unit `hour`) and break end is `Feb 6th 18:30` (in unit `minute`). Thus the break
 *  label prefers `Jan 25th 18:00` and `Feb 6th 18:30` rather than only `18:00` and `18:30`, otherwise it
 *  causes misleading.
 *  In this case, the tick of the break start and end will both be:
 *      `{level: 1, lowerTimeUnit: 'minute', upperTimeUnit: 'month'}`
 *  And get the final template by `generated_dict[lowerTimeUnit][upperTimeUnit][level]`.
 *  Note that the time unit can not be calculated directly by a single tick value, since the two breaks have
 *  to be at the same time unit to avoid awkward appearance. i.e., `Jan 25th 18:00` is in the time unit "hour"
 *  but we need it to be "minute", following `Feb 6th 18:30`.
 */
function parseTimeAxisLabelFormatterDictionary(
    dictOption: TimeAxisLabelFormatterDictionaryOption | NullUndefined
): TimeAxisLabelFormatterDictionary {
    dictOption = dictOption || {};
    const dict = {} as TimeAxisLabelFormatterDictionary;

    // Currently if any template is specified by user, it may contain rich text tag,
    // such as `'{my_bold|{YYYY}}'`, thus we do add highlight style to it.
    // (Note that nested tag (`'{some|{some2|xxx}}'`) in rich text is not supported yet.)
    let canAddHighlight = true;
    zrUtil.each(primaryTimeUnits, lowestUnit => {
        canAddHighlight &&= dictOption[lowestUnit] == null;
    });

    zrUtil.each(primaryTimeUnits, (lowestUnit, lowestUnitIdx) => {
        const upperDictOption = dictOption[lowestUnit];
        dict[lowestUnit] = {} as TimeAxisLabelFormatterUpperDictionary;

        let lowerTpl: string | null = null;
        for (let upperUnitIdx = lowestUnitIdx; upperUnitIdx >= 0; upperUnitIdx--) {
            const upperUnit = primaryTimeUnits[upperUnitIdx];
            const upperDictItemOption: TimeAxisLabelLeveledFormatterOption =
                (zrUtil.isObject(upperDictOption) && !zrUtil.isArray(upperDictOption))
                    ? upperDictOption[upperUnit]
                    : upperDictOption;

            let tplArr: string[];
            if (zrUtil.isArray(upperDictItemOption)) {
                tplArr = upperDictItemOption.slice();
                lowerTpl = tplArr[0] || '';
            }
            else if (zrUtil.isString(upperDictItemOption)) {
                lowerTpl = upperDictItemOption;
                tplArr = [lowerTpl];
            }
            else {
                if (lowerTpl == null) {
                    lowerTpl = defaultFormatterSeed[lowestUnit];
                }
                else if (!primaryTimeUnitFormatterMatchers[upperUnit].test(lowerTpl)) {
                    lowerTpl = `${dict[upperUnit][upperUnit][0]} ${lowerTpl}`;
                }
                tplArr = [lowerTpl];
                if (canAddHighlight) {
                    tplArr[1] = `{primary|${lowerTpl}}`;
                }
            }
            dict[lowestUnit][upperUnit] = tplArr;
        }
    });
    return dict;
}

export function pad(str: string | number, len: number): string {
    str += '';
    return '0000'.substr(0, len - (str as string).length) + str;
}

export function getPrimaryTimeUnit(timeUnit: TimeUnit): PrimaryTimeUnit {
    switch (timeUnit) {
        case 'half-year':
        case 'quarter':
            return 'month';
        case 'week':
        case 'half-week':
            return 'day';
        case 'half-day':
        case 'quarter-day':
            return 'hour';
        default:
            // year, minutes, second, milliseconds
            return timeUnit;
    }
}

export function isPrimaryTimeUnit(timeUnit: TimeUnit): boolean {
    return timeUnit === getPrimaryTimeUnit(timeUnit);
}

export function getDefaultFormatPrecisionOfInterval(timeUnit: PrimaryTimeUnit): PrimaryTimeUnit {
    switch (timeUnit) {
        case 'year':
        case 'month':
            return 'day';
        case 'millisecond':
            return 'millisecond';
        default:
            // Also for day, hour, minute, second
            return 'second';
    }
}

/**
 * Timezone-aware helpers.
 *
 * NOTE: These are used for axis ticks/rounding to properly step through DST
 * boundaries in the requested IANA timezone (e.g. "Europe/London").
 */
export type ZonedParts = {
    year: number;
    month: number; // 1-12
    day: number; // 1-31
    hour: number; // 0-23
    minute: number;
    second: number;
    millisecond: number;
};

function getTimeZoneOffsetMinutes(timeZone: string, utcMs: number): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        // @ts-expect-error: Test
        timeZoneName: 'shortOffset'
    });

    const parts = dtf.formatToParts(new Date(utcMs));
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';

    // examples: "GMT+2", "GMT+02", "GMT+02:00", "UTC+1"
    const m = tzName.match(/([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (!m) {
        return 0;
    }
    const sign = m[1] === '-' ? -1 : 1;
    const hh = parseInt(m[2], 10);
    const mm = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (hh * 60 + mm);
}

export function getZonedParts(timeZone: string, utcMs: number): ZonedParts {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        // @ts-expect-error: Test
        fractionalSecondDigits: 3,
        hourCycle: 'h23'
    });

    const parts = dtf.formatToParts(new Date(utcMs));
    const map: Record<string, string> = {};
    for (const p of parts) {
        if (p.type !== 'literal') {
            map[p.type] = p.value;
        }
    }

    return {
        year: +map.year,
        month: +map.month,
        day: +map.day,
        hour: +map.hour,
        minute: +map.minute,
        second: +map.second,
        millisecond: +(map.fractionalSecond || '0')
    };
}

function getZonedWeekdayIndex(timeZone: string, utcMs: number): number {
    // en-US short weekday: Sun, Mon, Tue, Wed, Thu, Fri, Sat
    const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(utcMs));
    const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return wdMap[wd] ?? 0;
}

export function zonedPartsToUtcMs(timeZone: string, p: ZonedParts): number {
    // Start with naive UTC guess for those fields, then correct by the timezone offset.
    let utcGuess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond);

    for (let i = 0; i < 3; i++) {
        const offMin = getTimeZoneOffsetMinutes(timeZone, utcGuess);
        const corrected = Date.UTC(
            p.year, p.month - 1, p.day,
            p.hour, p.minute, p.second, p.millisecond
        ) - offMin * 60000;
        if (corrected === utcGuess) {
            break;
        }
        utcGuess = corrected;
    }

    // Handle DST gaps (non-existent local times) by moving forward until parts match.
    const wantKey = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}.${p.millisecond}`;
    for (let j = 0; j < 120; j++) { // up to 2 hours worst-case safety
        const got = getZonedParts(timeZone, utcGuess);
        const gotKey = `${got.year}-${got.month}-${got.day} ${got.hour}:${got.minute}:${got.second}.${got.millisecond}`;
        if (gotKey === wantKey) {
            return utcGuess;
        }
        utcGuess += 60000; // +1 minute
    }

    return utcGuess;
}

export function addZonedParts(p: ZonedParts, add: Partial<Pick<ZonedParts,
    'year'|'month'|'day'|'hour'|'minute'|'second'|'millisecond'
>>): ZonedParts {
    // Use a UTC Date as a pure calendar arithmetic engine (no local tz impact)
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond));

    if (add.year) {
        d.setUTCFullYear(d.getUTCFullYear() + add.year);
    }
    if (add.month) {
        d.setUTCMonth(d.getUTCMonth() + add.month);
    }
    if (add.day) {
        d.setUTCDate(d.getUTCDate() + add.day);
    }
    if (add.hour) {
        d.setUTCHours(d.getUTCHours() + add.hour);
    }
    if (add.minute) {
        d.setUTCMinutes(d.getUTCMinutes() + add.minute);
    }
    if (add.second) {
        d.setUTCSeconds(d.getUTCSeconds() + add.second);
    }
    if (add.millisecond) {
        d.setUTCMilliseconds(d.getUTCMilliseconds() + add.millisecond);
    }

    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
        second: d.getUTCSeconds(),
        millisecond: d.getUTCMilliseconds()
    };
}

export function format(
    // Note: The result based on `isUTC` are totally different, which can not be just simply
    // substituted by the result without `isUTC`. So we make the param `isUTC` mandatory.
    time: unknown,
    template: string,
    isUTC: boolean,
    lang?: string | Model<LocaleOption>,
    timeZone?: string
): string {
    const date = numberUtil.parseDate(time);

    let y: number;
    let M: number;
    let d: number;
    let e: number;
    let H: number;
    let m: number;
    let s: number;
    let S: number;

    if (timeZone) {
        const parts = getZonedParts(timeZone, date.getTime());
        y = parts.year;
        M = parts.month;
        d = parts.day;
        H = parts.hour;
        m = parts.minute;
        s = parts.second;
        S = parts.millisecond;
        e = getZonedWeekdayIndex(timeZone, date.getTime());
    }
    else {
        y = date[fullYearGetterName(isUTC)]();
        M = date[monthGetterName(isUTC)]() + 1;
        d = date[dateGetterName(isUTC)]();
        e = date['get' + (isUTC ? 'UTC' : '') + 'Day' as 'getDay' | 'getUTCDay']();
        H = date[hoursGetterName(isUTC)]();
        m = date[minutesGetterName(isUTC)]();
        s = date[secondsGetterName(isUTC)]();
        S = date[millisecondsGetterName(isUTC)]();
    }

    const q = Math.floor((M - 1) / 3) + 1;
    const h = (H - 1) % 12 + 1;
    const a = H >= 12 ? 'pm' : 'am';
    const A = a.toUpperCase();

    const localeModel = lang instanceof Model ? lang
        : getLocaleModel(lang || SYSTEM_LANG) || getDefaultLocaleModel();
    const timeModel = localeModel.getModel('time');
    const month = timeModel.get('month');
    const monthAbbr = timeModel.get('monthAbbr');
    const dayOfWeek = timeModel.get('dayOfWeek');
    const dayOfWeekAbbr = timeModel.get('dayOfWeekAbbr');

    return (template || '')
        .replace(/{a}/g, a + '')
        .replace(/{A}/g, A + '')
        .replace(/{yyyy}/g, y + '')
        .replace(/{yy}/g, pad(y % 100 + '', 2))
        .replace(/{Q}/g, q + '')
        .replace(/{MMMM}/g, month[M - 1])
        .replace(/{MMM}/g, monthAbbr[M - 1])
        .replace(/{MM}/g, pad(M, 2))
        .replace(/{M}/g, M + '')
        .replace(/{dd}/g, pad(d, 2))
        .replace(/{d}/g, d + '')
        .replace(/{eeee}/g, dayOfWeek[e])
        .replace(/{ee}/g, dayOfWeekAbbr[e])
        .replace(/{e}/g, e + '')
        .replace(/{HH}/g, pad(H, 2))
        .replace(/{H}/g, H + '')
        .replace(/{hh}/g, pad(h + '', 2))
        .replace(/{h}/g, h + '')
        .replace(/{mm}/g, pad(m, 2))
        .replace(/{m}/g, m + '')
        .replace(/{ss}/g, pad(s, 2))
        .replace(/{s}/g, s + '')
        .replace(/{SSS}/g, pad(S, 3))
        .replace(/{S}/g, S + '');
}

export function leveledFormat(
    tick: ScaleTick,
    idx: number,
    formatter: TimeAxisLabelFormatterParsed,
    lang: string | Model<LocaleOption>,
    isUTC: boolean,
    timeZone?: string
) {
    let template = null;
    if (zrUtil.isString(formatter)) {
        // Single formatter for all units at all levels
        template = formatter;
    }
    else if (zrUtil.isFunction(formatter)) {
        const extra: TimeAxisLabelFormatterExtraParams = {
            time: tick.time,
            level: tick.time ? tick.time.level : 0,
        };
        const scaleBreakHelper = getScaleBreakHelper();
        if (scaleBreakHelper) {
            scaleBreakHelper.makeAxisLabelFormatterParamBreak(extra, tick.break);
        }
        template = formatter(tick.value, idx, extra);
    }
    else {
        const tickTime = tick.time;
        if (tickTime) {
            const leveledTplArr = formatter[tickTime.lowerTimeUnit][tickTime.upperTimeUnit];
            template = leveledTplArr[Math.min(tickTime.level, leveledTplArr.length - 1)] || '';
        }
        else {
            // tick may be from customTicks or timeline therefore no tick.time.
            const unit = getUnitFromValue(tick.value, isUTC, timeZone);
            template = formatter[unit][unit][0];
        }
    }

    return format(new Date(tick.value), template, isUTC, lang, timeZone);
}

export function getUnitFromValue(
    value: number | string | Date,
    isUTC: boolean,
    timeZone?: string
): PrimaryTimeUnit {
    const date = numberUtil.parseDate(value);

    let M: number;
    let d: number;
    let h: number;
    let m: number;
    let s: number;
    let S: number;

    if (timeZone) {
        const p = getZonedParts(timeZone, date.getTime());
        M = p.month;
        d = p.day;
        h = p.hour;
        m = p.minute;
        s = p.second;
        S = p.millisecond;
    }
    else {
        M = (date as any)[monthGetterName(isUTC)]() + 1;
        d = (date as any)[dateGetterName(isUTC)]();
        h = (date as any)[hoursGetterName(isUTC)]();
        m = (date as any)[minutesGetterName(isUTC)]();
        s = (date as any)[secondsGetterName(isUTC)]();
        S = (date as any)[millisecondsGetterName(isUTC)]();
    }

    const isSecond = S === 0;
    const isMinute = isSecond && s === 0;
    const isHour = isMinute && m === 0;
    const isDay = isHour && h === 0;
    const isMonth = isDay && d === 1;
    const isYear = isMonth && M === 1;

    if (isYear) {
        return 'year';
    }
    else if (isMonth) {
        return 'month';
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

/**
 * e.g.,
 * If timeUnit is 'year', return the Jan 1st 00:00:00 000 of that year.
 * If timeUnit is 'day', return the 00:00:00 000 of that day.
 *
 * @return The input date.
 */
export function roundTime(date: Date, timeUnit: PrimaryTimeUnit, isUTC: boolean, timeZone?: string): Date {
    if (timeZone) {
        const p = getZonedParts(timeZone, date.getTime());
        switch (timeUnit) {
            case 'year':
                p.month = 1;
            case 'month':
                p.day = 1;
            case 'day':
                p.hour = 0;
            case 'hour':
                p.minute = 0;
            case 'minute':
                p.second = 0;
            case 'second':
                p.millisecond = 0;
        }
        date.setTime(zonedPartsToUtcMs(timeZone, p));
        return date;
    }

    switch (timeUnit) {
        case 'year':
            date;
        case 'month':
            date;
        case 'day':
            date;
        case 'hour':
            date;
        case 'minute':
            date;
        case 'second':
            date;
    }
    return date;
}

export function fullYearGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCFullYear' : 'getFullYear';
}

export function monthGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCMonth' : 'getMonth';
}

export function dateGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCDate' : 'getDate';
}

export function hoursGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCHours' : 'getHours';
}

export function minutesGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCMinutes' : 'getMinutes';
}

export function secondsGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCSeconds' : 'getSeconds';
}

export function millisecondsGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCMilliseconds' : 'getMilliseconds';
}

export function fullYearSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCFullYear' : 'setFullYear';
}

export function monthSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCMonth' : 'setMonth';
}

export function dateSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCDate' : 'setDate';
}

export function hoursSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCHours' : 'setHours';
}

export function minutesSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCMinutes' : 'setMinutes';
}

export function secondsSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCSeconds' : 'setSeconds';
}

export function millisecondsSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCMilliseconds' : 'setMilliseconds';
}
