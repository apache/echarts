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

import { createChart, removeChart } from '../../core/utHelper';
import { EChartsType } from '../../../../src/echarts';


function getThumbnailContentRect(chart: EChartsType) {
    const thumbnailModel = (chart as any).getModel().getComponent('thumbnail');
    const thumbnailView = (chart as any).getViewOfComponentModel(thumbnailModel);
    return thumbnailView._bridgeRendered.group.getBoundingRect();
}

function renderGraph(chart: EChartsType, symbol: string) {
    chart.setOption({
        animation: false,
        thumbnail: {},
        series: [{
            type: 'graph',
            layout: 'none',
            symbol,
            symbolSize: 20,
            data: [
                {name: 'a', x: 100, y: 100},
                {name: 'b', x: 200, y: 100},
                {name: 'c', x: 150, y: 200}
            ],
            links: [
                {source: 'a', target: 'b'},
                {source: 'b', target: 'c'}
            ]
        }]
    });
}

describe('graph thumbnail', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        removeChart(chart);
    });

    it('should not shift or zoom out content when symbol is an SVG path', function () {
        renderGraph(chart, 'circle');
        const circleRect = getThumbnailContentRect(chart);

        renderGraph(chart, 'path://M0,0 L10,0 L10,10 L0,10 Z');
        const pathRect = getThumbnailContentRect(chart);

        expect(pathRect.x).toBeCloseTo(circleRect.x);
        expect(pathRect.y).toBeCloseTo(circleRect.y);
        expect(pathRect.width).toBeCloseTo(circleRect.width);
        expect(pathRect.height).toBeCloseTo(circleRect.height);
    });

    it('should not shift or zoom out content when symbol is an image', function () {
        renderGraph(chart, 'circle');
        const circleRect = getThumbnailContentRect(chart);

        renderGraph(chart, 'image://data:image/gif;base64,R0lGODlhAQABAAAAACw=');
        const imageRect = getThumbnailContentRect(chart);

        expect(imageRect.x).toBeCloseTo(circleRect.x);
        expect(imageRect.y).toBeCloseTo(circleRect.y);
        expect(imageRect.width).toBeCloseTo(circleRect.width);
        expect(imageRect.height).toBeCloseTo(circleRect.height);
    });

});
