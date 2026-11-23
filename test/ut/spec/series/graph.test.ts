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


describe('graph', function () {

    const viewOption = {
        animation: false,
        series: [{
            type: 'graph',
            layout: 'none',
            data: [{ name: 'a', x: 0, y: 0 }, { name: 'b', x: 1000, y: 800 }],
            links: [{ source: 'a', target: 'b' }]
        }]
    };

    const cartesianOption = {
        animation: false,
        xAxis: { type: 'value', min: 0, max: 10 },
        yAxis: { type: 'value', min: 0, max: 10 },
        series: [{
            type: 'graph',
            coordinateSystem: 'cartesian2d',
            data: [[2, 3], [8, 7]],
            links: [{ source: 0, target: 1 }]
        }]
    };

    function mainGroupTransform(chart: any) {
        const group = chart._chartsViews[0]._mainGroup;
        return [group.x, group.y, group.scaleX, group.scaleY];
    }

    it('places a cartesian2d graph on the grid after a graph on the view coordinate system', function () {
        const switched = createChart({width: 400, height: 300});
        const direct = createChart({width: 400, height: 300});

        try {
            switched.setOption(viewOption);
            switched.setOption(cartesianOption, true);
            direct.setOption(cartesianOption);

            expect(mainGroupTransform(switched)).toEqual(mainGroupTransform(direct));
            expect(mainGroupTransform(switched)).toEqual([0, 0, 1, 1]);
        }
        finally {
            switched.dispose();
            direct.dispose();
        }
    });
});
