
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

/* jshint maxlen:200 */

describe('api/containPixel', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/src/chart/pie',
        'echarts/src/chart/map',
        'echarts/src/chart/scatter',
        'echarts/src/chart/graph',
        'echarts/src/component/geo',
        'echarts/src/component/grid',
        'echarts/src/component/polar'
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


    testCase.createChart(1, 200, 150)('geo', function () {
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
                },
                {
                    id: 'cc',
                    aspectScale: 1,
                    left: 0,
                    width: '50%',
                    top: 0,
                    height: '50%',
                    zoom: 0.5, // test roam
                    map: 'test1'
                }
            ],
            series: [
                {id: 'k1', type: 'scatter', coordinateSystem: 'geo', geoIndex: 1},
                {id: 'k2', type: 'scatter', coordinateSystem: 'geo'}
            ]
        });

        var width = chart.getWidth();
        var height = chart.getWidth();

        expect(chart.containPixel('geo', [15, 30])).toEqual(true);
        expect(chart.containPixel('geo', [9.5, 30])).toEqual(false);
        expect(chart.containPixel({geoIndex: 1}, [width / 2, 50])).toEqual(true);
        expect(chart.containPixel({geoIndex: 1}, [10, 20])).toEqual(false);
        expect(chart.containPixel({geoId: 'cc'}, [0, 0])).toEqual(false);
    });


    testCase.createChart(1, 200, 150)('map', function () {
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

        expect(chart.containPixel('series', [15, 30])).toEqual(true);
        expect(chart.containPixel('series', [9.5, 30])).toEqual(false);
        expect(chart.containPixel({seriesId: 'k2'}, [width / 2, 50])).toEqual(true);
        expect(chart.containPixel({seriesId: 1}, [10, 20])).toEqual(false);
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

        expect(chart.containPixel('grid', [15, 30])).toEqual(true);
        expect(chart.containPixel('grid', [9.5, 30])).toEqual(false);
        expect(chart.containPixel({gridIndex: 1}, [width / 2, 50])).toEqual(true);
        expect(chart.containPixel({gridIndex: 1}, [10, 20])).toEqual(false);
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

        var height = chart.getHeight();

        expect(chart.containPixel('series', [40, height / 2])).toEqual(false);
        expect(chart.containPixel('series', [40, height / 2 + 10])).toEqual(true);
        expect(chart.containPixel('series', [9.5, 1])).toEqual(false);
    });


    testCase.createChart()('pieAndGeo', function () {
        this.echarts.registerMap('test1', testGeoJson1);
        this.echarts.registerMap('test2', testGeoJson2);
        var chart = this.chart;

        chart.setOption({
            geo: [
                {
                    id: 'aa',
                    left: 10,
                    top: 10,
                    width: 10,
                    height: 10,
                    map: 'test1'
                },
                {
                    id: 'bb',
                    left: 100,
                    top: 10,
                    width: 10,
                    height: 10,
                    map: 'test2'
                }
            ],
            series: [
                {id: 'k1', type: 'scatter', coordinateSystem: 'geo', geoIndex: 1},
                {id: 'k2', type: 'scatter', coordinateSystem: 'geo'},
                {
                    id: 'k3',
                    type: 'pie',
                    center: [40, 100],
                    radius: [3, 10],
                    data: [
                        {x: 1000, y: 2000},
                        {x: 1000, y: 5000}
                    ],
                    links: []
                }
            ]
        });

        expect(chart.containPixel({geoIndex: [0, 1], seriesId: 'k3'}, [15, 15])).toEqual(true);
        expect(chart.containPixel({geoIndex: [0, 1], seriesId: 'k3'}, [15, 25])).toEqual(false);
        expect(chart.containPixel({geoIndex: [0, 1], seriesId: 'k3'}, [105, 15])).toEqual(true);
        expect(chart.containPixel({geoIndex: [0, 1], seriesId: 'k3'}, [105, 25])).toEqual(false);
        expect(chart.containPixel({geoIndex: [0, 1], seriesId: 'k3'}, [45, 100])).toEqual(true);
        expect(chart.containPixel({geoIndex: [0, 1], seriesId: 'k3'}, [55, 100])).toEqual(false);
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

        expect(chart.containPixel('series', [15, 35])).toEqual(true);
        expect(chart.containPixel('series', [3, 4])).toEqual(false);
    });


});