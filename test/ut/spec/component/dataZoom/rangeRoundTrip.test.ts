
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
import { EChartsOption } from '../../../../../src/export/option';
import { AxisBaseModel } from '../../../../../src/coord/AxisBaseModel';


describe('dataZoom range recovery', function () {
    const charts: EChartsType[] = [];

    function create(option: Parameters<EChartsType['setOption']>[0]): EChartsType {
        const chart = createChart({width: 500, height: 400});
        charts.push(chart);
        chart.setOption(option);
        return chart;
    }

    function makeOption(swapped = false): EChartsOption {
        const bounds = swapped ? [300, 100] : [100, 300];
        return {
            animation: false,
            grid: {left: 50, right: 50, top: 50, bottom: 50},
            xAxis: {type: 'value', min: 0, max: 1},
            yAxis: bounds.map(function (bound, index) {
                return {min: -bound, max: bound, position: index ? 'right' : 'left'};
            }),
            dataZoom: {
                type: 'inside', yAxisIndex: 'all',
                rangeMode: ['value', 'value'], filterMode: 'none'
            },
            series: [{type: 'line', yAxisIndex: swapped ? 0 : 1, data: [[0, -300], [1, 300]]}]
        };
    }

    function expectRange(chart: EChartsType, index: number, extent: number[]): void {
        const axis = (getECModel(chart).getComponent('yAxis', index) as AxisBaseModel).axis;
        expect(axis.scale.getExtent()).toEqual(extent);
        expect(chart.convertToPixel({yAxisIndex: index}, extent[0])).toBeCloseTo(350);
        expect(chart.convertToPixel({yAxisIndex: index}, extent[1])).toBeCloseTo(50);
    }

    afterEach(function () {
        charts.forEach(function (chart) { chart.dispose(); });
        charts.length = 0;
    });

    it('recovers unchanged options repeatedly without sharing calculated value bounds', function () {
        let chart = create(makeOption());
        for (let i = 0; i < 3; i++) {
            expectRange(chart, 0, [-100, 100]);
            expectRange(chart, 1, [-300, 300]);
            chart = create(chart.getOption());
        }
        expectRange(chart, 1, [-300, 300]);
    });

    it('preserves axis bounds when adding a series with full option replacement', function () {
        const option = makeOption();
        const series = option.series;
        option.series = [];
        const chart = create(option);
        const replacement = chart.getOption();
        replacement.series = series;
        chart.setOption(replacement, {notMerge: true});
        expectRange(chart, 0, [-100, 100]);
        expectRange(chart, 1, [-300, 300]);
    });

    it('also recovers unequal axes in the opposite order', function () {
        const chart = create(create(makeOption(true)).getOption());
        expectRange(chart, 0, [-300, 300]);
        expectRange(chart, 1, [-100, 100]);
    });

    it('keeps explicit value bounds beyond the representative axis extent', function () {
        const option = makeOption();
        option.dataZoom = {
            type: 'inside', yAxisIndex: 'all', filterMode: 'none',
            rangeMode: ['value', 'value'], startValue: -200, endValue: 200
        };
        const chart = create(option);
        expectRange(chart, 0, [-100, 100]);
        expectRange(chart, 1, [-200, 200]);
        const recovered = create(chart.getOption());
        expectRange(recovered, 0, [-100, 100]);
        expectRange(recovered, 1, [-200, 200]);
    });

    it('recovers percent zoom actions after starting in value mode', function () {
        const chart = create(makeOption());
        chart.dispatchAction({type: 'dataZoom', start: 25, end: 75});
        expectRange(chart, 0, [-50, 50]);
        expectRange(chart, 1, [-150, 150]);
        const recovered = create(chart.getOption());
        expectRange(recovered, 0, [-50, 50]);
        expectRange(recovered, 1, [-150, 150]);
    });

    it('recovers mixed modes with an unspecified value boundary', function () {
        const option = makeOption();
        option.dataZoom = {
            type: 'inside', yAxisIndex: 'all', filterMode: 'none',
            rangeMode: ['value', 'percent'], end: 75
        };
        const chart = create(option);
        expectRange(chart, 0, [-100, 50]);
        expectRange(chart, 1, [-300, 150]);
        const recovered = create(chart.getOption());
        expectRange(recovered, 0, [-100, 50]);
        expectRange(recovered, 1, [-300, 150]);
    });

    it('recovers explicit value zoom actions without turning them into percentages', function () {
        const chart = create(makeOption());
        chart.dispatchAction({type: 'dataZoom', startValue: -50, endValue: 50});
        const recovered = create(chart.getOption());
        expectRange(recovered, 0, [-50, 50]);
        expectRange(recovered, 1, [-50, 50]);
    });
});
