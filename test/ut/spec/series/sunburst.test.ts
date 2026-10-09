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

import { createChart, removeChart } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts';

const RADIAN = Math.PI / 180;

describe('sunburst', function () {

    describe('minAngle', function () {

        function createSunburst(minAngle: number): EChartsType {
            const chart = createChart({ width: 500, height: 400 });
            chart.setOption({
                animation: false,
                series: [{
                    type: 'sunburst',
                    minAngle: minAngle,
                    data: [{
                        name: 'A',
                        children: [
                            { name: 'a', value: 100 },
                            { name: 'b', value: 1 },
                            { name: 'c', value: 1 },
                            { name: 'd', value: 1 }
                        ]
                    }]
                }]
            });
            return chart;
        }

        function getNodes(chart: EChartsType) {
            const root = (chart as any).getModel().getSeriesByIndex(0).getData().tree.root;
            const parent = root.children[0];
            return { parent: parent, children: parent.children };
        }

        it('should enlarge the sectors smaller than minAngle', function () {
            const chart = createSunburst(30);
            try {
                const children = getNodes(chart).children;
                for (let i = 0; i < children.length; i++) {
                    expect(children[i].getLayout().angle).toBeGreaterThanOrEqual(30 * RADIAN - 1e-6);
                }
            }
            finally {
                removeChart(chart);
            }
        });

        it('should not make the children overflow their parent', function () {
            const chart = createSunburst(30);
            try {
                const { parent, children } = getNodes(chart);
                let sum = 0;
                for (let i = 0; i < children.length; i++) {
                    sum += children[i].getLayout().angle;
                }
                expect(sum).toBeCloseTo(parent.getLayout().angle, 6);
                expect(children[children.length - 1].getLayout().endAngle)
                    .toBeCloseTo(parent.getLayout().endAngle, 6);
            }
            finally {
                removeChart(chart);
            }
        });

        it('should make the grandchildren fit in a sector enlarged to minAngle', function () {
            const chart = createChart({ width: 500, height: 400 });
            try {
                chart.setOption({
                    animation: false,
                    series: [{
                        type: 'sunburst',
                        minAngle: 30,
                        data: [
                            { name: 'a', value: 100 },
                            {
                                name: 'b',
                                children: [
                                    { name: 'b1', value: 2 },
                                    { name: 'b2', value: 1 }
                                ]
                            }
                        ]
                    }]
                });

                const root = (chart as any).getModel().getSeriesByIndex(0).getData().tree.root;
                const b = root.children[1];
                // `b` is only 3 / 103 of the circle, so it's enlarged to minAngle
                expect(b.getLayout().angle).toBeCloseTo(30 * RADIAN, 6);
                expect(b.children[0].getLayout().angle + b.children[1].getLayout().angle)
                    .toBeCloseTo(b.getLayout().angle, 6);
            }
            finally {
                removeChart(chart);
            }
        });

        it('should not change the layout when no sector is smaller than minAngle', function () {
            const chart = createSunburst(0);
            try {
                const { parent, children } = getNodes(chart);
                const unitRadian = parent.getLayout().angle / 103;
                expect(children[0].getLayout().angle).toBeCloseTo(100 * unitRadian, 6);
                expect(children[1].getLayout().angle).toBeCloseTo(unitRadian, 6);
            }
            finally {
                removeChart(chart);
            }
        });

        it('should not overflow the circle when the sum is zero', function () {
            const chart = createChart({ width: 500, height: 400 });
            try {
                const data = [];
                for (let i = 0; i < 20; i++) {
                    data.push({ name: 'n' + i, value: 0 });
                }
                chart.setOption({
                    animation: false,
                    series: [{ type: 'sunburst', minAngle: 30, data: data }]
                });

                const root = (chart as any).getModel().getSeriesByIndex(0).getData().tree.root;
                let sum = 0;
                for (let i = 0; i < root.children.length; i++) {
                    sum += root.children[i].getLayout().angle;
                }
                expect(sum).toBeCloseTo(Math.PI * 2, 6);
            }
            finally {
                removeChart(chart);
            }
        });
    });
});
