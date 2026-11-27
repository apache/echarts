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

import { createChart, getECModel } from '../../core/utHelper';
import { EChartsType } from '../../../../src/echarts';
import { EChartsOption } from '../../../../src/export/option';
import Model from '../../../../src/model/Model';
import AxisModel from '../../../../src/coord/cartesian/AxisModel';
import { setPlatformAPI } from 'zrender/src/core/platform';

describe('model/mixin/textStyle', function () {

    let chart: EChartsType;

    beforeEach(function () {
        // Width per character: the font size for monospace, half of it otherwise.
        // A font the stub cannot parse measures as `10px sans-serif`, the canvas default font.
        setPlatformAPI({
            measureText(text: string, font: string) {
                const match = /(\d+(?:\.\d+)?)px (.+)$/.exec(font);
                const fontSize = match ? +match[1] : 10;
                return { width: text.length * fontSize * (match && match[2] === 'monospace' ? 1 : 0.5) };
            }
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    function getAxisLabelModel(option: EChartsOption) {
        chart = createChart();
        chart.setOption(option);
        const axisModel = getECModel(chart).getComponent('xAxis', 0) as AxisModel;
        return axisModel.getModel('axisLabel');
    }

    describe('getTextRect', function () {

        it('should use the global textStyle as the fallback font', function () {
            const axisLabelModel = getAxisLabelModel({
                textStyle: { fontFamily: 'monospace', fontSize: 20 },
                xAxis: { type: 'category', data: ['a'] },
                yAxis: {}
            });
            const model = new Model({}, null, getECModel(chart));

            expect(model.getTextRect('abcd').width).toEqual(80);
            // `axisLabel.fontSize` defaults to 12, so only the global font family applies.
            expect(axisLabelModel.getTextRect('abcd').width).toEqual(48);
        });

        it('should merge the axisLabel font with the global textStyle', function () {
            const axisLabelModel = getAxisLabelModel({
                textStyle: { fontFamily: 'monospace', fontSize: 20 },
                xAxis: { type: 'category', data: ['a'], axisLabel: { fontSize: 10 } },
                yAxis: {}
            });

            expect(axisLabelModel.getTextRect('abcd').width).toEqual(40);
        });

        it('should keep a font size given with a unit', function () {
            const axisLabelModel = getAxisLabelModel({
                xAxis: { type: 'category', data: ['a'], axisLabel: { fontSize: '25px' } },
                yAxis: {}
            });

            expect(axisLabelModel.getTextRect('abcd').width).toEqual(50);
        });

        it('should use the default font when no font is configured', function () {
            const axisLabelModel = getAxisLabelModel({
                xAxis: { type: 'category', data: ['a'] },
                yAxis: {}
            });

            expect(axisLabelModel.getTextRect('abcd').width).toEqual(24);
        });
    });
});
