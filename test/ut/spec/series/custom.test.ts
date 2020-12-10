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

import { EChartsType } from '../../../../src/echarts';
import { createChart } from '../../core/utHelper';
import { ZRColor } from '../../../../src/util/types';
import { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from '../../../../src/chart/custom';


describe('custom_series', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });


    it('visual_palette', function () {
        const colors = ['#111111', '#222222', '#333333'];
        const resultPaletteColors: ZRColor[] = [];

        function renderItem(params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) {
            const color = api.visual('color');
            resultPaletteColors.push(color);
            return {
                type: 'circle'
            };
        }

        chart.setOption({
            color: colors,
            xAxis: { data: ['a'] },
            yAxis: {},
            series: [{
                type: 'custom',
                renderItem: renderItem,
                data: [11]
            }, {
                type: 'custom',
                renderItem: renderItem,
                data: [22]
            }, {
                type: 'custom',
                renderItem: renderItem,
                data: [33]
            }]
        }, true);

        expect(resultPaletteColors).toEqual(colors);
    });

});
