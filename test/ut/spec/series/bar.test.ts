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

    it('draws a background for every bar when showBackground is turned on with fewer bars', function () {
        const chart = createChart({width: 400, height: 300});
        const sales: Record<string, number> = { Apples: 42, Bananas: 75, Cherries: 30, Dates: 88, Figs: 61 };

        function makeOption(top3: boolean) {
            let names = Object.keys(sales);
            if (top3) {
                names = names.sort((a, b) => sales[b] - sales[a]).slice(0, 3);
            }
            return {
                animation: false,
                xAxis: { type: 'category', data: names },
                yAxis: { max: 100 },
                series: [{
                    type: 'bar',
                    showBackground: top3,
                    data: names.map(name => sales[name])
                }]
            };
        }

        function backgroundCount() {
            const view = (chart as any)._chartsViews[0];
            return view._backgroundGroup ? view._backgroundGroup.childCount() : 0;
        }

        try {
            chart.setOption(makeOption(false));
            expect(backgroundCount()).toBe(0);

            expect(() => chart.setOption(makeOption(true))).not.toThrow();

            const data = (chart as any).getModel().getSeriesByIndex(0).getData();
            expect(data.count()).toBe(3);
            expect(backgroundCount()).toBe(3);
            for (let i = 0; i < data.count(); i++) {
                expect(data.getItemGraphicEl(i)).toBeTruthy();
            }
        }
        finally {
            chart.dispose();
        }
    });

});
