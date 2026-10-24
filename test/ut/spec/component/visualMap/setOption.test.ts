
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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { EChartsOption } from '../../../../../src/export/option';
import { ContinuousVisualMapOption } from '../../../../../src/component/visualMap/ContinuousModel';
import { PiecewiseVisualMapOption } from '../../../../../src/component/visualMap/PiecewiseModel';
import VisualMapModel from '../../../../../src/component/visualMap/VisualMapModel';
import globalDefault from '../../../../../src/model/globalDefault';


describe('vsiaulMap_setOption', function () {
    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('defaultTargetController', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow']
                }
            }
        });

        const option = chart.getOption();
        const visualMapOptionGotten = option.visualMap as (ContinuousVisualMapOption | PiecewiseVisualMapOption)[];

        expect(visualMapOptionGotten.length).toEqual(1);
        expect(visualMapOptionGotten[0].inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(visualMapOptionGotten[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(visualMapOptionGotten[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
        done();
    });

    it('ec2ColorCompatiable', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                color: ['yellow', 'blue', 'red']
            }
        });

        const option = chart.getOption();
        const visualMapOptionGotten = option.visualMap as (ContinuousVisualMapOption | PiecewiseVisualMapOption)[];

        expect(visualMapOptionGotten.length).toEqual(1);
        expect(visualMapOptionGotten[0].color).toEqual(['yellow', 'blue', 'red']);
        expect(visualMapOptionGotten[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(visualMapOptionGotten[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
        done();
    });

    it('remainVisualProp', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow']
                }
            }
        });

        chart.setOption({
            visualMap: {}
        });

        expectTheSame(chart.getOption() as EChartsOption);

        chart.setOption({
            series: [{data: [[44, 55]]}] // visualMap depends series
        });

        expectTheSame(chart.getOption() as EChartsOption);

        function expectTheSame(option: EChartsOption) {
            const visualMapOptionGotten = option.visualMap as (ContinuousVisualMapOption | PiecewiseVisualMapOption)[];
            expect(visualMapOptionGotten.length).toEqual(1);
            expect(visualMapOptionGotten[0].inRange.color).toEqual(['red', 'blue', 'yellow']);
            expect(visualMapOptionGotten[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
            expect(visualMapOptionGotten[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
            done();
        }
    });

    it('eraseAllVisualProps_notRelative', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow'],
                    symbolSize: [0.3, 0.5]
                }
            }
        });

        // const option = chart.getOption();

        chart.setOption({
            visualMap: {
                inRange: {
                    symbolSize: [0.4, 0.6]
                }
            }
        });

        const option = chart.getOption();
        const visualMapOptionGotten = option.visualMap as (ContinuousVisualMapOption | PiecewiseVisualMapOption)[];

        expect(visualMapOptionGotten.length).toEqual(1);
        expect(visualMapOptionGotten[0].inRange.hasOwnProperty('color')).toEqual(false);
        expect(visualMapOptionGotten[0].target.inRange.hasOwnProperty('color')).toEqual(false);
        expect(visualMapOptionGotten[0].controller.inRange.hasOwnProperty('color')).toEqual(false);
        expect(visualMapOptionGotten[0].inRange.symbolSize).toEqual([0.4, 0.6]);
        expect(visualMapOptionGotten[0].target.inRange.symbolSize).toEqual([0.4, 0.6]);
        done();
        // Do not compare controller.inRange.symbolSize, which will be amplified to controller size.
        // expect(option.visualMap[0].controller.inRange.symbolSize).toEqual([?, ?]);
    });

    it('eraseAllVisualProps_reletive', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow'],
                    colorAlpha: [0.3, 0.5]
                }
            }
        });

        chart.setOption({
            visualMap: {
                inRange: {
                    colorAlpha: [0.4, 0.6]
                }
            }
        });

        let visualMapOptionGotten: (ContinuousVisualMapOption | PiecewiseVisualMapOption)[];
        visualMapOptionGotten = chart.getOption().visualMap as typeof visualMapOptionGotten;
        expect(visualMapOptionGotten.length).toEqual(1);
        expect(visualMapOptionGotten[0].inRange.hasOwnProperty('color')).toEqual(false);
        expect(visualMapOptionGotten[0].target.inRange.hasOwnProperty('color')).toEqual(false);
        expect(visualMapOptionGotten[0].controller.inRange.hasOwnProperty('color')).toEqual(false);
        expect(visualMapOptionGotten[0].inRange.colorAlpha).toEqual([0.4, 0.6]);
        expect(visualMapOptionGotten[0].target.inRange.colorAlpha).toEqual([0.4, 0.6]);
        expect(visualMapOptionGotten[0].controller.inRange.colorAlpha).toEqual([0.4, 0.6]);

        chart.setOption({
            visualMap: {
                color: ['red', 'blue', 'green']
            }
        });

        visualMapOptionGotten = chart.getOption().visualMap as typeof visualMapOptionGotten;
        expect(visualMapOptionGotten.length).toEqual(1);
        expect(visualMapOptionGotten[0].target.inRange.hasOwnProperty('colorAlpha')).toEqual(false);
        expect(visualMapOptionGotten[0].controller.inRange.hasOwnProperty('colorAlpha')).toEqual(false);
        expect(visualMapOptionGotten[0].target.inRange.color).toEqual(['green', 'blue', 'red']);
        expect(visualMapOptionGotten[0].controller.inRange.color).toEqual(['green', 'blue', 'red']);

        chart.setOption({
            visualMap: {
                controller: {
                    outOfRange: {
                        symbol: ['diamond']
                    }
                }
            }
        });

        visualMapOptionGotten = chart.getOption().visualMap as typeof visualMapOptionGotten;

        expect(visualMapOptionGotten.length).toEqual(1);
        expect(!!visualMapOptionGotten[0].target.inRange).toEqual(true);
        let onlyColor = true;
        for (const i in visualMapOptionGotten[0].target.inRange) {
            if (i !== 'color') {
                onlyColor = false;
            }
        }
        const inRangeColor = visualMapOptionGotten[0].target.inRange.color;
        expect(onlyColor).toEqual(true);
        expect(inRangeColor).toEqual(globalDefault.gradientColor);
        expect(visualMapOptionGotten[0].controller.outOfRange.symbol).toEqual(['diamond']);
        done();
    });

    it('setOpacityWhenUseColor', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow']
                }
            }
        });

        const visualMapOptionGotten = chart.getOption().visualMap as (
            ContinuousVisualMapOption | PiecewiseVisualMapOption
        )[];
        expect(!!visualMapOptionGotten[0].target.outOfRange.opacity).toEqual(true);
        done();
    });

    it('normalizeVisualRange', function (done) {
        chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: [
                {type: 'continuous', inRange: {color: 'red'}},
                {type: 'continuous', inRange: {opacity: 0.4}},
                {type: 'piecewise', inRange: {color: 'red'}},
                {type: 'piecewise', inRange: {opacity: 0.4}},
                {type: 'piecewise', inRange: {symbol: 'diamond'}},
                {type: 'piecewise', inRange: {color: 'red'}, categories: ['a', 'b']},
                {type: 'piecewise', inRange: {color: {a: 'red'}}, categories: ['a', 'b']},
                {type: 'piecewise', inRange: {opacity: 0.4}, categories: ['a', 'b']}
            ]
        });

        const ecModel = getECModel(chart);

        function getVisual(idx: number, visualType: 'color' | 'opacity' | 'symbol') {
            return (ecModel.getComponent('visualMap', idx) as VisualMapModel)
                .targetVisuals.inRange[visualType].option.visual;
        }

        function makeCategoryVisual(...args: unknown[]) {
            const CATEGORY_DEFAULT_VISUAL_INDEX = -1;
            const arr = [];
            if (args[0] != null) {
                arr[CATEGORY_DEFAULT_VISUAL_INDEX] = args[0];
            }
            for (let i = 1; i < args.length; i++) {
                arr.push(args[i]);
            }
            return arr;
        }

        expect(getVisual(0, 'color')).toEqual(['red']);
        expect(getVisual(1, 'opacity')).toEqual([0.4, 0.4]);
        expect(getVisual(2, 'color')).toEqual(['red']);
        expect(getVisual(3, 'opacity')).toEqual([0.4, 0.4]);
        expect(getVisual(4, 'symbol')).toEqual(['diamond']);
        expect(getVisual(5, 'color')).toEqual(makeCategoryVisual('red'));
        expect(getVisual(6, 'color')).toEqual(makeCategoryVisual(null, 'red'));
        expect(getVisual(7, 'opacity')).toEqual(makeCategoryVisual(0.4));
        done();
    });

    // See https://github.com/apache/echarts/issues/18066
    it('piecewiseWithNullBoundOnLineSeries', function (done) {
        // Setting `lte: null` (or omitting both bounds) makes the piece
        // interval [-Infinity, Infinity], which previously crashed
        // line series rendering with
        // "Cannot read properties of undefined (reading 'coord')".
        expect(function () {
            chart.setOption({
                xAxis: {type: 'category', data: ['A', 'B', 'C', 'D']},
                yAxis: {type: 'value'},
                visualMap: {
                    type: 'piecewise',
                    pieces: [
                        // lte set to null should be treated as no upper bound.
                        {lte: null, color: 'red'}
                    ]
                },
                series: [{
                    type: 'line',
                    data: [10, 20, 30, 40]
                }]
            });
        }).not.toThrow();
        done();
    });

    // See https://github.com/apache/echarts/issues/18066 review feedback.
    it('piecewiseHalfInfiniteEmitsBoundaryStop', function () {
        chart.setOption({
            xAxis: {type: 'category', data: ['A', 'B', 'C', 'D']},
            yAxis: {type: 'value'},
            visualMap: {
                type: 'piecewise',
                pieces: [
                    {lte: 10, color: 'red'}
                ],
                outOfRange: { color: 'blue' }
            } as PiecewiseVisualMapOption,
            series: [{
                type: 'line',
                data: [5, 8, 15, 20]
            }]
        });

        const visualMapModel = (chart as any).getModel().getComponent('visualMap', 0) as VisualMapModel;
        const visualMeta = (visualMapModel as any).getVisualMeta(
            (val: number) => visualMapModel.getValueState(val) === 'inRange' ? 'red' : 'blue'
        );

        // The half-infinite [-Infinity, 10] piece must record the finite edge
        // at 10 in `stops` (not just in `outerColors`), so consumers can locate
        // the boundary.
        const valuesAtTen = visualMeta.stops.filter((s: any) => s.value === 10);
        expect(valuesAtTen.length).toBeGreaterThanOrEqual(1);
        const colorsAtTen = valuesAtTen.map((s: any) => s.color);
        expect(colorsAtTen).toContain('red');
        // The implicit out-of-range piece for (10, Infinity) should also emit
        // its finite left edge.
        expect(colorsAtTen).toContain('blue');
    });

    it('piecewiseFullInfiniteStillEmitsNoStops', function () {
        chart.setOption({
            xAxis: {type: 'category', data: ['A', 'B', 'C', 'D']},
            yAxis: {type: 'value'},
            visualMap: {
                type: 'piecewise',
                pieces: [
                    {lte: null, color: 'red'}
                ]
            } as PiecewiseVisualMapOption,
            series: [{
                type: 'line',
                data: [10, 20, 30, 40]
            }]
        });

        const visualMapModel = (chart as any).getModel().getComponent('visualMap', 0) as VisualMapModel;
        const visualMeta = (visualMapModel as any).getVisualMeta(
            () => 'red'
        );

        // Truly fully infinite intervals have no finite edge to record, so
        // `stops` stays empty and the LineView defensive fallback handles it.
        expect(visualMeta.stops).toEqual([]);
        expect(visualMeta.outerColors[0]).toBe('red');
        expect(visualMeta.outerColors[1]).toBe('red');
    });

});