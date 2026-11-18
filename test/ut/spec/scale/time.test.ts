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

    describe('dst', function () {

        let chart: EChartsType;
        beforeEach(function () {
            chart = createChart({width: 600, height: 300});
        });

        afterEach(function () {
            chart.dispose();
            setTimezone();
        });

        it('day_ticks_after_midnight_dst_change', function () {
            // Local midnight does not exist on 2026-03-29 in Atlantic/Azores (00:00 -> 01:00).
            setTimezone('Atlantic/Azores');
            chart.setOption({
                animation: false,
                xAxis: {type: 'time'},
                yAxis: {type: 'value'},
                series: [{
                    type: 'line',
                    data: [
                        [Date.parse('2026-03-26T12:00Z'), 1],
                        [Date.parse('2026-04-03T00:00Z'), 2]
                    ]
                }]
            });

            const xAxis = getECModel(chart).getComponent('xAxis', 0) as CartesianAxisModel;
            const labels = xAxis.axis.getViewLabels().filter(function (item) {
                return !item.tick.notNice;
            });

            expect(labels.map(function (item) {
                return item.tick.value;
            })).toEqual([
                new Date(2026, 2, 27).getTime(),
                new Date(2026, 2, 28).getTime(),
                // Starts at 01:00 since 00:00 does not exist on that day.
                new Date(2026, 2, 29).getTime(),
                new Date(2026, 2, 30).getTime(),
                new Date(2026, 2, 31).getTime(),
                new Date(2026, 3, 1).getTime(),
                new Date(2026, 3, 2).getTime(),
                new Date(2026, 3, 3).getTime()
            ]);
            expect(new Date(labels[2].tick.value).getHours()).toEqual(1);

            expect(labels.map(function (item) {
                return item.formattedLabel;
            })).toEqual([
                '27', '28', '29', '30', '31', '{primary|Apr}', '2', '3'
            ]);
        });

        it('day_ticks_after_midnight_offset_change_with_minutes', function () {
            // Local midnight does not exist on 1986-01-01 in Asia/Kathmandu (00:00 -> 00:15).
            setTimezone('Asia/Kathmandu');
            chart.setOption({
                animation: false,
                xAxis: {type: 'time'},
                yAxis: {type: 'value'},
                series: [{
                    type: 'line',
                    data: [
                        [new Date(1985, 11, 28, 12).getTime(), 1],
                        [new Date(1986, 0, 5).getTime(), 2]
                    ]
                }]
            });

            const xAxis = getECModel(chart).getComponent('xAxis', 0) as CartesianAxisModel;
            const labels = xAxis.axis.getViewLabels().filter(function (item) {
                return !item.tick.notNice;
            });

            expect(labels.map(function (item) {
                return item.tick.value;
            })).toEqual([
                new Date(1985, 11, 29).getTime(),
                new Date(1985, 11, 30).getTime(),
                new Date(1985, 11, 31).getTime(),
                // Starts at 00:15 since 00:00 does not exist on that day.
                new Date(1986, 0, 1).getTime(),
                new Date(1986, 0, 2).getTime(),
                new Date(1986, 0, 3).getTime(),
                new Date(1986, 0, 4).getTime(),
                new Date(1986, 0, 5).getTime()
            ]);
            expect(new Date(labels[3].tick.value).getMinutes()).toEqual(15);
        });
    });
});
