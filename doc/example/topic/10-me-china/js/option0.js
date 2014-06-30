function option0 () {
    return {
        title : {
            text: '2011全国GDP',
            subtext: '数据来自国家统计局',
            x:'right',
            y: 'top'
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 600,
            max: 60000,
            orient: 'horizontal',
            color:['red','yellow'],
            text:['高','低'],           // 文本，默认为数值文本
            calculable : true,
            x: 'center',
            y: 'bottom',
            textStyle: {
                color: 'orange'
            }
        },
        toolbox: {
            show : true,
            //orient : 'vertical',
            x: 'left',
            y: 'top',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        grid:{
            x: 50,
            x2: 200,
            y2: 10,
            borderWidth:0
        },
        xAxis : [
            {
                type : 'value',
                position: 'top',
                name: '（亿元）',
                splitLine: {show:false},
                boundaryGap : [0, 0.01]
            }
        ],
        yAxis : [
            {
                type : 'category',
                splitLine: {show:false},
                axisLabel: {
                    interval:0
                },
                data : ['西藏','青海','宁夏','海南','甘肃','贵州','新疆','云南','重庆','吉林','山西','天津','江西','广西','陕西','黑龙江','内蒙古','安徽','北京','福建','上海','湖北','湖南','四川','辽宁','河北','河南','浙江','山东','江苏','广东']
            }
        ],
        series : [
            {
                name: '2011全国GDP',
                type: 'map',
                mapType: 'china',
                itemSdtyle:{
                    normal:{label:{show:true}}
                },
                mapLocation: {
                    x: 'right',
                    y: 80
                },
                data:[
                    {name:'西藏', value:605.83},
                    {name:'青海', value:1670.44},
                    {name:'宁夏', value:2102.21},
                    {name:'海南', value:2522.66},
                    {name:'甘肃', value:5020.37},
                    {name:'贵州', value:5701.84},
                    {name:'新疆', value:6610.05},
                    {name:'云南', value:8893.12},
                    {name:'重庆', value:10011.37},
                    {name:'吉林', value:10568.83},
                    {name:'山西', value:11237.55},
                    {name:'天津', value:11307.28},
                    {name:'江西', value:11702.82},
                    {name:'广西', value:11720.87},
                    {name:'陕西', value:12512.3},
                    {name:'黑龙江', value:12582},
                    {name:'内蒙古', value:14359.88},
                    {name:'安徽', value:15300.65},
                    {name:'北京', value:16251.93},
                    {name:'福建', value:17560.18},
                    {name:'上海', value:19195.69},
                    {name:'湖北', value:19632.26},
                    {name:'湖南', value:19669.56},
                    {name:'四川', value:21026.68},
                    {name:'辽宁', value:22226.7},
                    {name:'河北', value:24515.76},
                    {name:'河南', value:26931.03},
                    {name:'浙江', value:32318.85},
                    {name:'山东', value:45361.85},
                    {name:'江苏', value:49110.27},
                    {name:'广东', value:53210.28}
                ]
            },
            {
                type: 'bar',
                itemStyle : {
                    normal : {
                        color : (function (){
                            var zrColor = require('zrender/tool/color');
                            return zrColor.getLinearGradient(
                                0, 80, 0, 500,
                                [[0, 'red'],[0.2, 'orange'],[1, 'yellow']]
                            )
                        })(),
                        label : {
                            show : false
                        }
                    },
                    emphasis : {
                        label : {
                            show : true,
                            textStyle : {
                                color : 'orange',
                                fontWeight : 'bold'
                            }
                        }
                    }
                },
                data:[
                    {name:'西藏', value:605.83},
                    {name:'青海', value:1670.44},
                    {name:'宁夏', value:2102.21},
                    {name:'海南', value:2522.66},
                    {name:'甘肃', value:5020.37},
                    {name:'贵州', value:5701.84},
                    {name:'新疆', value:6610.05},
                    {name:'云南', value:8893.12},
                    {name:'重庆', value:10011.37},
                    {name:'吉林', value:10568.83},
                    {name:'山西', value:11237.55},
                    {name:'天津', value:11307.28},
                    {name:'江西', value:11702.82},
                    {name:'广西', value:11720.87},
                    {name:'陕西', value:12512.3},
                    {name:'黑龙江', value:12582},
                    {name:'内蒙古', value:14359.88},
                    {name:'安徽', value:15300.65},
                    {name:'北京', value:16251.93},
                    {name:'福建', value:17560.18},
                    {name:'上海', value:19195.69},
                    {name:'湖北', value:19632.26},
                    {name:'湖南', value:19669.56},
                    {name:'四川', value:21026.68},
                    {name:'辽宁', value:22226.7},
                    {name:'河北', value:24515.76},
                    {name:'河南', value:26931.03},
                    {name:'浙江', value:32318.85},
                    {name:'山东', value:45361.85},
                    {name:'江苏', value:49110.27},
                    {name:'广东', value:53210.28}
                ]
            }
        ]
    };
}