<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Option View</title>
    <script src="esl.js"></script>
    <script src="config.js"></script>
    <style type="text/css">
        body {
            margin: 0;
        }
        html, body, #option-view-chart {
            height: 100%;
        }
    </style>
</head>
<body>

    <div id="option-view-chart"></div>
    <script src="./lib/jquery.min.js"></script>

    <script>

        var echarts;
        var formatUtil;
        var chart;

        require([
            'echarts',
            'echarts/util/format',
            'echarts/component/tooltip',
            'echarts/component/legend',
            'echarts/chart/treemap'
        ], function (ec, format) {
            echarts = ec;
            formatUtil = format;

            chart = echarts.init($('#option-view-chart')[0]);
            chart.showLoading();

            $.getJSON('./data/option-view.json', initEcharts);
        });

        function convert(source, target, basePath) {
            for (var key in source) {
                var path = basePath ? (basePath + '.' + key) : key;
                if (key.match(/^\$/)) {

                }
                else {
                    target.children = target.children || [];
                    var child = {
                        name: path
                    };
                    target.children.push(child);
                    convert(source[key], child, path);
                }
            }

            target.value = source.$count || 1;
        }

        function initEcharts(rawData) {
            chart.hideLoading();

            var data = {};

            convert(rawData, data, '');

            chart.setOption({
                title: {
                    text: '配置项查询分布',
                    left: 'center'
                },
                tooltip: {},
                series: [{
                    name: 'option',
                    type: 'treemap',
                    visibleMin: 300,
                    // animationDurationUpdate: 2000,
                    // data: data.children,
                    data: [
                        {
                            name: 'a',
                            value: 10,
                            children: [
                                {
                                    name: 'a1',
                                    value: 11,
                                    children: [
                                        {
                                            name: 'a11',
                                            value: 111,
                                        },
                                        {
                                            name: 'a111',
                                            value: 1111
                                        },
                                        {
                                            name: 'a112',
                                            value: 1111
                                        },
                                        {
                                            name: 'a113',
                                            value: 111
                                        },
                                        {
                                            name: 'a114',
                                            value: 111
                                        },
                                        {
                                            name: 'a115',
                                            value: 1100
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            name: 'b',
                            value: 6,
                            children: [
                                {
                                    name: 'b1',
                                    value: 15,
                                    chidren: [
                                        {
                                            name: 'b11',
                                            value: 120
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    leafDepth: 1,
                    nodeClick: 'link',
                    itemStyle: {
                        // normal: {
                        //     gapWidth: 1,
                        //     borderWidth: 1
                        // }
                    },
                    levels: [
                        {
                            itemStyle: {
                                normal: {
                                    borderColor: '#333',
                                    borderWidth: 4,
                                    gapWidth: 2
                                }
                            }
                        },
                        {
                            itemStyle: {
                                normal: {
                                    borderColor: '#aaa',
                                    gapWidth: 2,
                                    borderWidth: 2
                                }
                            },
                            colorSaturation: [0.2, 0.7]
                        }
                    ]
                }]
            });
        }

        $(window).resize(function () {
            chart && chart.resize();
        })
    </script>
</body>
</html>