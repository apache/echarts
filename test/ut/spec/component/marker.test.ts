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
import { createChart } from '../../core/utHelper';

describe('marker_components', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('markLine_with_dataset_encode', function () {
        // Test case for issue where markLine fails with dataset + encode
        // due to undefined ordinalMeta when dimension info is incomplete
        const data = [
            ['2011-01-01T10:00:00Z', 4800, 4850, 4790, 4820, 1000],
            ['2011-01-01T10:30:00Z', 4820, 4900, 4800, 4880, 1200],
            ['2011-01-01T11:00:00Z', 4880, 4920, 4850, 4900, 1500],
            ['2011-01-01T11:30:00Z', 4900, 4950, 4870, 4920, 1300],
            ['2011-01-01T12:00:00Z', 4920, 5000, 4900, 4980, 1800]
        ];

        expect(() => {
            chart.setOption({
                dataset: {
                    source: data
                },
                xAxis: {
                    type: 'time'
                },
                yAxis: {
                    scale: true
                },
                series: [
                    {
                        name: 'Candles',
                        type: 'candlestick',
                        encode: {
                            x: 0,
                            y: [1, 2, 3, 4]
                        },
                        markLine: {
                            symbol: ['none', 'none'],
                            data: [
                                [
                                    {
                                        name: 'test line',
                                        xAxis: '2011-01-01T10:50:00Z',
                                        yAxis: 4800
                                    },
                                    {
                                        xAxis: '2011-01-01T11:55:00Z',
                                        yAxis: 4850
                                    }
                                ]
                            ]
                        }
                    }
                ]
            });
        }).not.toThrow();

        // Verify the chart rendered successfully
        expect(chart.getOption()).toBeTruthy();
    });

    it('markPoint_with_dataset_encode', function () {
        const data = [
            ['2011-01-01', 100],
            ['2011-01-02', 200],
            ['2011-01-03', 150]
        ];

        expect(() => {
            chart.setOption({
                dataset: {
                    source: data
                },
                xAxis: {
                    type: 'category'
                },
                yAxis: {},
                series: [
                    {
                        type: 'line',
                        encode: {
                            x: 0,
                            y: 1
                        },
                        markPoint: {
                            data: [
                                {
                                    name: 'Max',
                                    type: 'max'
                                }
                            ]
                        }
                    }
                ]
            });
        }).not.toThrow();

        expect(chart.getOption()).toBeTruthy();
    });

    it('markArea_with_dataset_encode', function () {
        const data = [
            ['2011-01-01', 100],
            ['2011-01-02', 200],
            ['2011-01-03', 150],
            ['2011-01-04', 300]
        ];

        expect(() => {
            chart.setOption({
                dataset: {
                    source: data
                },
                xAxis: {
                    type: 'category'
                },
                yAxis: {},
                series: [
                    {
                        type: 'line',
                        encode: {
                            x: 0,
                            y: 1
                        },
                        markArea: {
                            data: [
                                [
                                    {
                                        name: 'Area',
                                        xAxis: '2011-01-01'
                                    },
                                    {
                                        xAxis: '2011-01-03'
                                    }
                                ]
                            ]
                        }
                    }
                ]
            });
        }).not.toThrow();

        expect(chart.getOption()).toBeTruthy();
    });

    it('markLine_with_category_axis_dataset', function () {
        // Test with category axis to ensure ordinalMeta is properly handled
        const data = [
            ['Mon', 120],
            ['Tue', 200],
            ['Wed', 150],
            ['Thu', 80],
            ['Fri', 70]
        ];

        expect(() => {
            chart.setOption({
                dataset: {
                    source: data
                },
                xAxis: {
                    type: 'category'
                },
                yAxis: {},
                series: [
                    {
                        type: 'bar',
                        encode: {
                            x: 0,
                            y: 1
                        },
                        markLine: {
                            data: [
                                {
                                    type: 'average',
                                    name: 'Average'
                                },
                                [
                                    {
                                        xAxis: 'Mon',
                                        yAxis: 50
                                    },
                                    {
                                        xAxis: 'Fri',
                                        yAxis: 100
                                    }
                                ]
                            ]
                        }
                    }
                ]
            });
        }).not.toThrow();

        expect(chart.getOption()).toBeTruthy();
    });
});
