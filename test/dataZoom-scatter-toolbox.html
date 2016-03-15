<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <style>
            html, body, #main {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
            }
        </style>
        <div id="main"></div>
        <script>


            require([
                'echarts',
                'echarts/chart/scatter',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/tooltip',
                'echarts/component/toolbox',
                'echarts/component/dataZoom'
            ], function (echarts) {

                chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                var data1 = [];
                var data2 = [];
                var data3 = [];

                var random = function (max) {
                    return (Math.random() * max).toFixed(3);
                };

                for (var i = 0; i < 100; i++) {
                    data1.push([random(15), random(10), random(1)]);
                    // data1.push([i, 10, i]);
                    data2.push([random(10), random(10), random(1)]);
                    data3.push([random(15), random(10), random(1)]);
                }

                // console.profile('setOption');

                chart.setOption({
                    animation: false,
                    legend: {
                        data: ['scatter', 'scatter2', 'scatter3']
                    },
                    toolbox: {
                        // y: 'bottom',
                        feature: {
                            dataView: {},
                            dataZoom: {show: true},
                            restore: {show: true},
                            saveAsImage: {}
                        }
                    },
                    tooltip: {
                    },
                    xAxis: {
                        type: 'value',
                        min: 'dataMin',
                        max: 'dataMax',
                        splitLine: {
                            show: true
                        }
                    },
                    yAxis: {
                        type: 'value',
                        min: 'dataMin',
                        max: 'dataMax',
                        splitLine: {
                            show: true
                        }
                    },
                    dataZoom: [
                        {
                            show: true,
                            xAxisIndex: [0],
                            start: 10,
                            end: 70
                        },
                        {
                            show: true,
                            yAxisIndex: [0],
                            start: 0,
                            end: 20
                        },
                        {
                            type: 'inside',
                            xAxisIndex: [0],
                            start: 10,
                            end: 70
                        },
                        {
                            type: 'inside',
                            yAxisIndex: [0],
                            start: 0,
                            end: 20
                        }
                    ],
                    series: [
                        {
                            name: 'scatter',
                            type: 'scatter',
                            itemStyle: {
                                normal: {
                                    opacity: 0.8,
                                    // shadowBlur: 10,
                                    // shadowOffsetX: 0,
                                    // shadowOffsetY: 0,
                                    // shadowColor: 'rgba(0, 0, 0, 0.5)'
                                }
                            },
                            symbolSize: function (val) {
                                return val[2] * 40;
                            },
                            data: data1
                        },
                        {
                            name: 'scatter2',
                            type: 'scatter',
                            itemStyle: {
                                normal: {
                                    opacity: 0.8
                                }
                            },
                            symbolSize: function (val) {
                                return val[2] * 40;
                            },
                            data: data2
                        },
                        {
                            name: 'scatter3',
                            type: 'scatter',
                            itemStyle: {
                                normal: {
                                    opacity: 0.8,
                                }
                            },
                            symbolSize: function (val) {
                                return val[2] * 40;
                            },
                            data: data3
                        }
                    ]
                });
                // console.profileEnd('setOption');
            })

            window.onresize = function () {
                chart.resize();
            };

        </script>

        <!-- // <script src="js/memory-stats.js"></script> -->
        <!-- // <script src="js/memory.js"></script> -->
    </body>
</html>