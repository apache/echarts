<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="./esl.js"></script>
        <script src="./config.js"></script>
        <script src="./lib/facePrint.js"></script>
    </head>
    <body>
        <style>
            html,
            body,
            #main {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
            }
        </style>
        <div id="main"></div>
        <script>

            require([
                'data/rainfall.json',
                'echarts',
                'zrender/vml/vml',
                'echarts/chart/bar',
                'echarts/chart/line',
                'echarts/component/legend',
                'echarts/component/tooltip',
                'echarts/component/grid',
                'echarts/component/axis',
                'echarts/component/dataZoomInside'
            ], function (data, echarts) {


                var chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                chart.showLoading({
                    text : '正在读取数据中...'
                });

                var xAxisData = [];
                var data1 = [];
                var data2 = [];
                var data3 = [];

                for (var i = 0; i < 20; i++) {
                    xAxisData.push('类目' + i);
                    data1.push(Math.random() * 2);
                    data2.push(Math.random() * 2);
                    data3.push(Math.random() * 2);
                }

                chart.setOption({
                    tooltip: {
                        trigger: 'axis',
                    },
                    legend: {
                        data: ['降水量', '流量']
                    },
                    grid: [
                        {
                            show: true,
                            borderWidth: 0,
                            right: '15%',
                            bottom: '53%'
                        },
                        {
                            show: true,
                            borderWidth: 0,
                            right: '15%',
                            top: '53%'
                        }
                    ],
                    xAxis: [
                        {
                            // data: ['类目1', '类目2', '类目3', '类目4', '类目5',]
                            // data: xAxisData,
                            type: 'category',
                            boundaryGap: true,
                            // splitLine: {show: false},
                            axisLabel: {show: true},
                            splitLine: {show: false},
                            axisLine: {
                                show: true,
                                // onZero: false
                            },
                            data: data.category,
                            gridIndex: 0
                        },
                        {
                            // data: ['类目1', '类目2', '类目3', '类目4', '类目5',]
                            // data: xAxisData,
                            type: 'category',
                            boundaryGap: true,
                            axisLabel: {show: true},
                            splitLine: {show: false},
                            axisLine: {
                                show: true,
                            },
                            data: data.category,
                            gridIndex: 1
                        }
                    ],
                    yAxis: [
                        {
                            boundaryGap: false,
                            axisLabel: {
                            },
                            axisLine: {
                                lineStyle: {
                                    color: '#666'
                                }
                            },
                            gridIndex: 0
                        },
                        {
                            boundaryGap: false,
                            position: 'right',
                            inverse: true,
                            axisLabel: {
                                textStyle: {
                                    color: '#666'
                                }
                            },
                            axisLine: {
                                lineStyle: {
                                    color: '#666'
                                }
                            },
                            gridIndex: 1
                        }
                    ],
                    series: [
                        {
                            name: '降水量',
                            type: 'line',
                            data: data.rainfall,
                            itemStyle: {
                                normal: {
                                     areaStyle: {}
                                }
                            },
                            xAxisIndex: 0,
                            yAxisIndex: 0,
                        },
                        {
                            name: '流量',
                            type: 'line',
                            data: data.flow,
                            itemStyle: {
                                normal: {
                                     areaStyle: {}
                                }
                            },
                            xAxisIndex: 1,
                            yAxisIndex: 1
                        }
                    ],
                    dataZoom: [
                        {
                            type: 'inside',
                            xAxisIndex: [0, 1],
                            start: 30,
                            end: 40
                        }
                    ]
                });

                chart.hideLoading();

            })

        </script>
    </body>
</html>