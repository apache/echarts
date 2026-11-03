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

import { createChart, getGraphicElements } from '../../../core/utHelper';
import Text from 'zrender/src/graphic/Text';

describe('legend formatter', function () {
    it('passes the series name for ordinary series legends', function () {
        const chart = createChart();
        const formatterArgs: string[][] = [];

        try {
            chart.setOption({
                animation: false,
                legend: {
                    formatter(name: string, seriesName: string) {
                        formatterArgs.push([name, seriesName]);
                        return `${name}-${seriesName}`;
                    }
                },
                xAxis: {},
                yAxis: {},
                series: [{
                    type: 'line',
                    name: 'Revenue',
                    data: [10]
                }]
            });

            expect(formatterArgs).toEqual([['Revenue', 'Revenue']]);

            const text = getGraphicElements(chart, 'legend').find(el => el.type === 'text') as Text;
            expect(text.style.text).toBe('Revenue-Revenue');
        }
        finally {
            chart.dispose();
        }
    });

    it('passes the series name for data legends', function () {
        const chart = createChart();
        const formatterArgs: string[][] = [];

        try {
            chart.setOption({
                animation: false,
                legend: {
                    formatter(name: string, seriesName: string) {
                        formatterArgs.push([name, seriesName]);
                        return `${name}-${seriesName}`;
                    }
                },
                series: [{
                    type: 'pie',
                    name: 'Revenue',
                    data: [
                        {name: 'Product A', value: 10}
                    ]
                }]
            });

            expect(formatterArgs).toEqual([['Product A', 'Revenue']]);

            const text = getGraphicElements(chart, 'legend').find(el => el.type === 'text') as Text;
            expect(text.style.text).toBe('Product A-Revenue');
        }
        finally {
            chart.dispose();
        }
    });
});
