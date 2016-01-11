<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <script src="lib/dat.gui.min.js"></script>
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
                'echarts/chart/pie',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/tooltip',
                'echarts/component/toolbox'
            ], function (echarts) {

                var chart = echarts.init(document.getElementById('main'));

                var itemStyle = {
                    normal: {
                        // shadowBlur: 10,
                        // shadowOffsetX: 0,
                        // shadowOffsetY: 5,
                        // shadowColor: 'rgba(0, 0, 0, 0.4)'
                    }
                };

                chart.setOption({
                    legend: {
                        data:['直接访问','邮件营销','联盟广告','视频广告','搜索引擎']
                    },
                    toolbox: {
                        left: 'left',
                        feature: {
                            dataView: {},
                            saveAsImage: {}
                        }
                    },
                    tooltip: {},
                    series: [{
                        name: 'pie',
                        type: 'pie',
                        selectedMode: 'single',
                        selectedOffset: 30,
                        clockwise: true,
                        data:[
                            {value:335, name:'直接访问'},
                            {value:310, name:'邮件营销'},
                            {value:234, name:'联盟广告'},
                            {value:135, name:'视频广告'},
                            {value:1548, name:'搜索引擎'}
                        ],
                        itemStyle: itemStyle
                    }]
                });

                var config = {
                    labelPosition: 'outside',
                    clockwise: true,
                    labelLineLen: 20,
                    labelLineLen2: 5
                };

                function update() {
                    chart.setOption({
                        series: [{
                            name: 'pie',
                            clockwise: config.clockwise,
                            label: {
                                normal: {
                                    position: config.labelPosition
                                }
                            },
                            labelLine: {
                                normal: {
                                    length: config.labelLineLen,
                                    length2: config.labelLineLen2
                                }
                            }
                        }]
                    });
                }

                var gui = new dat.GUI();
                gui.add(config, 'clockwise')
                    .onChange(update);
                gui.add(config, 'labelPosition', ['inside', 'outside'])
                    .onChange(update);
                gui.add(config, 'labelLineLen', 0, 100)
                    .onChange(update);
                gui.add(config, 'labelLineLen2', 0, 100)
                    .onChange(update);
            })

        </script>
    </body>
</html>