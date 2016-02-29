module.exports = {
    visualMap: {
        show: true,
        min: 0,
        max: 1500,
        right: 50,
        top: 'middle',
        text:['高','低']
        // orient: 'horizontal'
    },
    selectedMode: 'single',
    series : [
        {
            name: 'iphone3',
            type: 'map',
            map: 'china',
            showLegendSymbol: true,
            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: false
                }
            },
            data:[
                {name: '北京',value: 500},
                {name: '天津',value: 500},
                {name: '上海',value: 500},
                {name: '重庆',value: 500},
                {name: '河北',value: 500},
                {name: '河南',value: 500},
                {name: '云南',value: 500},
                {name: '辽宁',value: 500},
                {name: '黑龙江',value: 500},
                {name: '湖南',value: 500},
                {name: '安徽',value: 500},
                {name: '山东',value: 500},
                {name: '新疆',value: 500},
                {name: '江苏',value: 500},
                {name: '浙江',value: 500},
                {name: '江西',value: 500},
                {name: '湖北',value: 500},
                {name: '广西',value: 500},
                {name: '甘肃',value: 500},
                {name: '山西',value: 500},
                {name: '内蒙古',value: 500},
                {name: '陕西',value: 500},
                {name: '吉林',value: 500},
                {name: '福建',value: 500},
                {name: '贵州',value: 500},
                {name: '广东',value: 500},
                {name: '青海',value: 500},
                {name: '西藏',value: 500},
                {name: '四川',value: 500},
                {name: '宁夏',value: 500},
                {name: '海南',value: 500},
                {name: '台湾',value: 500},
                {name: '香港',value: 500},
                {name: '澳门',value: 500}
            ]
        },
        {
            name: 'iphone4',
            type: 'map',
            mapType: 'china',
            showLegendSymbol: true,
            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: false
                }
            },
            data:[
                {name: '北京',value: 500},
                {name: '天津',value: 500},
                {name: '上海',value: 500},
                {name: '重庆',value: 500},
                {name: '河北',value: 500},
                {name: '安徽',value: 500},
                {name: '新疆',value: 500},
                {name: '浙江',value: 500},
                {name: '江西',value: 500},
                {name: '山西',value: 500},
                {name: '内蒙古',value: 500},
                {name: '吉林',value: 500},
                {name: '福建',value: 500},
                {name: '广东',value: 500},
                {name: '西藏',value: 500},
                {name: '四川',value: 500},
                {name: '宁夏',value: 500},
                {name: '香港',value: 500},
                {name: '澳门',value: 500}
            ]
        },
        {
            name: 'iphone5',
            type: 'map',
            mapType: 'china',
            showLegendSymbol: true,
            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: false
                }
            },
            data:[
                {name: '北京',value: 500},
                {name: '天津',value: 500},
                {name: '上海',value: 500},
                {name: '广东',value: 500},
                {name: '台湾',value: 500},
                {name: '香港',value: 500},
                {name: '澳门',value: 500}
            ]
        }
    ]
};