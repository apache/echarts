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
import { EChartsType } from '@/src/echarts';
import CartesianAxisModel from '@/src/coord/cartesian/AxisModel';


describe('scale_time', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({ width: 650, height: 300 });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('day_ticks_stay_within_their_month', function () {
        const data = [];
        for (let i = 0; i < 120; i++) {
            data.push([new Date(2026, 5, 9 + i).getTime(), 1]);
        }

        chart.setOption({
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{ type: 'bar', data }]
        });

        const xAxis = getECModel(chart).getComponent('xAxis', 0) as CartesianAxisModel;
        const ticks = xAxis.axis.scale.getTicks();
        const days = ticks.map(tick => new Date(tick.value).getDate());

        // Interval of 16 days: ticks on the 1st and 17th of each month, plus the extent ends.
        expect(days).toEqual([9, 17, 1, 17, 1, 17, 1, 17, 1, 6]);
    });

});
