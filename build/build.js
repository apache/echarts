/*
 * 图表按需加载，如需链接带入相关图表，选择性打开echarts.js中build注释内图表引用
 */
{
    // appDir: './',
    baseUrl: '../src',
    // optimize: 'none',
    name: 'echarts',
    packages: [
        {
            name: 'zrender',
            location: '../../zrender/src',
            main: 'zrender'
        },
        {
            name: 'echarts',
            location: '.',
            main: 'echarts'
        }
    ],
    out: 'echarts.js'
}