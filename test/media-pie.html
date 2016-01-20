<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <script src="lib/jquery.min.js"></script>
        <script src="lib/draggable.js"></script>
        <link rel="stylesheet" href="reset.css">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <style>
            body {
                position: absolute;
                left: 0;
                top: 0;
            }
            #main {
                position: absolute;
                top: 10px;
                left: 10px;
                width: 700px;
                height: 650px;
                background: #fff;
            }
        </style>
        <div id="main"></div>

        <script src="data/timelineGDP.js"></script>

        <script>


            require([
                'echarts',
                'echarts/chart/pie',
                'echarts/component/title',
                'echarts/component/legend',
                'echarts/component/tooltip'
            ], function (echarts) {

                chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                draggable.init(
                    document.getElementById('main'),
                    chart,
                    {throttle: 70}
                );




    option = {
        baseOption: {
            title : {
                text: '南丁格尔玫瑰图',
                subtext: '纯属虚构',
                x:'center'
            },
            tooltip : {
                trigger: 'item',
                formatter: "{a} <br/>{b} : {c} ({d}%)"
            },
            legend: {
                data:['rose1','rose2','rose3','rose4','rose5','rose6','rose7','rose8']
            },
            toolbox: {
                show : true,
                feature : {
                    mark : {show: true},
                    dataView : {show: true, readOnly: false},
                    magicType : {
                        show: true,
                        type: ['pie', 'funnel']
                    },
                    restore : {show: true},
                    saveAsImage : {show: true}
                }
            },
            calculable : true,
            series : [
                {
                    name:'半径模式',
                    type:'pie',
                    roseType : 'radius',
                    label: {
                        normal: {
                            show: false
                        },
                        emphasis: {
                            show: true
                        }
                    },
                    lableLine: {
                        normal: {
                            show: false
                        },
                        emphasis: {
                            show: true
                        }
                    },
                    data:[
                        {value:10, name:'rose1'},
                        {value:5, name:'rose2'},
                        {value:15, name:'rose3'},
                        {value:25, name:'rose4'},
                        {value:20, name:'rose5'},
                        {value:35, name:'rose6'},
                        {value:30, name:'rose7'},
                        {value:40, name:'rose8'}
                    ]
                },
                {
                    name:'面积模式',
                    type:'pie',
                    roseType : 'area',
                    data:[
                        {value:10, name:'rose1'},
                        {value:5, name:'rose2'},
                        {value:15, name:'rose3'},
                        {value:25, name:'rose4'},
                        {value:20, name:'rose5'},
                        {value:35, name:'rose6'},
                        {value:30, name:'rose7'},
                        {value:40, name:'rose8'}
                    ]
                }
            ]
        },
        media: [
            {
                option: {
                    legend: {
                        right: 'center',
                        bottom: 0,
                        orient: 'horizontal'
                    },
                    series: [
                        {
                            radius: [20, 110],
                            center: ['25%', 200]
                        },
                        {
                            radius: [30, 110],
                            center: ['75%', 200]
                        }
                    ]
                }
            },
            {
                query: {
                    minAspectRatio: 1
                },
                option: {
                    legend: {
                        right: 'center',
                        bottom: 0,
                        orient: 'horizontal'
                    },
                    series: [
                        {
                            radius: [20, 110],
                            center: ['25%', 200]
                        },
                        {
                            radius: [30, 110],
                            center: ['75%', 200]
                        }
                    ]
                }
            },
            {
                query: {
                    maxAspectRatio: 1
                },
                option: {
                    legend: {
                        right: 'center',
                        bottom: 0,
                        orient: 'horizontal'
                    },
                    series: [
                        {
                            radius: [20, 110],
                            center: [200, '30%']
                        },
                        {
                            radius: [30, 110],
                            center: [200, '70%']
                        }
                    ]
                }
            },
            {
                query: {
                    maxWidth: 500
                },
                option: {
                    legend: {
                        right: 10,
                        top: '15%',
                        orient: 'vertical'
                    },
                    series: [
                        {
                            radius: [20, 110],
                            center: [200, '30%']
                        },
                        {
                            radius: [30, 110],
                            center: [200, '75%']
                        }
                    ]
                }
            }
        ]
    };








                chart.setOption(option);

                chart.on('legendSelected', function () {
                });

                window.onresize = chart.resize;
            });
        </script>
    </body>
</html>