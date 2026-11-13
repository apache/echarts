
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
import { connect, disconnect, EChartsType } from '../../../../src/core/echarts';


describe('api/getConnectedDataURL', function () {

    let chart1: EChartsType;
    let chart2: EChartsType;
    let groupId: string;

    beforeEach(function () {
        chart1 = createChart({
            width: 400,
            height: 300,
            opts: {renderer: 'svg'}
        });
        chart2 = createChart({
            width: 400,
            height: 300,
            opts: {renderer: 'svg'}
        });
    });

    afterEach(function () {
        if (groupId) {
            disconnect(groupId);
        }
        removeChart(chart1);
        removeChart(chart2);
    });

    function setBarOption(chart: EChartsType, title: string, data: number[]): void {
        chart.setOption({
            title: {text: title},
            xAxis: {type: 'category', data: ['A', 'B']},
            yAxis: {},
            series: [{type: 'bar', data: data}]
        });
    }

    function decodeSvgDataURL(url: string): string {
        // 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
        return decodeURIComponent(url.substring(url.indexOf(',') + 1));
    }

    it('svg renderer should export two connected charts without throwing', function () {
        setBarOption(chart1, 'ChartOneTitle', [10, 20]);
        setBarOption(chart2, 'ChartTwoTitle', [30, 40]);
        groupId = connect([chart1, chart2]);

        // #19278: used to throw
        // "TypeError: Cannot set properties of undefined (setting 'innerHTML')"
        // because the throwaway zrender instance was never painted before
        // `getSvgRoot().innerHTML` was written.
        const url = chart1.getConnectedDataURL({type: 'svg'});

        expect(url).toContain('data:image/svg+xml');
        const svg = decodeSvgDataURL(url);
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        // Both charts' content must actually reach the output, not just
        // an empty svg shell.
        expect(svg).toContain('ChartOneTitle');
        expect(svg).toContain('ChartTwoTitle');
    });

    it('svg renderer should apply connectedBackgroundColor', function () {
        setBarOption(chart1, 'ChartOneTitle', [10, 20]);
        setBarOption(chart2, 'ChartTwoTitle', [30, 40]);
        groupId = connect([chart1, chart2]);

        const url = chart1.getConnectedDataURL({
            type: 'svg',
            connectedBackgroundColor: '#ff0000'
        });

        expect(url).toContain('data:image/svg+xml');
        const svg = decodeSvgDataURL(url);
        expect(svg).toContain('#ff0000');
        expect(svg).toContain('ChartOneTitle');
        expect(svg).toContain('ChartTwoTitle');
    });

});
