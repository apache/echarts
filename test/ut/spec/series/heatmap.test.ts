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

import { EChartsType } from '@/src/echarts';
import { createChart, getGraphicElements } from '../../core/utHelper';
import tokens from '@/src/visual/tokens';

describe('heatmap', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            width: 240,
            height: 160
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should render empty cells so splitArea does not leak through', function () {
        chart.setOption({
            backgroundColor: '#fff',
            animation: false,
            visualMap: {
                min: 0,
                max: 10,
                show: false
            },
            grid: {
                left: 20,
                right: 20,
                top: 20,
                bottom: 20
            },
            xAxis: {
                type: 'category',
                data: ['a', 'b', 'c'],
                splitArea: {
                    show: true
                }
            },
            yAxis: {
                type: 'category',
                data: ['row'],
                splitArea: {
                    show: true
                }
            },
            series: [{
                type: 'heatmap',
                data: [
                    [0, 0, 8],
                    [1, 0, ''],
                    [2, 0, '']
                ]
            }]
        }, true);

        const rects = getGraphicElements(chart, 'series')
            .filter(el => el.type === 'rect');

        expect(rects).toHaveLength(3);
        expect(rects.filter(rect => (rect as any).style.fill === '#fff')).toHaveLength(2);
    });

    it('should use token background for empty cells by default', function () {
        chart.setOption({
            animation: false,
            visualMap: {
                min: 0,
                max: 10,
                show: false
            },
            grid: {
                left: 20,
                right: 20,
                top: 20,
                bottom: 20
            },
            xAxis: {
                type: 'category',
                data: ['a', 'b'],
                splitArea: {
                    show: true
                }
            },
            yAxis: {
                type: 'category',
                data: ['row'],
                splitArea: {
                    show: true
                }
            },
            series: [{
                type: 'heatmap',
                data: [
                    [0, 0, 8],
                    [1, 0, '']
                ]
            }]
        }, true);

        const rects = getGraphicElements(chart, 'series')
            .filter(el => el.type === 'rect');

        expect(rects).toHaveLength(2);
        expect(rects.filter(rect => (rect as any).style.fill === tokens.color.background)).toHaveLength(1);
    });
});
