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

import { createChart } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts';


describe('line', function () {

    function makeOption(step: 'end' | false) {
        return {
            animation: false,
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            series: [{
                type: 'line',
                name: 'A',
                step,
                data: [[0, 1], [1, 3], [2, 2]],
                endLabel: { show: true, formatter: '{a}' }
            }]
        };
    }

    function getLineView(chart: EChartsType) {
        const seriesModel = (chart as any).getModel().getSeriesByIndex(0);
        return (chart as any).getViewOfSeriesModel(seriesModel);
    }

    function expectEndLabelAttached(chart: EChartsType) {
        const view = getLineView(chart);
        const endLabel = view._endLabel;
        expect(!!endLabel).toBe(true);
        // Compare by identity to avoid jest deep-printing graphic elements.
        expect(view._polyline.getTextContent() === endLabel).toBe(true);
        expect(endLabel.style.text).toBe('A');
    }

    // See #21833
    it('should keep endLabel when step is changed by setOption', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            chart.setOption(makeOption('end'));
            expectEndLabelAttached(chart);

            chart.setOption(makeOption(false), { notMerge: true });
            expectEndLabelAttached(chart);

            chart.setOption(makeOption('end'));
            expectEndLabelAttached(chart);
        }
        finally {
            chart.dispose();
        }
    });

});
