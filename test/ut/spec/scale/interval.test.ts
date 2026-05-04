
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
import IntervalScale from '@/src/scale/Interval';
import { intervalScaleNiceTicks } from '@/src/scale/helper';
import { getPrecisionSafe } from '@/src/util/number';
import { scaleCalcNice2 } from '@/src/coord/axisNiceTicks';
import { NumericAxisBaseOptionCommon, ValueAxisBaseOption } from '@/src/coord/axisCommonTypes';
import { AxisBaseModel } from '@/src/coord/AxisBaseModel';


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
            return randomSign() * (1 + Math.random()) * Math.pow(10, randomSign() * quantity);
        }
        function randomSign() {
            return (Math.random() - 0.5) > 0 ? 1 : -1;
        }

        function doSingleTest(
            extent: number[],
            splitNumber: number,
            fixMinMax: boolean
        ) {
            try {
                doSingleTestDeal(extent, splitNumber, fixMinMax);
            }
            catch (err) {
                err.message += [
                    '     [RAW_INPUTS] '
                    + ` extent: [${extent.join(',')}],`
                    + ` splitNumber: ${splitNumber},`
                    + ` fixMinMax: ${fixMinMax}.`
                ].join('');
                throw err;
            }
        }

        function doSingleTestDeal(
            extent: number[],
            splitNumber: number,
            fixMinMax: boolean
        ): void {
            const span = extent[1] - extent[0];
            const result = intervalScaleNiceTicks(extent, span, splitNumber);
            const intervalPrecision = result.intervalPrecision;
            const resultInterval = result.interval;
            const niceTickExtent = result.niceTickExtent;

            expect(resultInterval).toBeFinite();
            expect(intervalPrecision).toBeFinite();
            expect(niceTickExtent[0]).toBeFinite();
            expect(niceTickExtent[1]).toBeFinite();

            expect(niceTickExtent[0]).toBeGreaterThanOrEqual(extent[0]);
            expect(niceTickExtent[1]).toBeLessThanOrEqual(extent[1]);
            expect(niceTickExtent[1]).toBeGreaterThanOrEqual(niceTickExtent[1]);
            expect(niceTickExtent[0] - niceTickExtent[1] <= resultInterval);

            const intervalScale = new IntervalScale();
            const option: ValueAxisBaseOption = {
                splitNumber: splitNumber
            };
            if (fixMinMax) {
                option.min = extent[0];
                option.max = extent[1];
            }
            const axisModel = new CartesianAxisModel(option, null, null);
            scaleCalcNice2(
                intervalScale,
                axisModel as AxisBaseModel<NumericAxisBaseOptionCommon>,
                null,
                null,
                extent
            );

            const ticks = intervalScale.getTicks();

            expect(ticks.length > 1);

            if (fixMinMax) {
                expect(ticks[0].value).toEqual(extent[0]);
                expect(ticks[ticks.length - 1].value).toEqual(extent[1]);
            }
            else {
                expect(ticks[0].value).toBeLessThanOrEqual(extent[0]);
                expect(ticks[ticks.length - 1].value).toBeGreaterThanOrEqual(extent[1]);
            }

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
                // console.log(extent);
                doSingleTest(extent, splitNumber, false);
                doSingleTest(extent, splitNumber, true);
            }
        }

        it('cases', function () {
            doSingleTest([-4.487313802559083e-9, -3.371319349409791e-9], 5, false);
            doSingleTest([3.7210923755786733e-8, 176.4352516752083], 1, true);
            doSingleTest([1550932.3941785, 1550932.3941786], 5, true);
            doSingleTest([-3711126.9907707, -3711126.990770699], 5, true);
        });

        it('randomCover', function () {
            doRandomTest(500, 5, 10);
            doRandomTest(200, 1, 10);
        });
    });

});