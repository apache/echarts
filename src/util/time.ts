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
import { deprecateReplaceLog } from './log';

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
                // Generate the dict by the rule as follows:
                // If the user specify (or by default):
                //  {formatter: {
                //      year: '{yyyy}',
                //      month: '{MMM}',
                //      day: '{d}',
                //      ...
                //  }}
                // Concat them to make the final dictionary:
                //  {formatter: {
                //      year: {year: ['{yyyy}']},
                //      month: {year: ['{yyyy} {MMM}'], month: ['{MMM}']},
                //      day: {year: ['{yyyy} {MMM} {d}'], month: ['{MMM} {d}'], day: ['{d}']}
                //      ...
                //  }}
                // And then add `{primary|...}` to each array if from default template.
                // This strategy is convinient for user configurating and works for most cases.
                // If bad cases encountered, users can specify the entire dictionary themselves
                // instead of going through this logic.
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

export function format(
    // Note: The result based on `timeZone` can be totally different, which can not be just simply
    // substituted by the result without `timeZone`. So we make the param `timeZone` mandatory.
    time: unknown, template: string, timeZone: string, lang?: string | Model<LocaleOption>
): string;
/**
 * @deprecated Pass a time zone string instead of the legacy `isUTC` boolean.
 */
export function format(
    // Note: The result based on `isUTC` are totally different, which can not be just simply
    // substituted by the result without `isUTC`. So we make the param `isUTC` mandatory.
    time: unknown, template: string, isUTC: boolean, lang?: string | Model<LocaleOption>
): string;
export function format(
    time: unknown, template: string, timeZoneOrUTC: string | boolean, lang?: string | Model<LocaleOption>
): string {
    if (__DEV__ && typeof timeZoneOrUTC === 'boolean') {
        deprecateReplaceLog('isUTC boolean parameter', 'timeZone string parameter', 'echarts.time.format');
    }
    const date = numberUtil.parseDate(time);
    const timeZone = normalizeTimeZone(timeZoneOrUTC);
    const parts = getTimeZoneParts(date.getTime(), timeZone);
    const y = parts.year;
    const M = parts.month;
    const q = Math.floor((M - 1) / 3) + 1;
    const d = parts.day;
    const e = parts.dayOfWeek;
    const H = parts.hours;
    const h = (H - 1) % 12 + 1;
    const m = parts.minutes;
    const s = parts.seconds;
    const S = parts.milliseconds;
    const a = H >= 12 ? 'pm' : 'am';
    const A = a.toUpperCase();
    const Z = formatTimeZoneOffset(parts.offsetMinutes, false);
    const ZZ = formatTimeZoneOffset(parts.offsetMinutes, true);

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
        .replace(/{S}/g, S + '')
        .replace(/{ZZ}/g, ZZ)
        .replace(/{Z}/g, Z);
}

function formatTimeZoneOffset(offsetMinutes: number, padded: boolean): string {
    if (!offsetMinutes) {
        return 'Z';
    }

    const sign = offsetMinutes < 0 ? '-' : '+';
    const absoluteOffset = Math.abs(offsetMinutes);
    const hours = Math.floor(absoluteOffset / 60);
    const minutes = absoluteOffset % 60;
    return sign
        + (padded ? pad(hours, 2) : hours)
        + (padded || minutes ? ':' + pad(minutes, 2) : '');
}

export function leveledFormat(
    tick: ScaleTick,
    idx: number,
    formatter: TimeAxisLabelFormatterParsed,
    lang: string | Model<LocaleOption>,
    timeZone: string
): string;
/**
 * @deprecated Pass a time zone string instead of the legacy `isUTC` boolean.
 */
export function leveledFormat(
    tick: ScaleTick,
    idx: number,
    formatter: TimeAxisLabelFormatterParsed,
    lang: string | Model<LocaleOption>,
    isUTC: boolean
): string;
export function leveledFormat(
    tick: ScaleTick,
    idx: number,
    formatter: TimeAxisLabelFormatterParsed,
    lang: string | Model<LocaleOption>,
    timeZoneOrUTC: string | boolean
): string {
    if (__DEV__ && typeof timeZoneOrUTC === 'boolean') {
        deprecateReplaceLog('isUTC boolean parameter', 'timeZone string parameter', 'leveledFormat');
    }
    const timeZone = normalizeTimeZone(timeZoneOrUTC);
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
            const unit = getUnitFromValue(tick.value, timeZone);
            template = formatter[unit][unit][0];
        }
    }

    return format(new Date(tick.value), template, timeZone, lang);
}

