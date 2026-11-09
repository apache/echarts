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
import { createChart, getECModel } from '../../core/utHelper';
import SeriesModel from '@/src/model/Series';
import { RectLike } from 'zrender/src/core/BoundingRect';

describe('barStackMinHeight', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getItemLayout(seriesIndex: number, dataIndex: number): RectLike {
        const seriesModel = getECModel(chart).getSeriesByIndex(seriesIndex) as SeriesModel;
        return seriesModel.getData().getItemLayout(dataIndex);
    }

    function getStart(layout: RectLike, horizontal: boolean): number {
        return horizontal ? layout.x : layout.y;
    }

    function getEnd(layout: RectLike, horizontal: boolean): number {
        return horizontal ? layout.x + layout.width : layout.y + layout.height;
    }

    function valueToPixel(value: number, horizontal: boolean): number {
        return chart.convertToPixel(horizontal ? { xAxisIndex: 0 } : { yAxisIndex: 0 }, value) as number;
    }

    function setStackOption(horizontal: boolean, series: object[]) {
        const categoryAxis = { type: 'category', data: ['a', 'b'] };
        const valueAxis = { type: 'value' };
        chart.setOption({
            animation: false,
            xAxis: horizontal ? valueAxis : categoryAxis,
            yAxis: horizontal ? categoryAxis : valueAxis,
            series: series.map(item => ({ type: 'bar', stack: 'total', ...item }))
        });
    }

    const strategyCases = [
        { stackStrategy: 'samesign', lowerData: [0.1, -0.1], upperData: [50, -50] },
        { stackStrategy: 'all', lowerData: [0.1, -0.1], upperData: [-50, 50] },
        { stackStrategy: 'positive', lowerData: [0.1, 0.1], upperData: [50, -50] },
        { stackStrategy: 'negative', lowerData: [-0.1, -0.1], upperData: [-50, 50] }
    ];

    [false, true].forEach(function (horizontal) {
        const direction = horizontal ? 'horizontal' : 'vertical';

        strategyCases.forEach(function ({ stackStrategy, lowerData, upperData }) {
            it(`stacks ${direction} bars on a raised bar with stackStrategy ${stackStrategy}`, function () {
                setStackOption(horizontal, [
                    { barMinHeight: 20, data: lowerData },
                    { stackStrategy, data: upperData }
                ]);

                for (let dataIndex = 0; dataIndex < lowerData.length; dataIndex++) {
                    const lower = getItemLayout(0, dataIndex);
                    const upper = getItemLayout(1, dataIndex);
                    const lowerValue = lowerData[dataIndex];
                    const upperValue = upperData[dataIndex];

                    expect(Math.abs(getEnd(lower, horizontal) - getStart(lower, horizontal))).toBeCloseTo(20);
                    expect(getStart(upper, horizontal)).toBeCloseTo(getEnd(lower, horizontal));
                    expect(getEnd(upper, horizontal) - getStart(upper, horizontal)).toBeCloseTo(
                        valueToPixel(lowerValue + upperValue, horizontal) - valueToPixel(lowerValue, horizontal)
                    );
                }
            });
        });

        it(`pushes every ${direction} bar above a bar raised by barMinHeight`, function () {
            setStackOption(horizontal, [
                { barMinHeight: 20, data: [0.1, -0.1] },
                { data: [30, -30] },
                { data: [40, -40] }
            ]);

            for (let dataIndex = 0; dataIndex < 2; dataIndex++) {
                const bottom = getItemLayout(0, dataIndex);
                const middle = getItemLayout(1, dataIndex);
                const top = getItemLayout(2, dataIndex);

                expect(getStart(middle, horizontal)).toBeCloseTo(getEnd(bottom, horizontal));
                expect(getStart(top, horizontal)).toBeCloseTo(getEnd(middle, horizontal));
            }
        });

        it(`pushes ${direction} bars above a bar raised by barMinHeight with stackOrder seriesDesc`, function () {
            setStackOption(horizontal, [
                { stackOrder: 'seriesDesc', data: [50, -50] },
                { barMinHeight: 20, data: [0.1, -0.1] }
            ]);

            for (let dataIndex = 0; dataIndex < 2; dataIndex++) {
                expect(getStart(getItemLayout(0, dataIndex), horizontal)).toBeCloseTo(
                    getEnd(getItemLayout(1, dataIndex), horizontal)
                );
            }
        });

        it(`does not move ${direction} bars that are not stacked on a bar raised by barMinHeight`, function () {
            setStackOption(horizontal, [
                { barMinHeight: 20, data: [0.1, -0.1] },
                { data: [-50, 50] }
            ]);

            const zeroPixel = valueToPixel(0, horizontal);
            expect(getStart(getItemLayout(1, 0), horizontal)).toBeCloseTo(zeroPixel);
            expect(getStart(getItemLayout(1, 1), horizontal)).toBeCloseTo(zeroPixel);
        });

        it(`keeps the layout of stacked ${direction} bars when barMinHeight does not apply`, function () {
            const lowerData = [10, -20];
            const middleData = [30, -40];
            const upperData = [50, -60];
            [undefined, 2].forEach(function (barMinHeight) {
                setStackOption(horizontal, [
                    { barMinHeight, data: lowerData },
                    { barMinHeight, data: middleData },
                    { barMinHeight, data: upperData }
                ]);

                for (let dataIndex = 0; dataIndex < 2; dataIndex++) {
                    const stackedValues = [
                        0,
                        lowerData[dataIndex],
                        lowerData[dataIndex] + middleData[dataIndex],
                        lowerData[dataIndex] + middleData[dataIndex] + upperData[dataIndex]
                    ];
                    for (let seriesIndex = 0; seriesIndex < 3; seriesIndex++) {
                        const layout = getItemLayout(seriesIndex, dataIndex);
                        expect(getStart(layout, horizontal)).toBeCloseTo(
                            valueToPixel(stackedValues[seriesIndex], horizontal)
                        );
                        expect(getEnd(layout, horizontal)).toBeCloseTo(
                            valueToPixel(stackedValues[seriesIndex + 1], horizontal)
                        );
                    }
                }
            });
        });
    });
});
