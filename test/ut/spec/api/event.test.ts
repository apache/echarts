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
import { createChart, getECModel } from '../../core/utHelper';

describe('api/event', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should preserve the event query context when a handler calls setOption', function () {
        chart.setOption({
            xAxis: {
                type: 'category',
                data: ['Mon', 'Tue']
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    id: 'first',
                    type: 'line',
                    data: [1, 2]
                },
                {
                    id: 'second',
                    type: 'line',
                    data: [2, 3]
                }
            ]
        });

        const triggeredSeries: string[] = [];

        chart.on('click', {seriesId: 'first'}, function () {
            triggeredSeries.push('first');
            chart.setOption({
                series: [{
                    id: 'first',
                    data: [3, 4]
                }]
            });
        });
        chart.on('click', {seriesId: 'second'}, function () {
            triggeredSeries.push('second');
        });

        const target = getECModel(chart)
            .getSeriesByIndex(0)
            .getData()
            .getItemGraphicEl(0);

        chart.getZr().trigger('click', {
            target: target,
            offsetX: 10,
            offsetY: 10
        });

        expect(triggeredSeries).toEqual(['first']);

        const secondTarget = getECModel(chart)
            .getSeriesByIndex(1)
            .getData()
            .getItemGraphicEl(0);

        chart.getZr().trigger('click', {
            target: secondTarget,
            offsetX: 10,
            offsetY: 10
        });

        expect(triggeredSeries).toEqual(['first', 'second']);
    });
});
