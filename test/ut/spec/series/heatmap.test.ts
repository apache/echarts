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

import { EChartsType } from '@/src/echarts.all';
import { EChartsOption } from '@/src/export/option';
import { HeatmapSeriesOption } from '@/src/chart/heatmap/HeatmapSeries';
import Rect from 'zrender/src/graphic/shape/Rect';
import { createChart, getECModel } from '../../core/utHelper';


describe('heatmap cursor', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function setOption(option: EChartsOption): Promise<void> {
        return new Promise(function (resolve) {
            function onFinished() {
                chart.off('finished', onFinished);
                resolve();
            }
            chart.on('finished', onFinished);
            chart.setOption(option);
        });
    }

    function expectCursors(cursors: string[], progressive: boolean) {
        const series = getECModel(chart).getSeriesByIndex(0);
        const data = series.getData();
        expect(data.count()).toBe(cursors.length);
        expect(!!series.pipelineContext.progressiveRender).toBe(progressive);
        cursors.forEach(function (cursor, idx) {
            const el = data.getItemGraphicEl(idx) as Rect;
            expect(el).toBeDefined();
            expect(el.cursor).toBe(cursor);
            if (progressive) {
                expect(el.incremental).toBeTruthy();
            }
        });
    }

    (['cartesian2d', 'calendar', 'matrix'] as const).forEach(function (coordinateSystem) {
        [false, true].forEach(function (progressive) {
            describe(coordinateSystem + (progressive ? ' progressive' : ' normal'), function () {
                const values = coordinateSystem === 'calendar'
                    ? [['2026-01-01', 1], ['2026-01-02', 2], ['2026-01-03', 3]]
                    : [[0, 0, 1], [1, 0, 2], [2, 0, 3]];

                function makeOption(seriesOption: HeatmapSeriesOption = {}): EChartsOption {
                    const option: EChartsOption = {
                        animation: false,
                        visualMap: {min: 0, max: 3, show: false},
                        series: [{
                            type: 'heatmap',
                            coordinateSystem,
                            progressive: progressive ? 1 : 0,
                            progressiveThreshold: 1,
                            data: values,
                            ...seriesOption
                        }]
                    };
                    if (coordinateSystem === 'cartesian2d') {
                        option.xAxis = {type: 'category', data: ['a', 'b', 'c']};
                        option.yAxis = {type: 'category', data: ['row']};
                    }
                    else if (coordinateSystem === 'calendar') {
                        option.calendar = {range: '2026-01'};
                    }
                    else {
                        option.matrix = {x: {data: ['a', 'b', 'c']}, y: {data: ['row']}};
                    }
                    return option;
                }

                it('keeps the default cursor when omitted or empty', async function () {
                    await setOption(makeOption());
                    expectCursors(['pointer', 'pointer', 'pointer'], progressive);
                    await setOption({series: [{cursor: ''}]});
                    expectCursors(['pointer', 'pointer', 'pointer'], progressive);
                });

                it('applies the series cursor to tuple data', async function () {
                    await setOption(makeOption({cursor: 'crosshair'}));
                    expectCursors(['crosshair', 'crosshair', 'crosshair'], progressive);
                });

                it('inherits the series cursor without leaking item overrides', async function () {
                    const data = [
                        {value: values[0], cursor: 'help'},
                        values[1],
                        {value: values[2]}
                    ];
                    await setOption(makeOption({cursor: 'crosshair', data}));
                    expectCursors(['help', 'crosshair', 'crosshair'], progressive);
                });

                it('preserves item overrides when only the series cursor is cleared', async function () {
                    const data = [
                        {value: values[0], cursor: 'help'},
                        values[1],
                        {value: values[2]}
                    ];
                    await setOption(makeOption({cursor: 'crosshair', data}));
                    expectCursors(['help', 'crosshair', 'crosshair'], progressive);
                    await setOption({series: [{cursor: null}]});
                    expectCursors(['help', 'pointer', 'pointer'], progressive);
                });

                it('updates and resets series and item cursors with setOption', async function () {
                    const data = [
                        {value: values[0], cursor: 'help'},
                        values[1],
                        {value: values[2]}
                    ];
                    await setOption(makeOption({cursor: 'crosshair', data}));
                    await setOption({series: [{cursor: 'move'}]});
                    expectCursors(['help', 'move', 'move'], progressive);
                    await setOption({series: [{
                        data: [{value: values[0], cursor: 'wait'}, values[1], values[2]]
                    }]});
                    expectCursors(['wait', 'move', 'move'], progressive);
                    await setOption({series: [{cursor: null, data: values}]});
                    expectCursors(['pointer', 'pointer', 'pointer'], progressive);
                });
            });
        });
    });
});
