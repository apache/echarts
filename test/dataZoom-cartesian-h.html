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
                'echarts/chart/bar',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/axis',
                'echarts/component/dataZoom',
                'echarts/component/tooltip',
                'echarts/component/markPoint',
                'echarts/component/markLine'
            ], function (echarts) {

                chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                var xAxisData = [];
                var data1 = [];
                var data2 = [];
                var data3 = [];

                for (var i = 0; i < 200; i++) {
                    xAxisData.push('类目' + i);
                    if (Math.random() < 0.03) {
                        data1.push('-');
                        data2.push('-');
                        data3.push('-');
                    }
                    else {
                        data1.push((Math.random() + 0.1).toFixed(2));
                        data2.push(Math.random().toFixed(2));
                        data3.push(Math.random().toFixed(2));
                    }
                }

                chart.setOption({
                    legend: {
                        data: ['bar', 'bar2', 'bar3']
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    yAxis: {
                        // data: ['类目1', '类目2', '类目3', '类目4', '类目5',]
                        data: xAxisData,
                        boundaryGap: false
                    },
                    xAxis: {
                        // inverse: true,
                        // scale: true
                    },
                    series: [
                        {
                            name: 'bar2',
                            type: 'bar',
                            stack: 'all',
                            data: data2,
                            smooth: true
                        },
                        {
                            name: 'bar3',
                            type: 'bar',
                            stack: 'all',
                            data: data3,
                            smooth: 0.1
                        },
                        {
                            name: 'bar',
                            type: 'bar',
                            data: data1,
                            smooth: true,
                            stack: 'all',
                            itemStyle: {
                                normal: {
                                    areaStyle: {}
                                }
                            },
                            markPoint: {
                                data: [{
                                    type: 'max'
                                }]
                            },
                            markLine: {
                                data: [
                                    [{
                                        type: 'average'
                                    }, {
                                        type: 'max'
                                    }]
                                ]
                            }
                        }
                    ],
                    dataZoom: {
                        show: true,
                        end: 30,
                        borderColor: 'rgba(0,0,0,0.15)',
                        backgroundColor: 'rgba(200,200,200,0)',
                        yAxisIndex: 0
                    }
                });
            })

        </script>
    </body>
</html>