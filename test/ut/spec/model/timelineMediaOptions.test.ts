
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
const utHelper = require('../../core/utHelper');

describe('timelineMediaOptions', function () {

    function getData0(chart, seriesIndex) {
        return getSeries(chart, seriesIndex).getData().get('y', 0);
    }
    function getSeries(chart, seriesIndex) {
        return chart.getModel().getComponent('series', seriesIndex);
    }
    function getLegendOption(chart) {
        return chart.getModel().getComponent('legend', 0).option;
    }
    function getTimelineComponent(chart) {
        return chart.getModel().getComponent('timeline', 0);
    }

    var chart;
    beforeEach(function () {
        chart = utHelper.createChart(10, 10);
    });

    afterEach(function () {
        chart.dispose();
    });




    describe('parse_timeline_media_option', function () {

        it('parse_media_has_baseOption_has_default', function () {
            var option = {
                baseOption: {
                    xAxis: { data: ['a'] },
                    yAxis: {},
                    legend: { left: 10 },
                    series: { name: 'a', type: 'line', data: [11] }
                },
                legend: { left: 999, right: 123 }, // Illegal, should be ignored
                media: [{
                    query: { maxWidth: 670, minWidth: 550 },
                    option: {
                        legend: { left: 50 }
                    }
                }, {
                    option: {
                        legend: { left: 100 }
                    }
                }]
            };
            chart.setOption(option);
            expect(getLegendOption(chart).left).toEqual(100);
            expect(getLegendOption(chart).right).not.toEqual(123);

            chart.resize({ width: 600 });
            expect(getLegendOption(chart).left).toEqual(50);
        });

        it('parse_media_no_baseOption_has_default', function () {
            var option = {
                xAxis: { data: ['a'] },
                yAxis: {},
                legend: { left: 10 },
                series: { name: 'a', type: 'line', data: [11] },
                media: [{
                    query: { maxWidth: 670, minWidth: 550 },
                    option: {
                        legend: { left: 50 }
                    }
                }, {
                    option: {
                        legend: { left: 100 }
                    }
                }]
            };
            chart.setOption(option);
            expect(getLegendOption(chart).left).toEqual(100);

            chart.resize({ width: 600 });
            expect(getLegendOption(chart).left).toEqual(50);
        });

        it('parse_media_no_baseOption_no_default', function () {
            var option = {
                xAxis: { data: ['a'] },
                yAxis: {},
                legend: { left: 10 },
                series: { name: 'a', type: 'line', data: [11] },
                media: [{
                    query: { maxWidth: 670, minWidth: 550 },
                    option: {
                        legend: { left: 50 }
                    }
                }]
            };
            chart.setOption(option);
            expect(getLegendOption(chart).left).toEqual(10);

            chart.resize({ width: 600 });
            expect(getLegendOption(chart).left).toEqual(50);
        });

        it('parse_timeline_media_has_baseOption', function () {
            var option = {
                baseOption: {
                    timeline: { axisType: 'category' },
                    xAxis: { data: ['a'] },
                    yAxis: {},
                    legend: { left: 10 },
                    series: { name: 'a', type: 'line', data: [11] }
                },
                legend: { left: 999, right: 123 }, // Illegal, should be ignored
                media: [{
                    query: { maxWidth: 670, minWidth: 550 },
                    option: {
                        legend: { left: 50 }
                    }
                }, {
                    option: {
                        legend: { left: 100 }
                    }
                }],
                options: [
                    { series: { type: 'line', data: [88] } },
                    { series: { type: 'line', data: [99] } }
                ]
            };
            chart.setOption(option);
            expect(getLegendOption(chart).left).toEqual(100);
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).right).not.toEqual(123);
            expect(getTimelineComponent(chart) != null).toEqual(true);

            chart.resize({ width: 600 });
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).left).toEqual(50);

            chart.setOption({ timeline: { currentIndex: 1 } });
            expect(getData0(chart, 0)).toEqual(99);
            expect(getLegendOption(chart).left).toEqual(50);
        });

        it('parse_timeline_media_no_baseOption', function () {
            var option = {
                timeline: { axisType: 'category' },
                xAxis: { data: ['a'] },
                yAxis: {},
                legend: { left: 10 },
                series: { name: 'a', type: 'line', data: [11] },
                media: [{
                    query: { maxWidth: 670, minWidth: 550 },
                    option: {
                        legend: { left: 50 }
                    }
                }, {
                    option: {
                        legend: { left: 100 }
                    }
                }],
                options: [
                    { series: { type: 'line', data: [88] } },
                    { series: { type: 'line', data: [99] } }
                ]
            };
            chart.setOption(option);
            expect(getLegendOption(chart).left).toEqual(100);
            expect(getData0(chart, 0)).toEqual(88);
            expect(getTimelineComponent(chart) != null).toEqual(true);

            chart.resize({ width: 600 });
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).left).toEqual(50);

            chart.setOption({ timeline: { currentIndex: 1 } });
            expect(getData0(chart, 0)).toEqual(99);
            expect(getLegendOption(chart).left).toEqual(50);
        });

        it('parse_timeline_has_baseOption', function () {
            var option = {
                baseOption: {
                    timeline: { axisType: 'category' },
                    xAxis: { data: ['a'] },
                    yAxis: {},
                    legend: { },
                    series: { name: 'a', type: 'line', data: [11] }
                },
                legend: { right: 123 }, // Illegal, should be ignored
                options: [
                    { series: { type: 'line', data: [88] } },
                    { series: { type: 'line', data: [99] } }
                ]
            };
            chart.setOption(option);
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).right).not.toEqual(123);
            expect(getTimelineComponent(chart) != null).toEqual(true);

            chart.setOption({ timeline: { currentIndex: 1 } });
            expect(getData0(chart, 0)).toEqual(99);
        });

        it('parse_timeline_has_baseOption_compat', function () {
            var option = {
                timeline: { axisType: 'category' },
                baseOption: {
                    xAxis: { data: ['a'] },
                    yAxis: {},
                    legend: { },
                    series: { name: 'a', type: 'line', data: [11] }
                },
                legend: { right: 123 }, // Illegal, should be ignored
                options: [
                    { series: { type: 'line', data: [88] } },
                    { series: { type: 'line', data: [99] } }
                ]
            };
            chart.setOption(option);
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).right).not.toEqual(123);
            expect(getTimelineComponent(chart) != null).toEqual(true);

            chart.setOption({ timeline: { currentIndex: 1 } });
            expect(getData0(chart, 0)).toEqual(99);
        });

        it('parse_timeline_has_baseOption_compat', function () {
            var option = {
                timeline: { axisType: 'category' },
                baseOption: {
                    xAxis: { data: ['a'] },
                    yAxis: {},
                    legend: {},
                    series: { name: 'a', type: 'line', data: [11] }
                },
                legend: { right: 123 }, // Illegal, should be ignored
                options: [
                    { series: { type: 'line', data: [88] } },
                    { series: { type: 'line', data: [99] } }
                ]
            };
            chart.setOption(option);
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).right).not.toEqual(123);
            expect(getTimelineComponent(chart) != null).toEqual(true);

            chart.setOption({ timeline: { currentIndex: 1 } });
            expect(getData0(chart, 0)).toEqual(99);
        });

        it('parse_timeline_no_baseOption', function () {
            var option = {
                timeline: { axisType: 'category' },
                xAxis: { data: ['a'] },
                yAxis: {},
                legend: {},
                series: { name: 'a', type: 'line', data: [11] },
                options: [
                    { series: { type: 'line', data: [88] } },
                    { series: { type: 'line', data: [99] } }
                ]
            };
            chart.setOption(option);
            expect(getData0(chart, 0)).toEqual(88);
            expect(getLegendOption(chart).right).not.toEqual(123);
            expect(getTimelineComponent(chart) != null).toEqual(true);

            chart.setOption({ timeline: { currentIndex: 1 } });
            expect(getData0(chart, 0)).toEqual(99);
        });


    });





    describe('timeline_onceMore', function () {

        it('timeline_setOptionOnceMore_baseOption', function () {
            var option = {
                baseOption: {
                    timeline: {
                        axisType: 'category',
                        autoPlay: false,
                        playInterval: 1000
                    },
                    xAxis: {data: ['a']},
                    yAxis: {}
                },
                options: [{
                    series: [
                        { type: 'line', data: [11] },
                        { type: 'line', data: [22] }
                    ]
                }, {
                    series: [
                        { type: 'line', data: [111] },
                        { type: 'line', data: [222] }
                    ]
                }]
            };
            chart.setOption(option);

            expect(getData0(chart, 0)).toEqual(11);
            expect(getData0(chart, 1)).toEqual(22);

            chart.setOption({
                xAxis: {data: ['b']}
            });

            expect(getData0(chart, 0)).toEqual(11);
            expect(getData0(chart, 1)).toEqual(22);

            chart.setOption({
                xAxis: {data: ['c']},
                timeline: {
                    currentIndex: 1
                }
            });

            expect(getData0(chart, 0)).toEqual(111);
            expect(getData0(chart, 1)).toEqual(222);
        });



        it('timeline_setOptionOnceMore_substitudeTimelineOptions', function () {
            var option = {
                baseOption: {
                    timeline: {
                        axisType: 'category',
                        autoPlay: false,
                        playInterval: 1000,
                        currentIndex: 2
                    },
                    xAxis: {data: ['a']},
                    yAxis: {}
                },
                options: [{
                    series: [
                        { type: 'line', data: [11] },
                        { type: 'line', data: [22] }
                    ]
                }, {
                    series: [
                        { type: 'line', data: [111] },
                        { type: 'line', data: [222] }
                    ]
                }, {
                    series: [
                        { type: 'line', data: [1111] },
                        { type: 'line', data: [2222] }
                    ]
                }]
            };
            chart.setOption(option);

            var ecModel = chart.getModel();
            expect(getData0(chart, 0)).toEqual(1111);
            expect(getData0(chart, 1)).toEqual(2222);

            chart.setOption({
                baseOption: {
                    backgroundColor: '#987654',
                    xAxis: {data: ['b']}
                },
                options: [{
                    series: [
                        { type: 'line', data: [55] },
                        { type: 'line', data: [66] }
                    ]
                }, {
                    series: [
                        { type: 'line', data: [555] },
                        { type: 'line', data: [666] }
                    ]
                }]
            });

            var ecModel = chart.getModel();
            var option = ecModel.getOption();
            expect(option.backgroundColor).toEqual('#987654');
            expect(getData0(chart, 0)).toEqual(1111);
            expect(getData0(chart, 1)).toEqual(2222);

            chart.setOption({
                timeline: {
                    currentIndex: 0
                }
            });

            expect(getData0(chart, 0)).toEqual(55);
            expect(getData0(chart, 1)).toEqual(66);

            chart.setOption({
                timeline: {
                    currentIndex: 2
                }
            });

            // no 1111 2222 any more, replaced totally by new timeline.
            expect(getData0(chart, 0)).toEqual(55);
            expect(getData0(chart, 1)).toEqual(66);
        });
    });


});
