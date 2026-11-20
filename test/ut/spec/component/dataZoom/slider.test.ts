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

import { createChart, getViewGroup } from '../../../core/utHelper';

describe('dataZoom/slider', function () {

    let chart: ReturnType<typeof createChart>;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('keeps slider bounds valid with a single time data point', function () {
        chart.setOption({
            xAxis: { type: 'time' },
            yAxis: {},
            dataZoom: [{
                type: 'slider',
                xAxisIndex: 0,
                left: 40,
                right: 22,
                bottom: 12,
                showDataShadow: true
            }],
            series: [{
                type: 'line',
                data: [[Date.UTC(2025, 0, 1), 1]]
            }]
        });

        const sliderGroup = getViewGroup(chart, 'dataZoom', 0);
        const rect = sliderGroup.getBoundingRect();

        expect(Number.isFinite(rect.x)).toBe(true);
        expect(Number.isFinite(rect.y)).toBe(true);
        expect(Number.isFinite(rect.width)).toBe(true);
        expect(Number.isFinite(rect.height)).toBe(true);
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
    });

});
