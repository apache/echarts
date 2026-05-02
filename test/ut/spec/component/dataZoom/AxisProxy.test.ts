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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';


describe('dataZoom/AxisProxy', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function setToolboxStackedLineOption(filterMode?: 'filter' | 'weakFilter' | 'empty') {
        chart.setOption({
            toolbox: {
                feature: {
                    dataZoom: filterMode
                        ? {filterMode: filterMode}
                        : {}
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: ['Mon', 'Tue', 'Wed']
            },
            yAxis: {
                scale: true
            },
            series: [{
                type: 'line',
                stack: 'total',
                data: [100, 100, 100]
            }, {
                type: 'line',
                stack: 'total',
                areaStyle: {},
                data: [1, 2, 3]
            }]
        });
    }

    it('keeps stacked line data when toolbox dataZoom injects value-axis filtering', function () {
        setToolboxStackedLineOption();

        const data = getECModel(chart).getSeriesByIndex(1).getData();
        const stackResultDim = data.getCalculationInfo('stackResultDimension');
        expect(data.count()).toEqual(3);
        expect(data.get(stackResultDim, 0)).toEqual(101);
    });

    it('keeps stacked line data when toolbox dataZoom uses weakFilter', function () {
        setToolboxStackedLineOption('weakFilter');

        const data = getECModel(chart).getSeriesByIndex(1).getData();
        const stackResultDim = data.getCalculationInfo('stackResultDimension');
        expect(data.count()).toEqual(3);
        expect(data.get(stackResultDim, 0)).toEqual(101);
    });

    it('empties stacked line data by stack result dimension', function () {
        chart.setOption({
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: ['Mon', 'Tue', 'Wed']
            },
            yAxis: {
                scale: true
            },
            dataZoom: {
                yAxisIndex: 0,
                filterMode: 'empty',
                startValue: 102,
                endValue: 103
            },
            series: [{
                type: 'line',
                stack: 'total',
                data: [100, 100, 100]
            }, {
                type: 'line',
                stack: 'total',
                areaStyle: {},
                data: [1, 2, 3]
            }]
        });

        const data = getECModel(chart).getSeriesByIndex(1).getData();
        const stackResultDim = data.getCalculationInfo('stackResultDimension');
        expect(data.count()).toEqual(3);
        expect(isNaN(data.get(stackResultDim, 0) as number)).toEqual(true);
        expect(data.get(stackResultDim, 1)).toEqual(102);
        expect(data.get(stackResultDim, 2)).toEqual(103);
        expect(data.get('y', 1)).toEqual(2);
        expect(data.get('y', 2)).toEqual(3);
    });

});
