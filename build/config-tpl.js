{
    // appDir: './',
    baseUrl: '../src',
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
        /*
        'echarts/chart/gauge',
        'echarts/chart/funnel',
        'echarts/chart/scatter',
        'echarts/chart/k',
        */
        'echarts/chart/radar',
        //'echarts/chart/chord',
        //'echarts/chart/force',
        'echarts/chart/map',
        //'echarts/util/mapData/geoJson/an_hui_geo',
        //'echarts/util/mapData/geoJson/ao_men_geo',
        //'echarts/util/mapData/geoJson/bei_jing_geo',
        'echarts/util/mapData/geoJson/china_geo',
        /*'echarts/util/mapData/geoJson/chong_qing_geo',
        'echarts/util/mapData/geoJson/fu_jian_geo',
        'echarts/util/mapData/geoJson/gan_su_geo',
        'echarts/util/mapData/geoJson/guang_dong_geo',
        'echarts/util/mapData/geoJson/guang_xi_geo',
        'echarts/util/mapData/geoJson/gui_zhou_geo',
        'echarts/util/mapData/geoJson/hai_nan_geo',
        'echarts/util/mapData/geoJson/hei_long_jiang_geo',
        'echarts/util/mapData/geoJson/he_bei_geo',
        'echarts/util/mapData/geoJson/he_nan_geo',
        'echarts/util/mapData/geoJson/hu_bei_geo',
        'echarts/util/mapData/geoJson/hu_nan_geo',
        'echarts/util/mapData/geoJson/jiang_su_geo',
        'echarts/util/mapData/geoJson/jiang_xi_geo',
        'echarts/util/mapData/geoJson/ji_lin_geo',
        'echarts/util/mapData/geoJson/liao_ning_geo',
        'echarts/util/mapData/geoJson/nei_meng_gu_geo',
        'echarts/util/mapData/geoJson/ning_xia_geo',
        'echarts/util/mapData/geoJson/qing_hai_geo',
        'echarts/util/mapData/geoJson/shang_hai_geo',
        'echarts/util/mapData/geoJson/shan_dong_geo',
        'echarts/util/mapData/geoJson/shan_xi_1_geo',
        'echarts/util/mapData/geoJson/shan_xi_2_geo',
        'echarts/util/mapData/geoJson/si_chuan_geo',
        'echarts/util/mapData/geoJson/tai_wan_geo',
        'echarts/util/mapData/geoJson/tian_jin_geo',
        'echarts/util/mapData/geoJson/world_geo',
        'echarts/util/mapData/geoJson/xiang_gang_geo',
        'echarts/util/mapData/geoJson/xin_jiang_geo',
        'echarts/util/mapData/geoJson/xi_zang_geo',
        'echarts/util/mapData/geoJson/yun_nan_geo',
        'echarts/util/mapData/geoJson/zhe_jiang_geo',*/
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/pie'
    ],
    out: 'echarts.js'
}