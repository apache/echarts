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
        </style>
        <div id="main"></div>
        <script>

            require([
                'echarts',
                'echarts/chart/scatter',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/tooltip'
            ], function (echarts) {

                var chart = echarts.init(document.getElementById('main'));

                var data1 = [];
                var data2 = [];
                var data3 = [];

                var random = function (max) {
                    return (Math.random() * max).toFixed(3);
                }

                for (var i = 0; i < 30; i++) {
                    data1.push([random(5), random(5), random(2)]);
                    data2.push([random(10), random(10), random(2)]);
                    data3.push([random(15), random(10), random(2)]);
                }

                chart.setOption({
                    legend: {
                        data: ['scatter', 'scatter2', 'scatter3']
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'cross'
                        },
                        position: 'top'
                    },
                    xAxis: {
                        type: 'value',
                        splitLine: {
                            show: false
                        },
                        min: 0,
                        max: 15,
                        splitNumber: 30
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: {
                            show: false
                        }
                    },
                    series: [{
                        name: 'scatter',
                        type: 'scatter',
                        label: {
                            emphasis: {
                                show: true
                            }
                        },
                        // symbol: 'diamond',
                        symbolSize: function (val) {
                            return val[2] * 40;
                        },
                        data: data1
                    }, {
                        name: 'scatter2',
                        type: 'scatter',
                        label: {
                            emphasis: {
                                show: true
                            }
                        },
                        symbolSize: function (val) {
                            return val[2] * 40;
                        },
                        data: data2
                    }, {
                        name: 'scatter3',
                        type: 'scatter',
                        label: {
                            emphasis: {
                                show: true
                            }
                        },
                        symbolSize: function (val) {
                            return val[2] * 40;
                        },
                        data: data3
                    }]
                });

                var count = 0;
                setInterval(function () {
                    chart.dispatchAction({
                        type: 'showTip',
                        // seriesIndex: 0,
                        dataIndex: (count++) % data1.length
                    });
                }, 1000);
            });

        </script>
    </body>
</html>