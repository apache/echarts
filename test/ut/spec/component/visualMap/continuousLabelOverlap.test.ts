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

describe('visualMap/continuous#verticalLabelOverlap', function () {

    let chart: any;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getHandleLabels(): any[] {
        const ecIns: any = chart;
        const ecModel = ecIns.getModel();
        const vmModel = ecModel.getComponent('visualMap', 0);
        if (!vmModel) {
            return null;
        }
        const view = ecIns._componentsMap[vmModel.__viewId];
        return view && view._shapes && view._shapes.handleLabels
            ? view._shapes.handleLabels
            : null;
    }

    [
        [50, 50],
        [49, 51],
        [0, 100]
    ].forEach(([start, end]) => {
        it(`should_separate_overlapping_handle_labels_vertical_range_${start}_${end}`, function () {
            // https://github.com/apache/echarts/issues/21766
            // On a vertical calculable continuous visualMap, when both handles
            // sit at (almost) the same position, the two value labels must be
            // pushed apart instead of drawing on top of each other.
            chart.setOption({
                visualMap: {
                    type: 'continuous',
                    min: 0,
                    max: 100,
                    orient: 'vertical',
                    calculable: true,
                    start,
                    end,
                    left: 'left',
                    top: 'center'
                },
                xAxis: { type: 'category', data: ['a', 'b', 'c', 'd', 'e'] },
                yAxis: { type: 'category', data: ['x', 'y', 'z'] },
                series: [{
                    type: 'heatmap',
                    data: [['a', 'x', 10], ['b', 'y', 50], ['c', 'z', 90], ['d', 'x', 30], ['e', 'y', 70]]
                }]
            });

            const labels = getHandleLabels();
            expect(labels).toBeTruthy();
            expect(labels.length).toEqual(2);

            const rect0 = labels[0].getBoundingRect();
            const rect1 = labels[1].getBoundingRect();
            // After the push-apart, the two label bounding rects must not
            // intersect vertically (the reported bug had them stacked exactly
            // on top of each other for close handle ranges).
            const verticallyDisjoint =
                rect0.y + rect0.height <= rect1.y + 1e-6
                || rect1.y + rect1.height <= rect0.y + 1e-6;
            expect(verticallyDisjoint).toBe(true);

            const samePos = Math.abs(rect0.y - rect1.y) < 1e-6;
            expect(samePos).toBe(false);
        });
    });
});
