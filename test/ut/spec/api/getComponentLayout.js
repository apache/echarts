/* jshint maxlen:200 */

describe('api/getComponentLayout', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/chart/pie',
        'echarts/chart/map',
        'echarts/chart/scatter',
        'echarts/chart/graph',
        'echarts/component/geo',
        'echarts/component/grid',
        'echarts/component/polar'
    ]);

    var testGeoJson1 = {
        'type': 'FeatureCollection',
        'features': [
            {
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [
                        [
                            [
                                2000,
                                3000
                            ],
                            [
                                5000,
                                3000
                            ],
                            [
                                5000,
                                8000
                            ],
                            [
                                2000,
                                8000
                            ]
                        ]
                    ]
                },
                'properties': {
                    'name': 'Afghanistan',
                    'childNum': 1
                }
            }
        ]
    };

    var testGeoJson2 = {
        'type': 'FeatureCollection',
        'features': [
            {
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [
                        [
                            [
                                200,
                                300
                            ],
                            [
                                500,
                                300
                            ],
                            [
                                500,
                                800
                            ],
                            [
                                200,
                                800
                            ]
                        ]
                    ]
                },
                'properties': {
                    'name': 'Afghanistan',
                    'childNum': 1
                }
            }
        ]
    };


    testCase.createChart()('geo', function () {
        this.echarts.registerMap('test1', testGeoJson1);
        this.echarts.registerMap('test2', testGeoJson2);
        var chart = this.chart;

        chart.setOption({
            geo: [
                {
                    id: 'aa',
                    left: 10,
                    right: '50%',
                    top: 30,
                    bottom: 40,
                    map: 'test1'
                },
                {
                    id: 'bb',
                    layoutCenter: ['50%', 50],
                    layoutSize: 20,
                    aspectScale: 1,
                    map: 'test2'
                }
            ],
            series: [
                {id: 'k1', type: 'scatter', coordinateSystem: 'geo', geoIndex: 1},
                {id: 'k2', type: 'scatter', coordinateSystem: 'geo'}
            ]
        });

        var width = chart.getWidth();
        var height = chart.getHeight();

        expect(chart.getComponentLayout('geo')).toEqual({x: 10, y: 30, width: width - width / 2 - 10, height: height - 70});
        expect(chart.getComponentLayout({geoIndex: 1})).toEqual({x: width / 2 - 6, y: 50 - 10, width: 12, height: 20});

    });


    testCase.createChart()('map', function () {
        this.echarts.registerMap('test1', testGeoJson1);
        this.echarts.registerMap('test2', testGeoJson2);
        var chart = this.chart;

        chart.setOption({
            series: [
                {
                    id: 'k1',
                    type: 'map',
                    map: 'test1',
                    left: 10,
                    right: '50%',
                    top: 30,
                    bottom: 40
                },
                {
                    id: 'k2',
                    type: 'map',
                    map: 'test2',
                    layoutCenter: ['50%', 50],
                    layoutSize: 20,
                    aspectScale: 1
                }
            ]
        });

        var width = chart.getWidth();
        var height = chart.getHeight();

        expect(chart.getComponentLayout('series')).toEqual({x: 10, y: 30, width: width - width / 2 - 10, height: height - 70});
        expect(chart.getComponentLayout({seriesIndex: 1})).toEqual({x: width / 2 - 6, y: 50 - 10, width: 12, height: 20});
    });


    testCase.createChart()('cartesian', function () {
        this.echarts.registerMap('test1', testGeoJson1);
        var chart = this.chart;

        chart.setOption({
            geo: [ // Should not affect grid converter.
                {
                    map: 'test1'
                }
            ],
            grid: [
                {
                    id: 'g0',
                    left: 10,
                    right: '50%',
                    top: 30,
                    bottom: 40
                },
                {
                    id: 'g1',
                    left: '50%',
                    right: 20,
                    top: 30,
                    bottom: 40
                }
            ],
            xAxis: [
                {
                    id: 'x0',
                    type: 'value',
                    min: -500,
                    max: 3000,
                    gridId: 'g0'
                },
                {
                    id: 'x1',
                    type: 'value',
                    min: -50,
                    max: 300,
                    gridId: 'g0'
                },
                {
                    id: 'x2',
                    type: 'value',
                    min: -50,
                    max: 300,
                    gridId: 'g1'
                }
            ],
            yAxis: [
                {
                    id: 'y0',
                    type: 'value',
                    min: 6000,
                    max: 9000,
                    gridId: 'g0'
                },
                {
                    id: 'y1',
                    type: 'value',
                    inverse: true, // test inverse
                    min: 600,
                    max: 900,
                    gridId: 'g1'
                }
            ],
            series: [
                {
                    id: 'k1',
                    type: 'scatter',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    data: [[1000, 700]]
                },
                {
                    id: 'k2',
                    type: 'scatter',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    data: [[100, 800]]
                },
                {
                    id: 'j1',
                    type: 'scatter',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    data: [[100, 800]],
                    xAxisIndex: 1
                },
                {
                    id: 'i1',
                    type: 'scatter',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    data: [],
                    xAxisId: 'x2',
                    yAxisId: 'y1'
                }
            ]
        });

        var width = chart.getWidth();
        var height = chart.getHeight();

        expect(chart.getComponentLayout('grid')).toEqual({x: 10, y: 30, width: width - width / 2 - 10, height: height - 70});
        expect(chart.getComponentLayout({gridIndex: 1})).toEqual({x: width / 2, y: 30, width: width - width / 2 - 20, height: height - 70});
    });


    testCase.createChart()('pie', function () {
        var chart = this.chart;

        chart.setOption({
            series: [
                {
                    id: 'k1',
                    type: 'pie',
                    center: [40, '50%'],
                    radius: [10, '50%'],
                    data: [
                        {x: 1000, y: 2000},
                        {x: 1000, y: 5000},
                        {x: 3000, y: 5000},
                        {x: 3000, y: 2000}
                    ],
                    links: []
                }
            ]
        });

        var width = chart.getWidth();
        var height = chart.getHeight();

        expect(chart.getComponentLayout('series')).toEqual({cx: 40, cy: height / 2, r: Math.min(width, height) / 2 / 2, r0: 10});
    });


    testCase.createChart()('graph', function () {
        this.echarts.registerMap('test1', testGeoJson1);
        var chart = this.chart;

        chart.setOption({
            geo: [ // Should not affect graph converter.
                {
                    map: 'test1'
                }
            ],
            series: [
                {
                    id: 'k1',
                    type: 'graph',
                    left: 10,
                    right: '50%',
                    top: 30,
                    bottom: 40,
                    data: [
                        {x: 1000, y: 2000},
                        {x: 1000, y: 5000},
                        {x: 3000, y: 5000},
                        {x: 3000, y: 2000}
                    ],
                    links: []
                }
            ]
        });

        var width = chart.getWidth();
        var height = chart.getHeight();

        expect(chart.getComponentLayout('series')).toEqual({x: 10, y: 30, width: width - width / 2 - 10, height: height - 70});
    });


});