<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <script src="lib/jquery.min.js"></script>
    </head>
    <body>
        <style>
            html, body, #main {
                width: 100%;
                height: 100%;
                margin: 0;
            }
        </style>
        <div id="main"></div>
        <script>

            require([
                'echarts',
                'echarts/component/grid',
                'echarts/chart/graph',
                'echarts/component/title',
                'echarts/component/legend',
                'echarts/component/tooltip',
                'echarts/component/toolbox',
                'echarts/component/dataZoomInside',
                'zrender/vml/vml',

                'theme/vintage'
            ], function (echarts) {

                var chart = echarts.init(document.getElementById('main'), 'vintage');


                var axisData = ['周一','周二','周三','周四','周五','周六','周日'];
                var data = axisData.map(function (item, i) {
                    return Math.round(Math.random() * 1000 * (i + 1));
                });
                var links = data.map(function (item, i) {
                    return {
                        source: i,
                        target: i + 1
                    };
                });
                links.pop();
                var option = {
                    tooltip: {},
                    xAxis: {
                        type : 'category',
                        boundaryGap : false,
                        data : axisData
                    },
                    yAxis: {
                        type : 'value'
                    },
                    toolbox: {
                        feature: {
                            dataZoom: {
                                yAxisIndex: false
                            }
                        }
                    },
                    dataZoom: {
                        type: 'inside'
                    },
                    series: [
                        {
                            type: 'graph',
                            layout: 'none',
                            coordinateSystem: 'cartesian2d',
                            symbolSize: 40,
                            label: {
                                normal: {
                                    show: true
                                }
                            },
                            edgeSymbol: ['circle', 'arrow'],
                            edgeSymbolSize: [4, 10],
                            data: data,
                            links: links
                        }
                    ]
                };

                chart.setOption(option);
            });
        </script>
    </body>
</html>