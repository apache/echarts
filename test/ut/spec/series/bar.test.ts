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


describe('bar', function () {

    describe('stackGap', function () {

        function createStackedChart(
            orientation: 'vertical' | 'horizontal',
            values: Array<number | null>,
            stackGap: number,
            barMinHeight?: number,
            valueRange: [number, number] = [0, 100]
        ) {
            const chart = createChart({width: 400, height: 300});
            const isHorizontal = orientation === 'horizontal';
            const [min, max] = valueRange;
            const series = values.map(value => ({
                type: 'bar' as const,
                stack: 'total',
                stackGap,
                barMinHeight,
                data: [value]
            }));

            chart.setOption({
                animation: false,
                xAxis: isHorizontal
                    ? { type: 'value', min, max }
                    : { type: 'category', data: ['A'] },
                yAxis: isHorizontal
                    ? { type: 'category', data: ['A'] }
                    : { type: 'value', min, max },
                series
            });
            return chart;
        }

        function getLayouts(chart: ReturnType<typeof createChart>) {
            const ecModel = getECModel(chart);
            return [0, 1, 2].map(index => ecModel.getSeriesByIndex(index).getData().getItemLayout(0));
        }

        it('separates positive vertical stacks and preserves the outer edges', function () {
            const chartWithGap = createStackedChart('vertical', [20, 30, 50], 8);
            const chartWithoutGap = createStackedChart('vertical', [20, 30, 50], 0);

            try {
                const layouts = getLayouts(chartWithGap);
                const layoutsWithoutGap = getLayouts(chartWithoutGap);

                expect(layouts[0].y + layouts[0].height - layouts[1].y).toBeCloseTo(8, 5);
                expect(layouts[1].y + layouts[1].height - layouts[2].y).toBeCloseTo(8, 5);
                expect(layouts[0].y).toBeCloseTo(layoutsWithoutGap[0].y, 5);
                expect(layouts[2].y + layouts[2].height).toBeCloseTo(
                    layoutsWithoutGap[2].y + layoutsWithoutGap[2].height,
                    5
                );
            }
            finally {
                chartWithGap.dispose();
                chartWithoutGap.dispose();
            }
        });

        it('separates negative horizontal stacks', function () {
            const chart = createChart({width: 400, height: 300});
            chart.setOption({
                animation: false,
                xAxis: { type: 'value', min: -100, max: 0 },
                yAxis: { type: 'category', data: ['A'] },
                series: [-20, -30, -50].map(value => ({
                    type: 'bar' as const,
                    stack: 'total',
                    stackGap: 8,
                    data: [value]
                }))
            });

            try {
                const layouts = getLayouts(chart);
                expect(layouts[0].x + layouts[0].width - layouts[1].x).toBeCloseTo(8, 5);
                expect(layouts[1].x + layouts[1].width - layouts[2].x).toBeCloseTo(8, 5);
            }
            finally {
                chart.dispose();
            }
        });

        it('keeps thin stack segments at barMinHeight', function () {
            const chart = createStackedChart('vertical', [20, 0.1, 79.9], 8, 4);

            try {
                const middleLayout = getLayouts(chart)[1];
                expect(Math.abs(middleLayout.height)).toBeGreaterThanOrEqual(4);
            }
            finally {
                chart.dispose();
            }
        });

        it('keeps a gap between visible segments across zero or missing values', function () {
            for (const values of [[20, 0, 30], [20, null, 30]]) {
                const chart = createStackedChart('vertical', values, 8);
                try {
                    const layouts = getLayouts(chart);
                    expect(layouts[0].y + layouts[0].height - layouts[2].y).toBeCloseTo(8, 5);
                }
                finally {
                    chart.dispose();
                }
            }
        });

        it('does not add a gap between positive and negative stacks', function () {
            const chart = createStackedChart('vertical', [20, -10, 30], 8, undefined, [-100, 100]);

            try {
                const layouts = getLayouts(chart);
                expect(layouts[0].y + layouts[0].height - layouts[2].y).toBeCloseTo(8, 5);
                expect(layouts[1].y).toBeCloseTo(layouts[0].y, 5);
            }
            finally {
                chart.dispose();
            }
        });

        it('applies stackGap in large mode', function () {
            const chart = createChart({width: 400, height: 300});
            chart.setOption({
                animation: false,
                xAxis: { type: 'category', data: ['A'] },
                yAxis: { type: 'value', min: 0, max: 100 },
                series: [20, 30, 50].map(value => ({
                    type: 'bar' as const,
                    stack: 'total',
                    stackGap: 8,
                    large: true,
                    largeThreshold: 0,
                    data: [value]
                }))
            });

            try {
                const ecModel = getECModel(chart);
                const points = [0, 1, 2].map(index => (
                    ecModel.getSeriesByIndex(index).getData().getLayout('largePoints') as Float32Array
                ));

                expect(points[0][1] + points[0][2] - points[1][1]).toBeCloseTo(8, 4);
                expect(points[1][1] + points[1][2] - points[2][1]).toBeCloseTo(8, 4);
            }
            finally {
                chart.dispose();
            }
        });

        it('matches stack segments by data index on a time base axis', function () {
            const chart = createChart({width: 400, height: 300});
            const timestamp = Date.UTC(2025, 0, 1);
            chart.setOption({
                animation: false,
                xAxis: { type: 'time' },
                yAxis: { type: 'value', min: 0, max: 100 },
                series: [20, 30, 50].map(value => ({
                    type: 'bar' as const,
                    stack: 'total',
                    stackGap: 8,
                    data: [[timestamp, value]]
                }))
            });

            try {
                const layouts = getLayouts(chart);
                expect(layouts[0].y + layouts[0].height - layouts[1].y).toBeCloseTo(8, 5);
                expect(layouts[1].y + layouts[1].height - layouts[2].y).toBeCloseTo(8, 5);
            }
            finally {
                chart.dispose();
            }
        });

    });

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

});
