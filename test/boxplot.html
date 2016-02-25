<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="reset.css"/>
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <script src="lib/facePrint.js"></script>
    </head>
    <body>
        <style>
            #main {
                width: 900px;
                height: 650px;
                border: 9px solid #eee;
            }
        </style>
        <div id="info"></div>
        <div id="main"></div>
        <script>

            /**
             * @see <https://en.wikipedia.org/wiki/Michelson%E2%80%93Morley_experiment>
             * @see <http://bl.ocks.org/mbostock/4061502>
             */
            var chart;
            var data;
            var mean;

            require([
                'echarts',
                'data/Michelson-Morley.json',
                'extension/dataTool/prepareBoxplotData',
                'zrender/core/env',
                'echarts/chart/boxplot',
                'echarts/chart/scatter',
                'echarts/component/title',
                'echarts/component/legend',
                'echarts/component/markLine',
                'echarts/component/markPoint',
                'echarts/component/grid',
                'echarts/component/tooltip',
                'zrender/vml/vml'
            ], function (echarts, rawData, prepareBoxplotData, env) {

                chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                update('horizontal');
                // update('vertical');

                initControlPanel(env);

                function update(layout) {

                    data = prepareBoxplotData(rawData, {
                        layout: layout
                    });
                    mean = calculateMean(rawData);

                    var categoryAxis = {
                        type: 'category',
                        data: data.axisData,
                        boundaryGap: true,
                        nameGap: 30,
                        splitArea: {
                            show: false
                        },
                        axisLabel: {
                            formatter: 'expr {value}'
                        },
                        splitLine: {
                            show: false
                        }
                    };
                    var valueAxis = {
                        type: 'value',
                        name: 'km/s minus 299,000',
                        splitArea: {
                            show: true
                        }
                    };

                    chart.setOption({
                        title: [
                            {
                                text: 'Michelson-Morley Experiment',
                                left: 'center'
                            },
                            {
                                text: 'upper: Q3 + 1.5 * IRQ \nlower: Q1 - 1.5 * IRQ',
                                borderColor: '#999',
                                borderWidth: 1,
                                textStyle: {
                                    fontSize: 14
                                },
                                left: '10%',
                                top: '90%'
                            }
                        ],
                        legend: {
                            data: ['line', 'line2', 'line3']
                        },
                        tooltip: {
                            trigger: 'item',
                            axisPointer: {
                                type: 'shadow'
                            }
                        },
                        grid: {
                            left: '10%',
                            right: '10%',
                            bottom: '15%'
                        },
                        xAxis: layout === 'horizontal' ? categoryAxis : valueAxis,
                        yAxis: layout === 'vertical' ? categoryAxis : valueAxis,
                        series: [
                            {
                                name: 'boxplot',
                                type: 'boxplot',
                                data: data.boxData,
                                tooltip: {
                                    formatter: function (param) {
                                        return [
                                            'Experiment ' + param.name + ': ',
                                            'upper: ' + param.data[0],
                                            'Q1: ' + param.data[1],
                                            'median: ' + param.data[2],
                                            'Q3: ' + param.data[3],
                                            'lower: ' + param.data[4]
                                        ].join('<br/>')
                                    }
                                },

                                markPoint: {
                                    data: [
                                        {
                                            name: '某个坐标',
                                            coord: [2, 300]
                                        },
                                        {
                                            name: '某个屏幕坐标',
                                            x: 100,
                                            y: 200,
                                            label: {
                                                normal: {
                                                    show: false,
                                                    formatter: 'asdf'
                                                },
                                                emphasis: {
                                                    show: true,
                                                    position: 'top',
                                                    formatter: 'zxcv'
                                                }
                                            }
                                        },
                                        {
                                            name: 'max value (default)',
                                            type: 'max'
                                        },
                                        {
                                            name: 'min value (default)',
                                            type: 'min'
                                        },
                                        {
                                            name: 'max value (dim:Q1)',
                                            type: 'max',
                                            valueDim: 'Q1'
                                        },
                                        {
                                            name: 'average value (dim:Q1)',
                                            type: 'average',
                                            valueDim: 'Q1'
                                        }
                                    ]
                                },

                                markLine: {
                                    data: [
                                        [
                                            {name: '两个坐标之间的标线', coord: [1, 240]},
                                            {coord: [2, 260]}
                                        ],
                                        [
                                            {name: '两个屏幕坐标之间的标线', x: 50, y: 60},
                                            {x: 70, y: 90}
                                        ],
                                        [
                                            {name: 'max - min', type: 'max'},
                                            {type: 'min'}
                                        ],
                                        {
                                            name: 'min line',
                                            type: 'min'
                                        },
                                        {
                                            name: 'max line on dim:Q3',
                                            type: 'max',
                                            valueDim: 'Q3'
                                        }
                                    ]
                                }

                            },
                            {
                                name: 'outlier',
                                type: 'scatter',
                                data: data.outliers
                            }
                        ]
                    });
                }

                function calculateMean(rawData) {
                    var sum = 0;
                    var count = 0;
                    for (var i = 0, len = rawData.length; i < len; i++) {
                        for (var j = 0, lenj = rawData[i].length; j < lenj; j++) {
                            var value = rawData[i][j];
                            count++;
                            if (!isNaN(value) && value != null && value !== '') {
                                sum += value;
                            }
                        }
                    }
                    return sum / count;
                };


                function initControlPanel(env) {
                    if (!env.browser.ie || env.browser.ie.version > 8) {

                        var scr = document.createElement('script');
                        scr.src = 'lib/dat.gui.min.js';
                        scr.onload = function () {
                            var gui = new dat.GUI();
                            var config = {
                                layout: 'horizontal'
                            };
                            gui
                                .add(config, 'layout', ['horizontal', 'vertical'])
                                .onChange(update);
                        };
                        document.head.appendChild(scr);
                    }
                }
            });

        </script>
    </body>
</html>