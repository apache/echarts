import * as zrUtil from 'zrender/src/core/util';
import {TimeAxisLabelFormatterOption} from './../coord/axisCommonTypes';
import * as numberUtil from './number';
import {pad} from './format';
import lang from '../lang';
import {TimeScaleTick} from './types';

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
    millisecond: '{hh}:{mm}:{ss} {SSS}',
    none: '{yyyy}-{MM}-{dd} {hh}:{mm}:{ss} {SSS}'
};

const fullDayFormatter = '{yyyy}-{MM}-{dd}';

export const fullLeveledFormatter = {
    year: '{yyyy}',
    month: '{yyyy}:{MM}',
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

export function format(time: Date | number, template: string, isUTC?: boolean): string {
    const date = numberUtil.parseDate(time);
    const utc = isUTC ? 'UTC' : '';
    const y = (date as any)['get' + utc + 'FullYear']();
    const M = (date as any)['get' + utc + 'Month']() + 1;
    const q = Math.floor((M - 1) / 4) + 1;
    const d = (date as any)['get' + utc + 'Date']();
    const e = (date as any)['get' + utc + 'Day']();
    const H = (date as any)['get' + utc + 'Hours']();
    const h = (H - 1) % 12 + 1;
    const m = (date as any)['get' + utc + 'Minutes']();
    const s = (date as any)['get' + utc + 'Seconds']();
    const S = (date as any)['get' + utc + 'Milliseconds']();

    return (template || '')
        .replace(/{yyyy}/g, y)
        .replace(/{yy}/g, y % 100 + '')
        .replace(/{Q}/g, q + '')
        .replace(/{MMMM}/g, lang.time.month[M - 1])
        .replace(/{MMM}/g, lang.time.monthAbbr[M - 1])
        .replace(/{MM}/g, pad(M, 2))
        .replace(/{M}/g, M)
        .replace(/{dd}/g, pad(d, 2))
        .replace(/{d}/g, d)
        .replace(/{eeee}/g, lang.time.dayOfWeek[e])
        .replace(/{ee}/g, lang.time.dayOfWeekAbbr[e])
        .replace(/{e}/g, e)
        .replace(/{HH}/g, pad(H, 2))
        .replace(/{H}/g, H)
        .replace(/{hh}/g, pad(h + '', 2))
        .replace(/{h}/g, h + '')
        .replace(/{mm}/g, pad(m, 2))
        .replace(/{m}/g, m)
        .replace(/{ss}/g, pad(s, 2))
        .replace(/{s}/g, s)
        .replace(/{SSS}/g, pad(S, 3))
        .replace(/{S}/g, S);
}

export function leveledFormat(
    tick: TimeScaleTick,
    idx: number,
    formatter: TimeAxisLabelFormatterOption,
    isUTC?: boolean
) {
    let template = null;
    if (typeof formatter === 'string') {
        // Single formatter for all units at all levels
        template = formatter;
    }
    else if (typeof formatter === 'function') {
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

    return format(new Date(tick.value), template, isUTC);
}

export function getUnitFromValue(
    value: number | string | Date,
    isUTC: boolean
): PrimaryTimeUnit {
    const date = numberUtil.parseDate(value);
    const utc = isUTC ? 'UTC' : '';
    const M = (date as any)['get' + utc + 'Month']() + 1;
    const d = (date as any)['get' + utc + 'Date']();
    const h = (date as any)['get' + utc + 'Hours']();
    const m = (date as any)['get' + utc + 'Minutes']();
    const s = (date as any)['get' + utc + 'Seconds']();
    const S = (date as any)['get' + utc + 'Milliseconds']();

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
    unit?: TimeUnit,
    isUTC?: boolean
) : number {
    const date = typeof value === 'number'
        ? numberUtil.parseDate(value) as any
        : value;
    unit = unit || getUnitFromValue(value, isUTC);
    const utc = isUTC ? 'UTC' : '';

    switch (unit) {
        case 'year':
            return date['get' + utc + 'FullYear']();
        case 'half-year':
            return date['get' + utc + 'Month']() >= 6 ? 1 : 0;
        case 'quarter':
            return Math.floor((date['get' + utc + 'Month']() + 1) / 4);
        case 'month':
            return date['get' + utc + 'Month']();
        case 'day':
            return date['get' + utc + 'Date']();
        case 'half-day':
            return date['get' + utc + 'Hours']() / 24;
        case 'hour':
            return date['get' + utc + 'Hours']();
        case 'minute':
            return date['get' + utc + 'Minutes']();
        case 'second':
            return date['get' + utc + 'Seconds']();
        case 'millisecond':
            return date['get' + utc + 'Milliseconds']();
    }
}
