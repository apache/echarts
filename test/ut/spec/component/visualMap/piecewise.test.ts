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

import { createChart } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';

function makeOption(pieces: unknown[]) {
    return {
        xAxis: {
            boundaryGap: false,
            data: ['A', 'B', 'C', 'D', 'E']
        },
        yAxis: {},
        visualMap: [{
            type: 'piecewise' as const,
            show: true,
            dimension: 1,
            pieces
        }],
        series: [{
            name: 'population',
            type: 'line' as const,
            data: [320, 530, 230, 550, 220]
        }]
    };
}

describe('visualMap_piecewise', function () {
    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });
    afterEach(function () {
        chart.dispose();
    });

    it('two pieces should not throw', function () {
        expect(function () {
            chart.setOption(makeOption([
                { lte: 400, color: 'green' },
                { gt: 400, color: '#f00' }
            ]));
        }).not.toThrow();
    });

    it('five pieces should not throw', function () {
        expect(function () {
            chart.setOption(makeOption([
                { lte: 100, color: 'green' },
                { gt: 100, lte: 200, color: 'red' },
                { gt: 200, lte: 300, color: 'green' },
                { gt: 300, lte: 400, color: 'red' },
                { gt: 400, color: '#f00' }
            ]));
        }).not.toThrow();
    });

    it('one piece should not throw', function () {
        expect(function () {
            chart.setOption(makeOption([
                { lte: 400, color: 'green' }
            ]));
        }).not.toThrow();
    });

    it('one piece with only gt should not throw', function () {
        expect(function () {
            chart.setOption(makeOption([
                { gt: 400, color: 'green' }
            ]));
        }).not.toThrow();
    });

    it('three pieces should not throw', function () {
        expect(function () {
            chart.setOption(makeOption([
                { lte: 100, color: 'green' },
                { gt: 100, lte: 400, color: 'red' },
                { gt: 400, color: '#f00' }
            ]));
        }).not.toThrow();
    });
});
