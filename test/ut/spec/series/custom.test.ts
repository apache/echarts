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
import { createChart } from '../../core/utHelper';
import { ZRColor } from '@/src/util/types';
import { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from '@/src/chart/custom/CustomSeries';


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

    it('should pass user defined data to event handlers', async () => {
        const data = [
            [10, 16],
            [20, 18],
            [30, 26],
            [40, 32],
            [50, 56],
          ];
        const option = {
            xAxis: { scale: true },
            yAxis: {},
            series: [
                {
                    type: 'custom',
                    renderItem: function (params: any, api:any) {
                        const yValue = api.value(1);
                        const start = api.coord([api.value(0), yValue]);
                        const size = api.size([0, yValue]);
                        return {
                            type: 'rect',
                            info: { foo: 'bar' },
                            shape: {
                                x: start[0],
                                y: start[1],
                                width: 50,
                                height: size[1]
                            }
                        };
                    },
                    data: data
                }
            ]
        };
        chart.setOption(option);
        let customInfo: any;
        chart.on('mousemove', param => customInfo = param.info);
        const el = chart.getDom().children.item(0);
        const e = new MouseEvent('mousemove');
        Object.assign(e, { zrX: 100, zrY: 270 });
        el.dispatchEvent(e)
        expect(customInfo).toEqual({ foo: 'bar' });
    })
});