export function getUnitFromValue(
    value: number | string | Date,
    timeZone: string
): PrimaryTimeUnit;
/**
 * @deprecated Pass a time zone string instead of the legacy `isUTC` boolean.
 */
export function getUnitFromValue(
    value: number | string | Date,
    isUTC: boolean
): PrimaryTimeUnit;
export function getUnitFromValue(
    value: number | string | Date,
    timeZoneOrUTC: string | boolean
): PrimaryTimeUnit {
    if (__DEV__ && typeof timeZoneOrUTC === 'boolean') {
        deprecateReplaceLog('isUTC boolean parameter', 'timeZone string parameter', 'getUnitFromValue');
    }
    const date = numberUtil.parseDate(value);
    const parts = getTimeZoneParts(date.getTime(), normalizeTimeZone(timeZoneOrUTC));
    const M = parts.month;
    const d = parts.day;
    const h = parts.hours;
    const m = parts.minutes;
    const s = parts.seconds;
    const S = parts.milliseconds;

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
export function roundTime(
    date: Date,
    timeUnit: PrimaryTimeUnit,
    timeZone: string
): Date;
/**
 * @deprecated Pass a time zone string instead of the legacy `isUTC` boolean.
 */
export function roundTime(
    date: Date,
    timeUnit: PrimaryTimeUnit,
    isUTC: boolean
): Date;
export function roundTime(
    date: Date,
    timeUnit: PrimaryTimeUnit,
    timeZoneOrUTC: string | boolean
): Date {
    if (__DEV__ && typeof timeZoneOrUTC === 'boolean') {
        deprecateReplaceLog('isUTC boolean parameter', 'timeZone string parameter', 'echarts.time.roundTime');
    }
    date.setTime(roundTimeInTimeZone(
        date.getTime(), timeUnit, normalizeTimeZone(timeZoneOrUTC)
    ));
    return date;
}

function normalizeTimeZone(timeZoneOrUTC: string | boolean): string {
    return typeof timeZoneOrUTC === 'string'
        ? timeZoneOrUTC
        : timeZoneOrUTC ? 'UTC' : getSystemTimeZone();
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function fullYearGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCFullYear' : 'getFullYear';
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function monthGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCMonth' : 'getMonth';
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function dateGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCDate' : 'getDate';
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function hoursGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCHours' : 'getHours';
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function minutesGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCMinutes' : 'getMinutes';
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function secondsGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCSeconds' : 'getSeconds';
}

/**
 * @deprecated Use `getTimeZoneParts` to read values in a specific time zone.
 */
export function millisecondsGetterName(isUTC: boolean) {
    return isUTC ? 'getUTCMilliseconds' : 'getMilliseconds';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function fullYearSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCFullYear' : 'setFullYear';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function monthSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCMonth' : 'setMonth';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function dateSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCDate' : 'setDate';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function hoursSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCHours' : 'setHours';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function minutesSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCMinutes' : 'setMinutes';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function secondsSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCSeconds' : 'setSeconds';
}

/**
 * @deprecated Use time-zone-aware utilities instead of selecting a local/UTC `Date` setter.
 */
export function millisecondsSetterName(isUTC: boolean) {
    return isUTC ? 'setUTCMilliseconds' : 'setMilliseconds';
}

interface TimeZoneDateParts {
    year: number;
    // Calendar month, from 1 (January) to 12 (December), matching Intl/Temporal.
    month: number;
    day: number;
    dayOfWeek: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
    // Same sign as an ISO offset: UTC-05:00 is -300 and UTC+05:30 is 330.
    offsetMinutes: number;
}

type TimeZoneWallTimeParts = Omit<TimeZoneDateParts, 'dayOfWeek' | 'offsetMinutes'>;

interface TimeZoneDayInfo {
    offsetBefore: number;
    transitionTimestamp?: number;
    offsetAfter: number;
}

interface TimeZoneDayCache {
    dayStartOffsets: zrUtil.HashMap<number, number>;
    days: zrUtil.HashMap<TimeZoneDayInfo, number>;
}

// Required for IANA time zones. Legacy environments can provide an Intl polyfill.
// eslint-disable-next-line no-restricted-globals
const intl = Intl;
type TimeZoneFormatter = ReturnType<typeof intl.DateTimeFormat>;
type TimeZoneFormatterOptions = NonNullable<Parameters<typeof intl.DateTimeFormat>[1]>;

const MINUTES_PER_DAY = ONE_DAY / ONE_MINUTE;
const formatterCache = zrUtil.createHashMap<TimeZoneFormatter, string>();
const timeZoneDayCaches = zrUtil.createHashMap<TimeZoneDayCache, string>();
let systemTimeZone: string;

function getFormatter(timeZone: string): TimeZoneFormatter {
    let formatter = formatterCache.get(timeZone);
    if (!formatter) {
        formatter = new intl.DateTimeFormat(
            'en-US-u-ca-gregory-nu-latn',
            {
                timeZone: timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                // `hourCycle` is intentionally used together with `hour12` because
                // some engines otherwise represent midnight as hour 24.
                hourCycle: 'h23'
            } as TimeZoneFormatterOptions
        );
        formatterCache.set(timeZone, formatter);
    }
    return formatter;
}

function makeUTCTimestamp(parts: TimeZoneWallTimeParts): number {
    const date = new Date(0);
    date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    date.setUTCHours(parts.hours, parts.minutes, parts.seconds, parts.milliseconds);
    return date.getTime();
}

function getUTCParts(timestamp: number): TimeZoneDateParts {
    const date = new Date(timestamp);
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        dayOfWeek: date.getUTCDay(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
        seconds: date.getUTCSeconds(),
        milliseconds: date.getUTCMilliseconds(),
        offsetMinutes: 0
    };
}

function getLocalParts(timestamp: number): TimeZoneDateParts {
    const date = new Date(timestamp);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        dayOfWeek: date.getDay(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        milliseconds: date.getMilliseconds(),
        offsetMinutes: -date.getTimezoneOffset()
    };
}

function getFormattedTimeZoneParts(
    timestamp: number,
    timeZone: string
): TimeZoneWallTimeParts {
    const values: {[type: string]: number} = {};
    const parts = getFormatter(timeZone).formatToParts(timestamp);
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.type !== 'literal') {
            values[part.type] = +part.value;
        }
    }

    let hours = values.hour;
    if (hours === 24) {
        hours = 0;
    }
    return {
        year: values.year,
        month: values.month,
        day: values.day,
        hours: hours,
        minutes: values.minute,
        seconds: values.second,
        // Offset probes and transition searches deliberately use minute precision.
        milliseconds: 0
    };
}

