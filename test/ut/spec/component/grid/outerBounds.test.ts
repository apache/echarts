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

import { createChart, removeChart } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';


describe('grid/outerBounds', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({width: 600, height: 400});
    });

    afterEach(function () {
        removeChart(chart);
    });

    function getGridRect(): {x: number, y: number, width: number, height: number} {
        return (chart as any).getModel().getComponent('grid').coordinateSystem.getRect();
    }

    function makeOption(xInverse: boolean, yInverse: boolean) {
        return {
            animation: false,
            grid: {
                outerBoundsMode: 'same',
                outerBoundsContain: 'axisLabel'
            },
            xAxis: [
                {type: 'category', data: ['A', 'B', 'C', 'D']},
                {type: 'value', inverse: xInverse, min: 0.4498, max: 0.6824}
            ],
            yAxis: [
                {type: 'value'},
                {type: 'value', inverse: yInverse, min: 0.4498, max: 0.6824}
            ],
            series: [
                {type: 'line', data: [10, 20, 30, 40]},
                {type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: [[0.5, 0.5], [0.65, 0.65]]}
            ]
        };
    }

    it('should not collapse the grid when an inverted y axis has a tick near its edge', function () {
        chart.setOption(makeOption(false, false));
        const rect = getGridRect();

        chart.setOption(makeOption(false, true), true);
        const inverseRect = getGridRect();

        expect(rect.height).toBeGreaterThan(100);
        expect(inverseRect.height).toBeCloseTo(rect.height, 0);
    });

    it('should not collapse the grid when an inverted x axis has a tick near its edge', function () {
        chart.setOption(makeOption(false, false));
        const rect = getGridRect();

        chart.setOption(makeOption(true, false), true);
        const inverseRect = getGridRect();

        expect(rect.width).toBeGreaterThan(100);
        expect(inverseRect.width).toBeCloseTo(rect.width, 0);
    });

});
