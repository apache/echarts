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

import { createChart } from '../../core/utHelper';
import GlobalModel from '../../../../src/model/Global';
import CartesianAxisModel from '../../../../src/coord/cartesian/AxisModel';
import OrdinalScale from '../../../../src/scale/Ordinal';


describe('bar', function () {

    (['canvas', 'svg'] as const).forEach(function (renderer) {
        (['xAxis', 'yAxis'] as const).forEach(function (axisType) {
            it('should restore category order when realtimeSort is disabled on ' + axisType + ' with ' + renderer,
                function () {
                    const chart = createChart({opts: {renderer}});
                    const categories = ['a', 'b', 'c', 'd'];
                    const getLabels = function () {
                        const model = (chart as any).getModel() as GlobalModel;
                        const axis = (model.getComponent(axisType) as CartesianAxisModel).axis;
                        const scale = axis.scale as OrdinalScale;
                        return categories.map(function (_, index) {
                            return scale.getLabel({value: index});
                        });
                    };

                    try {
                        chart.setOption({
                            animation: false,
                            [axisType]: {type: 'category', data: categories, inverse: axisType === 'yAxis'},
                            [axisType === 'xAxis' ? 'yAxis' : 'xAxis']: {type: 'value'},
                            series: [{type: 'bar', realtimeSort: false, data: [10, 40, 20, 30]}]
                        });
                        expect(getLabels()).toEqual(categories);

                        // Repeat to cover enabling sorting again after restoring the original order.
                        for (let i = 0; i < 2; i++) {
                            chart.setOption({series: [{realtimeSort: true}]});
                            chart.getZr().flush();
                            expect(getLabels()).toEqual(['b', 'd', 'c', 'a']);

                            chart.setOption({series: [{realtimeSort: false}]});
                            expect(getLabels()).toEqual(categories);
                            chart.resize();
                            expect(getLabels()).toEqual(categories);
                        }
                    }
                    finally {
                        chart.dispose();
                    }
                }
            );
        });
    });

    it('should keep sorting until the last realtimeSort series on the axis is disabled', function () {
        const chart = createChart();
        const getLabels = function () {
            const model = (chart as any).getModel() as GlobalModel;
            const scale = (model.getComponent('xAxis') as CartesianAxisModel).axis.scale as OrdinalScale;
            return [0, 1, 2, 3].map(function (value) {
                return scale.getLabel({value});
            });
        };

        try {
            chart.setOption({
                animation: false,
                xAxis: {type: 'category', data: ['a', 'b', 'c', 'd']},
                yAxis: {},
                series: [
                    {id: 'first', type: 'bar', realtimeSort: true, data: [10, 40, 20, 30]},
                    {id: 'second', type: 'bar', realtimeSort: true, data: [10, 40, 20, 30]},
                    {type: 'line', data: [1, 2, 3, 4]}
                ]
            });
            expect(getLabels()).toEqual(['b', 'd', 'c', 'a']);
            chart.setOption({series: [{id: 'first', realtimeSort: false}]});
            expect(getLabels()).toEqual(['b', 'd', 'c', 'a']);
            chart.setOption({series: [{id: 'second', realtimeSort: false}]});
            expect(getLabels()).toEqual(['a', 'b', 'c', 'd']);
        }
        finally {
            chart.dispose();
        }
    });

    it('should preserve an axis order that was not set by realtimeSort', function () {
        const chart = createChart();

        try {
            chart.setOption({
                animation: false,
                xAxis: {type: 'category', data: ['a', 'b', 'c', 'd']},
                yAxis: {},
                series: [{type: 'bar', data: [10, 40, 20, 30]}]
            });
            chart.dispatchAction({
                type: 'changeAxisOrder',
                componentType: 'xAxis',
                xAxisIndex: 0,
                sortInfo: {ordinalNumbers: [3, 2, 1, 0]}
            });
            chart.setOption({series: [{data: [20, 50, 30, 40]}]});
            const model = (chart as any).getModel() as GlobalModel;
            const scale = (model.getComponent('xAxis') as CartesianAxisModel).axis.scale as OrdinalScale;
            expect([0, 1, 2, 3].map(function (value) {
                return scale.getLabel({value});
            })).toEqual(['d', 'c', 'b', 'a']);
        }
        finally {
            chart.dispose();
        }
    });

    it('should respect encoded object-row dimensions missing from earlier rows', function () {
        const chart = createChart({width: 400, height: 300});

        try {
            chart.setOption({
                animation: false,
                dataset: {
                    source: [
                        { timestamp: 1568191020000, ECM: 26311.466666666667 },
                        { timestamp: 1568191140000, ECM: 1666775.3333333333, GSWY: 1332.5333333333333 }
                    ]
                },
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                series: [{
                    type: 'bar',
                    name: 'ECM',
                    encode: { x: 'timestamp', y: 'ECM' },
                    stack: 'one'
                }, {
                    type: 'bar',
                    name: 'GSWY',
                    encode: { x: 'timestamp', y: 'GSWY' },
                    stack: 'one'
                }]
            });

            const series = (chart as any).getModel().getSeriesByIndex(1);
            const data = series.getData();
            const yDim = data.mapDimension('y');

            expect(yDim).toBe('GSWY');
            expect(isNaN(data.get(yDim, 0))).toBe(true);
            expect(data.get(yDim, 1)).toBe(1332.5333333333333);
        }
        finally {
            chart.dispose();
        }
    });

});
