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
import { createChart, getECModel } from '../../core/utHelper';

describe('omit some aria data', function() {

    let chart: EChartsType;
    beforeEach(function() {
        chart = createChart();
    });

    afterEach(function() {
        chart.dispose();
    });

    it('data for column index in columnsToExclude (Tuesday, second column) should be omitted from Aria', async () => {
        const option = {
            aria: {
                enabled: true,
                data: {
                    columnsToExclude: [1]
                }
            },
            xAxis: {
                type: 'category',
                data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    data: [150, 230, 224, 218, 135, 147, 260],
                    type: 'line'
                }
            ]
        };
        chart.setOption(option);
        const el = chart.getDom();
        const ariaValue = el.getAttribute('aria-label');
        expect(ariaValue).not.toContain('Tue');
    });

    it('data for graph should not be omitted', async () => {
        const option = {
            aria: {
                enabled: true,
                data: {
                    columnsToExclude: [0]
                }
            },
            xAxis: {
                type: 'category',
                data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    data: [150, 230, 224, 218, 135, 147, 260],
                    type: 'line'
                }
            ]
        };
        chart.setOption(option);
        const listData = getECModel(chart).getSeries()[0].getData();
        expect(listData.getName(0)).toEqual('Mon');
        expect(listData.getValues(0)).toEqual([0, 150]);
        expect(listData.count()).toEqual(7);
    });

    it('aria should be omitted correctly in nested array', async () => {
        const option = {
            aria: {
                enabled: true,
                data: {
                    columnsToExclude: [0]
                }
            },
            xAxis: {
                data: ['2017-10-24', '2017-10-25', '2017-10-26', '2017-10-27']
            },
            yAxis: {},
            series: [
                {
                    type: 'candlestick',
                    data: [
                        [20, 34, 10, 38],
                        [40, 35, 30, 50],
                        [31, 38, 33, 44],
                        [38, 15, 5, 42]
                    ]
                }
            ]
        };
        chart.setOption(option);
        const el = chart.getDom();
        const ariaValue = el.getAttribute('aria-label');
        expect(ariaValue).not.toContain('2017-10-24');
    });


    it('data for graph should not be omitted', async () => {
        const option = {
            aria: {
                enabled: true,
                data: {
                    columnsToExclude: [0]
                }
            },
            xAxis: {
                data: ['2017-10-24', '2017-10-25', '2017-10-26', '2017-10-27']
            },
            yAxis: {},
            series: [
                {
                    type: 'candlestick',
                    data: [
                        [20, 34, 10, 38],
                        [40, 35, 30, 50],
                        [31, 38, 33, 44],
                        [38, 15, 5, 42]
                    ]
                }
            ]
        };
        chart.setOption(option);
        const listData = getECModel(chart).getSeries()[0].getData();
        expect(listData.getName(0)).toEqual('2017-10-24');
        expect(listData.count()).toEqual(4);
    });

});
