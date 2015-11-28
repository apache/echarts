({
    // appDir: './',
    // baseUrl: '../src',
    optimize: 'none',
    name: 'echarts',
    packages: [
        {
            name: 'zrender',
            location: '../../zrender-dev3.0/src',
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

        'echarts/component/geo',
        'echarts/component/parallel',

        'echarts/component/title',

        'echarts/component/dataZoom',
        'echarts/component/dataRange',

        'echarts/component/markPoint',
        'echarts/component/markLine',

        'echarts/parser/gexf',
        'echarts/scale/Time',
        'echarts/scale/Log'
    ],
    out: '../dist/echarts.js'
})