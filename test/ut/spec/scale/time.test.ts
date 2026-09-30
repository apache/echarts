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

import { createChart, getECModel } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts';
import CartesianAxisModel from '@/src/coord/cartesian/AxisModel';
import TimeScale from '@/src/scale/Time';
import { getSystemTimeZone, getTimeZoneParts } from '@/src/util/time';

describe('scale_timeZone', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        jest.restoreAllMocks();
        chart.dispose();
    });

    it('resolves global, legacy UTC and axis time zones at scale creation', function () {
        chart.setOption({
            timeZone: 'America/New_York',
            xAxis: [
                { type: 'time' },
                { type: 'time', timeZone: 'Europe/Paris' }
            ],
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('America/New_York');
        expect(getTimeScale(chart, 'xAxis', 1).getTimeZone()).toBe('Europe/Paris');
        expect(chart.getOption().useUTC).toBe(false);

        chart.dispose();
        chart = createChart();
        chart.setOption({
            useUTC: true,
            xAxis: [
                { type: 'time' },
                { type: 'time', timeZone: 'Europe/Paris' }
            ],
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });
        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('UTC');
        expect(getTimeScale(chart, 'xAxis', 1).getTimeZone()).toBe('Europe/Paris');
    });

    it('resolves the system time zone when useUTC is absent or false', function () {
        chart.setOption({
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });
        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe(getSystemTimeZone());

        chart.dispose();
        chart = createChart();
        chart.setOption({
            useUTC: false,
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });
        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe(getSystemTimeZone());
    });

    it('rejects invalid global and axis time zones', function () {
        expect(() => chart.setOption({
            timeZone: 'Not/A_Time_Zone',
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        })).toThrow(/Invalid time zone/);

        chart.dispose();
        chart = createChart();
        expect(() => chart.setOption({
            xAxis: { type: 'time', timeZone: 'Not/A_Time_Zone' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        })).toThrow(/Invalid time zone/);
    });

    it('prefers global timeZone over legacy useUTC', function () {
        chart.setOption({
            timeZone: 'Europe/Paris',
            useUTC: true,
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('Europe/Paris');
        expect(chart.getOption().useUTC).toBe(true);
    });

    it('keeps timeZone precedence across merged and round-tripped options', function () {
        chart.setOption({
            useUTC: true,
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        chart.setOption({ timeZone: 'Europe/Paris' });
        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('Europe/Paris');

        chart.setOption({ useUTC: false });
        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('Europe/Paris');

        chart.setOption(chart.getOption());
        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('Europe/Paris');
    });

    it('allows a media option to override the base time-zone mode', function () {
        chart.setOption({
            baseOption: {
                useUTC: true,
                xAxis: { type: 'time' },
                yAxis: {},
                series: [{ type: 'line', data: [] }]
            },
            media: [{
                option: { timeZone: 'Europe/Paris' }
            }]
        });

        expect(getTimeScale(chart, 'xAxis', 0).getTimeZone()).toBe('Europe/Paris');
    });

    it('recreates the effective scale context when timeZone changes', function () {
        chart.setOption({
            timeZone: 'UTC',
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });
        const utcScale = getTimeScale(chart, 'xAxis', 0);

        chart.setOption({ timeZone: 'Europe/Paris' });
        const parisScale = getTimeScale(chart, 'xAxis', 0);

        expect(parisScale).not.toBe(utcScale);
        expect(parisScale.getTimeZone()).toBe('Europe/Paris');
    });

    it('formats labels in the axis time zone', function () {
        const value = Date.parse('2024-07-15T08:34:56.000-04:00');
        chart.setOption({
            timeZone: 'UTC',
            xAxis: {
                type: 'time',
                timeZone: 'America/New_York',
                min: value - 1000,
                max: value + 1000
            },
            yAxis: {},
            series: [{ type: 'line', data: [[value, 1]] }]
        });

        expect(getTimeScale(chart, 'xAxis', 0).getLabel({ value: value }))
            .toContain('08:34:56');
    });

    it('formats both occurrences of a repeated hour with their offsets', function () {
        const timeZone = 'America/New_York';
        chart.setOption({
            xAxis: { type: 'time', timeZone: timeZone },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });
        const scale = getTimeScale(chart, 'xAxis', 0);
        const formatter = '{HH}:{mm} {ZZ}';

        expect(scale.getFormattedLabel({
            value: Date.parse('2024-11-03T01:30:00.000-04:00')
        }, 0, formatter)).toBe('01:30 -04:00');
        expect(scale.getFormattedLabel({
            value: Date.parse('2024-11-03T01:30:00.000-05:00')
        }, 1, formatter)).toBe('01:30 -05:00');
    });

    it('aligns hourly ticks to wall time through a DST gap', function () {
        chart.setOption({
            xAxis: {
                type: 'time',
                timeZone: 'America/New_York',
                min: Date.parse('2024-03-10T00:00:00.000-05:00'),
                max: Date.parse('2024-03-10T05:00:00.000-04:00'),
                splitNumber: 4
            },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        const scale = getTimeScale(chart, 'xAxis', 0);
        const hourlyLabels = scale.getTicks()
            .filter(tick => tick.time && tick.time.upperTimeUnit === 'hour')
            .map(tick => scale.getLabel(tick));

        expect(hourlyLabels.some(label => label.indexOf('02:00') >= 0)).toBe(false);
        expect(hourlyLabels.some(label => label.indexOf('01:00') >= 0)).toBe(true);
        expect(hourlyLabels.some(label => label.indexOf('03:00') >= 0)).toBe(true);
    });

    it('keeps hourly ticks monotonic through both occurrences of a DST fold', function () {
        const firstOccurrence = Date.parse('2024-11-03T01:00:00.000-04:00');
        const secondOccurrence = Date.parse('2024-11-03T01:00:00.000-05:00');
        chart.setOption({
            xAxis: {
                type: 'time',
                timeZone: 'America/New_York',
                min: Date.parse('2024-11-03T00:00:00.000-04:00'),
                max: Date.parse('2024-11-03T03:00:00.000-05:00'),
                splitNumber: 4
            },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        const ticks = getTimeScale(chart, 'xAxis', 0).getTicks();
        const values = ticks.map(tick => tick.value);

        expect(values).toContain(firstOccurrence);
        expect(values).toContain(secondOccurrence);
        for (let i = 1; i < values.length; i++) {
            expect(values[i]).toBeGreaterThan(values[i - 1]);
        }
    });

    it('aligns daily ticks to local midnight across DST', function () {
        const timeZone = 'America/New_York';
        const beforeTransition = Date.parse('2024-03-10T00:00:00.000-05:00');
        const afterTransition = Date.parse('2024-03-11T00:00:00.000-04:00');
        chart.setOption({
            xAxis: {
                type: 'time',
                timeZone: timeZone,
                min: Date.parse('2024-03-08T00:00:00.000-05:00'),
                max: Date.parse('2024-03-13T00:00:00.000-04:00'),
                splitNumber: 5
            },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        const tickValues = getTimeScale(chart, 'xAxis', 0).getTicks().map(tick => tick.value);
        expect(tickValues).toContain(beforeTransition);
        expect(tickValues).toContain(afterTransition);
        expect(afterTransition - beforeTransition).toBe(23 * 60 * 60 * 1000);
    });

    it('aligns month and year ticks to the IANA calendar', function () {
        const timeZone = 'America/New_York';
        chart.setOption({
            xAxis: {
                type: 'time',
                timeZone: timeZone,
                min: Date.parse('2023-10-15T00:00:00.000-04:00'),
                max: Date.parse('2025-03-15T00:00:00.000-04:00'),
                splitNumber: 6
            },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        const calendarTicks = getTimeScale(chart, 'xAxis', 0).getTicks()
            .map(tick => ({
                tick: tick,
                parts: getTimeZoneParts(tick.value, timeZone)
            }))
            .filter(item => item.parts.day === 1 && item.parts.hours === 0);

        expect(calendarTicks.length).toBeGreaterThan(2);
        expect(calendarTicks.some(item =>
            item.parts.year === 2024 && item.parts.month === 1
        )).toBe(true);
        expect(calendarTicks.some(item =>
            item.parts.year === 2025 && item.parts.month === 1
        )).toBe(true);
    });

    it('formats time-axis break boundaries in the axis time zone', function () {
        const timeZone = 'America/New_York';
        const breakStart = Date.parse('2024-03-10T01:30:00.000-05:00');
        const breakEnd = Date.parse('2024-03-10T03:30:00.000-04:00');
        chart.setOption({
            xAxis: {
                type: 'time',
                timeZone: timeZone,
                min: Date.parse('2024-03-10T00:00:00.000-05:00'),
                max: Date.parse('2024-03-10T05:00:00.000-04:00'),
                breaks: [{ start: breakStart, end: breakEnd, gap: 0 }]
            },
            yAxis: {},
            series: [{ type: 'line', data: [] }]
        });

        const scale = getTimeScale(chart, 'xAxis', 0);
        const breakTicks = scale.getTicks().filter(tick => tick.break);
        expect(breakTicks.map(tick => tick.value)).toEqual([breakStart, breakEnd]);
        expect(breakTicks.map((tick, idx) => scale.getFormattedLabel(
            tick, idx, '{HH}:{mm} {ZZ}'
        ))).toEqual(['01:30 -05:00', '03:30 -04:00']);
    });

    it('does not perform zoned calendar conversion for every data point', function () {
        const format = jest.spyOn(Intl.DateTimeFormat.prototype, 'format', 'get');
        const formatToParts = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
        const start = Date.parse('2024-01-01T00:00:00.000-05:00');
        const data: number[][] = [];
        for (let i = 0; i < 5000; i++) {
            data.push([start + i * 60 * 1000, i]);
        }

        chart.setOption({
            xAxis: { type: 'time', timeZone: 'America/New_York' },
            yAxis: {},
            series: [{ type: 'line', data: data }]
        });

        expect(format.mock.calls.length + formatToParts.mock.calls.length)
            .toBeLessThan(data.length / 5);
    });
});

function getTimeScale(
    chart: EChartsType,
    mainType: 'xAxis' | 'yAxis',
    index: number
): TimeScale {
    const axisModel = getECModel(chart).getComponent(mainType, index) as CartesianAxisModel;
    return axisModel.axis.scale as TimeScale;
}
