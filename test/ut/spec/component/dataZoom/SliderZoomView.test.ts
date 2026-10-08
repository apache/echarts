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

import { EChartsType } from '../../../../../src/echarts';
import { createChart, getGraphicElements } from '../../../core/utHelper';

interface DataShadowPath {
    type: string;
    shape: {
        points: number[][];
    };
}

function isDataShadowPath(el: unknown): el is DataShadowPath {
    const path = el as DataShadowPath;
    return !!(
        path
        && (path.type === 'polygon' || path.type === 'polyline')
        && path.shape
        && path.shape.points
    );
}

describe('dataZoom/SliderZoomView', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should keep data shadow points finite for single-point time axis data', function () {
        chart.setOption({
            xAxis: { type: 'time' },
            yAxis: { type: 'value' },
            dataZoom: [{ type: 'slider', showDataShadow: true }],
            series: [{
                type: 'line',
                data: [['2025-07-01', 285]]
            }]
        });

        const dataShadowPaths: DataShadowPath[] = [];
        getGraphicElements(chart, 'dataZoom', 0).forEach(function (el) {
            if (isDataShadowPath(el)) {
                dataShadowPaths.push(el);
            }
        });

        expect(dataShadowPaths.length).toBeGreaterThan(0);

        dataShadowPaths.forEach(function (path) {
            path.shape.points.forEach(function (point) {
                point.forEach(function (coord) {
                    expect(isFinite(coord)).toEqual(true);
                });
            });
        });
    });

});