function getRawTimeZoneOffset(timestamp: number, timeZone: string): number {
    const offset = makeUTCTimestamp(getFormattedTimeZoneParts(timestamp, timeZone)) - timestamp;
    return Math.round(offset / ONE_MINUTE) * ONE_MINUTE;
}

function getTimeZoneDayCache(timeZone: string): TimeZoneDayCache {
    let cache = timeZoneDayCaches.get(timeZone);
    if (!cache) {
        cache = {
            dayStartOffsets: zrUtil.createHashMap<number, number>(),
            days: zrUtil.createHashMap<TimeZoneDayInfo, number>()
        };
        timeZoneDayCaches.set(timeZone, cache);
    }
    return cache;
}

function getDayStartOffset(
    dayIndex: number,
    timeZone: string,
    cache: TimeZoneDayCache
): number {
    if (cache.dayStartOffsets.hasKey(dayIndex)) {
        return cache.dayStartOffsets.get(dayIndex);
    }
    const offset = getRawTimeZoneOffset(dayIndex * ONE_DAY, timeZone);
    cache.dayStartOffsets.set(dayIndex, offset);
    return offset;
}

function findTransitionTimestamp(
    dayStart: number,
    timeZone: string,
    offsetBefore: number
): number {
    // Time-zone offsets and modern IANA transitions use minute precision.
    let leftMinute = 0;
    let rightMinute = MINUTES_PER_DAY;
    while (rightMinute - leftMinute > 1) {
        const middleMinute = Math.floor((leftMinute + rightMinute) / 2);
        if (getRawTimeZoneOffset(
            dayStart + middleMinute * ONE_MINUTE, timeZone
        ) === offsetBefore) {
            leftMinute = middleMinute;
        }
        else {
            rightMinute = middleMinute;
        }
    }
    return dayStart + rightMinute * ONE_MINUTE;
}

