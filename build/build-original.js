/*
 * 图表按需加载，如需链接带入相关图表，选择性打开echarts.js中build注释内图表引用
 */
{
    // appDir: './',
    baseUrl: '../src',
    optimize: 'none', // 是否压缩
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
    include:[
        'echarts/chart/scatter',
        'echarts/chart/k',
        'echarts/chart/radar',
        'echarts/chart/force',
        /*
        'echarts/chart/map',
        'echarts/util/mapData/china/0',     // 全国
        'echarts/util/mapData/china/65',    // 新疆
        'echarts/util/mapData/china/54',    // 西藏
        'echarts/util/mapData/china/15',    // 内蒙古
        'echarts/util/mapData/china/63',    // 青海
        'echarts/util/mapData/china/51',    // 四川
        'echarts/util/mapData/china/23',    // 黑龙江
        'echarts/util/mapData/china/62',    // 甘肃
        'echarts/util/mapData/china/53',    // 云南
        'echarts/util/mapData/china/45',    // 广西
        'echarts/util/mapData/china/43',    // 湖南
        'echarts/util/mapData/china/61',    // 陕西
        'echarts/util/mapData/china/44',    // 广东
        'echarts/util/mapData/china/22',    // 吉林
        'echarts/util/mapData/china/13',    // 河北
        'echarts/util/mapData/china/42',    // 湖北
        'echarts/util/mapData/china/52',    // 贵州
        'echarts/util/mapData/china/37',    // 山东
        'echarts/util/mapData/china/36',    // 江西
        'echarts/util/mapData/china/41',    // 河南
        'echarts/util/mapData/china/21',    // 辽宁
        'echarts/util/mapData/china/14',    // 山西
        'echarts/util/mapData/china/34',    // 安徽
        'echarts/util/mapData/china/35',    // 福建
        'echarts/util/mapData/china/33',    // 浙江
        'echarts/util/mapData/china/32',    // 江苏
        'echarts/util/mapData/china/50',    // 重庆
        'echarts/util/mapData/china/64',    // 宁夏
        'echarts/util/mapData/china/46',    // 海南
        'echarts/util/mapData/china/71',    // 台湾
        'echarts/util/mapData/china/11',    // 北京
        'echarts/util/mapData/china/12',    // 天津
        'echarts/util/mapData/china/31',    // 上海
        'echarts/util/mapData/china/81',    // 香港
        'echarts/util/mapData/china/82',    // 澳门
        */
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/pie'
    ],
    out: 'echarts-original.js'
}