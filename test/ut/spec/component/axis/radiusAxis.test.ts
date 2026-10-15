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


import { EChartsType } from '../../../../../src/echarts';
import { createChart, getGraphicElements } from '../../../core/utHelper';
import { Line, Text } from '../../../../../src/util/graphic';

describe('radiusAxis', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({ width: 400, height: 400 });
    });
    afterEach(function () {
        chart.dispose();
    });

    // The radius axis runs from the polar center (200, 200) along +x when
    // angleAxis.startAngle is 0, so ticks and labels sit above (y < 200)
    // or below (y > 200) it.
    function render(inside: boolean) {
        chart.setOption({
            animation: false,
            angleAxis: { startAngle: 0 },
            radiusAxis: {
                type: 'category',
                data: ['Mon', 'Tue', 'Wed', 'Thu'],
                axisTick: { inside },
                axisLabel: { inside }
            },
            polar: { center: ['50%', '50%'] },
            series: [{ type: 'bar', data: [1, 2, 3, 4], coordinateSystem: 'polar' }]
        });
        const els = getGraphicElements(chart, 'radiusAxis');
        const tick = els.find(el => el.anid && el.anid.startsWith('ticks_')) as Line;
        const label = els.find(el => el instanceof Text && el.style.text === 'Mon') as Text;
        return {
            tickEndY: tick.shape.y2 - tick.shape.y1,
            labelSide: Math.sign(label.y - 200)
        };
    }

    it('should draw ticks and labels on the default side', function () {
        expect(render(false)).toEqual({ tickEndY: -5, labelSide: -1 });
    });

    it('should flip ticks and labels with axisTick.inside and axisLabel.inside', function () {
        expect(render(true)).toEqual({ tickEndY: 5, labelSide: 1 });
    });
});
