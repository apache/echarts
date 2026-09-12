
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

import {
    addTimeInTimeZone,
    format,
    getSystemTimeZone,
    getTimeZoneParts,
    getUnitFromValue,
    leveledFormat,
    roundTime,
    validateTimeZone
} from '@/src/util/time';
import { getDefaultLocaleModel } from '@/src/core/locale';

describe('util/time', function () {

    afterEach(function () {
        jest.restoreAllMocks();
    });

    it('warns when legacy boolean overloads are used', function () {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const time = Date.parse('2024-01-01T00:00:00.000Z');

        format(time, '{yyyy}', true);
        leveledFormat({ value: time }, 0, '{yyyy}', getDefaultLocaleModel(), true);
        getUnitFromValue(time, true);
        roundTime(new Date(time), 'year', true);

        expect(warn.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining([
            expect.stringContaining('[echarts.time.format]isUTC boolean parameter is deprecated'),
            expect.stringContaining('[leveledFormat]isUTC boolean parameter is deprecated'),
            expect.stringContaining('[getUnitFromValue]isUTC boolean parameter is deprecated'),
            expect.stringContaining('[echarts.time.roundTime]isUTC boolean parameter is deprecated')
        ]));
    });

    describe('format', function () {

        const time = new Date('2003-04-09 01:04:02.300 UTC');
        const anotherTime = new Date('2023-12-19 11:44:33.003 UTC');
        const oneMoreTime = new Date('2023-01-12 13:09:01.035 UTC');

        // test {yyyy}, {yy} ...
        it('should format year', function () {
            expect(format(time, '{yyyy}', true)).toEqual('2003');
            expect(format(time, '{yy}', true)).toEqual('03');

            expect(format(anotherTime, '{yyyy}', true)).toEqual('2023');
            expect(format(anotherTime, '{yy}', true)).toEqual('23');
        });

        // test {Q}...
        it('should format quarter', function () {
            expect(format(time, '{Q}', true)).toEqual('2');
            expect(format(anotherTime, '{Q}', true)).toEqual('4');
        });


        // test {MMMM}, {MMM} {MM}, {M} ...
        it('should format month', function () {
            expect(format(time, '{MMMM}', true)).toEqual('April');
            expect(format(time, '{MMM}', true)).toEqual('Apr');
            expect(format(time, '{MM}', true)).toEqual('04');
            expect(format(time, '{M}', true)).toEqual('4');

            expect(format(anotherTime, '{MMMM}', true)).toEqual('December');
            expect(format(anotherTime, '{MMM}', true)).toEqual('Dec');
            expect(format(anotherTime, '{MM}', true)).toEqual('12');
            expect(format(anotherTime, '{M}', true)).toEqual('12');
        });

        // test {dd}, {d} ...
        it('should format day', function () {
            expect(format(time, '{dd}', true)).toEqual('09');
            expect(format(time, '{d}', true)).toEqual('9');

            expect(format(anotherTime, '{dd}', true)).toEqual('19');
            expect(format(anotherTime, '{d}', true)).toEqual('19');
        });

        // test {eeee}, {ee}, {e} ...
        it('should format day of week', function () {
            expect(format(time, '{eeee}', true)).toEqual('Wednesday');
            expect(format(time, '{ee}', true)).toEqual('Wed');
            expect(format(time, '{e}', true)).toEqual('3');

            expect(format(anotherTime, '{eeee}', true)).toEqual('Tuesday');
            expect(format(anotherTime, '{ee}', true)).toEqual('Tue');
            expect(format(anotherTime, '{e}', true)).toEqual('2');
        });

        // test {HH}, {H} ...
        it('should format hour', function () {
            expect(format(time, '{HH}', true)).toEqual('01');
            expect(format(time, '{H}', true)).toEqual('1');

            expect(format(anotherTime, '{HH}', true)).toEqual('11');
            expect(format(anotherTime, '{H}', true)).toEqual('11');
        });

        // test {hh}, {h} ...
        it('should format hour', function () {
            expect(format(time, '{hh}', true)).toEqual('01');
            expect(format(time, '{h}', true)).toEqual('1');

            expect(format(anotherTime, '{hh}', true)).toEqual('11');
            expect(format(anotherTime, '{h}', true)).toEqual('11');
        });

        // test {mm}, {m} ...
        it('should format minute', function () {
            expect(format(time, '{mm}', true)).toEqual('04');
            expect(format(time, '{m}', true)).toEqual('4');

            expect(format(anotherTime, '{mm}', true)).toEqual('44');
            expect(format(anotherTime, '{m}', true)).toEqual('44');
        });

        // test {ss}, {s} ...
        it('should format second', function () {
            expect(format(time, '{ss}', true)).toEqual('02');
            expect(format(time, '{s}', true)).toEqual('2');

            expect(format(anotherTime, '{ss}', true)).toEqual('33');
            expect(format(anotherTime, '{s}', true)).toEqual('33');
        });


        // test {SSS} ...
        it('should format millisecond', function () {
            expect(format(time, '{SSS}', true)).toEqual('300');
            expect(format(anotherTime, '{SSS}', true)).toEqual('003');
        });

        // test {S} ...
        it('should format millisecond', function () {
            expect(format(time, '{S}', true)).toEqual('300');
            expect(format(anotherTime, '{S}', true)).toEqual('3');
        });

        // test {a} ...
        it('should format meridian', function () {
            expect(format(time, '{a}', true)).toEqual('am');
            expect(format(anotherTime, '{a}', true)).toEqual('am');
            expect(format(oneMoreTime, '{a}', true)).toEqual('pm');
        });

        it('should format meridian in uppercase', function () {
            expect(format(time, '{A}', true)).toEqual('AM');
            expect(format(anotherTime, '{A}', true)).toEqual('AM');
            expect(format(oneMoreTime, '{A}', true)).toEqual('PM');
        });

        it('should format time zone offsets', function () {
            const time = Date.parse('2024-01-15T12:00:00.000Z');

            expect(format(time, '{Z} {ZZ}', 'UTC')).toEqual('Z Z');
            expect(format(time, '{Z} {ZZ}', 'Africa/Abidjan')).toEqual('+0 +00:00');
            expect(format(time, '{Z} {ZZ}', 'America/New_York')).toEqual('-5 -05:00');
            expect(format(time, '{Z} {ZZ}', 'America/St_Johns')).toEqual('-3:30 -03:30');
            expect(format(time, '{Z} {ZZ}', 'Asia/Kathmandu')).toEqual('+5:45 +05:45');
        });

        it('should format both offsets in a repeated DST hour', function () {
            const timeZone = 'America/New_York';
            const template = '{HH}:{mm} {Z} {ZZ}';

            expect(format(Date.parse('2024-11-03T01:30:00.000-04:00'), template, timeZone))
                .toEqual('01:30 -4 -04:00');
            expect(format(Date.parse('2024-11-03T01:30:00.000-05:00'), template, timeZone))
                .toEqual('01:30 -5 -05:00');
        });
    });

    describe('roundTime', function () {
        it('roundTime_UTC', function () {
            expect(roundTime(new Date(0), 'year', true).toISOString()).toEqual('1970-01-01T00:00:00.000Z');

            const time1 = 3600 * 1000 * 24 * 6122 + 12345678; // '1986-10-06T03:25:45.678Z'
            expect(roundTime(new Date(time1), 'year', true).toISOString()).toEqual('1986-01-01T00:00:00.000Z');
            expect(roundTime(new Date(time1), 'month', true).toISOString()).toEqual('1986-10-01T00:00:00.000Z');
            expect(roundTime(new Date(time1), 'day', true).toISOString()).toEqual('1986-10-06T00:00:00.000Z');
            expect(roundTime(new Date(time1), 'hour', true).toISOString()).toEqual('1986-10-06T03:00:00.000Z');
            expect(roundTime(new Date(time1), 'minute', true).toISOString()).toEqual('1986-10-06T03:25:00.000Z');
            expect(roundTime(new Date(time1), 'second', true).toISOString()).toEqual('1986-10-06T03:25:45.000Z');
            expect(roundTime(new Date(time1), 'millisecond', true).toISOString()).toEqual('1986-10-06T03:25:45.678Z');
        });

        it('roundTime_locale', function () {
            // The local UTC offset is date-dependent because of DST, so each
            // expected wall time must resolve its own offset.
            const time1 = makeLocalDate('1986-10-06T11:25:45.678');

            expect(roundTime(new Date(time1), 'year', false).getTime())
                .toEqual(makeLocalDate('1986-01-01T00:00:00.000').getTime());
            expect(roundTime(new Date(time1), 'month', false).getTime())
                .toEqual(makeLocalDate('1986-10-01T00:00:00.000').getTime());
            expect(roundTime(new Date(time1), 'day', false).getTime())
                .toEqual(makeLocalDate('1986-10-06T00:00:00.000').getTime());
            expect(roundTime(new Date(time1), 'hour', false).getTime())
                .toEqual(makeLocalDate('1986-10-06T11:00:00.000').getTime());
            expect(roundTime(new Date(time1), 'minute', false).getTime())
                .toEqual(makeLocalDate('1986-10-06T11:25:00.000').getTime());
            expect(roundTime(new Date(time1), 'second', false).getTime())
                .toEqual(makeLocalDate('1986-10-06T11:25:45.000').getTime());
            expect(roundTime(new Date(time1), 'millisecond', false).getTime())
                .toEqual(makeLocalDate('1986-10-06T11:25:45.678').getTime());
        });

        it('roundTime_TimeZone', function () {
            const timeZone = 'America/New_York';
            const time1 = new Date('1986-10-06T11:25:45.678-04:00');

            expect(roundTime(new Date(time1), 'year', timeZone).getTime())
                .toEqual(new Date('1986-01-01T00:00:00.000-05:00').getTime());
            expect(roundTime(new Date(time1), 'month', timeZone).getTime())
                .toEqual(new Date('1986-10-01T00:00:00.000-04:00').getTime());
            expect(roundTime(new Date(time1), 'day', timeZone).getTime())
                .toEqual(new Date('1986-10-06T00:00:00.000-04:00').getTime());
            expect(roundTime(new Date(time1), 'hour', timeZone).getTime())
                .toEqual(new Date('1986-10-06T11:00:00.000-04:00').getTime());
            expect(roundTime(new Date(time1), 'minute', timeZone).getTime())
                .toEqual(new Date('1986-10-06T11:25:00.000-04:00').getTime());
            expect(roundTime(new Date(time1), 'second', timeZone).getTime())
                .toEqual(new Date('1986-10-06T11:25:45.000-04:00').getTime());
            expect(roundTime(new Date(time1), 'millisecond', timeZone).getTime())
                .toEqual(new Date('1986-10-06T11:25:45.678-04:00').getTime());
        });

        it('preserves the occurrence when rounding a repeated DST hour', function () {
            const timeZone = 'America/New_York';
            const firstOccurrence = new Date('2024-11-03T01:45:00.000-04:00');
            const secondOccurrence = new Date('2024-11-03T01:45:00.000-05:00');

            expect(roundTime(firstOccurrence, 'hour', timeZone).getTime())
                .toBe(Date.parse('2024-11-03T01:00:00.000-04:00'));
            expect(roundTime(secondOccurrence, 'hour', timeZone).getTime())
                .toBe(Date.parse('2024-11-03T01:00:00.000-05:00'));
        });
    });

    describe('timeZone', function () {
        it('validates time zones', function () {
            expect(validateTimeZone('Europe/Paris')).toBe('Europe/Paris');
            expect(() => validateTimeZone('Not/A_Time_Zone')).toThrow(/Invalid time zone/);
        });

        it('rejects invalid time zones consistently in public helpers', function () {
            const value = Date.parse('2024-01-01T00:00:00.000Z');
            const timeZone = 'Not/A_Time_Zone';
            const error = `Invalid time zone: ${timeZone}`;

            expect(() => format(value, '{yyyy}', timeZone)).toThrow(error);
            expect(() => leveledFormat(
                { value: value }, 0, '{yyyy}', getDefaultLocaleModel(), timeZone
            )).toThrow(error);
            expect(() => getUnitFromValue(value, timeZone)).toThrow(error);
            expect(() => roundTime(new Date(value), 'year', timeZone)).toThrow(error);
            expect(() => format(value, '{yyyy}', '__proto__'))
                .toThrow('Invalid time zone: __proto__');
        });

        it('extracts civil parts and offsets in IANA time zones', function () {
            const winter = Date.parse('2024-01-15T07:34:56.789-05:00');
            const summer = Date.parse('2024-07-15T08:34:56.789-04:00');
            const kathmandu = Date.parse('2024-01-15T18:19:56.789+05:45');

            expect(getTimeZoneParts(winter, 'America/New_York')).toMatchObject({
                year: 2024,
                month: 1,
                day: 15,
                hours: 7,
                minutes: 34,
                seconds: 56,
                milliseconds: 789,
                offsetMinutes: -300
            });
            expect(getTimeZoneParts(summer, 'America/New_York')).toMatchObject({
                hours: 8,
                minutes: 34,
                offsetMinutes: -240
            });
            expect(getTimeZoneParts(kathmandu, 'Asia/Kathmandu')).toMatchObject({
                hours: 18,
                minutes: 19,
                offsetMinutes: 345
            });
        });

        it('distinguishes repeated civil time by its offset', function () {
            const firstOccurrence = getTimeZoneParts(
                Date.parse('2024-11-03T01:30:00.000-04:00'), 'America/New_York'
            );
            const secondOccurrence = getTimeZoneParts(
                Date.parse('2024-11-03T01:30:00.000-05:00'), 'America/New_York'
            );

            expect(firstOccurrence).toMatchObject({
                hours: 1,
                minutes: 30,
                offsetMinutes: -240
            });
            expect(secondOccurrence).toMatchObject({
                hours: 1,
                minutes: 30,
                offsetMinutes: -300
            });
        });

        it('uses compatible disambiguation in DST gaps and folds', function () {
            const springGap = addTimeInTimeZone(
                Date.parse('2024-03-10T01:30:00.000-05:00'),
                'hour', 1, 'America/New_York'
            );
            expect(springGap).toBe(Date.parse('2024-03-10T03:30:00.000-04:00'));

            const autumnFold = addTimeInTimeZone(
                Date.parse('2024-11-03T00:30:00.000-04:00'),
                'hour', 1, 'America/New_York'
            );
            expect(autumnFold).toBe(Date.parse('2024-11-03T01:30:00.000-04:00'));
        });

        it('advances fixed-duration units through both occurrences of a DST fold', function () {
            const timeZone = 'America/New_York';

            expect(addTimeInTimeZone(
                Date.parse('2024-11-03T01:30:00.000-04:00'), 'hour', 1, timeZone
            )).toBe(Date.parse('2024-11-03T01:30:00.000-05:00'));
            expect(addTimeInTimeZone(
                Date.parse('2024-11-03T01:59:00.000-04:00'), 'minute', 1, timeZone
            )).toBe(Date.parse('2024-11-03T01:00:00.000-05:00'));
            expect(addTimeInTimeZone(
                Date.parse('2024-11-03T01:59:59.000-04:00'), 'second', 1, timeZone
            )).toBe(Date.parse('2024-11-03T01:00:00.000-05:00'));
            expect(addTimeInTimeZone(
                Date.parse('2024-11-03T01:59:59.999-04:00'), 'millisecond', 1, timeZone
            )).toBe(Date.parse('2024-11-03T01:00:00.000-05:00'));
        });

        it('advances month and year units in the configured calendar', function () {
            const timeZone = 'America/New_York';
            const start = Date.parse('2024-02-01T00:00:00.000-05:00');

            expect(addTimeInTimeZone(start, 'month', 1, timeZone))
                .toBe(Date.parse('2024-03-01T00:00:00.000-05:00'));
            expect(addTimeInTimeZone(start, 'month', 2, timeZone))
                .toBe(Date.parse('2024-04-01T00:00:00.000-04:00'));
            expect(addTimeInTimeZone(start, 'year', 1, timeZone))
                .toBe(Date.parse('2025-02-01T00:00:00.000-05:00'));
        });

        it('classifies a timestamp using the configured time zone', function () {
            const value = Date.parse('2024-01-01T00:00:00.000Z');

            expect(getUnitFromValue(value, 'UTC')).toBe('year');
            expect(getUnitFromValue(value, 'America/New_York')).toBe('hour');
            expect(getUnitFromValue(value, true)).toBe('year');
        });

        it('handles non-hour time-zone transitions', function () {
            const halfHourGap = addTimeInTimeZone(
                Date.parse('2024-10-06T01:45:00.000+10:30'),
                'minute', 30, 'Australia/Lord_Howe'
            );
            expect(halfHourGap).toBe(Date.parse('2024-10-06T02:45:00.000+11:00'));

            const skippedDay = addTimeInTimeZone(
                Date.parse('2011-12-29T12:00:00.000-10:00'),
                'day', 1, 'Pacific/Apia'
            );
            expect(skippedDay).toBe(Date.parse('2011-12-31T12:00:00.000+14:00'));
        });

        it('caches scanned days and the transition within a day', function () {
            const timeZone = getSystemTimeZone() === 'Europe/Paris'
                ? 'America/New_York'
                : 'Europe/Paris';
            const isParis = timeZone === 'Europe/Paris';
            const formatToParts = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
            const ordinaryDay = Date.parse(
                isParis ? '2035-01-15T13:00:00.000+01:00' : '2035-01-15T07:00:00.000-05:00'
            );

            getTimeZoneParts(ordinaryDay, timeZone);
            const firstDayCalls = formatToParts.mock.calls.length;
            getTimeZoneParts(ordinaryDay + 60 * 60 * 1000, timeZone);
            expect(formatToParts.mock.calls.length).toBe(firstDayCalls);

            getTimeZoneParts(ordinaryDay + 24 * 60 * 60 * 1000, timeZone);
            expect(formatToParts.mock.calls.length).toBe(firstDayCalls + 1);

            const beforeTransition = Date.parse(
                isParis ? '2035-03-25T01:30:00.000+01:00' : '2035-03-11T01:30:00.000-05:00'
            );
            const afterTransition = Date.parse(
                isParis ? '2035-03-25T03:30:00.000+02:00' : '2035-03-11T03:30:00.000-04:00'
            );
            expect(getTimeZoneParts(beforeTransition, timeZone)).toMatchObject({
                hours: 1,
                minutes: 30
            });
            expect(getTimeZoneParts(afterTransition, timeZone)).toMatchObject({
                hours: 3,
                minutes: 30
            });
            const transitionDayCalls = formatToParts.mock.calls.length;

            getTimeZoneParts(beforeTransition, timeZone);
            getTimeZoneParts(afterTransition, timeZone);
            expect(formatToParts.mock.calls.length).toBe(transitionDayCalls);
        });

        it('uses preferred offsets only while valid for calendar targets', function () {
            const beforeSpring = Date.parse('2024-03-09T12:00:00.000-05:00');
            expect(addTimeInTimeZone(
                beforeSpring, 'day', 1, 'America/New_York'
            )).toBe(Date.parse('2024-03-10T12:00:00.000-04:00'));

            const beforeSpringGap = Date.parse('2024-03-09T02:30:00.000-05:00');
            expect(addTimeInTimeZone(
                beforeSpringGap, 'day', 1, 'America/New_York'
            )).toBe(Date.parse('2024-03-10T03:30:00.000-04:00'));

            const beforeAutumnFold = Date.parse('2024-11-02T01:30:00.000-04:00');
            expect(addTimeInTimeZone(
                beforeAutumnFold, 'day', 1, 'America/New_York'
            )).toBe(Date.parse('2024-11-03T01:30:00.000-04:00'));

            const afterAutumnFold = Date.parse('2024-11-04T01:30:00.000-05:00');
            expect(addTimeInTimeZone(
                afterAutumnFold, 'day', -1, 'America/New_York'
            )).toBe(Date.parse('2024-11-03T01:30:00.000-05:00'));

            const duringDay = Date.parse('2024-03-10T14:45:12.345-04:00');
            expect(roundTime(
                new Date(duringDay), 'day', 'America/New_York'
            ).getTime()).toBe(Date.parse('2024-03-10T00:00:00.000-05:00'));
        });

        it('formats the same instant in the configured time zone', function () {
            const instant = Date.parse('2024-07-15T08:34:56.789-04:00');
            expect(format(
                instant,
                '{yyyy}-{MM}-{dd} {HH}:{mm}:{ss} {SSS}',
                'America/New_York'
            )).toBe('2024-07-15 08:34:56 789');
        });
    });
});

function makeLocalDate(localTime: string): Date {
    const offsetMinutes = new Date(localTime).getTimezoneOffset();
    // Invert sign because getTimezoneOffset() returns minutes behind UTC
    const sign = offsetMinutes > 0 ? '-' : '+';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const offset = `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return new Date(`${localTime}${offset}`);
}
