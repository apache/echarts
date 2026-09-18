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

import { EChartsType } from '../../../../src/echarts';
import { createChart, removeChart } from '../../core/utHelper';

const QUOTE = String.fromCharCode(96);
const MAIN_PROCESS_ERROR = '[ECharts] ' + QUOTE + 'setOption' + QUOTE
    + ' should not be called during main process.';

describe('api/setOption', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        removeChart(chart);
    });

    it('recovers from an invalid calendar option error', function () {
        const oldConsoleErr = console.error;
        console.error = jest.fn();

        try {
            expect(function () {
                chart.setOption({
                    calendar: {
                        range: '999'
                    },
                    visualMap: {
                        show: false,
                        min: 0,
                        max: 10
                    },
                    series: {
                        type: 'heatmap',
                        coordinateSystem: 'calendar',
                        data: []
                    }
                });
            }).toThrow();
        }
        finally {
            console.error = oldConsoleErr;
        }

        const consoleErr = jest.fn();
        console.error = consoleErr;

        try {
            expect(function () {
                chart.setOption({
                    calendar: {
                        range: '2020'
                    },
                    visualMap: {
                        show: false,
                        min: 0,
                        max: 10
                    },
                    series: {
                        type: 'heatmap',
                        coordinateSystem: 'calendar',
                        data: []
                    }
                });
            }).not.toThrow();
        }
        finally {
            console.error = oldConsoleErr;
        }

        expect(consoleErr).not.toHaveBeenCalledWith(MAIN_PROCESS_ERROR);
        expect((chart.getOption().calendar as any[])[0].range).toEqual('2020');
    });

    it('resets the main process state when option merge throws', function () {
        expect(function () {
            chart.setOption({
                xAxis: {
                    data: ['a']
                },
                yAxis: {},
                series: [
                    {
                        id: 'duplicate',
                        type: 'line',
                        data: [1]
                    },
                    {
                        id: 'duplicate',
                        type: 'line',
                        data: [2]
                    }
                ]
            });
        }).toThrowError(/duplicate/);

        const oldConsoleErr = console.error;
        const consoleErr = jest.fn();
        console.error = consoleErr;

        try {
            chart.setOption({
                xAxis: {
                    data: ['a']
                },
                yAxis: {},
                series: [
                    {
                        id: 'valid',
                        type: 'line',
                        data: [1]
                    }
                ]
            });
        }
        finally {
            console.error = oldConsoleErr;
        }

        expect(consoleErr).not.toHaveBeenCalledWith(MAIN_PROCESS_ERROR);
        expect((chart.getOption().series as any[])[0].id).toEqual('valid');
    });
});
