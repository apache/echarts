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
import { createChart, getGraphicElements } from '../../core/utHelper';


describe('heatmap', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({width: 240, height: 200});
    });

    afterEach(function () {
        chart.dispose();
    });

    function getFirstHeatmapCell() {
        const cell = getGraphicElements(chart, 'series', 0).filter(function (el) {
            return el.type === 'rect' && !!el.getTextContent();
        })[0] as any;

        expect(cell).toBeTruthy();
        return cell;
    }

    it('should use cell size as dynamic label overflow area', function () {
        chart.setOption({
            animation: false,
            grid: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            },
            xAxis: {
                type: 'category',
                data: ['a', 'b']
            },
            yAxis: {
                type: 'category',
                data: ['x']
            },
            visualMap: {
                show: false,
                min: 0,
                max: 100
            },
            series: [{
                type: 'heatmap',
                data: [[0, 0, 123456], [1, 0, 789012]],
                label: {
                    show: true,
                    overflow: 'truncate'
                }
            }]
        });

        const cell = getFirstHeatmapCell();
        const textConfig = cell.textConfig;
        const textStyle = cell.getTextContent().style;

        expect(textStyle.overflow).toBe('truncate');
        expect(textStyle.width).toBeUndefined();
        expect(textConfig.autoOverflowArea).toBe(true);
        expect(textConfig.layoutRect.width).toBe(cell.shape.width);
        expect(textConfig.layoutRect.height).toBe(cell.shape.height);

        const width = cell.shape.width;

        chart.resize({width: 480, height: 200});

        const resizedCell = getFirstHeatmapCell();
        const resizedTextConfig = resizedCell.textConfig;

        expect(resizedCell.shape.width).toBeGreaterThan(width);
        expect(resizedTextConfig.autoOverflowArea).toBe(true);
        expect(resizedTextConfig.layoutRect.width).toBe(resizedCell.shape.width);
        expect(resizedTextConfig.layoutRect.height).toBe(resizedCell.shape.height);
    });

});
