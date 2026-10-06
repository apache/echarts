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

describe('whiskerBoxCommon (candlestick/boxplot)', function () {

    it('should resolve the correct base axis when series refers axis by id', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            const data = [
                [0, 317.3413, 327.2178, 317.0466, 328.4467],
                [1, 327.7224, 332.9728, 326.5084, 334.3916],
                [2, 331.6939, 333.4524, 328.7171, 334.7013]
            ];

            chart.setOption({
                animation: false,
                xAxis: [
                    { id: 'main-x', type: 'value', gridIndex: 0 },
                    { id: 'second-x', type: 'value', gridIndex: 1 }
                ],
                yAxis: [
                    { type: 'value', id: 'main-y', gridIndex: 0, min: 300, max: 340 },
                    { type: 'value', id: 'second-y', gridIndex: 1, min: 300, max: 340 }
                ],
                grid: [
                    { id: 'main-grid', top: '5%', height: '35%' },
                    { id: 'second-grid', top: '50%', height: '35%' }
                ],
                series: [
                    { id: 's1', xAxisId: 'main-x', yAxisId: 'main-y', type: 'candlestick', data: data },
                    { id: 's2', xAxisId: 'second-x', yAxisId: 'second-y', type: 'candlestick', data: data }
                ]
            });

            const model = (chart as any).getModel();
            const series0 = model.getSeriesByIndex(0);
            const series1 = model.getSeriesByIndex(1);

            // The base axis of series 0 should be the axis with id 'main-x'
            const baseAxis0 = (series0 as any).getBaseAxis();
            expect(baseAxis0.model.option.id).toBe('main-x');

            // The base axis of series 1 should be the axis with id 'second-x'
            // (previously this incorrectly resolved to the first xAxis)
            const baseAxis1 = (series1 as any).getBaseAxis();
            expect(baseAxis1.model.option.id).toBe('second-x');

            // The base axis dims should differ (different axes), not both resolve to axis 0
            expect(baseAxis0.model.componentIndex).toBe(0);
            expect(baseAxis1.model.componentIndex).toBe(1);
        }
        finally {
            chart.dispose();
        }
    });

    it('should still fall back to the first axis when no index/id is specified', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            const data = [
                [317.3413, 327.2178, 317.0466, 328.4467],
                [327.7224, 332.9728, 326.5084, 334.3916]
            ];

            chart.setOption({
                animation: false,
                xAxis: { type: 'value' },
                yAxis: { type: 'value' },
                series: [
                    { type: 'candlestick', data: data }
                ]
            });

            const model = (chart as any).getModel();
            const series0 = model.getSeriesByIndex(0);
            const baseAxis0 = (series0 as any).getBaseAxis();
            expect(baseAxis0.model.option.id).toBe(undefined);
            expect(baseAxis0.model.componentIndex).toBe(0);
        }
        finally {
            chart.dispose();
        }
    });

});