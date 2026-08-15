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
import { createChart } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';

describe('tooltip_dispose', function () {

    beforeEach(function () {
        jest.useFakeTimers();
    });

    afterEach(function () {
        jest.useRealTimers();
    });

    function createChartWithTooltip(tooltipOption: unknown): EChartsType {
        const chart = createChart({width: 400, height: 300});
        chart.setOption({
            animation: false,
            tooltip: tooltipOption,
            xAxis: {type: 'category', data: ['a', 'b', 'c']},
            yAxis: {type: 'value'},
            series: [{type: 'line', data: [1, 2, 3]}]
        });
        return chart;
    }

    // A `showDelay` timer scheduled before `dispose` used to survive the disposal
    // and then run against a torn-down view, throwing
    // "Cannot read properties of null (reading 'setEnterable')".
    each([
        {renderMode: 'html', trigger: 'axis'},
        {renderMode: 'html', trigger: 'item'},
        {renderMode: 'richText', trigger: 'axis'},
        {renderMode: 'richText', trigger: 'item'}
    ], function (caseOpt) {
        it('should not run a pending showDelay timer after dispose'
            + ` (${caseOpt.renderMode}, ${caseOpt.trigger})`, function () {

            const chart = createChartWithTooltip({
                trigger: caseOpt.trigger,
                renderMode: caseOpt.renderMode,
                showDelay: 500
            });

            chart.dispatchAction({type: 'showTip', seriesIndex: 0, dataIndex: 1});
            expect(jest.getTimerCount()).toBeGreaterThan(0);

            chart.dispose();
            expect(jest.getTimerCount()).toBe(0);

            expect(function () {
                jest.runAllTimers();
            }).not.toThrow();
        });
    });

    it('should clear a pending hideDelay timer on dispose (richText)', function () {
        const chart = createChartWithTooltip({
            trigger: 'axis',
            renderMode: 'richText',
            hideDelay: 500
        });

        chart.dispatchAction({type: 'showTip', seriesIndex: 0, dataIndex: 1});
        chart.dispatchAction({type: 'hideTip'});
        expect(jest.getTimerCount()).toBeGreaterThan(0);

        chart.dispose();
        expect(jest.getTimerCount()).toBe(0);
    });

});
