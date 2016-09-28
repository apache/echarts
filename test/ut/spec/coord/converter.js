describe('coord/converter', function() {

    var utHelper = window.utHelper;

    var DELTA = 1E-4;

    function pointEquals(p1, p2) {
        return Math.abs(p1[0] - p2[0]) < DELTA && Math.abs(p1[1] - p2[1]) < DELTA;
    }

    var testCase = utHelper.prepare([
        'echarts/chart/map',
        'echarts/chart/scatter',
        'echarts/chart/graph',
        'echarts/component/geo',
        'echarts/component/grid'
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
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    map: 'test1'
                },
                {
                    id: 'bb',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
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

        expect(pointEquals(chart.convertToPixel('geo', [5000, 3000]), [width, height])).toEqual(true);
        expect(pointEquals(chart.convertToPixel({geoIndex: 1}, [500, 800]), [width, 0])).toEqual(true);
        expect(pointEquals(chart.convertToPixel({geoId: 'bb'}, [200, 300]), [0, height])).toEqual(true);
        expect(pointEquals(chart.convertToPixel({seriesIndex: 0}, [200, 800]), [0, 0])).toEqual(true);
        expect(pointEquals(chart.convertToPixel({seriesId: 'k2'}, [2000, 8000]), [0, 0])).toEqual(true);
    });

});