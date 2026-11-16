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

import { createChart, getGraphicElements } from '../../core/utHelper';
import { liftColor } from 'zrender/src/tool/color';
import Displayable from 'zrender/src/graphic/Displayable';


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

    it('should lift emphasis color from the updated color with universalTransition', function () {
        const chart = createChart({width: 400, height: 300});

        function build(data: (number | { value: number, itemStyle: { color: string } })[]) {
            return {
                xAxis: { type: 'category', data: ['a', 'b', 'c'] },
                yAxis: {},
                series: [{
                    id: 's',
                    type: 'bar',
                    universalTransition: true,
                    itemStyle: { color: '#1f5fd6' },
                    data: data
                }]
            } as const;
        }

        try {
            chart.setOption(build([3, 5, 7]));
            chart.setOption(
                build([3, 5, 7].map(value => ({ value, itemStyle: { color: '#14a04a' } }))),
                { replaceMerge: ['series'] }
            );

            const bars = getGraphicElements(chart, 'series', 0).filter(
                el => (el as Displayable).states && (el as Displayable).states.emphasis
            ) as Displayable[];
            expect(bars.length).toBe(3);

            // The fill is still animating from the previous color here.
            bars[0].useState('emphasis', false, true);
            expect(bars[0].style.fill).toBe(liftColor('#14a04a'));
        }
        finally {
            chart.dispose();
        }
    });

});
