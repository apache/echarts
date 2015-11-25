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
        'echarts/component/legend',

        'echarts/chart/scatter',
        'echarts/chart/map',
        'echarts/chart/treemap',
        'echarts/chart/graph',
        'echarts/chart/gauge',
        'echarts/chart/funnel',
        'echarts/chart/parallel',

        'echarts/component/geo',
        'echarts/component/polar',
        'echarts/component/parallel',

        'echarts/component/title',

        'echarts/component/dataZoom',
        'echarts/component/tooltip',
        'echarts/component/dataRange',

        'echarts/component/markPoint',
        'echarts/component/markLine',

        'echarts/parser/gexf',
        'echarts/scale/Time',
        'echarts/scale/Log'
    ],
    out: '../dist/echarts.js'
})