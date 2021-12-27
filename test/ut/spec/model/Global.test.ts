
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
import { createChart, getECModel } from '../../core/utHelper';
import { ComponentMainType, ParsedValue } from '@/src/util/types';
import SeriesModel from '@/src/model/Series';
import ComponentModel from '@/src/model/Component';
import ChartView from '@/src/view/Chart';
import { EChartsOption } from '@/src/export/option';

type OriginModelView = {
    model: SeriesModel;
    view: ChartView;
};


describe('modelAndOptionMapping', function () {

    function getData0(chart: EChartsType, seriesIndex: number): ParsedValue {
        return getSeries(chart, seriesIndex).getData().get('y', 0);
    }

    function getSeries(chart: EChartsType, seriesIndex: number): SeriesModel {
        return getECModel(chart).getComponent('series', seriesIndex) as SeriesModel;
    }

    function getModel(chart: EChartsType, type: ComponentMainType, index: number): ComponentModel {
        return getECModel(chart).getComponent(type, index);
    }

    function countSeries(chart: EChartsType): number {
        return countModel(chart, 'series');
    }

    function countModel(chart: EChartsType, type: ComponentMainType): number {
        // FIXME
        // access private
        // @ts-ignore
        return getECModel(chart)._componentsMap.get(type).length;
    }

    function getChartView(chart: EChartsType, series: SeriesModel): ChartView {
        // @ts-ignore
        return chart._chartsMap[series.__viewId];
    }

    function countChartViews(chart: EChartsType): number {
        // @ts-ignore
        return chart._chartsViews.length;
    }

    function saveOrigins(chart: EChartsType): OriginModelView[] {
        const count = countSeries(chart);
        const origins = [];
        for (let i = 0; i < count; i++) {
            const series = getSeries(chart, i);
            origins.push({
                model: series,
                view: getChartView(chart, series)
            });
        }
        return origins;
    }

    function modelEqualsToOrigin(
        chart: EChartsType,
        idxList: number[],
        origins: OriginModelView[],
        boolResult: boolean
    ): void {
        for (let i = 0; i < idxList.length; i++) {
            const idx = idxList[i];
            expect(origins[idx].model === getSeries(chart, idx)).toEqual(boolResult);
        }
    }

    function viewEqualsToOrigin(
        chart: EChartsType,
        idxList: number[],
        origins: OriginModelView[],
        boolResult: boolean
    ): void {
        for (let i = 0; i < idxList.length; i++) {
            const idx = idxList[i];
            expect(
                origins[idx].view === getChartView(chart, getSeries(chart, idx))
            ).toEqual(boolResult);
        }
    }


    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    describe('idNoNameNo', function () {

        it('sameTypeNotMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            chart.setOption(option);

            // Not merge
            const origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(3);
            expect(countSeries(chart)).toEqual(3);
            modelEqualsToOrigin(chart, [0, 1, 2], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2], origins, true);
        });

        it('sameTypeMergeFull', function () {
            chart.setOption({
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            });

            // Merge
            const origins = saveOrigins(chart);
            chart.setOption({
                series: [
                    {type: 'line', data: [111]},
                    {type: 'line', data: [222]},
                    {type: 'line', data: [333]}
                ]
            });

            expect(countSeries(chart)).toEqual(3);
            expect(countChartViews(chart)).toEqual(3);
            expect(getData0(chart, 0)).toEqual(111);
            expect(getData0(chart, 1)).toEqual(222);
            expect(getData0(chart, 2)).toEqual(333);
            viewEqualsToOrigin(chart, [0, 1, 2], origins, true);
            modelEqualsToOrigin(chart, [0, 1, 2], origins, true);
        });

        it('sameTypeMergePartial', function () {
            chart.setOption({
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            });

            // Merge
            const origins = saveOrigins(chart);
            chart.setOption({
                series: [
                    {data: [22222]}
                ]
            });

            expect(countSeries(chart)).toEqual(3);
            expect(countChartViews(chart)).toEqual(3);
            expect(getData0(chart, 0)).toEqual(22222);
            expect(getData0(chart, 1)).toEqual(22);
            expect(getData0(chart, 2)).toEqual(33);
            viewEqualsToOrigin(chart, [0, 1, 2], origins, true);
            modelEqualsToOrigin(chart, [0, 1, 2], origins, true);
        });

        it('differentTypeMerge', function () {
            chart.setOption({
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            });

            // Merge
            const origins = saveOrigins(chart);
            chart.setOption({
                series: [
                    {type: 'line', data: [111]},
                    {type: 'bar', data: [222]},
                    {type: 'line', data: [333]}
                ]
            });

            expect(countSeries(chart)).toEqual(3);
            expect(countChartViews(chart)).toEqual(3);
            expect(getData0(chart, 0)).toEqual(111);
            expect(getData0(chart, 1)).toEqual(222);
            expect(getData0(chart, 2)).toEqual(333);
            expect(getSeries(chart, 1).type === 'series.bar').toEqual(true);
            modelEqualsToOrigin(chart, [0, 2], origins, true);
            modelEqualsToOrigin(chart, [1], origins, false);
            viewEqualsToOrigin(chart, [0, 2], origins, true);
            viewEqualsToOrigin(chart, [1], origins, false);
        });

    });





    describe('idSpecified', function () {

        it('sameTypeNotMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20},
                    {type: 'line', data: [33], id: 30},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option);

            expect(countSeries(chart)).toEqual(5);
            expect(countChartViews(chart)).toEqual(5);
            expect(getData0(chart, 0)).toEqual(11);
            expect(getData0(chart, 1)).toEqual(22);
            expect(getData0(chart, 2)).toEqual(33);
            expect(getData0(chart, 3)).toEqual(44);
            expect(getData0(chart, 4)).toEqual(55);

            const origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        it('sameTypeMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20},
                    {type: 'line', data: [33], id: 30},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            chart.setOption(option);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        it('differentTypeNotMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20},
                    {type: 'line', data: [33], id: 30},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            const option2: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'bar', data: [22], id: 20},
                    {type: 'line', data: [33], id: 30},
                    {type: 'bar', data: [44]},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option2, true);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [1, 3], origins, false);
        });

        it('differentTypeMergeFull', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20},
                    {type: 'line', data: [33], id: 30, name: 'a'},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            const option2: EChartsOption = {
                series: [
                    {type: 'line', data: [11]},
                    {type: 'bar', data: [22], id: 20, name: 'a'},
                    {type: 'line', data: [33], id: 30},
                    {type: 'bar', data: [44]},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 2, 4], origins, true);
            modelEqualsToOrigin(chart, [1, 3], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [1, 3], origins, false);
        });

        it('differentTypeMergePartial1', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20},
                    {type: 'line', data: [33]},
                    {type: 'line', data: [44], id: 40},
                    {type: 'line', data: [55]}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            const option2: EChartsOption = {
                series: [
                    {type: 'bar', data: [444], id: 40},
                    {type: 'line', data: [333]},
                    {type: 'line', data: [222], id: 20}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            expect(getData0(chart, 0)).toEqual(333);
            expect(getData0(chart, 1)).toEqual(222);
            expect(getData0(chart, 2)).toEqual(33);
            expect(getData0(chart, 3)).toEqual(444);
            expect(getData0(chart, 4)).toEqual(55);
            modelEqualsToOrigin(chart, [0, 1, 2, 4], origins, true);
            modelEqualsToOrigin(chart, [3], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [3], origins, false);
        });

        it('differentTypeMergePartial2', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20}
                ]
            };
            chart.setOption(option);

            const option2: EChartsOption = {
                series: [
                    {type: 'bar', data: [444], id: 40},
                    {type: 'line', data: [333]},
                    {type: 'line', data: [222], id: 20},
                    {type: 'line', data: [111]}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(4);
            expect(countSeries(chart)).toEqual(4);

            expect(getData0(chart, 0)).toEqual(333);
            expect(getData0(chart, 1)).toEqual(222);
            expect(getData0(chart, 2)).toEqual(444);
            expect(getData0(chart, 3)).toEqual(111);
        });


        it('mergePartialDoNotMapToOtherId', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], id: 10},
                    {type: 'line', data: [22], id: 20}
                ]
            };
            chart.setOption(option);

            const option2: EChartsOption = {
                series: [
                    {type: 'bar', data: [444], id: 40}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(3);
            expect(countSeries(chart)).toEqual(3);

            expect(getData0(chart, 0)).toEqual(11);
            expect(getData0(chart, 1)).toEqual(22);
            expect(getData0(chart, 2)).toEqual(444);
        });


        it('idDuplicate', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], id: 10},
                    {type: 'line', data: [22], id: 10}
                ]
            };


            expect(function () {
                chart.setOption(option);
            }).toThrowError(/duplicate/);
        });


        it('nameTheSameButIdNotTheSame', function () {

            const option = {
                grid: {},
                xAxis: [
                    {id: 'x1', name: 'a', xxxx: 'x1_a'},
                    {id: 'x2', name: 'b', xxxx: 'x2_b'}
                ],
                yAxis: {}
            };

            chart.setOption(option);

            let xAxisModel0;
            let xAxisModel1;

            xAxisModel0 = getModel(chart, 'xAxis', 0);
            xAxisModel1 = getModel(chart, 'xAxis', 1);
            expect((xAxisModel0.option as any).xxxx).toEqual('x1_a');
            expect((xAxisModel1.option as any).xxxx).toEqual('x2_b');
            expect(xAxisModel1.option.name).toEqual('b');

            const option2 = {
                xAxis: [
                    {id: 'k1', name: 'a', xxxx: 'k1_a'},
                    {id: 'x2', name: 'a', xxxx: 'x2_a'}
                ]
            };
            chart.setOption(option2);

            xAxisModel0 = getModel(chart, 'xAxis', 0);
            xAxisModel1 = getModel(chart, 'xAxis', 1);
            const xAxisModel2 = getModel(chart, 'xAxis', 2);
            expect((xAxisModel0.option as any).xxxx).toEqual('x1_a');
            expect((xAxisModel1.option as any).xxxx).toEqual('x2_a');
            expect(xAxisModel1.option.name).toEqual('a');
            expect((xAxisModel2.option as any).xxxx).toEqual('k1_a');
        });

    });










    describe('noIdButNameExists', function () {

        it('sameTypeNotMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'},
                    {type: 'line', data: [33], name: 'b'},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55], name: 'a'}
                ]
            };
            chart.setOption(option);

            expect(getSeries(chart, 1)).not.toEqual(getSeries(chart, 4));


            expect(countSeries(chart)).toEqual(5);
            expect(countChartViews(chart)).toEqual(5);
            expect(getData0(chart, 0)).toEqual(11);
            expect(getData0(chart, 1)).toEqual(22);
            expect(getData0(chart, 2)).toEqual(33);
            expect(getData0(chart, 3)).toEqual(44);
            expect(getData0(chart, 4)).toEqual(55);

            const origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        it('sameTypeMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'},
                    {type: 'line', data: [33], name: 'b'},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55], name: 'a'}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            chart.setOption(option);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        it('differentTypeNotMerge', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'},
                    {type: 'line', data: [33], name: 'b'},
                    {type: 'line', data: [44]},
                    {type: 'line', data: [55], name: 'a'}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            const option2: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'bar', data: [22], name: 'a'},
                    {type: 'line', data: [33], name: 'b'},
                    {type: 'bar', data: [44]},
                    {type: 'line', data: [55], name: 'a'}
                ]
            };
            chart.setOption(option2, true);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [1, 3], origins, false);
        });

        it('differentTypeMergePartialOneMapTwo', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'},
                    {type: 'line', data: [33]},
                    {type: 'line', data: [44], name: 'b'},
                    {type: 'line', data: [55], name: 'a'}
                ]
            };
            chart.setOption(option);

            const origins = saveOrigins(chart);
            const option2: EChartsOption = {
                series: [
                    {type: 'bar', data: [444], id: 40},
                    {type: 'line', data: [333]},
                    {type: 'bar', data: [222], name: 'a'}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(6);
            expect(countSeries(chart)).toEqual(6);

            expect(getData0(chart, 0)).toEqual(333);
            expect(getData0(chart, 1)).toEqual(222);
            expect(getData0(chart, 2)).toEqual(33);
            expect(getData0(chart, 3)).toEqual(44);
            expect(getData0(chart, 4)).toEqual(55);
            expect(getData0(chart, 5)).toEqual(444);
            modelEqualsToOrigin(chart, [0, 2, 3, 4], origins, true);
            modelEqualsToOrigin(chart, [1], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 3, 4], origins, true);
            viewEqualsToOrigin(chart, [1], origins, false);
        });

        it('differentTypeMergePartialTwoMapOne', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'}
                ]
            };
            chart.setOption(option);

            const option2: EChartsOption = {
                series: [
                    {type: 'bar', data: [444], name: 'a'},
                    {type: 'line', data: [333]},
                    {type: 'line', data: [222], name: 'a'},
                    {type: 'line', data: [111]}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(4);
            expect(countSeries(chart)).toEqual(4);

            expect(getData0(chart, 0)).toEqual(333);
            expect(getData0(chart, 1)).toEqual(444);
            expect(getData0(chart, 2)).toEqual(222);
            expect(getData0(chart, 3)).toEqual(111);
        });

        it('mergePartialCanMapToOtherName', function () {
            // Consider case: axis.name = 'some label', which can be overwritten.
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], name: 10},
                    {type: 'line', data: [22], name: 20}
                ]
            };
            chart.setOption(option);

            const option2: EChartsOption = {
                series: [
                    {type: 'bar', data: [444], name: 40},
                    {type: 'bar', data: [999], name: 40},
                    {type: 'bar', data: [777], id: 70}
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(3);
            expect(countSeries(chart)).toEqual(3);

            expect(getData0(chart, 0)).toEqual(444);
            expect(getData0(chart, 1)).toEqual(999);
            expect(getData0(chart, 2)).toEqual(777);
        });

    });






    describe('ohters', function () {

        it('aBugCase', function () {
            const option: EChartsOption = {
                series: [
                    {
                        type: 'pie',
                        radius: ['20%', '25%'],
                        center: ['20%', '20%'],
                        avoidLabelOverlap: true,
                        label: {
                            show: true,
                            position: 'center',
                            fontSize: '30',
                            fontWeight: 'bold'
                        },
                        emphasis: {
                            scale: false,
                            label: {
                                show: true
                            }
                        },
                        data: [
                            {value: 135, name: '视频广告'},
                            {value: 1548}
                        ]
                    }
                ]
            };
            chart.setOption(option);

            chart.setOption({
                series: [
                    {
                        type: 'pie',
                        radius: ['20%', '25%'],
                        center: ['20%', '20%'],
                        avoidLabelOverlap: true,
                        label: {
                            show: true,
                            position: 'center',
                            fontSize: '30',
                            fontWeight: 'bold'
                        },
                        data: [
                            {value: 135, name: '视频广告'},
                            {value: 1548}
                        ]
                    },
                    {
                        type: 'pie',
                        radius: ['20%', '25%'],
                        center: ['60%', '20%'],
                        avoidLabelOverlap: true,
                        label: {
                            show: true,
                            position: 'center',
                            fontSize: '30',
                            fontWeight: 'bold'
                        },
                        data: [
                            {value: 135, name: '视频广告'},
                            {value: 1548}
                        ]
                    }
                ]
            }, true);

            expect(countChartViews(chart)).toEqual(2);
            expect(countSeries(chart)).toEqual(2);
        });

        it('color', function () {
            const option: EChartsOption = {
                backgroundColor: 'rgba(1,1,1,1)',
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            chart.setOption(option);
            expect(getECModel(chart).option.backgroundColor).toEqual('rgba(1,1,1,1)');

            // Not merge
            chart.setOption({
                backgroundColor: '#fff'
            }, true);

            expect(getECModel(chart).option.backgroundColor).toEqual('#fff');
        });

        it('innerId', function () {
            const option: EChartsOption = {
                xAxis: {data: ['a']},
                yAxis: {},
                toolbox: {
                    feature: {
                        dataZoom: {}
                    }
                },
                dataZoom: [
                    {type: 'inside', id: 'a'},
                    {type: 'slider', id: 'b'}
                ],
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]}
                ]
            };
            chart.setOption(option);

            expect(countModel(chart, 'dataZoom')).toEqual(4);
            expect(getModel(chart, 'dataZoom', 0).id).toEqual('a');
            expect(getModel(chart, 'dataZoom', 1).id).toEqual('b');

            // Merge
            chart.setOption({
                dataZoom: [
                    {type: 'slider', id: 'c'},
                    {type: 'slider', name: 'x'}
                ]
            });

            expect(countModel(chart, 'dataZoom')).toEqual(5);
            expect(getModel(chart, 'dataZoom', 0).id).toEqual('a');
            expect(getModel(chart, 'dataZoom', 1).id).toEqual('b');
            expect(getModel(chart, 'dataZoom', 4).id).toEqual('c');
        });

    });


});
