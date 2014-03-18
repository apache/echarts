function option1 (curSelected) {
    var valueMax;
    if (curSelected.GDP) {
        valueMax = 0;
        for (var k in curSelected) {
            if (curSelected[k]) {
                valueMax++
            }
        }
        valueMax = valueMax > 1 ? undefined : 53500;
    }
   
    var option = {
        color: ['#87cefa','#ff7f50','#da70d6','#32cd32','#6495ed',
                '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
                '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
                '#6699FF','#ff6666','#3cb371','#b8860b','#30e0e0'],
        title : {
            subtext: '数据来自国家统计局'
        },
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data : ['GDP','金融','房地产','第一产业','第二产业','第三产业'],
            selected : curSelected
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                magicType : {show: true, type: ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        animation : false,
        grid : {
            y : 80
        },
        xAxis : [
            {
                type : 'category',
                axisLabel: {
                    rotate: '45'
                },
                data : ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆']
            }
        ],
        yAxis : [
            {
                type : 'value',
                name : 'GDP（亿元）',
                max: valueMax,//53500,
                splitArea : {show : true}
            },
            {
                type : 'value',
                name : '其他（亿元）',
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'GDP',
                _name: 'GDP',
                type:'bar'
            },
            {
                name:'金融',
                _name: 'Financial',
                yAxisIndex: 1,
                type:'bar'
            },
            {
                name:'房地产',
                _name: 'Estate',
                yAxisIndex: 1,
                type:'bar'
            },
            {
                name:'第一产业',
                _name: 'PI',
                yAxisIndex: 1,
                type:'bar'
            },
            {
                name:'第二产业',
                _name: 'SI',
                yAxisIndex: 1,
                type:'bar'
            },
            {
                name:'第三产业',
                _name: 'TI',
                yAxisIndex: 1,
                type:'bar'
            }
        ]
    };
    
    option.title.text = curYear + '全国宏观经济指标'
    for (var i = 0, l = option.series.length; i < l; i++) {
        option.series[i].data = 
            dataMap['data' + option.series[i]._name][curYear]
    }
    return option;
}