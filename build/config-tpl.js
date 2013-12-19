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
        'echarts/chart/chord',
        'echarts/chart/force',
        'echarts/chart/map',
        'echarts/util/mapData/geoJson/an_hui.geo',
        'echarts/util/mapData/geoJson/ao_men.geo',
        'echarts/util/mapData/geoJson/bei_jing.geo',
        'echarts/util/mapData/geoJson/china.geo',
        'echarts/util/mapData/geoJson/chong_qing.geo',
        'echarts/util/mapData/geoJson/fu_jian.geo',
        'echarts/util/mapData/geoJson/gan_su.geo',
        'echarts/util/mapData/geoJson/guang_dong.geo',
        'echarts/util/mapData/geoJson/guang_xi.geo',
        'echarts/util/mapData/geoJson/gui_zhou.geo',
        'echarts/util/mapData/geoJson/hai_nan.geo',
        'echarts/util/mapData/geoJson/hei_long_jiang.geo',
        'echarts/util/mapData/geoJson/he_bei.geo',
        'echarts/util/mapData/geoJson/he_nan.geo',
        'echarts/util/mapData/geoJson/hu_bei.geo',
        'echarts/util/mapData/geoJson/hu_nan.geo',
        'echarts/util/mapData/geoJson/jiang_su.geo',
        'echarts/util/mapData/geoJson/jiang_xi.geo',
        'echarts/util/mapData/geoJson/ji_lin.geo',
        'echarts/util/mapData/geoJson/liao_ning.geo',
        'echarts/util/mapData/geoJson/nei_meng_gu.geo',
        'echarts/util/mapData/geoJson/ning_xia.geo',
        'echarts/util/mapData/geoJson/qing_hai.geo',
        'echarts/util/mapData/geoJson/shang_hai.geo',
        'echarts/util/mapData/geoJson/shan_dong.geo',
        'echarts/util/mapData/geoJson/shan_xi_1.geo',
        'echarts/util/mapData/geoJson/shan_xi_2.geo',
        'echarts/util/mapData/geoJson/si_chuan.geo',
        'echarts/util/mapData/geoJson/tai_wan.geo',
        'echarts/util/mapData/geoJson/tian_jin.geo',
        'echarts/util/mapData/geoJson/world.geo',
        'echarts/util/mapData/geoJson/xiang_gang.geo',
        'echarts/util/mapData/geoJson/xin_jiang.geo',
        'echarts/util/mapData/geoJson/xi_zang.geo',
        'echarts/util/mapData/geoJson/yun_nan.geo',
        'echarts/util/mapData/geoJson/zhe_jiang.geo',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/pie'
    ],
    wrap : {
        startFile : ['wrap/start.js', "wrap/almond.js"],
        endFile : 'wrap/end.js'
    },
    out: 'echarts.js'
}