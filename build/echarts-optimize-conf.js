exports.modules = {
    main: {
        name: 'echarts/echarts',
        includeShallow: [
            'echarts/component/dataRange'
        ]
    },
    parts: [
        {name: 'echarts/chart/line', weight: 100},
        {name: 'echarts/chart/bar', weight: 100},
        {name: 'echarts/chart/scatter', weight: 90},
        {name: 'echarts/chart/k', weight: 30},
        {name: 'echarts/chart/pie', weight: 90},
        {name: 'echarts/chart/radar', weight: 30},
        {name: 'echarts/chart/chord', weight: 30},
        {name: 'echarts/chart/force', weight: 30},
        {
            name: 'echarts/chart/map',
            weight: 90,
            includeShallow: [
                'echarts/util/mapData/geoJson/an_hui_geo',
                'echarts/util/mapData/geoJson/ao_men_geo',
                'echarts/util/mapData/geoJson/bei_jing_geo',
                'echarts/util/mapData/geoJson/china_geo',
                'echarts/util/mapData/geoJson/chong_qing_geo',
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
                'echarts/util/mapData/geoJson/zhe_jiang_geo'
            ]
        },
        {name: 'echarts/chart/gauge', weight: 30},
        {name: 'echarts/chart/funnel', weight: 30},
        {name: 'echarts/chart/eventRiver', weight: 10},
        {name: 'echarts/chart/venn', weight: 10},
        {name: 'echarts/chart/treemap', weight: 10},
        {name: 'echarts/chart/tree', weight: 10},
        {name: 'echarts/chart/wordCloud', weight: 10},
        {name: 'echarts/chart/heatmap', weight: 10, includeShallow: [
            'echarts/layer/heatmap'
        ]}
    ]
};

exports.amd = {
    baseUrl: process.cwd(),
    packages: [
        {
            name: 'echarts',
            location: '../src',
            main: 'echarts'
        },
        {
            name: 'zrender',
            location: '../../zrender/src',
            main: 'zrender'
        }
    ]
};