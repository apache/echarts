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
import ChordSeriesModel from '@/src/chart/chord/ChordSeries';
import { createChart, getECModel } from '../../core/utHelper';

const PI2 = Math.PI * 2;
const LABEL_FLIP_START_ANGLE = Math.PI * 0.5;
const LABEL_FLIP_END_ANGLE = Math.PI * 1.5;
const RADIAN_EPSILON = 1e-4;

function normalizeRadian(radian: number): number {
    return (radian % PI2 + PI2) % PI2;
}

function isRadianAroundZero(radian: number): boolean {
    return radian > -RADIAN_EPSILON && radian < RADIAN_EPSILON;
}

function getExpectedRadialLabelRotation(layout: {startAngle: number, endAngle: number}): number {
    const midAngle = (layout.startAngle + layout.endAngle) / 2;
    const midAngleNormal = normalizeRadian(midAngle);
    const needsFlip = midAngleNormal > LABEL_FLIP_START_ANGLE
        && !isRadianAroundZero(midAngleNormal - LABEL_FLIP_START_ANGLE)
        && midAngleNormal < LABEL_FLIP_END_ANGLE;
    return normalizeRadian(-midAngle + (needsFlip ? Math.PI : 0));
}

describe('series/chord', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('supports radial label rotation', function () {
        chart.setOption({
            series: {
                type: 'chord',
                startAngle: 0,
                padAngle: 0,
                label: {
                    show: true,
                    rotate: 'radial'
                },
                data: [
                    {name: 'a'},
                    {name: 'b'}
                ],
                edges: [{
                    source: 'a',
                    target: 'b',
                    value: 1
                }]
            }
        });

        const seriesModel = getECModel(chart).getSeriesByType('chord')[0] as ChordSeriesModel;
        const data = seriesModel.getData();
        const textContent = data.getItemGraphicEl(0).getTextContent();
        const layout = data.getItemLayout(0);

        expect(textContent.rotation).toBeCloseTo(getExpectedRadialLabelRotation(layout));
    });

    it('handles radial label rotation on startAngle boundary', function () {
        chart.setOption({
            series: {
                type: 'chord',
                startAngle: 180,
                padAngle: 0,
                label: {
                    show: true,
                    rotate: 'radial'
                },
                data: [
                    {name: 'a'},
                    {name: 'b'}
                ],
                edges: [{
                    source: 'a',
                    target: 'b',
                    value: 1
                }]
            }
        });

        const seriesModel = getECModel(chart).getSeriesByType('chord')[0] as ChordSeriesModel;
        const data = seriesModel.getData();
        const textContent = data.getItemGraphicEl(0).getTextContent();
        const layout = data.getItemLayout(0);

        expect((layout.startAngle + layout.endAngle) / 2).toBeCloseTo(Math.PI * 1.5);
        expect(textContent.rotation).toBeCloseTo(Math.PI * 0.5);
    });

    it('converts numeric label rotation from degrees to radians', function () {
        chart.setOption({
            series: {
                type: 'chord',
                label: {
                    show: true,
                    rotate: 45
                },
                data: [
                    {name: 'a'},
                    {name: 'b'}
                ],
                edges: [{
                    source: 'a',
                    target: 'b',
                    value: 1
                }]
            }
        });

        const seriesModel = getECModel(chart).getSeriesByType('chord')[0] as ChordSeriesModel;
        const textContent = seriesModel.getData().getItemGraphicEl(0).getTextContent();

        expect(textContent.rotation).toBeCloseTo(Math.PI / 4);
    });

    it('applies state label rotation', function () {
        chart.setOption({
            series: {
                type: 'chord',
                startAngle: 0,
                padAngle: 0,
                label: {
                    show: true,
                    rotate: 0
                },
                emphasis: {
                    label: {
                        rotate: 'radial'
                    }
                },
                blur: {
                    label: {
                        rotate: 30
                    }
                },
                select: {
                    label: {
                        rotate: 45
                    }
                },
                data: [
                    {name: 'a'},
                    {name: 'b'}
                ],
                edges: [{
                    source: 'a',
                    target: 'b',
                    value: 1
                }]
            }
        });

        const seriesModel = getECModel(chart).getSeriesByType('chord')[0] as ChordSeriesModel;
        const data = seriesModel.getData();
        const textContent = data.getItemGraphicEl(0).getTextContent();
        const layout = data.getItemLayout(0);

        expect(textContent.rotation).toBeCloseTo(0);
        expect(textContent.states.emphasis.rotation).toBeCloseTo(getExpectedRadialLabelRotation(layout));
        expect(textContent.states.blur.rotation).toBeCloseTo(Math.PI / 6);
        expect(textContent.states.select.rotation).toBeCloseTo(Math.PI / 4);
    });

    it('clears stale state label rotation on option update', function () {
        const option = {
            series: {
                type: 'chord',
                label: {
                    show: true,
                    rotate: 0
                },
                emphasis: {
                    label: {
                        rotate: 45
                    }
                },
                data: [
                    {name: 'a'},
                    {name: 'b'}
                ],
                edges: [{
                    source: 'a',
                    target: 'b',
                    value: 1
                }]
            }
        };
        chart.setOption(option);

        let seriesModel = getECModel(chart).getSeriesByType('chord')[0] as ChordSeriesModel;
        let textContent = seriesModel.getData().getItemGraphicEl(0).getTextContent();
        const oldTextContent = textContent;

        expect(textContent.states.emphasis.rotation).toBeCloseTo(Math.PI / 4);

        chart.setOption({
            series: {
                ...option.series,
                emphasis: {
                    label: {
                        rotate: null
                    }
                }
            }
        });

        seriesModel = getECModel(chart).getSeriesByType('chord')[0] as ChordSeriesModel;
        textContent = seriesModel.getData().getItemGraphicEl(0).getTextContent();

        expect(textContent).toBe(oldTextContent);
        expect(textContent.rotation).toBeCloseTo(0);
        expect(textContent.states.emphasis.rotation).toBeNull();

        textContent.useState('emphasis', false, true);
        expect(textContent.rotation).toBeCloseTo(0);
    });

});
