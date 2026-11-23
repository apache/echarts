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

    it('draws a polar bar series with large: true normally once it reaches largeThreshold', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            expect(() => chart.setOption({
                animation: false,
                polar: {},
                angleAxis: { type: 'category', data: ['a', 'b', 'c'] },
                radiusAxis: {},
                series: [{
                    type: 'bar',
                    coordinateSystem: 'polar',
                    large: true,
                    largeThreshold: 2,
                    data: [1, 2, 3]
                }]
            })).not.toThrow();

            const data = (chart as any).getModel().getSeriesByIndex(0).getData();
            for (let i = 0; i < data.count(); i++) {
                expect(data.getItemGraphicEl(i)).toBeTruthy();
            }
        }
        finally {
            chart.dispose();
        }
    });

    it('keeps large mode for a cartesian2d bar series', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            chart.setOption({
                animation: false,
                xAxis: { type: 'category', data: ['a', 'b', 'c'] },
                yAxis: {},
                series: [{ type: 'bar', large: true, largeThreshold: 2, data: [1, 2, 3] }]
            });

            expect((chart as any).getModel().getSeriesByIndex(0).pipelineContext.large).toBe(true);
        }
        finally {
            chart.dispose();
        }
    });

});
