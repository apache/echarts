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
import { createChart, getECModel } from '../../core/utHelper';

describe('treemap', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should use select.itemStyle.color for parent nodes with upperLabel', function () {
        chart.setOption({
            series: [{
                type: 'treemap',
                selectedMode: 'single',
                upperLabel: {
                    show: true,
                    height: 24
                },
                select: {
                    itemStyle: {
                        color: '#ff0',
                        borderColor: '#0f0'
                    }
                },
                data: [{
                    name: 'Bob',
                    value: 10,
                    children: [{
                        name: 'Bob 1',
                        value: 4
                    }, {
                        name: 'Bob 2',
                        value: 6
                    }]
                }]
            }]
        });

        const seriesModel = getECModel(chart).getSeriesByIndex(0);
        const bg = seriesModel.getData().getItemGraphicEl(0) as any;

        expect(bg.states.select.style.fill).toBe('#ff0');
    });
});
