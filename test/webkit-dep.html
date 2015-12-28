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

                'echarts/chart/graph',

                'echarts/component/title',
                'echarts/component/legend',
                'echarts/component/geo',
                'echarts/component/tooltip',
                'echarts/component/visualMap'
            ], function (echarts) {

                $.get('data/webkit-dep.json', function (webkitDep) {
                    var chart = echarts.init(document.getElementById('main'));

                    chart.setOption({
                        legend: {
                            data: ['HTMLElement', 'WebGL', 'SVG', 'CSS', 'Other']
                        },
                        series: [{
                            type: 'graph',
                            layout: 'force',
                            animation: false,
                            label: {
                                normal: {
                                    position: 'right',
                                    formatter: '{b}'
                                }
                            },
                            draggable: true,
                            data: webkitDep.nodes.map(function (node, idx) {
                                node.id = idx;
                                return node;
                            }),
                            categories: webkitDep.categories,
                            force: {
                                // initLayout: 'circular'
                                // gravity: 0
                                // repulsion: 20,
                                edgeLength: 5,
                                repulsion: 20
                            },
                            edges: webkitDep.links
                        }]
                    });
                });
            });
        </script>
    </body>
</html>