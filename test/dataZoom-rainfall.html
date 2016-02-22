<html>
    <head>
        <meta charset="utf-8">
        <script src="./esl.js"></script>
        <script src="./config.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
                'echarts/chart/bar',
                'echarts/chart/line',
                'echarts/component/legend',
                'echarts/component/tooltip',
                'echarts/component/grid',
                'echarts/component/axis',
                'echarts/component/dataZoom'
            ], function (data, echarts) {

                chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
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
                    grid: {
                        show: true,
                        borderColor: '#ccc',
                        borderWidth: 1,
                        right: '15%'
                    },
                    xAxis: [
                        {
                            // data: ['类目1', '类目2', '类目3', '类目4', '类目5',]
                            // data: xAxisData,
                            type: 'category',
                            boundaryGap: true,
                            // splitLine: {show: false},
                            axisLabel: {show: true},
                            axisLine: {show: true},
                            data: data.category
                        }
                    ],
                    yAxis: [
                        {
                            // scale: true
                            boundaryGap: false,
                            splitLine: {show: false},
                            axisLabel: {
                            },
                            axisLine: {
                                lineStyle: {
                                    color: '#666'
                                }
                            }
                        },
                        {
                            // scale: true
                            boundaryGap: false,
                            splitLine: {show: false},
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
                            }
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
                            }
                        },
                        {
                            name: '流量',
                            type: 'line',
                            data: data.flow,
                            yAxisIndex: 1,
                            itemStyle: {
                                normal: {
                                     areaStyle: {}
                                }
                            }
                        },
                        // {
                        //     name: 'bar3',
                        //     type: 'line',
                        //     data: data3
                        // }
                    ],
                    dataZoom: [
                        {
                            show: true,
                            orient: 'vertical',
                            filterMode: 'empty',
                            yAxisIndex: [0],
                            left: 10
                        },
                        {
                            show: true,
                            xAxisIndex: [0],
                            // realtime: false,
                        },
                        {
                            show: true,
                            orient: 'vertical',
                            filterMode: 'empty',
                            yAxisIndex: [1]
                        }
                    ]
                });
            })

        </script>
    </body>
</html>