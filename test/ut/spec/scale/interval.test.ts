
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

import { createChart, isValueFinite, getECModel } from '../../core/utHelper';
import { EChartsType } from '../../../../src/echarts';
import CartesianAxisModel from '../../../../src/coord/cartesian/AxisModel';
import IntervalScale from '../../../../src/scale/Interval';
import { intervalScaleNiceTicks } from '../../../../src/scale/helper';
import { getPrecisionSafe } from '../../../../src/util/number';


describe('scale_interval', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });


    describe('extreme', function () {
        it('ticks_min_max', function () {

            const min = 0;
            const max = 54.090909;
            const splitNumber = 5;

            chart.setOption({
                xAxis: {},
                yAxis: {
                    type: 'value',
                    min: min,
                    max: max,
                    interval: max / splitNumber,
                    splitNumber: splitNumber
                },
                series: [{type: 'line', data: []}]
            });

            const yAxis = getECModel(chart).getComponent('yAxis', 0) as CartesianAxisModel;
            const scale = yAxis.axis.scale;
            const ticks = scale.getTicks();

            expect(ticks[0].value).toEqual(min);
            expect(ticks[ticks.length - 1].value).toEqual(max);
        });

        it('ticks_small_value', function () {
            chart.setOption({
                tooltip: {},
                xAxis: [
                    {
                        type: 'category',
                        data: ['Mon'],
                        axisTick: {
                            alignWithLabel: true
                        }
                    }
                ],
                yAxis: [
                    {
                        type: 'value'
                    }
                ],
                series: [
                    {
                        name: '',
                        type: 'bar',
                        data: [0.0000034]
                    }
                ]
            });

            const yAxis = getECModel(chart).getComponent('yAxis', 0) as CartesianAxisModel;
            const scale = yAxis.axis.scale as IntervalScale;
            const ticks = scale.getTicks();
            const labels = yAxis.axis.getViewLabels().map(function (item) {
                return item.formattedLabel;
            });

            const labelPrecisioned = scale.getLabel({ value: 0.0000005 }, { precision: 10 });

            expect(ticks.map(tick => tick.value)).toEqual(
                [0, 0.0000005, 0.000001, 0.0000015, 0.000002, 0.0000025, 0.000003, 0.0000035]
            );
            expect(labels).toEqual(
                // Should not be '5e-7'
                ['0', '0.0000005', '0.000001', '0.0000015', '0.000002', '0.0000025', '0.000003', '0.0000035']
            );
            expect(labelPrecisioned).toEqual('0.0000005000');
        });
    });


    describe('ticks', function () {

        function randomNumber(quantity: number): number {
            return (Math.random() - 0.5) * Math.pow(10, (Math.random() - 0.5) * quantity);
        }

        function doSingleTest(extent: [number, number], splitNumber: number): void {
            const result = intervalScaleNiceTicks(extent, splitNumber);
            const intervalPrecision = result.intervalPrecision;
            const resultInterval = result.interval;
            const niceTickExtent = result.niceTickExtent;

            expect(isValueFinite(resultInterval)).toEqual(true);
            expect(isValueFinite(intervalPrecision)).toEqual(true);
            expect(isValueFinite(niceTickExtent[0])).toEqual(true);
            expect(isValueFinite(niceTickExtent[1])).toEqual(true);

            expect(niceTickExtent[0]).toBeGreaterThanOrEqual(extent[0]);
            expect(niceTickExtent[1]).not.toBeGreaterThan(extent[1]);
            expect(niceTickExtent[1]).toBeGreaterThanOrEqual(niceTickExtent[1]);

            const interval = new IntervalScale();
            interval.setExtent(extent[0], extent[1]);
            interval.niceExtent({
                fixMin: true,
                fixMax: true,
                splitNumber
            });
            const ticks = interval.getTicks();

            expect(ticks.length > 0);
            expect(ticks[0].value).toEqual(extent[0]);
            expect(ticks[ticks.length - 1].value).toEqual(extent[1]);

            for (let i = 1; i < ticks.length; i++) {
                expect(ticks[i - 1].value).not.toBeGreaterThanOrEqual(ticks[i].value);

                if (ticks[i].value !== extent[0] && ticks[i].value !== extent[1]) {
                    const tickPrecision = getPrecisionSafe(ticks[i].value);
                    expect(tickPrecision).not.toBeGreaterThan(intervalPrecision);
                }
            }
        }

        function doRandomTest(count: number, splitNumber: number, quantity: number): void {
            for (let i = 0; i < count; i++) {
                const extent: number[] = [];
                extent[0] = randomNumber(quantity);
                extent[1] = extent[0] + randomNumber(quantity);
                if (extent[1] === extent[0]) {
                    extent[1] = extent[0] + 1;
                }
                if (extent[0] > extent[1]) {
                    extent.reverse();
                }
                doSingleTest(extent as [number, number], splitNumber);
            }
        }

        it('cases', function () {
            doSingleTest([3.7210923755786733e-8, 176.4352516752083], 1);
            doSingleTest([1550932.3941785, 1550932.3941786], 5);
            doSingleTest([-3711126.9907707, -3711126.990770699], 5);
        });

        it('randomCover', function () {
            doRandomTest(500, 5, 20);
            doRandomTest(200, 1, 20);
        });
    });

});