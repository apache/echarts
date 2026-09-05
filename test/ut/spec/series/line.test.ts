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


describe('line_series', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should render line under labels from mixed series', function () {
        chart.setOption({
            animation: false,
            xAxis: {
                type: 'category',
                data: ['A', 'B', 'C']
            },
            yAxis: {},
            series: [
                {
                    type: 'bar',
                    label: {
                        show: true,
                        position: 'top'
                    },
                    data: [120, 120, 120]
                },
                {
                    type: 'line',
                    showSymbol: false,
                    data: [140, 100, 140]
                }
            ]
        });

        const barItem = getGraphicElements(chart, 'series', 0).find(el => el.name === 'item');
        const barLabel = barItem && barItem.getTextContent();
        const linePolyline = getGraphicElements(chart, 'series', 1).find(el => el.type === 'ec-polyline');

        expect(barItem).toBeDefined();
        expect(barLabel).toBeDefined();
        expect(linePolyline).toBeDefined();

        expect((linePolyline as any).z2).toBeLessThan((barLabel as any).z2);
    });

});
