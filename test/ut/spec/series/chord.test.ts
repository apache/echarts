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

import { EChartsType } from '@/src/echarts';
import { createChart, getECModel } from '../../core/utHelper';
import { LinearGradientObject } from 'zrender/src/graphic/LinearGradient';
import { Path } from '@/src/util/graphic';


function makeOption(value: number) {
    return {
        animation: false,
        series: [{
            type: 'chord',
            data: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
            lineStyle: { color: 'gradient' },
            links: [
                { source: 'A', target: 'B', value: value },
                { source: 'B', target: 'C', value: 20 },
                { source: 'A', target: 'C', value: 10 }
            ]
        }]
    };
}

function getEdgeGradients(chart: EChartsType) {
    const edgeData = (getECModel(chart).getSeriesByIndex(0) as any).getEdgeData();
    const result = [];
    for (let i = 0; i < edgeData.count(); i++) {
        const fill = (edgeData.getItemGraphicEl(i) as Path).style.fill as LinearGradientObject;
        result.push([fill.x, fill.y, fill.x2, fill.y2]);
    }
    return result;
}

describe('chord', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({ width: 240, height: 390 });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should update gradient edge colors on resize', function () {
        chart.setOption(makeOption(40));
        chart.resize({ width: 400, height: 300 });

        const freshChart = createChart({ width: 400, height: 300 });
        freshChart.setOption(makeOption(40));

        expect(getEdgeGradients(chart)).toEqual(getEdgeGradients(freshChart));
        freshChart.dispose();
    });

    it('should update gradient edge colors on data change', function () {
        chart.setOption(makeOption(40));
        chart.setOption(makeOption(5));

        const freshChart = createChart({ width: 240, height: 390 });
        freshChart.setOption(makeOption(5));

        expect(getEdgeGradients(chart)).toEqual(getEdgeGradients(freshChart));
        freshChart.dispose();
    });

});
