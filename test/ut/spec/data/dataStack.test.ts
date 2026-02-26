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

import { createChart, removeChart, getECModel } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts.all';

describe('dataStack', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        removeChart(chart);
    });

    describe('time axis stacking', function () {

        it('stack_by_time_value_not_array_index', function () {
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    {
                        name: 'A',
                        type: 'bar',
                        data: [['2025-01-01', 4], ['2025-02-01', 8]],
                        stack: 'stack1'
                    },
                    {
                        name: 'B',
                        type: 'bar',
                        data: [['2025-02-01', 3], ['2025-01-01', 9]],
                        stack: 'stack1'
                    }
                ]
            });

            const dataA = getECModel(chart).getSeriesByIndex(0).getData();
            const dataB = getECModel(chart).getSeriesByIndex(1).getData();

            const stackResultDimA = dataA.getCalculationInfo('stackResultDimension');
            expect(dataA.get(stackResultDimA, 0)).toEqual(4);
            expect(dataA.get(stackResultDimA, 1)).toEqual(8);

            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataB.get(stackResultDimB, 0)).toEqual(11);
            expect(dataB.get(stackedOverDimB, 0)).toEqual(8);
            expect(dataB.get(stackResultDimB, 1)).toEqual(13);
            expect(dataB.get(stackedOverDimB, 1)).toEqual(4);

            expect(dataB.get(stackResultDimB, 0)).not.toEqual(7);
            expect(dataB.get(stackResultDimB, 1)).not.toEqual(17);
        });

        it('time_axis_uses_value_based_stacking', function () {
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [{
                    name: 'A',
                    type: 'bar',
                    data: [['2025-01-01', 4], ['2025-02-01', 8]],
                    stack: 'stack1'
                }]
            });

            const data = getECModel(chart).getSeriesByIndex(0).getData();

            expect(data.getDimensionInfo('x')?.type).toBe('time');
            expect(data.getCalculationInfo('stackedDimension')).toBeTruthy();
            expect(data.getCalculationInfo('stackedByDimension')).toBeTruthy();
            expect(data.getCalculationInfo('isStackedByIndex')).not.toBe(true);
        });

        it('category_axis_stacking', function () {
            chart.setOption({
                xAxis: { type: 'category', data: ['Jan', 'Feb'] },
                yAxis: { type: 'value' },
                series: [
                    { name: 'A', type: 'bar', data: [4, 8], stack: 'stack1' },
                    { name: 'B', type: 'bar', data: [3, 9], stack: 'stack1' }
                ]
            });

            const dataB = getECModel(chart).getSeriesByIndex(1).getData();
            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataB.get(stackResultDimB, 0)).toEqual(7);
            expect(dataB.get(stackedOverDimB, 0)).toEqual(4);
            expect(dataB.get(stackResultDimB, 1)).toEqual(17);
            expect(dataB.get(stackedOverDimB, 1)).toEqual(8);
        });

        it('undefined_value_in_first_series', function () {
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    {
                        name: 'A',
                        type: 'bar',
                        data: [['2025-01-01', undefined], ['2025-02-01', 8]],
                        stack: 'stack1'
                    },
                    {
                        name: 'B',
                        type: 'bar',
                        data: [['2025-01-01', 5], ['2025-02-01', 3]],
                        stack: 'stack1'
                    }
                ]
            });

            const dataA = getECModel(chart).getSeriesByIndex(0).getData();
            const dataB = getECModel(chart).getSeriesByIndex(1).getData();

            const stackResultDimA = dataA.getCalculationInfo('stackResultDimension');
            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataA.get(stackResultDimA, 0)).toBeNaN();
            expect(dataA.get(stackResultDimA, 1)).toEqual(8);

            expect(dataB.get(stackResultDimB, 0)).toEqual(5);
            expect(dataB.get(stackedOverDimB, 0)).toBeNaN();
            expect(dataB.get(stackResultDimB, 1)).toEqual(11);
            expect(dataB.get(stackedOverDimB, 1)).toEqual(8);
        });

        it('null_value_in_first_series', function () {
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    {
                        name: 'A',
                        type: 'bar',
                        data: [['2025-01-01', null], ['2025-02-01', 8]],
                        stack: 'stack1'
                    },
                    {
                        name: 'B',
                        type: 'bar',
                        data: [['2025-01-01', 5], ['2025-02-01', 3]],
                        stack: 'stack1'
                    }
                ]
            });

            const dataA = getECModel(chart).getSeriesByIndex(0).getData();
            const dataB = getECModel(chart).getSeriesByIndex(1).getData();

            const stackResultDimA = dataA.getCalculationInfo('stackResultDimension');
            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataA.get(stackResultDimA, 0)).toBeNaN();
            expect(dataA.get(stackResultDimA, 1)).toEqual(8);

            expect(dataB.get(stackResultDimB, 0)).toEqual(5);
            expect(dataB.get(stackedOverDimB, 0)).toBeNaN();
            expect(dataB.get(stackResultDimB, 1)).toEqual(11);
            expect(dataB.get(stackedOverDimB, 1)).toEqual(8);
        });

        it('many_datapoints_100', function () {
            const seriesDataA: [string, number][] = [];
            const seriesDataB: [string, number][] = [];

            for (let i = 0; i < 100; i++) {
                const dateStr = new Date(2025, 0, i + 1).toISOString().split('T')[0];
                seriesDataA.push([dateStr, i + 1]);
                seriesDataB.push([dateStr, (i + 1) * 2]);
            }

            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    { name: 'A', type: 'bar', data: seriesDataA, stack: 'stack1' },
                    { name: 'B', type: 'bar', data: seriesDataB, stack: 'stack1' }
                ]
            });

            const dataA = getECModel(chart).getSeriesByIndex(0).getData();
            const dataB = getECModel(chart).getSeriesByIndex(1).getData();

            const stackResultDimA = dataA.getCalculationInfo('stackResultDimension');
            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataA.count()).toEqual(100);
            expect(dataB.count()).toEqual(100);

            expect(dataA.get(stackResultDimA, 0)).toEqual(1);
            expect(dataB.get(stackResultDimB, 0)).toEqual(3);
            expect(dataB.get(stackedOverDimB, 0)).toEqual(1);

            expect(dataA.get(stackResultDimA, 50)).toEqual(51);
            expect(dataB.get(stackResultDimB, 50)).toEqual(153);
            expect(dataB.get(stackedOverDimB, 50)).toEqual(51);

            expect(dataA.get(stackResultDimA, 99)).toEqual(100);
            expect(dataB.get(stackResultDimB, 99)).toEqual(300);
            expect(dataB.get(stackedOverDimB, 99)).toEqual(100);
        });

        it('many_datapoints_reverse_order', function () {
            const seriesDataA: [string, number][] = [];
            const seriesDataB: [string, number][] = [];

            for (let i = 0; i < 50; i++) {
                const dateStr = new Date(2025, 0, i + 1).toISOString().split('T')[0];
                seriesDataA.push([dateStr, i + 1]);
            }

            for (let i = 49; i >= 0; i--) {
                const dateStr = new Date(2025, 0, i + 1).toISOString().split('T')[0];
                seriesDataB.push([dateStr, (i + 1) * 2]);
            }

            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    { name: 'A', type: 'bar', data: seriesDataA, stack: 'stack1' },
                    { name: 'B', type: 'bar', data: seriesDataB, stack: 'stack1' }
                ]
            });

            const dataB = getECModel(chart).getSeriesByIndex(1).getData();
            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataB.get(stackResultDimB, 0)).toEqual(150);
            expect(dataB.get(stackedOverDimB, 0)).toEqual(50);
            expect(dataB.get(stackResultDimB, 49)).toEqual(3);
            expect(dataB.get(stackedOverDimB, 49)).toEqual(1);
        });

        it('sparse_data_with_gaps', function () {
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    {
                        name: 'A',
                        type: 'bar',
                        data: [['2025-01-01', 10], ['2025-03-01', 30]],
                        stack: 'stack1'
                    },
                    {
                        name: 'B',
                        type: 'bar',
                        data: [['2025-01-01', 1], ['2025-02-01', 2], ['2025-03-01', 3]],
                        stack: 'stack1'
                    }
                ]
            });

            const dataB = getECModel(chart).getSeriesByIndex(1).getData();
            const stackResultDimB = dataB.getCalculationInfo('stackResultDimension');
            const stackedOverDimB = dataB.getCalculationInfo('stackedOverDimension');

            expect(dataB.get(stackResultDimB, 0)).toEqual(11);
            expect(dataB.get(stackedOverDimB, 0)).toEqual(10);
            expect(dataB.get(stackResultDimB, 1)).toEqual(2);
            expect(dataB.get(stackedOverDimB, 1)).toBeNaN();
            expect(dataB.get(stackResultDimB, 2)).toEqual(33);
            expect(dataB.get(stackedOverDimB, 2)).toEqual(30);
        });

        it('mixed_null_values_multiple_series', function () {
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [
                    {
                        name: 'A',
                        type: 'bar',
                        data: [['2025-01-01', null], ['2025-02-01', 10], ['2025-03-01', 20]],
                        stack: 'stack1'
                    },
                    {
                        name: 'B',
                        type: 'bar',
                        data: [['2025-01-01', 5], ['2025-02-01', null], ['2025-03-01', 15]],
                        stack: 'stack1'
                    },
                    {
                        name: 'C',
                        type: 'bar',
                        data: [['2025-01-01', 3], ['2025-02-01', 7], ['2025-03-01', null]],
                        stack: 'stack1'
                    }
                ]
            });

            const dataC = getECModel(chart).getSeriesByIndex(2).getData();
            const stackResultDimC = dataC.getCalculationInfo('stackResultDimension');
            const stackedOverDimC = dataC.getCalculationInfo('stackedOverDimension');

            expect(dataC.get(stackResultDimC, 0)).toEqual(8);
            expect(dataC.get(stackedOverDimC, 0)).toEqual(5);
            expect(dataC.get(stackResultDimC, 1)).toEqual(17);
            expect(dataC.get(stackedOverDimC, 1)).toEqual(10);
            expect(dataC.get(stackResultDimC, 2)).toBeNaN();
        });
    });
});
