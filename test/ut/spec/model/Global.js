describe('modelAndOptionMapping', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/src/component/grid',
        'echarts/src/chart/line',
        'echarts/src/chart/pie',
        'echarts/src/chart/bar',
        'echarts/src/component/toolbox',
        'echarts/src/component/dataZoom'
    ]);

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
        return chart.getModel()._componentsMap.get(type).length;
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

    function modelEqualsToOrigin(chart, idxList, origins, boolResult) {
        for (var i = 0; i < idxList.length; i++) {
            var idx = idxList[i];
            expect(origins[idx].model === getSeries(chart, idx)).toEqual(boolResult);
        }
    }

    function viewEqualsToOrigin(chart, idxList, origins, boolResult) {
        for (var i = 0; i < idxList.length; i++) {
            var idx = idxList[i];
            expect(
                origins[idx].view === getChartView(chart, getSeries(chart, idx))
            ).toEqual(boolResult);
        }
    }



    describe('idNoNameNo', function () {

        testCase.createChart()('sameTypeNotMerge', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            var chart = this.chart;
            chart.setOption(option);

            // Not merge
            var origins = saveOrigins(chart);
            chart.setOption(option, true);
            expect(countChartViews(chart)).toEqual(3);
            expect(countSeries(chart)).toEqual(3);
            modelEqualsToOrigin(chart, [0, 1, 2], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2], origins, true);
        });

        testCase.createChart()('sameTypeMergeFull', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            var chart = this.chart;
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
            viewEqualsToOrigin(chart, [0, 1, 2], origins, true);
            modelEqualsToOrigin(chart, [0, 1, 2], origins, true);
        });

        testCase.createChart()('sameTypeMergePartial', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            var chart = this.chart;
            chart.setOption(option);

            // Merge
            var origins = saveOrigins(chart);
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

        testCase.createChart()('differentTypeMerge', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22]},
                    {type: 'line', data: [33]}
                ]
            };
            var chart = this.chart;
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
            modelEqualsToOrigin(chart, [0, 2], origins, true);
            modelEqualsToOrigin(chart, [1], origins, false);
            viewEqualsToOrigin(chart, [0, 2], origins, true);
            viewEqualsToOrigin(chart, [1], origins, false);
        });

    });





    describe('idSpecified', function () {

        testCase.createChart()('sameTypeNotMerge', function () {
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
            var chart = this.chart;
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

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        testCase.createChart()('sameTypeMerge', function () {
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
            var chart = this.chart;
            chart.setOption(option);

            var origins = saveOrigins(chart);
            chart.setOption(option);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        testCase.createChart()('differentTypeNotMerge', function () {
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
            var chart = this.chart;
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

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [1, 3], origins, false);
        });

        testCase.createChart()('differentTypeMergeFull', function () {
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
            var chart = this.chart;
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

            modelEqualsToOrigin(chart, [0, 2, 4], origins, true);
            modelEqualsToOrigin(chart, [1, 3], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [1, 3], origins, false);
        });

        testCase.createChart()('differentTypeMergePartial1', function () {
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
            var chart = this.chart;
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
            modelEqualsToOrigin(chart, [0, 1, 2, 4], origins, true);
            modelEqualsToOrigin(chart, [3], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [3], origins, false);
        });

        testCase.createChart()('differentTypeMergePartial2', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], id: 20}
                ]
            };
            var chart = this.chart;
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


        testCase.createChart()('mergePartialDoNotMapToOtherId', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], id: 10},
                    {type: 'line', data: [22], id: 20}
                ]
            };
            var chart = this.chart;
            chart.setOption(option);

            var option2 = {
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


        testCase.createChart()('idDuplicate', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], id: 10},
                    {type: 'line', data: [22], id: 10}
                ]
            };

            var chart = this.chart;

            expect(function () {
                chart.setOption(option);
            }).toThrowError(/duplicate/);
        });


        testCase.createChart()('nameTheSameButIdNotTheSame', function () {
            var chart = this.chart;

            var option = {
                grid: {},
                xAxis: [
                    {id: 'x1', name: 'a', xxxx: 'x1_a'},
                    {id: 'x2', name: 'b', xxxx: 'x2_b'}
                ],
                yAxis: {}
            };

            chart.setOption(option);

            var xAxisModel0 = getModel(chart, 'xAxis', 0);
            var xAxisModel1 = getModel(chart, 'xAxis', 1);
            expect(xAxisModel0.option.xxxx).toEqual('x1_a');
            expect(xAxisModel1.option.xxxx).toEqual('x2_b');
            expect(xAxisModel1.option.name).toEqual('b');

            var option2 = {
                xAxis: [
                    {id: 'k1', name: 'a', xxxx: 'k1_a'},
                    {id: 'x2', name: 'a', xxxx: 'x2_a'}
                ]
            };
            chart.setOption(option2);

            var xAxisModel0 = getModel(chart, 'xAxis', 0);
            var xAxisModel1 = getModel(chart, 'xAxis', 1);
            var xAxisModel2 = getModel(chart, 'xAxis', 2);
            expect(xAxisModel0.option.xxxx).toEqual('x1_a');
            expect(xAxisModel1.option.xxxx).toEqual('x2_a');
            expect(xAxisModel1.option.name).toEqual('a');
            expect(xAxisModel2.option.xxxx).toEqual('k1_a');
        });

    });










    describe('noIdButNameExists', function () {

        testCase.createChart()('sameTypeNotMerge', function () {
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
            var chart = this.chart;
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

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        testCase.createChart()('sameTypeMerge', function () {
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
            var chart = this.chart;
            chart.setOption(option);

            var origins = saveOrigins(chart);
            chart.setOption(option);
            expect(countChartViews(chart)).toEqual(5);
            expect(countSeries(chart)).toEqual(5);

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
            viewEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, true);
        });

        testCase.createChart()('differentTypeNotMerge', function () {
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
            var chart = this.chart;
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

            modelEqualsToOrigin(chart, [0, 1, 2, 3, 4], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 4], origins, true);
            viewEqualsToOrigin(chart, [1, 3], origins, false);
        });

        testCase.createChart()('differentTypeMergePartialOneMapTwo', function () {
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
            var chart = this.chart;
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
            modelEqualsToOrigin(chart, [0, 2, 3, 4], origins, true);
            modelEqualsToOrigin(chart, [1], origins, false);
            viewEqualsToOrigin(chart, [0, 2, 3, 4], origins, true);
            viewEqualsToOrigin(chart, [1], origins, false);
        });

        testCase.createChart()('differentTypeMergePartialTwoMapOne', function () {
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11]},
                    {type: 'line', data: [22], name: 'a'}
                ]
            };
            var chart = this.chart;
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

        testCase.createChart()('mergePartialCanMapToOtherName', function () {
            // Consider case: axis.name = 'some label', which can be overwritten.
            var option = {
                xAxis: {data: ['a']},
                yAxis: {},
                series: [
                    {type: 'line', data: [11], name: 10},
                    {type: 'line', data: [22], name: 20}
                ]
            };
            var chart = this.chart;
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

        testCase.createChart()('aBugCase', function () {
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
            var chart = this.chart;
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

        testCase.createChart()('color', function () {
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
            var chart = this.chart;
            chart.setOption(option);
            expect(chart._model.option.backgroundColor).toEqual('rgba(1,1,1,1)');

            // Not merge
            chart.setOption({
                backgroundColor: '#fff'
            }, true);

            expect(chart._model.option.backgroundColor).toEqual('#fff');
        });

        testCase.createChart()('innerId', function () {
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
            var chart = this.chart;
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
