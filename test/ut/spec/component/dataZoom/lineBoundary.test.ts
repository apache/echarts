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
import { createChart, getECModel } from '../../../core/utHelper';

function getRawIndices(chart: EChartsType, seriesIndex = 0): number[] {
    const data = getECModel(chart).getSeries()[seriesIndex].getData();
    const out: number[] = [];
    for (let i = 0; i < data.count(); i++) {
        out.push(data.getRawIndex(i));
    }
    return out;
}

describe('dataZoom/lineBoundary', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });
    afterEach(function () {
        chart.dispose();
    });

    // https://github.com/apache/echarts/issues/21564
    it('keeps one neighbor on each side so partial line segments still draw', function () {
        chart.setOption({
            xAxis: {
                type: 'category',
                data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
            },
            yAxis: { type: 'value' },
            dataZoom: [{
                type: 'inside',
                xAxisIndex: 0,
                startValue: 3,
                endValue: 13
            }],
            series: [{
                type: 'line',
                data: [
                    [0, 5],
                    [2, 6],
                    [8, 5],
                    [12, 5],
                    [16, 6]
                ]
            }]
        });

        // Window covers categories [3, 13]. Raw rows in window: 2 (x=8), 3 (x=12).
        // The fix also keeps row 1 (x=2, predecessor of first in-window row)
        // and row 4 (x=16, successor of last in-window row), so the line view
        // can render the partial segments crossing the window boundary.
        expect(getRawIndices(chart)).toEqual([1, 2, 3, 4]);
    });

    // https://github.com/apache/echarts/issues/21565
    it('keeps a null gap row whose neighbor in raw order is in the window', function () {
        chart.setOption({
            xAxis: {
                type: 'category',
                data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
            },
            yAxis: { type: 'value' },
            dataZoom: [{
                type: 'inside',
                xAxisIndex: 0,
                startValue: 3,
                endValue: 10
            }],
            series: [{
                type: 'line',
                data: [
                    [4, 5],
                    [7, 5],
                    [11, 5],
                    [11, null],
                    [6, 6],
                    [9, 6]
                ]
            }]
        });

        // Window covers categories [3, 10]. Raw rows whose x is in window:
        // 0 (x=4), 1 (x=7), 4 (x=6), 5 (x=9). Without the fix, row 3 (x=11,
        // y=null) would be dropped and the line would jump from row 1 (7,5)
        // to row 4 (6,6), producing a ghost line. The fix keeps row 3 because
        // its raw-order successor (row 4) is in the window, and also keeps
        // row 2 (x=11) because its predecessor (row 1) is in the window.
        expect(getRawIndices(chart)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('does not affect bar series (boundary keeping is line-only)', function () {
        chart.setOption({
            xAxis: { type: 'category', data: [0, 1, 2, 3, 4] },
            yAxis: { type: 'value' },
            dataZoom: [{
                type: 'inside',
                xAxisIndex: 0,
                startValue: 1,
                endValue: 3
            }],
            series: [{
                type: 'bar',
                data: [
                    [0, 5],
                    [1, 5],
                    [2, 5],
                    [3, 5],
                    [4, 5]
                ]
            }]
        });

        expect(getRawIndices(chart)).toEqual([1, 2, 3]);
    });

    it('does not change behavior when filterMode is not "filter"', function () {
        chart.setOption({
            xAxis: { type: 'category', data: [0, 1, 2, 3, 4, 5, 6] },
            yAxis: { type: 'value' },
            dataZoom: [{
                type: 'inside',
                xAxisIndex: 0,
                startValue: 2,
                endValue: 4,
                filterMode: 'none'
            }],
            series: [{
                type: 'line',
                data: [
                    [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5]
                ]
            }]
        });

        // filterMode 'none' keeps every row.
        expect(getRawIndices(chart)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('keeps no extra neighbors when every row is in the window', function () {
        chart.setOption({
            xAxis: { type: 'category', data: [0, 1, 2, 3, 4] },
            yAxis: { type: 'value' },
            dataZoom: [{
                type: 'inside',
                xAxisIndex: 0,
                startValue: 0,
                endValue: 4
            }],
            series: [{
                type: 'line',
                data: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5]]
            }]
        });

        expect(getRawIndices(chart)).toEqual([0, 1, 2, 3, 4]);
    });
});
