<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <style>
            html, body {
                width: 100%;
                height: 100%;
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
                'echarts/component/tooltip'
            ], function (echarts) {

                var itemStyle = {
                    normal: {
                        label: {
                            show: false,
                            position: 'outside'
                        }
                    },
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0,
                        shadowColor: 'rgba(0,0,0,0.5)'
                    }
                };
                console.profile('setOption');

                var main = document.getElementById('main');
                for (var i = 0; i < 100; i++) {
                    var div = document.createElement('div');
                    div.style.cssText = 'width: 400px; height:200px;';
                    main.appendChild(div);
                    var chart = echarts.init(div, null, {
                        renderer: 'canvas'
                    });

                    var xAxisData = [];
                    var data1 = [];
                    var data2 = [];
                    var data3 = [];
                    var data4 = [];

                    for (var j = 0; j < 10; j++) {
                        xAxisData.push('类目' + j);
                        data1.push((Math.random() * 5).toFixed(2));
                        data2.push(-Math.random().toFixed(2));
                        data3.push((Math.random() + 0.5).toFixed(2));
                        data4.push((Math.random() + 0.3).toFixed(2));
                    }

                    chart.setOption({
                        animation: false,
                        // legend: {
                        //     data: [{
                        //         name: 'bar'
                        //     }, 'bar2', 'bar3', 'bar4'],
                        //     selected: {
                        //         // 'bar': false
                        //     },
                        //     orient: 'vertical',
                        //     x: 'right',
                        //     y: 'bottom',
                        //     align: 'right'
                        // },
                        tooltip: {},
                        xAxis: {
                            data: xAxisData,
                            axisLine: {
                                onZero: true
                            },
                            splitLine: {
                                show: false
                            },
                            splitArea: {
                                show: false
                            }
                        },
                        yAxis: {
                            inverse: true,
                            splitArea: {
                                show: false
                            }
                        },
                        series: [{
                            name: 'bar',
                            type: 'bar',
                            stack: 'one',
                            itemStyle: itemStyle,
                            data: data1
                        }, {
                            name: 'bar2',
                            type: 'bar',
                            stack: 'one',
                            itemStyle: itemStyle,
                            data: data2
                        }, {
                            name: 'bar3',
                            type: 'bar',
                            stack: 'two',
                            itemStyle: itemStyle,
                            data: data3
                        }, {
                            name: 'bar4',
                            type: 'bar',
                            stack: 'two',
                            itemStyle: itemStyle,
                            data: data4
                        }]
                    });
                }
                console.profileEnd('setOption');
            })

        </script>
    </body>
</html>