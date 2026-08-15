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

import { each } from 'zrender/src/core/util';
import { createChart } from '../../core/utHelper';
import { EChartsType } from '../../../../src/echarts';

describe('whiskerBox_emptyValue', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({width: 400, height: 300});
    });
    afterEach(function () {
        chart.dispose();
    });

    // `null` / `undefined` are documented empty values, equivalent to `'-'`. On a
    // category base axis the series prepends the ordinal index to every array item,
    // and that pass used to read `item.value` without checking whether `item` exists.
    each(['candlestick', 'boxplot'] as const, function (seriesType) {

        const valid = seriesType === 'candlestick'
            ? [[20, 30, 10, 35], [25, 35, 15, 40]]
            : [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];

        each([
            {name: 'null', empty: null as unknown},
            {name: 'undefined', empty: undefined as unknown},
            {name: 'dash', empty: '-' as unknown}
        ], function (emptyCase) {
            it(`${seriesType} should accept a ${emptyCase.name} data item`, function () {
                expect(function () {
                    chart.setOption({
                        animation: false,
                        xAxis: {type: 'category', data: ['d1', 'd2', 'd3']},
                        yAxis: {type: 'value'},
                        series: [{
                            type: seriesType,
                            data: [valid[0], emptyCase.empty, valid[1]]
                        }]
                    });
                }).not.toThrow();
            });
        });
    });

    it('should keep the ordinal index of items after an empty value', function () {
        chart.setOption({
            animation: false,
            xAxis: {type: 'category', data: ['d1', 'd2', 'd3']},
            yAxis: {type: 'value'},
            series: [{
                type: 'candlestick',
                data: [[20, 30, 10, 35], null, [25, 35, 15, 40]]
            }]
        });

        const data = (chart as any).getModel().getSeriesByIndex(0).getData();
        expect(data.count()).toBe(3);
        // The item after the gap must still map to the third category, not the second.
        expect(data.get('base', 0)).toBe(0);
        expect(data.get('base', 2)).toBe(2);
        expect(data.get('open', 2)).toBe(25);
        // The gap itself carries no value, so it is not rendered.
        expect(isNaN(data.get('open', 1))).toBe(true);
    });

});
