<html>
    <head>
        <meta charset="utf-8">
        <script src="./esl.js"></script>
        <script src="./config.js"></script>
        <link rel="stylesheet" href="./reset.css">
    </head>
    <body>
        <style>
            body {
                background: #000;
                width: 100%;
                height: 100%;
                margin: 0;
            }
            #chart1, #chart2 {
                width: 50%;
                height: 100%;
                float: left;
            }
        </style>
        <div id="main">
            <div id="chart1"></div>
            <div id="chart2"></div>
        </div>

        <script>

            // Schema:
            // date,AQIindex,PM2.5,PM10,CO,NO2,SO2
            var schema = [
                {name: 'date', index: 0, text: '日'},
                {name: 'AQIindex', index: 1, text: 'AQI指数'},
                {name: 'PM25', index: 2, text: 'PM2.5'},
                {name: 'PM10', index: 3, text: 'PM10'},
                {name: 'CO', index: 4, text: '一氧化碳（CO）'},
                {name: 'NO2', index: 5, text: '二氧化氮（NO2）'},
                {name: 'SO2', index: 6, text: '二氧化硫（SO2）'}
            ];

            require([
                'data/aqi/BJdata',
                'data/aqi/GZdata',
                'data/aqi/SHdata',
                'echarts',
                'echarts/chart/scatter',
                'echarts/component/legend',
                'echarts/component/tooltip',
                'echarts/component/grid',
                'echarts/component/visualMapContinuous'
            ], function (dataBJ, dataGZ, dataSH, echarts) {

                var chart1 = echarts.init(document.getElementById('chart1'));
                var chart2 = echarts.init(document.getElementById('chart2'));

                var option1 = makeChartOption();
                var option2 = makeChartOption();
                option1.visualMap.inRange = {
                    symbolSize: [10, 70]
                };
                option1.visualMap.outOfRange = {
                    symbolSize: [10, 70],
                    color: ['rgba(255,255,255,.2)']
                };
                option1.visualMap.dimension = 'z';
                option1.visualMap.max = 250;

                option2.visualMap.inRange = {
                    colorLightness: [1, 0.5]
                };
                option2.visualMap.outOfRange = {
                    color: ['rgba(255,255,255,.2)']
                };
                option2.visualMap.dimension = 'z';
                option2.visualMap.max = 250;

                chart1.setOption(option1);
                chart2.setOption(option2);

                echarts.connect([chart1, chart2]);

                function makeChartOption(legend) {
                    var itemStyle = {
                        normal: {
                            opacity: 0.8,
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowOffsetY: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    };

                    return {
                        color: [
                            '#dd4444', '#fec42c', '#80F1BE'
                        ],
                        legend: {
                            top: 'top',
                            data: ['北京', '上海', '广州'],
                            textStyle: {
                                color: '#fff',
                                fontSize: 20
                            }
                        },
                        grid: {
                            left: '10%',
                            right: 200,
                            top: '15%',
                            bottom: '10%'
                        },
                        tooltip: {
                            padding: 10,
                            backgroundColor: '#222',
                            borderColor: '#777',
                            borderWidth: 1,
                            formatter: function (obj) {
                                var value = obj.value;
                                return '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 18px;padding-bottom: 7px;margin-bottom: 7px">'
                                    + obj.seriesName + ' ' + value[0] + '日：'
                                    + value[7]
                                    + '</div>'
                                    + schema[1].text + '：' + value[1] + '<br>'
                                    + schema[2].text + '：' + value[2] + '<br>'
                                    + schema[3].text + '：' + value[3] + '<br>'
                                    + schema[4].text + '：' + value[4] + '<br>'
                                    + schema[5].text + '：' + value[5] + '<br>'
                                    + schema[6].text + '：' + value[6] + '<br>';
                            }
                        },
                        xAxis: {
                            type: 'value',
                            name: '日期',
                            nameGap: 16,
                            nameTextStyle: {
                                color: '#fff',
                                fontSize: 14
                            },
                            max: 31,
                            splitLine: {
                                show: false
                            },
                            axisTick: {
                                lineStyle: {
                                    color: '#777'
                                }
                            },
                            axisLabel: {
                                formatter: '{value}',
                                textStyle: {
                                    color: '#fff'
                                }
                            }
                        },
                        yAxis: {
                            type: 'value',
                            name: 'AQI指数',
                            nameLocation: 'end',
                            nameGap: 20,
                            nameTextStyle: {
                                color: '#fff',
                                fontSize: 20
                            },
                            axisTick: {
                                lineStyle: {
                                    color: '#777'
                                }
                            },
                            splitLine: {
                                show: false
                            },
                            axisLabel: {
                                textStyle: {
                                    color: '#fff'
                                }
                            }
                        },
                        visualMap: {
                            left: 'right',
                            top: 'top',
                            min: 0,
                            itemWidth: 30,
                            itemHeight: 130,
                            calculable: true,
                            precision: 0.1,
                            text: ['圆形大小：PM2.5'],
                            textGap: 30,
                            textStyle: {
                                color: '#fff'
                            },
                            inRange: {
                                symbolSize: [10, 70]
                            },
                            outOfRange: {
                                symbolSize: [10, 70],
                                color: ['rgba(255,255,255,.2)']
                            },
                            controller: {
                                outOfRange: {
                                    color: ['#444']
                                }
                            }
                        },
                        series: [
                            {
                                name: '北京',
                                type: 'scatter',
                                itemStyle: itemStyle,
                                symbolSize: 20,
                                data: dataBJ
                            },
                            {
                                name: '上海',
                                type: 'scatter',
                                itemStyle: itemStyle,
                                symbolSize: 20,
                                data: dataSH
                            },
                            {
                                name: '广州',
                                type: 'scatter',
                                itemStyle: itemStyle,
                                symbolSize: 20,
                                data: dataGZ
                            }
                        ]
                    };
                }
            });
        </script>
    </body>
</html>