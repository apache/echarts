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
import MarkerModel from '../../../../../src/component/marker/MarkerModel';

describe('component/markLine', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    // Regression test for #21683: an empty/invalid entry (e.g. `{}`) inside
    // `markLine.data` used to throw "Cannot read properties of undefined
    // (reading 'coord')" in markLineFilter, which aborted rendering of ALL
    // markLines. It should instead be ignored while the valid markLines render.
    it('ignores an empty markLine data item and still renders the valid ones (#21683)', function () {
        function setInvalidMarkLine() {
            chart.setOption({
                xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
                yAxis: { type: 'value' },
                series: [{
                    type: 'bar',
                    data: [1, 2, 3, 4, 5],
                    markLine: {
                        data: [
                            { yAxis: 1 },
                            {}, // invalid / empty entry
                            { yAxis: 3 }
                        ]
                    }
                }]
            });
        }

        expect(setInvalidMarkLine).not.toThrow();

        // The two valid markLines should still be rendered; the empty one dropped.
        const seriesModel = getECModel(chart).getSeriesByIndex(0);
        const markLineModel = MarkerModel.getMarkerModelFromSeries(seriesModel, 'markLine');
        expect(markLineModel).toBeTruthy();
        expect(markLineModel.getData().count()).toBe(2);
    });

});
