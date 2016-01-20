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
        'echarts/chart/scatter',
        'echarts/component/tooltip',
        'echarts/component/legend',

        'echarts/component/grid',
        'echarts/component/title',

        'echarts/component/markPoint',
        'echarts/component/markLine',
        'echarts/component/dataZoom',
        'echarts/component/toolbox',

        'zrender/vml/vml'
    ],
    out: '../../dist/echarts.common.js'
})