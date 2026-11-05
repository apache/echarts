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


// Regression tests for https://github.com/apache/echarts/issues/21148
// "[Bug] Empty Bar series causes x axis bounds to change".
// On the reported versions (5.6.0 / 6.0.0) an empty bar series on a time
// xAxis caused the explicitly set `xAxis.min`/`max` to be expanded, because
// the bar-overflow adjustment in `axisHelper.getScaleExtent`
// (`adjustScaleForOverflow`) ran for any bar series on the axis - even an
// empty one - and ignored the fixed min/max. That mechanism no longer
// exists on master; these tests lock in the correct behaviour.
describe('empty_bar_series_axis_extent_21148', function () {

    let chart: EChartsType;
    afterEach(function () {
        if (chart) {
            chart.dispose();
        }
    });

    function xExtent(option: any): number[] {
        chart = createChart();
        chart.setOption(option);
        const xAxis = getECModel(chart).getComponent('xAxis', 0) as CartesianAxisModel;
        const extent = xAxis.axis.scale.getExtent();
        chart.dispose();
        chart = null;
        return extent;
    }

    it('time axis with fixed min/max is not changed by an empty bar series', function () {
        const min = +new Date('2025-01-01T00:00:00Z');
        const max = +new Date('2025-01-10T00:00:00Z');
        const baseOption = {
            xAxis: {type: 'time', min: min, max: max},
            yAxis: {},
            series: [{type: 'line', data: [[min + 86400000, 5], [min + 4 * 86400000, 8]]}]
        };
        const withEmptyBarOption = {
            xAxis: {type: 'time', min: min, max: max},
            yAxis: {},
            series: [
                {type: 'line', data: [[min + 86400000, 5], [min + 4 * 86400000, 8]]},
                {type: 'bar', data: []}
            ]
        };
        expect(xExtent(baseOption)).toEqual([min, max]);
        expect(xExtent(withEmptyBarOption)).toEqual([min, max]);
    });

    it('time axis with fixed min/max and only an empty bar series', function () {
        const min = +new Date('2025-01-01T00:00:00Z');
        const max = +new Date('2025-01-10T00:00:00Z');
        expect(xExtent({
            xAxis: {type: 'time', min: min, max: max},
            yAxis: {},
            series: [{type: 'bar', data: []}]
        })).toEqual([min, max]);
    });

    it('value axis with fixed min/max is not changed by an empty bar series', function () {
        const withEmptyBarOption = {
            xAxis: {type: 'value', min: 0, max: 100},
            yAxis: {},
            series: [
                {type: 'line', data: [[0, 5], [10, 8], [50, 3], [90, 7]]},
                {type: 'bar', data: []}
            ]
        };
        expect(xExtent(withEmptyBarOption)).toEqual([0, 100]);
    });
});
