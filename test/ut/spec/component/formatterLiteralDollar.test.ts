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
import { createChart, getECModel, getGraphicElements } from '../../core/utHelper';
import CartesianAxisModel from '@/src/coord/cartesian/AxisModel';
import RadarModel from '@/src/coord/radar/RadarModel';
import VisualMapModel from '@/src/component/visualMap/VisualMapModel';
import ZRText from 'zrender/src/graphic/Text';

// Sequences that String.prototype.replace interprets in a replacement string.
const specialTexts = ['$&', '$$', '$`', '$\''];

describe('string formatter templates keep literal dollar sequences', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it.each(specialTexts)('axis label %s', text => {
        const category = 'Tier ' + text;
        chart.setOption({
            animation: false,
            xAxis: { type: 'category', data: [category], axisLabel: { formatter: '<{value}>' } },
            yAxis: {},
            series: [{ type: 'bar', data: [1] }]
        });

        const axis = getECModel(chart).getComponent('xAxis', 0) as CartesianAxisModel;
        const labels = axis.axis.getViewLabels().map(label => label.formattedLabel);
        expect(labels).toEqual(['<' + category + '>']);
    });

    it.each(specialTexts)('legend %s', text => {
        const name = 'Series ' + text;
        chart.setOption({
            animation: false,
            legend: { formatter: '[{name}]' },
            series: [{ type: 'pie', name: name, data: [{ name: name, value: 1 }] }]
        });

        const texts = getGraphicElements(chart, 'legend')
            .filter(el => el instanceof ZRText)
            .map(el => (el as ZRText).style.text);
        expect(texts).toContain('[' + name + ']');
    });

    it.each(specialTexts)('radar indicator name %s', text => {
        const name = 'Price ' + text;
        chart.setOption({
            animation: false,
            radar: {
                indicator: [{ name: name, max: 10 }, { name: 'b', max: 10 }],
                axisName: { formatter: '({value})' }
            },
            series: [{ type: 'radar', data: [{ value: [1, 2] }] }]
        });

        const radar = getECModel(chart).getComponent('radar', 0) as RadarModel;
        expect(radar.getIndicatorModels()[0].get('name')).toBe('(' + name + ')');
    });

    it.each(specialTexts)('visualMap category text %s', text => {
        const category = 'Tier ' + text;
        chart.setOption({
            animation: false,
            visualMap: { type: 'piecewise', categories: [category], formatter: '<{value}>' },
            xAxis: {},
            yAxis: {},
            series: [{ type: 'scatter', data: [[1, 1]] }]
        });

        const visualMap = getECModel(chart).getComponent('visualMap', 0) as VisualMapModel;
        expect(visualMap.formatValueText(category, true)).toBe('<' + category + '>');
    });
});
