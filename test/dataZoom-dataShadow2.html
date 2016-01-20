<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
    </head>
    <body>
        <style>
            html, body, #main {
                width: 100%;
                height: 100%;
            }
            body {
                margin: 0;
            }
        </style>
        <div id="main"></div>
        <script>

            require([
                'echarts',
                'echarts/chart/line',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/axis',
                'echarts/component/dataZoom',
                'echarts/component/tooltip',
                'echarts/component/markPoint',
                'echarts/component/markLine'
            ], function (echarts) {

                var chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                var xAxisData = [];
                var data1dim = [];
                var data2dim = [];

                var offset = 50;

                for (var i = 0; i < 200; i++) {
                    xAxisData.push('类目' + i);
                    if (i < 150) {
                        var v = Math.log(i + 4) + offset;
                        data1dim.push(v);
                        // data2dim.push([i, v]);
                        data2dim.push([v, i]);
                    }
                    else {
                        var v = -Math.log(i + 19) + offset;
                        data1dim.push(v);
                        // data2dim.push([i, v]);
                        data2dim.push([v, i]);
                    }
                }

                chart.setOption({
                    animation: false,
                    legend: {
                        data: ['line', 'line2', 'line3']
                    },
                    tooltip: {

                    },
                    xAxis: {
                        // position: 'top',
                        type: 'value',
                        // data: xAxisData,
                        // boundaryGap: false
                    },
                    yAxis: {
                        type: 'value',
                        // inverse: true
                        // data: xAxisData
                    },
                    series: [
                        {
                            name: 'line2',
                            type: 'line',
                            stack: 'all',
                            symbol: 'none',
                            // data: data1dim,
                            data: data2dim,
                            itemStyle: {
                                normal: {
                                    areaStyle: {}
                                }
                            }
                        }
                    ],
                    dataZoom: [
                        {
                            show: true,
                            start: 60
                        },
                        {
                            show: true,
                            orient: 'vertical'
                        }
                    ]
                });
            })

        </script>
    </body>
</html>