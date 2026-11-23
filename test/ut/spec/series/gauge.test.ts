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


import { createChart, removeChart } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts';


describe('gauge', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({width: 400, height: 300});
    });
    afterEach(function () {
        removeChart(chart);
    });

    function gaugeOption(showProgress: boolean) {
        return {
            animation: false,
            series: [{
                type: 'gauge',
                pointer: { show: false },
                progress: { show: showProgress, width: 14 },
                data: [{ value: 68, name: 'Uptime' }]
            }]
        };
    }

    function progressSectors() {
        const sectors: any[] = [];
        (chart as any).getZr().storage.getDisplayList(true).forEach(function (el: any) {
            if (el.type === 'sector' && el.shape && el.shape.r0 > 0) {
                sectors.push(el);
            }
        });
        return sectors;
    }

    it('shows the progress after a render with neither the pointer nor the progress', function () {
        chart.setOption(gaugeOption(false));
        const before = progressSectors().length;

        expect(() => chart.setOption(gaugeOption(true))).not.toThrow();

        expect(progressSectors().length).toBe(before + 1);
    });

    it('hides and shows the progress again', function () {
        chart.setOption(gaugeOption(true));
        chart.setOption(gaugeOption(false));

        expect(() => chart.setOption(gaugeOption(true))).not.toThrow();
    });
});
