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
    // Note: The result based on `isUTC` are totally different, which can not be just simply
    // substituted by the result without `isUTC`. So we make the param `isUTC` mandatory.
    time: unknown, template: string, isUTC: boolean, lang?: string | Model<LocaleOption>
): string {
    const date = numberUtil.parseDate(time);
    const y = date[fullYearGetterName(isUTC)]();
    const M = date[monthGetterName(isUTC)]() + 1;
    const q = Math.floor((M - 1) / 3) + 1;
    const d = date[dateGetterName(isUTC)]();
    const e = date['get' + (isUTC ? 'UTC' : '') + 'Day' as 'getDay' | 'getUTCDay']();
    const H = date[hoursGetterName(isUTC)]();
    const h = (H - 1) % 12 + 1;
    const m = date[minutesGetterName(isUTC)]();
    const s = date[secondsGetterName(isUTC)]();
    const S = date[millisecondsGetterName(isUTC)]();
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
    isUTC: boolean
) {
    let template = null;
    if (zrUtil.isString(formatter)) {
        // Single formatter for all units at all levels
        template = formatter;
    }
    else if (zrUtil.isFunction(formatter)) {
        const extra: TimeAxisLabelFormatterExtraParams = {
            time: tick.time,
            level: tick.time.level,
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
            const unit = getUnitFromValue(tick.value, isUTC);
            template = formatter[unit][unit][0];
        }
    }

    return format(new Date(tick.value), template, isUTC, lang);
}

export function getUnitFromValue(
    value: number | string | Date,
    isUTC: boolean
): PrimaryTimeUnit {
    const date = numberUtil.parseDate(value);
    const M = (date as any)[monthGetterName(isUTC)]() + 1;
    const d = (date as any)[dateGetterName(isUTC)]();
    const h = (date as any)[hoursGetterName(isUTC)]();
    const m = (date as any)[minutesGetterName(isUTC)]();
    const s = (date as any)[secondsGetterName(isUTC)]();
    const S = (date as any)[millisecondsGetterName(isUTC)]();

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

// export function getUnitValue(
//     value: number | Date,
//     unit: TimeUnit,
//     isUTC: boolean
// ) : number {
//     const date = zrUtil.isNumber(value)
//         ? numberUtil.parseDate(value)
//         : value;
//     unit = unit || getUnitFromValue(value, isUTC);

//     switch (unit) {
//         case 'year':
//             return date[fullYearGetterName(isUTC)]();
//         case 'half-year':
//             return date[monthGetterName(isUTC)]() >= 6 ? 1 : 0;
//         case 'quarter':
//             return Math.floor((date[monthGetterName(isUTC)]() + 1) / 4);
//         case 'month':
//             return date[monthGetterName(isUTC)]();
//         case 'day':
//             return date[dateGetterName(isUTC)]();
//         case 'half-day':
//             return date[hoursGetterName(isUTC)]() / 24;
//         case 'hour':
//             return date[hoursGetterName(isUTC)]();
//         case 'minute':
//             return date[minutesGetterName(isUTC)]();
//         case 'second':
//             return date[secondsGetterName(isUTC)]();
//         case 'millisecond':
//             return date[millisecondsGetterName(isUTC)]();
//     }
// }

/**
 * e.g.,
 * If timeUnit is 'year', return the Jan 1st 00:00:00 000 of that year.
 * If timeUnit is 'day', return the 00:00:00 000 of that day.
 *
 * @return The input date.
 */
export function roundTime(date: Date, timeUnit: PrimaryTimeUnit, isUTC: boolean): Date {
    switch (timeUnit) {
        case 'year':
            date[monthSetterName(isUTC)](0);
        case 'month':
            date[dateSetterName(isUTC)](1);
        case 'day':
            date[hoursSetterName(isUTC)](0);
        case 'hour':
            date[minutesSetterName(isUTC)](0);
        case 'minute':
            date[secondsSetterName(isUTC)](0);
        case 'second':
            date[millisecondsSetterName(isUTC)](0);
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
