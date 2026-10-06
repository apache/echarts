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
import { EChartsType } from '../../../../../src/echarts';
import { EChartsOption } from '../../../../../src/export/option';
import Group from 'zrender/src/graphic/Group';
import Rect from 'zrender/src/graphic/shape/Rect';

function findBackgroundRect(chart: EChartsType): Rect {
    const legendGroup = getViewGroup(chart, 'legend');
    let backgroundRect: Rect;

    legendGroup.eachChild(function (child) {
        const rect = child as Rect & { z2: number };
        if (rect.type === 'rect' && rect.z2 === -1) {
            backgroundRect = rect;
        }
    });

    return backgroundRect;
}

function findClipRect(chart: EChartsType): Rect {
    const legendGroup = getViewGroup(chart, 'legend');
    let clipRect: Rect;

    legendGroup.traverse(function (child) {
        if (child.type === 'group') {
            clipRect = ((child as Group).getClipPath() as Rect) || clipRect;
        }
    });

    return clipRect;
}

describe('legend/scrollableLegend', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            width: 500,
            height: 400
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should respect width as max width for vertical scroll legend', function () {
        const legendWidth = 100;
        const padding = 10;
        const longName = 'Long legend item name '.repeat(20);
        const option: EChartsOption = {
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 10,
                bottom: 20,
                width: legendWidth,
                padding,
                backgroundColor: '#212121'
            },
            series: [
                {
                    type: 'pie',
                    data: [
                        {value: 10, name: longName + '0'},
                        {value: 20, name: longName + '1'},
                        {value: 30, name: longName + '2'},
                        {value: 40, name: longName + '3'}
                    ]
                }
            ]
        };

        chart.setOption(option);

        const backgroundRect = findBackgroundRect(chart);
        const clipRect = findClipRect(chart);

        expect(backgroundRect).toBeDefined();
        expect(backgroundRect.shape.width).toBeLessThanOrEqual(legendWidth + padding * 2);
        expect(clipRect).toBeDefined();
        expect(clipRect.shape.width).toBeLessThanOrEqual(legendWidth);
    });
});