function getTimeZoneDayInfo(timestamp: number, timeZone: string): TimeZoneDayInfo {
    const dayIndex = Math.floor(timestamp / ONE_DAY);
    const cache = getTimeZoneDayCache(timeZone);
    let dayInfo = cache.days.get(dayIndex);
    if (!dayInfo) {
        const offsetBefore = getDayStartOffset(dayIndex, timeZone, cache);
        const offsetAfter = getDayStartOffset(dayIndex + 1, timeZone, cache);
        dayInfo = {
            offsetBefore: offsetBefore,
            offsetAfter: offsetAfter
        };
        // IANA transitions are separated by more than one day. Comparing UTC
        // day boundaries therefore identifies the only possible transition in
        // this day, without scanning every minute.
        if (offsetBefore !== offsetAfter) {
            dayInfo.transitionTimestamp = findTransitionTimestamp(
                dayIndex * ONE_DAY, timeZone, offsetBefore
            );
        }
        cache.days.set(dayIndex, dayInfo);
    }
    return dayInfo;
}

export function getSystemTimeZone(): string {
    return systemTimeZone || (systemTimeZone = new intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function validateTimeZone(timeZone: string): string {
    try {
        return getFormatter(timeZone).resolvedOptions().timeZone;
    }
    catch (err) {
        throw new Error(`Invalid time zone: ${timeZone}`);
    }
}

export function getTimeZoneParts(timestamp: number, timeZone: string): TimeZoneDateParts {
    if (timeZone === 'UTC') {
        return getUTCParts(timestamp);
    }
    if (timeZone === getSystemTimeZone()) {
        return getLocalParts(timestamp);
    }

    const offset = getTimeZoneOffset(timestamp, timeZone);
    const parts = getUTCParts(timestamp + offset);
    parts.offsetMinutes = offset / ONE_MINUTE;
    return parts;
}

function getTimeZoneOffset(timestamp: number, timeZone: string): number {
    if (timeZone === 'UTC') {
        return 0;
    }
    if (timeZone === getSystemTimeZone()) {
        return -new Date(timestamp).getTimezoneOffset() * ONE_MINUTE;
    }

    const dayInfo = getTimeZoneDayInfo(timestamp, timeZone);
    return dayInfo.transitionTimestamp == null || timestamp < dayInfo.transitionTimestamp
        ? dayInfo.offsetBefore
        : dayInfo.offsetAfter;
}

function makeTimeZoneDate(
    parts: TimeZoneWallTimeParts,
    timeZone: string,
    preferredOffsetMinutes?: number
): number {
    if (timeZone === 'UTC') {
        return makeUTCTimestamp(parts);
    }

    const isSystemTimeZone = timeZone === getSystemTimeZone();
    let timestamp: number;
    if (preferredOffsetMinutes != null) {
        timestamp = makeUTCTimestamp(parts);
        const preferredOffset = preferredOffsetMinutes * ONE_MINUTE;
        const preferredTimestamp = timestamp - preferredOffset;
        if (getTimeZoneOffset(preferredTimestamp, timeZone) === preferredOffset) {
            return preferredTimestamp;
        }
    }

    if (isSystemTimeZone) {
        const date = new Date(0);
        date.setFullYear(parts.year, parts.month - 1, parts.day);
        date.setHours(parts.hours, parts.minutes, parts.seconds, parts.milliseconds);
        return date.getTime();
    }

    if (preferredOffsetMinutes == null) {
        timestamp = makeUTCTimestamp(parts);
    }
    const probeDistance = 3 * ONE_DAY;
    const offsets = [
        getTimeZoneOffset(timestamp - probeDistance, timeZone),
        getTimeZoneOffset(timestamp, timeZone),
        getTimeZoneOffset(timestamp + probeDistance, timeZone)
    ];
    const uniqueOffsets: number[] = [];
    for (let i = 0; i < offsets.length; i++) {
        if (zrUtil.indexOf(uniqueOffsets, offsets[i]) < 0) {
            uniqueOffsets.push(offsets[i]);
        }
    }

    let validTimestamp = Infinity;
    let laterTimestamp = Infinity;
    let laterDifference = Infinity;
    let earlierTimestamp = -Infinity;
    let earlierDifference = -Infinity;

    for (let i = 0; i < uniqueOffsets.length; i++) {
        const assumedOffset = uniqueOffsets[i];
        const candidate = timestamp - assumedOffset;
        const candidateOffset = getTimeZoneOffset(candidate, timeZone);
        if (candidateOffset === assumedOffset) {
            // Compatible disambiguation chooses the earlier instant in a fold.
            validTimestamp = Math.min(validTimestamp, candidate);
            continue;
        }

        const difference = candidateOffset - assumedOffset;
        if (difference > 0 && difference < laterDifference) {
            laterDifference = difference;
            laterTimestamp = candidate;
        }
        else if (difference < 0 && difference > earlierDifference) {
            earlierDifference = difference;
            earlierTimestamp = candidate;
        }
    }

    if (validTimestamp !== Infinity) {
        return validTimestamp;
    }
    // Compatible disambiguation moves a nonexistent wall time forward by the gap.
    if (laterTimestamp !== Infinity) {
        return laterTimestamp;
    }
    if (earlierTimestamp !== -Infinity) {
        return earlierTimestamp;
    }

    throw new Error(`Unable to resolve time in time zone ${timeZone}.`);
}

function roundTimeInTimeZone(
    timestamp: number,
    timeUnit: PrimaryTimeUnit,
    timeZone: string
): number {
    if (timeZone === 'UTC') {
        const date = new Date(timestamp);
        switch (timeUnit) {
            case 'year':
                date.setUTCMonth(0);
            case 'month':
                date.setUTCDate(1);
            case 'day':
                date.setUTCHours(0);
            case 'hour':
                date.setUTCMinutes(0);
            case 'minute':
                date.setUTCSeconds(0);
            case 'second':
                date.setUTCMilliseconds(0);
        }
        return date.getTime();
    }

    const parts = getTimeZoneParts(timestamp, timeZone);
    switch (timeUnit) {
        case 'year':
            parts.month = 1;
        case 'month':
            parts.day = 1;
        case 'day':
            parts.hours = 0;
        case 'hour':
            parts.minutes = 0;
        case 'minute':
            parts.seconds = 0;
        case 'second':
            parts.milliseconds = 0;
    }
    return makeTimeZoneDate(parts, timeZone, parts.offsetMinutes);
}

export function addTimeInTimeZone(
    timestamp: number,
    timeUnit: PrimaryTimeUnit,
    amount: number,
    timeZone: string
): number {
    switch (timeUnit) {
        case 'hour':
            return timestamp + amount * ONE_HOUR;
        case 'minute':
            return timestamp + amount * ONE_MINUTE;
        case 'second':
            return timestamp + amount * ONE_SECOND;
        case 'millisecond':
            return timestamp + amount;
    }

    const parts = getTimeZoneParts(timestamp, timeZone);
    const date = new Date(makeUTCTimestamp(parts));
    switch (timeUnit) {
        case 'year':
            date.setUTCFullYear(date.getUTCFullYear() + amount);
            break;
        case 'month':
            date.setUTCMonth(date.getUTCMonth() + amount);
            break;
        case 'day':
            date.setUTCDate(date.getUTCDate() + amount);
            break;
    }
    const normalized = getUTCParts(date.getTime());
    return makeTimeZoneDate(normalized, timeZone, parts.offsetMinutes);
}
