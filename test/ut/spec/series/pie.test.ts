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
import { EChartsType } from '@/src/echarts';
import ZRText from 'zrender/src/graphic/Text';
import Rect from 'zrender/src/graphic/shape/Rect';


describe('pie', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({width: 300, height: 200});
    });
    afterEach(function () {
        removeChart(chart);
    });

    function getLabelBackgroundWidths(lineHeight?: number): number[] {
        chart.setOption({
            animation: false,
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '70%'],
                startAngle: 180,
                endAngle: 360,
                label: {
                    backgroundColor: '#ccc',
                    overflow: 'break',
                    lineHeight
                },
                data: [
                    {value: 1048, name: 'Search Engine '.repeat(20)},
                    {value: 735, name: 'Direct '.repeat(3)},
                    {value: 580, name: 'Email marketing campaign '.repeat(20)}
                ]
            }]
        }, true);
        const data = (chart as any).getModel().getSeriesByIndex(0).getData();
        const widths: number[] = [];
        data.each(function (idx: number) {
            const label = data.getItemGraphicEl(idx).getTextContent() as ZRText;
            const bg = label.childrenRef().filter(el => el instanceof Rect)[0] as Rect;
            let textWidth = 0;
            label.childrenRef().forEach(el => {
                if (!(el instanceof Rect)) {
                    textWidth = Math.max(textWidth, el.getBoundingRect().width);
                }
            });
            widths.push(bg.shape.width - Math.ceil(textWidth));
        });
        return widths;
    }

    // https://github.com/apache/echarts/issues/21710
    it('label background with overflow: break should fit the wrapped text when lineHeight is set', function () {
        // Width of the label background minus the width of the wrapped text.
        expect(getLabelBackgroundWidths()).toEqual([0, 0, 0]);
        expect(getLabelBackgroundWidths(14)).toEqual([0, 0, 0]);
        expect(getLabelBackgroundWidths(80)).toEqual([0, 0, 0]);
    });

});
