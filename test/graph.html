<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <script src="lib/jquery.min.js"></script>
        <script src="lib/dat.gui.min.js"></script>
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

                'extension/dataTool/gexf',

                'echarts/chart/graph',

                'echarts/component/title',
                'echarts/component/legend',
                'echarts/component/geo',
                'echarts/component/tooltip',
                'echarts/component/visualMap',

                'theme/vintage'
            ], function (echarts, gexf) {

                var chart = echarts.init(document.getElementById('main'), 'vintage', {
                    renderer: 'canvas'
                });

                $.get('./data/les-miserables.gexf', function (xml) {
                    var graph = gexf.parse(xml);
                    var categories = [];
                    for (var i = 0; i < 9; i++) {
                        categories[i] = {
                            name: '类目' + i
                        };
                    }
                    graph.nodes.forEach(function (node) {
                        delete node.itemStyle;
                        node.value = node.symbolSize;
                        node.label = {
                            normal: {
                                show: node.symbolSize > 30
                            }
                        };
                        node.category = node.attributes['modularity_class'];
                    });
                    graph.links.forEach(function (link) {
                        delete link.lineStyle;
                    });
                    var option = {
                        tooltip: {},
                        legend: [{
                            // selectedMode: 'single',
                            data: categories.map(function (a) {
                                return a.name;
                            })
                        }],
                        // visualMap: {
                        //     max: 100,
                        //     inRange: {
                        //         colorSaturation: [1, 0.3]
                        //     }
                        // },
                        animationDurationUpdate: 1500,
                        animationEasingUpdate: 'quinticInOut',
                        series : [
                            {
                                name: 'Les Miserables',
                                type: 'graph',
                                layout: 'none',
                                data: graph.nodes,
                                links: graph.links,
                                categories: categories,
                                roam: true,
                                draggable: true,
                                // edgeSymbol: ['none', 'arrow'],
                                // scaleLimit: {
                                //     min: 1.5,
                                //     max: 2
                                // },
                                label: {
                                    normal: {
                                        position: 'right',
                                        formatter: '{b}'
                                    }
                                },
                                lineStyle: {
                                    normal: {
                                        curveness: 0.3
                                    }
                                }
                            }
                        ]
                    };

                    chart.setOption(option);

                    var config = {
                        layout: 'none'
                    };

                    chart.on('click', function (params) {
                        console.log(params, params.data);
                    });

                    var gui = new dat.GUI();
                    gui.add(config, 'layout', ['none', 'circular'])
                        .onChange(function (value) {
                            chart.setOption({
                                series: [{
                                    name: 'Les Miserables',
                                    layout: value
                                }]
                            });
                        });
                });
            });
        </script>
    </body>
</html>