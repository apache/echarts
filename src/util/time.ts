import * as zrUtil from 'zrender/src/core/util';
import {TimeAxisLabelFormatterOption} from './../coord/axisCommonTypes';
import * as numberUtil from './number';
import {pad} from './format';
import lang from '../lang';
import {TimeScaleTick} from './types';

export const defaultLeveledFormatter = {
    millisecond: '{hh}:{mm}:{ss} {SSS}',
    second: '{hh}:{mm}:{ss}',
    minute: '{hh}:{mm}',
    hour: '{hh}:{mm}',
    day: '{d}',
    week: '{d}',
    month: '{MMM}',
    quarter: 'Q{Q}',
    year: '{YYYY}',
    none: '{YYYY}-{MM}-{dd} {hh}:{mm}'
};

export type PrimaryTimeUnit = 'millisecond' | 'second' | 'minute' | 'hour'
    | 'day' | 'month' | 'year';
export type TimeUnit = PrimaryTimeUnit | 'week' | 'quarter';

export const timeUnits: TimeUnit[] = [
    'year', 'quarter', 'month', 'week', 'day',
    'hour', 'minute', 'second', 'millisecond'
];


export function format(time: Date, template: string, isUTC?: boolean): string {
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

    return template
        .replace('{yyyy}', y)
        .replace('{yy}', y % 100 + '')
        .replace('{Q}', q + '')
        .replace('{MMMM}', lang.time.month[M - 1])
        .replace('{MMM}', lang.time.monthAbbr[M - 1])
        .replace('{MM}', pad(M, 2))
        .replace('{M}', M)
        .replace('{dd}', pad(d, 2))
        .replace('{d}', d)
        .replace('{eeee}', lang.time.dayOfWeek[e])
        .replace('{ee}', lang.time.dayOfWeekAbbr[e])
        .replace('{e}', e)
        .replace('{HH}', pad(H, 2))
        .replace('{H}', H)
        .replace('{hh}', pad(h + '', 2))
        .replace('{h}', h + '')
        .replace('{mm}', pad(m, 2))
        .replace('{m}', m)
        .replace('{ss}', pad(s, 2))
        .replace('{s}', s)
        .replace('{SSS}', pad(S, 3))
        .replace('{S}', S);
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
        template = formatter(tick, idx);
    }
    else {
        const mergedFormatter = (formatter
            ? (formatter.inherit
                ? formatter // Use formatter with bigger units
                : zrUtil.defaults(formatter, defaultLeveledFormatter)
            )
            : defaultLeveledFormatter) as any;

        const unit = getUnitFromValue(tick.value, isUTC, true);
        if (idx === 0 && mergedFormatter.first) {
            template = mergedFormatter.first;
        }
        else if (mergedFormatter[unit]) {
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
            template = template || defaultLeveledFormatter.none;
        }

        if (zrUtil.isArray(template)) {
            const levelId = tick.level == null
                ? 0
                : (tick.level >= 0 ? tick.level : template.length + tick.level);
            template = template[levelId];
        }
    }

    return format(new Date(tick.value), template, isUTC);
}

export function getUnitFromValue (
    value: number | string | Date,
    isUTC: boolean,
    primaryOnly: boolean
): TimeUnit {
    const date = numberUtil.parseDate(value);
    const utc = isUTC ? 'UTC' : '';
    const M = (date as any)['get' + utc + 'Month']() + 1;
    const w = (date as any)['get' + utc + 'Day']();
    const d = (date as any)['get' + utc + 'Date']();
    const h = (date as any)['get' + utc + 'Hours']();
    const m = (date as any)['get' + utc + 'Minutes']();
    const s = (date as any)['get' + utc + 'Seconds']();
    const S = (date as any)['get' + utc + 'Milliseconds']();

    const isSecond = S === 0;
    const isMinute = isSecond && s === 0;
    const isHour = isMinute && m === 0;
    const isDay = isHour && h === 0;
    const isWeek = isDay && w === 0; // TODO: first day to be configured
    const isMonth = isDay && d === 1;
    const isQuarter = isMonth && (M % 3 === 1);
    const isYear = isMonth && M === 1;

    if (isYear) {
        return 'year';
    }
    else if (isQuarter && !primaryOnly) {
        return 'quarter';
    }
    else if (isMonth) {
        return 'month';
    }
    else if (isWeek && !primaryOnly) {
        return 'week';
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

export function getUnitValue (
    value: number | Date,
    unit?: TimeUnit,
    isUTC?: boolean
) : number {
    const date = typeof value === 'number'
        ? numberUtil.parseDate(value) as any
        : value;
    unit = unit || getUnitFromValue(value, isUTC, true);
    const utc = isUTC ? 'UTC' : '';

    switch (unit) {
        case 'millisecond':
            return date['get' + utc + 'Milliseconds']();
        case 'second':
            return date['get' + utc + 'Seconds']();
        case 'minute':
            return date['get' + utc + 'Minutes']();
        case 'hour':
            return date['get' + utc + 'Hours']();
        case 'day':
            return date['get' + utc + 'Date']();
        case 'month':
            return date['get' + utc + 'Month']();
        case 'year':
            return date['get' + utc + 'FullYear']();
    }
}
