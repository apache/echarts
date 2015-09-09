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
        'echarts/component/legend',
        'echarts/component/grid',
        'echarts/component/polar',
        'echarts/component/dataZoom'
    ],
    out: 'echarts.js'
}