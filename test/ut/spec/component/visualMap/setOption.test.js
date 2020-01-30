
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
const utHelper = require('../../../core/utHelper');

describe('vsiaulMap_setOption', function () {
    var chart;
    beforeEach(function () {
        chart = utHelper.createChart();
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

        var option = chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(option.visualMap[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(option.visualMap[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
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

        var option = chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].color).toEqual(['yellow', 'blue', 'red']);
        expect(option.visualMap[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(option.visualMap[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
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

        expectTheSame(chart.getOption());

        chart.setOption({
            series: [{data: [[44, 55]]}] // visualMap depends series
        });

        expectTheSame(chart.getOption());

        function expectTheSame(option) {
            expect(option.visualMap.length).toEqual(1);
            expect(option.visualMap[0].inRange.color).toEqual(['red', 'blue', 'yellow']);
            expect(option.visualMap[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
            expect(option.visualMap[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
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

        var option = chart.getOption();

        chart.setOption({
            visualMap: {
                inRange: {
                    symbolSize: [0.4, 0.6]
                }
            }
        });

        var option = chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].target.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].controller.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].inRange.symbolSize).toEqual([0.4, 0.6]);
        expect(option.visualMap[0].target.inRange.symbolSize).toEqual([0.4, 0.6]);
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

        var option = chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].target.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].controller.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].inRange.colorAlpha).toEqual([0.4, 0.6]);
        expect(option.visualMap[0].target.inRange.colorAlpha).toEqual([0.4, 0.6]);
        expect(option.visualMap[0].controller.inRange.colorAlpha).toEqual([0.4, 0.6]);

        chart.setOption({
            visualMap: {
                color: ['red', 'blue', 'green']
            }
        });

        var option = chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].target.inRange.hasOwnProperty('colorAlpha')).toEqual(false);
        expect(option.visualMap[0].controller.inRange.hasOwnProperty('colorAlpha')).toEqual(false);
        expect(option.visualMap[0].target.inRange.color).toEqual(['green', 'blue', 'red']);
        expect(option.visualMap[0].controller.inRange.color).toEqual(['green', 'blue', 'red']);

        chart.setOption({
            visualMap: {
                controller: {
                    outOfRange: {
                        symbol: ['diamond']
                    }
                }
            }
        });

        var option = chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(!!option.visualMap[0].target.inRange).toEqual(true);
        var onlyColor = true;
        for (var i in option.visualMap[0].target.inRange) {
            if (i !== 'color') {
                onlyColor = false;
            }
        }
        var inRangeColor = option.visualMap[0].target.inRange.color;
        expect(onlyColor).toEqual(true);
        expect(inRangeColor).toEqual(['#f6efa6', '#d88273', '#bf444c']);
        expect(option.visualMap[0].controller.outOfRange.symbol).toEqual(['diamond']);
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

        var option = chart.getOption();

        expect(!!option.visualMap[0].target.outOfRange.opacity).toEqual(true);
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

        var ecModel = chart.getModel();

        function getVisual(idx, visualType) {
            return ecModel.getComponent('visualMap', idx)
                .targetVisuals.inRange[visualType].option.visual;
        }

        function makeCategoryVisual(val) {
            var CATEGORY_DEFAULT_VISUAL_INDEX = -1;
            var arr = [];
            if (val != null) {
                arr[CATEGORY_DEFAULT_VISUAL_INDEX] = val;
            }
            for (var i = 1; i < arguments.length; i++) {
                arr.push(arguments[i]);
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

});