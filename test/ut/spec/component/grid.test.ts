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


import { createChart, removeChart, getECModel } from '../../core/utHelper';
import GridModel from '../../../../src/coord/cartesian/GridModel';


describe('component/grid', function () {

    function getGridHeight(inverse: boolean): number {
        const chart = createChart({ width: 600, height: 400 });
        chart.setOption({
            grid: {
                outerBoundsMode: 'same',
                outerBoundsContain: 'axisLabel'
            },
            xAxis: {
                type: 'category',
                data: ['A', 'B', 'C', 'D']
            },
            yAxis: [
                { type: 'value' },
                { type: 'value', inverse: inverse, min: 0.4498, max: 0.6824 }
            ],
            series: [
                { type: 'line', data: [10, 20, 30, 40] },
                { type: 'line', yAxisIndex: 1, data: [0.5, 0.55, 0.6, 0.65] }
            ]
        });
        const gridModel = getECModel(chart).getComponent('grid', 0) as GridModel;
        const height = gridModel.coordinateSystem.getRect().height;
        removeChart(chart);
        return height;
    }

    it('outerBoundsContain should not collapse the grid on an inverse axis', function () {
        const normalHeight = getGridHeight(false);
        const inverseHeight = getGridHeight(true);
        // The inverse axis must lay out (nearly) the same grid as the
        // non-inverse axis; before the fix the grid collapsed to a few
        // dozen pixels because the label proportion ignored `inverse`.
        expect(inverseHeight).toBeGreaterThan(normalHeight - 30);
        expect(inverseHeight).toBeGreaterThan(150);
    });

});
