{
    // appDir: './',
    // baseUrl: '../src',
    // optimize: 'none',
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
        'echarts/chart/scatter',
        'echarts/chart/pie',
        'echarts/chart/map',

        'echarts/component/geo',
        'echarts/component/grid',
        'echarts/component/polar',

        'echarts/component/legend',
        'echarts/component/dataZoom',
        'echarts/component/tooltip',
        'echarts/component/dataRange',

        'echarts/component/markPoint',
        'echarts/component/markLine'
    ],
    out: 'echarts.js'
}