({
    baseUrl: '../',
    optimize: 'none',
    name: 'echarts',
    packages: [
        {
            name: 'zrender',
            location: '../../zrender/src',
            main: 'zrender'
        },
        {
            name: 'echarts',
            location: '../src',
            main: 'echarts'
        }
    ],
    include:[
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/component/grid',
        'echarts/chart/pie',
        'echarts/chart/scatter',
        'echarts/component/tooltip',
        'echarts/component/polar',
        'echarts/chart/radar',

        'echarts/component/legend',

        'echarts/chart/map',
        'echarts/chart/treemap',
        'echarts/chart/graph',
        'echarts/chart/gauge',
        'echarts/chart/funnel',
        'echarts/chart/parallel',
        'echarts/chart/sankey',
        'echarts/chart/boxplot',
        'echarts/chart/candlestick',
        'echarts/chart/effectScatter',
        'echarts/chart/lines',
        'echarts/chart/heatmap',

        'echarts/component/geo',
        'echarts/component/parallel',

        'echarts/component/title',

        'echarts/component/dataZoom',
        'echarts/component/visualMap',

        'echarts/component/markPoint',
        'echarts/component/markLine',

        'echarts/component/timeline',
        'echarts/component/toolbox',

        'zrender/vml/vml'
    ],
    out: '../../dist/echarts.js'
})