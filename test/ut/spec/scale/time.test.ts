
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

import { createChart, getECModel } from '../../core/utHelper';
import { parseDate } from '../../../../src/util/number';
import { EChartsType } from '../../../../src/echarts';


describe('scale/time', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('uses ISO weeks in time series and dataZoom bounds', function () {
        chart.setOption({
            animation: false,
            xAxis: { type: 'time' },
            yAxis: { type: 'value' },
            dataZoom: [{ type: 'slider', xAxisIndex: 0 }],
            series: [{
                type: 'line',
                data: [
                    ['2020-W52', 1],
                    ['2020-W53', 2],
                    ['2021-W01', 3],
                    ['2021-W02', 4]
                ]
            }]
        });
        const model = getECModel(chart);
        expect(model.getSeriesByIndex(0).getData().count()).toEqual(4);
        const pixel = chart.convertToPixel('grid', ['2020-W53', 2]);
        expect(isFinite(pixel[0])).toEqual(true);
        expect(isFinite(pixel[1])).toEqual(true);

        chart.dispatchAction({
            type: 'dataZoom',
            startValue: '2020-W53',
            endValue: '2021-W01'
        });
        const data = model.getSeriesByIndex(0).getData();
        expect(data.count()).toEqual(2);
        expect(data.get('x', 0)).toEqual(+parseDate('2020-12-28'));
        expect(data.get('x', 1)).toEqual(+parseDate('2021-01-04'));
    });
});
