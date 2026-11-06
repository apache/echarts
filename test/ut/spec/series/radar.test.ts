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


const radarOption = {
    animation: false,
    radar: {
        indicator: [
            { name: 'A', max: 100 },
            { name: 'B', max: 100 },
            { name: 'C', max: 100 }
        ]
    }
};

describe('radar', function () {

    it('should support symbol and symbolSize as functions on data items (#20471)', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            const symbolCalls: any[] = [];
            const symbolSizeCalls: any[] = [];
            chart.setOption({
                ...radarOption,
                series: [{
                    type: 'radar',
                    data: [
                        {
                            value: [80, 90, 70], name: 'first',
                            symbol: function (value: any, params: any) {
                                symbolCalls.push([value, params.dataIndex]);
                                return 'triangle';
                            },
                            symbolSize: function (value: any, params: any) {
                                symbolSizeCalls.push([value, params.dataIndex]);
                                return 12;
                            }
                        },
                        { value: [60, 50, 80], name: 'second' }
                    ]
                }]
            });

            // The callbacks are invoked per data item with (rawValue, params),
            // and the returned values become the item visuals.
            expect(symbolCalls).toEqual([[[80, 90, 70], 0]]);
            expect(symbolSizeCalls).toEqual([[[80, 90, 70], 0]]);

            const series = (chart as any).getModel().getSeriesByIndex(0);
            const data = series.getData();
            expect(data.getItemVisual(0, 'symbol')).toBe('triangle');
            expect(data.getItemVisual(0, 'symbolSize')).toBe(12);
            // Untouched items keep the default symbol.
            expect(data.getItemVisual(1, 'symbol')).toBe('circle');
        }
        finally {
            chart.dispose();
        }
    });

    it('should support symbol and symbolSize as functions on the series', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            chart.setOption({
                ...radarOption,
                series: [{
                    type: 'radar',
                    symbol: function () {
                        return 'diamond';
                    },
                    symbolSize: function () {
                        return 16;
                    },
                    data: [
                        { value: [80, 90, 70], name: 'first' },
                        { value: [60, 50, 80], name: 'second' }
                    ]
                }]
            });

            const series = (chart as any).getModel().getSeriesByIndex(0);
            const data = series.getData();
            expect(data.getItemVisual(0, 'symbol')).toBe('diamond');
            expect(data.getItemVisual(1, 'symbolSize')).toBe(16);
        }
        finally {
            chart.dispose();
        }
    });

});
