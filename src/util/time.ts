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
import {TimeAxisLabelFormatterOption} from './../coord/axisCommonTypes';
import * as numberUtil from './number';
import {TimeScaleTick} from './types';
import { getDefaultLocaleModel, getLocaleModel, SYSTEM_LANG, LocaleOption } from '../core/locale';
import Model from '../model/Model';

export const ONE_SECOND = 1000;
export const ONE_MINUTE = ONE_SECOND * 60;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const ONE_YEAR = ONE_DAY * 365;

export const defaultLeveledFormatter = {
    year: '{yyyy}',
    month: '{MMM}',
    day: '{d}',
    hour: '{HH}:{mm}',
    minute: '{HH}:{mm}',
    second: '{HH}:{mm}:{ss}',
    millisecond: '{HH}:{mm}:{ss} {SSS}',
    none: '{yyyy}-{MM}-{dd} {HH}:{mm}:{ss} {SSS}'
};

const fullDayFormatter = '{yyyy}-{MM}-{dd}';

export const fullLeveledFormatter = {
    year: '{yyyy}',
    month: '{yyyy}-{MM}',
    day: fullDayFormatter,
    hour: fullDayFormatter + ' ' + defaultLeveledFormatter.hour,
    minute: fullDayFormatter + ' ' + defaultLeveledFormatter.minute,
    second: fullDayFormatter + ' ' + defaultLeveledFormatter.second,
    millisecond: defaultLeveledFormatter.none
};

export type PrimaryTimeUnit = 'millisecond' | 'second' | 'minute' | 'hour'
    | 'day' | 'month' | 'year';
export type TimeUnit = PrimaryTimeUnit | 'half-year' | 'quarter' | 'week'
    | 'half-week' | 'half-day' | 'quarter-day';

export const primaryTimeUnits: PrimaryTimeUnit[] = [
    'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'
];
export const timeUnits: TimeUnit[] = [
    'year', 'half-year', 'quarter', 'month', 'week', 'half-week', 'day',
    'half-day', 'quarter-day', 'hour', 'minute', 'second', 'millisecond'
];

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


    const localeModel = lang instanceof Model ? lang
        : getLocaleModel(lang || SYSTEM_LANG) || getDefaultLocaleModel();
    const timeModel = localeModel.getModel('time');
    const month = timeModel.get('month');
    const monthAbbr = timeModel.get('monthAbbr');
    const dayOfWeek = timeModel.get('dayOfWeek');
    const dayOfWeekAbbr = timeModel.get('dayOfWeekAbbr');

    return (template || '')
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
    tick: TimeScaleTick,
    idx: number,
    formatter: TimeAxisLabelFormatterOption,
    lang: string | Model<LocaleOption>,
    isUTC: boolean
) {
    let template = null;
    if (zrUtil.isString(formatter)) {
        // Single formatter for all units at all levels
        template = formatter;
    }
    else if (zrUtil.isFunction(formatter)) {
        // Callback formatter
        template = formatter(tick.value, idx, {
            level: tick.level
        });
    }
    else {
        const defaults = zrUtil.extend({}, defaultLeveledFormatter);
        if (tick.level > 0) {
            for (let i = 0; i < primaryTimeUnits.length; ++i) {
                defaults[primaryTimeUnits[i]] = `{primary|${defaults[primaryTimeUnits[i]]}}`;
            }
        }

        const mergedFormatter = (formatter
            ? (formatter.inherit === false
                ? formatter // Use formatter with bigger units
                : zrUtil.defaults(formatter, defaults)
            )
            : defaults) as any;

        const unit = getUnitFromValue(tick.value, isUTC);
        if (mergedFormatter[unit]) {
            template = mergedFormatter[unit];
        }
        else if (mergedFormatter.inherit) {
            // Unit formatter is not defined and should inherit from bigger units
            const targetId = timeUnits.indexOf(unit);
            for (let i = targetId - 1; i >= 0; --i) {
                if (mergedFormatter[unit]) {
                    template = mergedFormatter[unit];
                    break;
                }
            }
            template = template || defaults.none;
        }

        if (zrUtil.isArray(template)) {
            let levelId = tick.level == null
                ? 0
                : (tick.level >= 0 ? tick.level : template.length + tick.level);
            levelId = Math.min(levelId, template.length - 1);
            template = template[levelId];
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

export function getUnitValue(
    value: number | Date,
    unit: TimeUnit,
    isUTC: boolean
) : number {
    const date = zrUtil.isNumber(value)
        ? numberUtil.parseDate(value)
        : value;
    unit = unit || getUnitFromValue(value, isUTC);

    switch (unit) {
        case 'year':
            return date[fullYearGetterName(isUTC)]();
        case 'half-year':
            return date[monthGetterName(isUTC)]() >= 6 ? 1 : 0;
        case 'quarter':
            return Math.floor((date[monthGetterName(isUTC)]() + 1) / 4);
        case 'month':
            return date[monthGetterName(isUTC)]();
        case 'day':
            return date[dateGetterName(isUTC)]();
        case 'half-day':
            return date[hoursGetterName(isUTC)]() / 24;
        case 'hour':
            return date[hoursGetterName(isUTC)]();
        case 'minute':
            return date[minutesGetterName(isUTC)]();
        case 'second':
            return date[secondsGetterName(isUTC)]();
        case 'millisecond':
            return date[millisecondsGetterName(isUTC)]();
    }
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
