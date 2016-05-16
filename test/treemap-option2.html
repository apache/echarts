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

            $.getJSON('./data/option-view2.json', initEcharts);
        });

        function initEcharts(rawData) {
            chart.hideLoading();

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

                if (!target.children) {
                    target.value = source.$count || 1;
                }
                else {
                    target.children.push({
                        name: basePath,
                        value: source.$count
                    });
                }
            }

            var data = [];

            convert(rawData, data, '');

            chart.setOption({
                title: {
                    text: 'ECharts 配置项查询分布',
                    subtext: '2016/04',
                    left: 'leafDepth'
                },
                tooltip: {},
                series: [{
                    name: 'option',
                    type: 'treemap',
                    visibleMin: 300,
                    data: data.children,
                    leafDepth: 2,
                    levels: [
                        {
                            itemStyle: {
                                normal: {
                                    borderColor: '#333',
                                    borderWidth: 1,
                                    gapWidth: 1
                                }
                            }
                        },
                        {
                            colorSaturation: [0.3, 0.6],
                            itemStyle: {
                                normal: {
                                    borderColor: '#fff',
                                    borderWidth: 1
                                }
                            }
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