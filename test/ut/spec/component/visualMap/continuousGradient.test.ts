/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* 'License'); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/
import { createChart, removeChart } from '../../../core/utHelper';

describe('continuous visualMap overlapping gradients', () => {
    test.each(['vertical', 'horizontal'])('%s geometry, including range updates', orient => {
        const chart = createChart();
        chart.setOption({xAxis: {}, yAxis: {}, visualMap: {
            min: 0, max: 100, calculable: true, orient, range: [25, 75],
            controller: {inRange: {color: ['#00000055', '#00000099'], symbolSize: [5, 10]},
                outOfRange: {color: ['red', 'blue'], symbolSize: [10, 10]}}
        }, series: [{type: 'scatter', data: [[0, 0], [100, 100]]}]});
        const model = (chart as any).getModel().getComponent('visualMap');
        const view = (chart as any).getViewOfComponentModel(model);
        const shapes = view._shapes;
        const clip = shapes.outOfRange.getClipPath();
        expect(clip).toBeTruthy();
        function check() {
            const points = shapes.inRange.shape.points;
            const w = model.itemSize[0];
            const h = model.itemSize[1];
            expect(clip.shape.points).toEqual([[0, 0], [w, 0], [w, points[0][1]], points[0], points[3],
                [w, points[3][1]], [w, h], [0, h]]);
        }
        check();
        for (const ends of [[0, 140], [70, 70], [20, 100]]) {
            view._handleEnds = ends;
            view._dataInterval = ends.map((v: number) => v / model.itemSize[1] * 100);
            view._updateView();
            expect(shapes.outOfRange.getClipPath()).toBe(clip);
            check();
        }
        removeChart(chart);
    });

    test('preserves the non-overlapping wing when the bar edges cross', () => {
        const chart = createChart();
        chart.setOption({xAxis: {}, yAxis: {}, visualMap: {
            min: 0, max: 100, calculable: true, range: [25, 75],
            inRange: {color: ['#00000055', '#00000099']}, outOfRange: {color: ['red', 'blue']}
        }, series: [{type: 'scatter', data: [[0, 0], [100, 100]]}]});
        const model = (chart as any).getModel().getComponent('visualMap');
        const view = (chart as any).getViewOfComponentModel(model);
        const original = view.getControllerVisual;
        view.getControllerVisual = function (value: number, key: string, opts: any) {
            if (key === 'symbolSize' && opts && opts.forceState) {
                return opts.forceState === 'inRange' ? 5 + 0.15 * value : 20 - 0.15 * value;
            }
            return original.apply(this, arguments);
        };
        view._updateView();
        const shapes = view._shapes;
        const clip = shapes.outOfRange.getClipPath();
        const global = (x: number, y: number) => shapes.outOfRange.transformCoordToGlobal(x, y);
        // At y=50, x=8 is in the out-of-range wing, x=18 is covered by in-range.
        expect(clip.contain(...global(8, 50))).toBe(true);
        expect(clip.contain(...global(18, 50))).toBe(false);
        // At y=90 the selected bar is wider; the overlapping region stays excluded.
        expect(clip.contain(...global(18, 90))).toBe(false);
        removeChart(chart);
    });

});
