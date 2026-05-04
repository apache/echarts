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

import { EChartsType } from '@/src/echarts';
import SeriesModel from '@/src/model/Series';
import { createChart, getECModel } from '../../core/utHelper';

function getStackResultValue(chart: EChartsType, seriesIndex: number, dataIndex: number): number {
    const seriesModel = getECModel(chart).getSeriesByIndex(seriesIndex) as SeriesModel;
    const data = seriesModel.getData();
    return data.get(data.getCalculationInfo('stackResultDimension'), dataIndex) as number;
}

describe('series.line stack', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('normalizes stacked area values to the stack total', function () {
        chart.setOption({
            xAxis: {
                data: ['A', 'B']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [1, 2]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [3, 6]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [6, 2]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBeCloseTo(0.1);
        expect(getStackResultValue(chart, 1, 0)).toBeCloseTo(0.4);
        expect(getStackResultValue(chart, 2, 0)).toBeCloseTo(1);

        expect(getStackResultValue(chart, 0, 1)).toBeCloseTo(0.2);
        expect(getStackResultValue(chart, 1, 1)).toBeCloseTo(0.8);
        expect(getStackResultValue(chart, 2, 1)).toBeCloseTo(1);
    });

    it('normalizes negative stacked values with samesign strategy', function () {
        chart.setOption({
            xAxis: {
                data: ['A']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [-2]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [-3]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [5]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBeCloseTo(-0.4);
        expect(getStackResultValue(chart, 1, 0)).toBeCloseTo(-1);
        expect(getStackResultValue(chart, 2, 0)).toBeCloseTo(1);
    });

    it('normalizes stacked values with all strategy', function () {
        chart.setOption({
            xAxis: {
                data: ['A', 'B']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'all',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [2, -2]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'all',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [-1, -3]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'all',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [3, 1]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBeCloseTo(0.5);
        expect(getStackResultValue(chart, 1, 0)).toBeCloseTo(0.25);
        expect(getStackResultValue(chart, 2, 0)).toBeCloseTo(1);

        expect(getStackResultValue(chart, 0, 1)).toBeCloseTo(-0.5);
        expect(getStackResultValue(chart, 1, 1)).toBeCloseTo(-1.25);
        expect(getStackResultValue(chart, 2, 1)).toBeCloseTo(-1);
    });

    it('normalizes stacked values with positive strategy', function () {
        chart.setOption({
            xAxis: {
                data: ['A']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'positive',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [-1]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'positive',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [2]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'positive',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [3]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBeCloseTo(-0.2);
        expect(getStackResultValue(chart, 1, 0)).toBeCloseTo(0.4);
        expect(getStackResultValue(chart, 2, 0)).toBeCloseTo(1);
    });

    it('normalizes stacked values with negative strategy', function () {
        chart.setOption({
            xAxis: {
                data: ['A']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'negative',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [1]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'negative',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [-2]
                },
                {
                    type: 'line',
                    stack: 'total',
                    stackStrategy: 'negative',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [-3]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBeCloseTo(0.2);
        expect(getStackResultValue(chart, 1, 0)).toBeCloseTo(-0.4);
        expect(getStackResultValue(chart, 2, 0)).toBeCloseTo(-1);
    });

    it('keeps regular stacked values when stackNormalize is not enabled', function () {
        chart.setOption({
            xAxis: {
                data: ['A']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    areaStyle: {},
                    data: [1]
                },
                {
                    type: 'line',
                    stack: 'total',
                    areaStyle: {},
                    data: [3]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBe(1);
        expect(getStackResultValue(chart, 1, 0)).toBe(4);
    });

    it('keeps regular stacked values when only part of the stack enables stackNormalize', function () {
        chart.setOption({
            xAxis: {
                data: ['A']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    stack: 'total',
                    stackNormalize: true,
                    areaStyle: {},
                    data: [1]
                },
                {
                    type: 'line',
                    stack: 'total',
                    areaStyle: {},
                    data: [3]
                }
            ]
        });

        expect(getStackResultValue(chart, 0, 0)).toBe(1);
        expect(getStackResultValue(chart, 1, 0)).toBe(4);
    });
});
