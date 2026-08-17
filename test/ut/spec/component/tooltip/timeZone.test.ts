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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '@/src/echarts';
import { normalizeTooltipFormatResult } from '@/src/model/mixin/dataFormat';
import {
    buildTooltipMarkup,
    createTooltipMarkup,
    TooltipMarkupNameValueBlock,
    TooltipMarkupSection,
    TooltipMarkupStyleCreator
} from '@/src/component/tooltip/tooltipMarkup';

describe('tooltip_timeZone', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('formats each temporal series dimension in its axis time zone', function () {
        const xValue = Date.parse('2024-07-15T08:00:00.000-04:00');
        const yValue = Date.parse('2024-07-15T15:00:00.000+02:00');
        chart.setOption({
            timeZone: 'UTC',
            xAxis: { type: 'time', timeZone: 'America/New_York' },
            yAxis: { type: 'time', timeZone: 'Europe/Paris' },
            series: [{ type: 'line', data: [[xValue, yValue]] }]
        });

        const series = getECModel(chart).getSeriesByIndex(0);
        const fragment = normalizeTooltipFormatResult(
            series.formatTooltip(0, false, null)
        ).frag as TooltipMarkupSection;
        const valueBlock = fragment.blocks[0] as TooltipMarkupNameValueBlock;

        expect(valueBlock.timeZone).toEqual(['America/New_York', 'Europe/Paris']);

        const tooltipText = buildTooltipMarkup(
            fragment,
            new TooltipMarkupStyleCreator(),
            'html',
            'seriesAsc',
            series.ecModel.getTimeZone(),
            {}
        );
        expect(tooltipText).toContain('2024-07-15 08:00:00');
        expect(tooltipText).toContain('2024-07-15 15:00:00');
    });

    it('assigns axis time zones to named tooltip sub-blocks', function () {
        const xValue = Date.parse('2024-07-15T08:00:00.000-04:00');
        const yValue = Date.parse('2024-07-15T15:00:00.000+02:00');
        chart.setOption({
            timeZone: 'UTC',
            xAxis: { type: 'time', timeZone: 'America/New_York' },
            yAxis: { type: 'time', timeZone: 'Europe/Paris' },
            series: [{
                type: 'line',
                dimensions: [
                    { name: 'xTime', type: 'time' },
                    { name: 'yTime', type: 'time' }
                ],
                encode: {
                    x: 'xTime',
                    y: 'yTime',
                    tooltip: ['xTime', 'yTime']
                },
                data: [[xValue, yValue]]
            }]
        });

        const series = getECModel(chart).getSeriesByIndex(0);
        const fragment = normalizeTooltipFormatResult(
            series.formatTooltip(0, false, null)
        ).frag as TooltipMarkupSection;
        const timeBlocks = fragment.blocks.filter(
            block => block.type === 'nameValue' && block.name
        ) as TooltipMarkupNameValueBlock[];

        expect(timeBlocks.map(block => block.timeZone))
            .toEqual(['America/New_York', 'Europe/Paris']);

        const tooltipText = buildTooltipMarkup(
            fragment,
            new TooltipMarkupStyleCreator(),
            'html',
            'seriesAsc',
            series.ecModel.getTimeZone(),
            {}
        );
        expect(tooltipText).toContain('2024-07-15 08:00:00');
        expect(tooltipText).toContain('2024-07-15 15:00:00');
    });

    it('uses scalar and fallback time zones when building markup', function () {
        const value = Date.parse('2024-07-15T12:00:00.000Z');
        const styleCreator = new TooltipMarkupStyleCreator();
        const explicitTimeZone = createTooltipMarkup('nameValue', {
            value: value,
            valueType: 'time',
            timeZone: 'America/New_York'
        });
        const fallbackTimeZone = createTooltipMarkup('nameValue', {
            value: value,
            valueType: 'time'
        });

        expect(buildTooltipMarkup(
            explicitTimeZone, styleCreator, 'html', 'seriesAsc', 'Europe/Paris', {}
        )).toContain('2024-07-15 08:00:00');
        expect(buildTooltipMarkup(
            fallbackTimeZone, styleCreator, 'html', 'seriesAsc', 'Europe/Paris', {}
        )).toContain('2024-07-15 14:00:00');
    });

    it('formats an axis tooltip with the time zone of that axis', function () {
        const value = Date.parse('2024-11-03T01:30:00.000-05:00');
        chart.setOption({
            animation: false,
            timeZone: 'UTC',
            tooltip: {
                trigger: 'axis',
                renderMode: 'html',
                formatter: '{yyyy}-{MM}-{dd} {HH}:{mm} {ZZ}'
            },
            xAxis: {
                type: 'time',
                timeZone: 'America/New_York',
                min: Date.parse('2024-11-03T00:00:00.000-04:00'),
                max: Date.parse('2024-11-03T03:00:00.000-05:00')
            },
            yAxis: {},
            series: [{ type: 'line', data: [[value, 1]] }]
        });

        chart.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: 0
        });

        expect(chart.getDom().innerHTML).toContain('2024-11-03 01:30 -05:00');
    });

    it('renders an item tooltip through TooltipView in the axis time zone', function () {
        const value = Date.parse('2024-07-15T08:00:00.000-04:00');
        chart.setOption({
            animation: false,
            timeZone: 'UTC',
            tooltip: {
                trigger: 'item',
                renderMode: 'html'
            },
            xAxis: { type: 'time', timeZone: 'America/New_York' },
            yAxis: {},
            series: [{
                type: 'line',
                encode: { tooltip: [0, 1] },
                data: [[value, 1]]
            }]
        });

        chart.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: 0
        });

        expect(chart.getDom().innerHTML).toContain('2024-07-15 08:00:00');
    });
});
