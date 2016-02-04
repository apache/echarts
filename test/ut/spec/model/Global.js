describe('modelAndOptionMapping', function() {

    var utHelper = window.utHelper;
    var el;
    var chart;

    beforeEach(function (done) {
        window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

        if (el) {
            document.body.removeChild(el);
        }
        if (chart) {
            chart.dispose();
        }

        el = document.createElement('div');
        document.body.appendChild(el);

        utHelper.resetPackageLoader(done);
    });

    function testCase(name, doTest) {
        it(name, function (done) {
            window.require(
                [
                    'echarts',
                    'echarts/component/grid',
                    'echarts/chart/line',
                    'echarts/chart/pie',
                    'echarts/chart/bar',
                    'echarts/component/toolbox',
                    'echarts/component/dataZoom'
                ],
                function (echarts) {
                    chart = echarts.init(el, null, {renderer: 'canvas'});
                    doTest(chart, echarts);
                    done();
                }
            );
        });
    }
    function xtestCase() {} // jshint ignore:line

    function getData0(chart, seriesIndex) {
        return getSeries(chart, seriesIndex).getData().get('y', 0);
    }

    function getSeries(chart, seriesIndex) {
        return chart.getModel().getComponent('series', seriesIndex);
    }

    function getModel(chart, type, index) {
        return chart.getModel().getComponent(type, index);
    }

    function countSeries(chart) {
        return countModel(chart, 'series');
    }

    function countModel(chart, type) {
        // FIXME
        // access private
        return chart.getModel()._componentsMap[type].length;
    }

    function getChartView(chart, series) {
        return chart._chartsMap[series.__viewId];
    }

    function countChartViews(chart) {
        return chart._chartsViews.length;
    }

    function saveOrigins(chart) {
        var count = countSeries(chart);
        var origins = [];
        for (var i = 0; i < count; i++) {
            var series = getSeries(chart, i);
            origins.push({
                model: series,
                view: getChartView(chart, series)
            });
        }
        return origins;
    }

    function modelEqualsToOrigin(idxList, origins, boolResult) {
        for (var i = 0; i < idxList.length; i++) {
            var idx = idxList[i];
            expect(origins[idx].model === getSeries(chart, idx)).toEqual(boolResult);
        }
    }

    function viewEqualsToOrigin(idxList, origins, boolResult) {
        for (var i = 0; i < idxList.length; i++) {
            var idx = idxList[i];
            expect(
                origins[idx].view === getChartView(chart, getSeries(chart, idx))
            ).toEqual(boolResult);
        }
    }



    describe('idNoNameNo', function () {

        testCase('sameTypeNotMerge', function (chart, echarts) {
            var option = {
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
            var origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(3);
            expect(countSeries(chart)).toEqual(3);
            modelEqualsToOrigin([0, 1, 2], origins, false);
            viewEqualsToOrigin([0, 1, 2], origins, true);
        });

        testCase('sameTypeMergeFull', function (chart, echarts) {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            chart.setOption(option);

            // Merge
            var origins = saveOrigins(chart);
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
            viewEqualsToOrigin([0, 1, 2], origins, true);
            modelEqualsToOrigin([0, 1, 2], origins, true);
        });

        testCase('sameTypeMergePartial', function (chart, echarts) {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            chart.setOption(option);

            // Merge
            var origins = saveOrigins(chart);
            chart.setOption({
                series: [
                    {type: 'line', data: [22222]}
                ]
            });

            expect(countSeries(chart)).toEqual(3);
            expect(countChartViews(chart)).toEqual(3);
            expect(getData0(chart, 0)).toEqual(22222);
            expect(getData0(chart, 1)).toEqual(22);
            expect(getData0(chart, 2)).toEqual(33);
            viewEqualsToOrigin([0, 1, 2], origins, true);
            modelEqualsToOrigin([0, 1, 2], origins, true);
        });

        testCase('differentTypeMerge', function (chart, echarts) {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            chart.setOption(option);

            // Merge
            var origins = saveOrigins(chart);
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
            modelEqualsToOrigin([0, 2], origins, true);
            modelEqualsToOrigin([1], origins, false);
            viewEqualsToOrigin([0, 2], origins, true);
            viewEqualsToOrigin([1], origins, false);
        });

    });





    describe('idSpecified', function () {

        testCase('sameTypeNotMerge', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin([0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin([0, 1, 2, 3, 4], origins, true);
        });

        testCase('sameTypeMerge', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            chart.setOption(option);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin([0, 1, 2, 3, 4], origins, true);
            viewEqualsToOrigin([0, 1, 2, 3, 4], origins, true);
        });

        testCase('differentTypeNotMerge', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            var option2 = {
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

            modelEqualsToOrigin([0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin([0, 2, 4], origins, true);
            viewEqualsToOrigin([1, 3], origins, false);
        });

        testCase('differentTypeMergeFull', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            var option2 = {
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

            modelEqualsToOrigin([0, 2, 4], origins, true);
            modelEqualsToOrigin([1, 3], origins, false);
            viewEqualsToOrigin([0, 2, 4], origins, true);
            viewEqualsToOrigin([1, 3], origins, false);
        });

        testCase('differentTypeMergePartial1', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            var option2 = {
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
            modelEqualsToOrigin([0, 1, 2, 4], origins, true);
            modelEqualsToOrigin([3], origins, false);
            viewEqualsToOrigin([0, 1, 2, 4], origins, true);
            viewEqualsToOrigin([3], origins, false);
        });

        testCase('differentTypeMergePartial2', function (chart, echarts) {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20}
                ]
            };
            chart.setOption(option);

            var option2 = {
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


        testCase('mergePartialDoNotMapToOtherId', function (chart, echarts) {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], id: 10},
                    {type: 'line', data: [22], id: 20}
                ]
            };
            chart.setOption(option);

            var option2 = {
                series: [
                    {type: 'bar', data: [444], id: 40},
                ]
            };
            chart.setOption(option2);
            expect(countChartViews(chart)).toEqual(3);
            expect(countSeries(chart)).toEqual(3);

            expect(getData0(chart, 0)).toEqual(11);
            expect(getData0(chart, 1)).toEqual(22);
            expect(getData0(chart, 2)).toEqual(444);
        });


        testCase('idDuplicate', function (chart, echarts) {
            var option = {
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


    });










    describe('noIdButNameExists', function () {

        testCase('sameTypeNotMerge', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin([0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin([0, 1, 2, 3, 4], origins, true);
        });

        testCase('sameTypeMerge', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            chart.setOption(option);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin([0, 1, 2, 3, 4], origins, true);
            viewEqualsToOrigin([0, 1, 2, 3, 4], origins, true);
        });

        testCase('differentTypeNotMerge', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            var option2 = {
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

            modelEqualsToOrigin([0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin([0, 2, 4], origins, true);
            viewEqualsToOrigin([1, 3], origins, false);
        });

        testCase('differentTypeMergePartialOneMapTwo', function (chart, echarts) {
            var option = {
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

            var origins = saveOrigins(chart);
            var option2 = {
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
            modelEqualsToOrigin([0, 2, 3, 4], origins, true);
            modelEqualsToOrigin([1], origins, false);
            viewEqualsToOrigin([0, 2, 3, 4], origins, true);
            viewEqualsToOrigin([1], origins, false);
        });

        testCase('differentTypeMergePartialTwoMapOne', function (chart, echarts) {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'}
                ]
            };
            chart.setOption(option);

            var option2 = {
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

        testCase('mergePartialCanMapToOtherName', function (chart, echarts) {
            // Consider case: axis.name = 'some label', which can be overwritten.
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], name: 10},
                    {type: 'line', data: [22], name: 20}
                ]
            };
            chart.setOption(option);

            var option2 = {
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

        testCase('aBugCase', function (chart, echarts) {
            var option = {
                series: [
                    {
                        type:'pie',
                        radius: ['20%', '25%'],
                        center:['20%', '20%'],
                        avoidLabelOverlap: true,
                        hoverAnimation :false,
                        label: {
                            normal: {
                                show: true,
                                position: 'center',
                                textStyle: {
                                    fontSize: '30',
                                    fontWeight: 'bold'
                                }
                            },
                            emphasis: {
                                show: true
                            }
                        },
                        data:[
                            {value:135, name:'视频广告'},
                            {value:1548}
                        ]
                    }
                ]
            };
            chart.setOption(option);

            chart.setOption({
                series: [
                    {
                        type:'pie',
                        radius: ['20%', '25%'],
                        center: ['20%', '20%'],
                        avoidLabelOverlap: true,
                        hoverAnimation: false,
                        label: {
                            normal: {
                                show: true,
                                position: 'center',
                                textStyle: {
                                    fontSize: '30',
                                    fontWeight: 'bold'
                                }
                            }
                        },
                        data: [
                            {value:135, name:'视频广告'},
                            {value:1548}
                        ]
                    },
                    {
                        type:'pie',
                        radius: ['20%', '25%'],
                        center: ['60%', '20%'],
                        avoidLabelOverlap: true,
                        hoverAnimation: false,
                        label: {
                            normal: {
                                show: true,
                                position: 'center',
                                textStyle: {
                                    fontSize: '30',
                                    fontWeight: 'bold'
                                }
                            }
                        },
                        data: [
                            {value:135, name:'视频广告'},
                            {value:1548}
                        ]
                    }
                ]
            }, true);

            expect(countChartViews(chart)).toEqual(2);
            expect(countSeries(chart)).toEqual(2);
        });

        testCase('color', function (chart, echarts) {
            var option = {
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
            expect(chart._model.option.backgroundColor).toEqual('rgba(1,1,1,1)');

            // Not merge
            chart.setOption({
                backgroundColor: '#fff'
            }, true);

            expect(chart._model.option.backgroundColor).toEqual('#fff');
        });

        testCase('innerId', function (chart, echarts) {
            var option = {
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
