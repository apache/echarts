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
        'echarts/chart/pie',
        'echarts/component/grid'
    ],
    out: '../../dist/echarts.simple.js'
})