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

import { createChart } from '../../core/utHelper';


describe('bar', function () {

    it('should respect encoded object-row dimensions missing from earlier rows', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            chart.setOption({
                animation: false,
                dataset: {
                    source: [
                        { timestamp: 1568191020000, ECM: 26311.466666666667 },
                        { timestamp: 1568191140000, ECM: 1666775.3333333333, GSWY: 1332.5333333333333 }
                    ]
                },
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [{
                    type: 'bar',
                    name: 'ECM',
                    encode: { x: 'timestamp', y: 'ECM' },
                    stack: 'one'
                }, {
                    type: 'bar',
                    name: 'GSWY',
                    encode: { x: 'timestamp', y: 'GSWY' },
                    stack: 'one'
                }]
            });

            const series = (chart as any).getModel().getSeriesByIndex(1);
            const data = series.getData();
            const yDim = data.mapDimension('y');

            expect(yDim).toBe('GSWY');
            expect(isNaN(data.get(yDim, 0))).toBe(true);
            expect(data.get(yDim, 1)).toBe(1332.5333333333333);
        }
        finally {
            chart.dispose();
        }
    });

    describe('polar bar label', function () {

        function makePolarOption(
            categoryOnAngle: boolean,
            count: number,
            labelPosition: string,
            data?: number[]
        ) {
            const categoryAxis = {
                type: 'category',
                data: ['a', 'b', 'c', 'd', 'e'].slice(0, count)
            };
            const valueAxis = { max: 4 };
            return {
                animation: false,
                polar: {},
                angleAxis: categoryOnAngle ? categoryAxis : valueAxis,
                radiusAxis: categoryOnAngle ? valueAxis : categoryAxis,
                series: [{
                    type: 'bar',
                    coordinateSystem: 'polar',
                    label: { show: true, position: labelPosition },
                    data: data || [2, 1.2, 2.4, 3, 1].slice(0, count)
                }]
            };
        }

        function getLabelLayouts(chart: ReturnType<typeof createChart>) {
            const data = (chart as any).getModel().getSeriesByIndex(0).getData();
            const result = [];
            for (let i = 0; i < data.count(); i++) {
                const el = data.getItemGraphicEl(i);
                const textConfig = el.textConfig;
                const textPosition = el.calculateTextPosition(
                    {},
                    { position: textConfig.position, distance: textConfig.distance },
                    { x: 0, y: 0, width: 10, height: 10 }
                );
                result.push({
                    rotation: textConfig.rotation,
                    x: textPosition.x,
                    y: textPosition.y,
                    align: textPosition.align,
                    verticalAlign: textPosition.verticalAlign
                });
            }
            return result;
        }

        function expectSameAsFreshChart(initOption: any, updateOption: any, notMerge?: boolean) {
            const chart = createChart({width: 400, height: 300});
            const expectedChart = createChart({width: 400, height: 300});

            try {
                chart.setOption(initOption);
                chart.setOption(updateOption, notMerge);
                expectedChart.setOption(updateOption);

                const actual = getLabelLayouts(chart);
                const expected = getLabelLayouts(expectedChart);
                expect(actual.length).toBe(expected.length);
                for (let i = 0; i < expected.length; i++) {
                    expect(actual[i].rotation).toBeCloseTo(expected[i].rotation, 10);
                    expect(actual[i].x).toBeCloseTo(expected[i].x, 10);
                    expect(actual[i].y).toBeCloseTo(expected[i].y, 10);
                    expect(actual[i].align).toBe(expected[i].align);
                    expect(actual[i].verticalAlign).toBe(expected[i].verticalAlign);
                }
            }
            finally {
                chart.dispose();
                expectedChart.dispose();
            }
        }

        it('should update label rotation when categories are added on angleAxis', function () {
            expectSameAsFreshChart(
                makePolarOption(true, 3, 'middle'),
                makePolarOption(true, 5, 'middle')
            );
        });

        it('should update label rotation when data changes with category on radiusAxis', function () {
            expectSameAsFreshChart(
                makePolarOption(false, 3, 'insideEnd'),
                makePolarOption(false, 3, 'insideEnd', [3.5, 0.5, 1])
            );
        });

        it('should update label position when category axis moves from radiusAxis to angleAxis', function () {
            expectSameAsFreshChart(
                makePolarOption(false, 3, 'insideStart'),
                makePolarOption(true, 3, 'insideStart'),
                true
            );
        });

        it('should update label position when category axis moves from angleAxis to radiusAxis', function () {
            expectSameAsFreshChart(
                makePolarOption(true, 3, 'end'),
                makePolarOption(false, 3, 'end'),
                true
            );
        });

    });

});
