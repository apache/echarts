function option1 (curSelected) {
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
                magicType : {show: true, type: ['line', 'bar', 'stack', 'tiled']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        grid : {
            y : 80,
            y2 : 100,
        },
        xAxis : [
            {
                type : 'category',
                axisLabel: {
                    interval: 0
                },
                data : [
                    '北京','\n天津','河北','\n山西','内蒙古','\n辽宁',
                    '吉林','\n黑龙江','上海','\n江苏','浙江','\n安徽',
                    '福建','\n江西','山东','\n河南','湖北','\n湖南',
                    '广东','\n广西','海南','\n重庆','四川','\n贵州',
                    '云南','\n西藏','陕西','\n甘肃','青海','\n宁夏','新疆'
                ]
            }
        ],
        yAxis : [
            {
                type : 'value',
                name : 'GDP（亿元）',
                max: 53500,
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
                type:'bar',
                markLine: {
                    symbol : ['arrow','none'],symbolSize : [4, 2],itemStyle : {normal: {
                        lineStyle: {color:'orange'},
                        borderColor:'orange',
                        label:{position:'left',formatter:function(params){return Math.round(params.value)},
                        textStyle:{color:"orange"}
                    }}},
                    data : [
                        {type : 'average', name : '平均值'}
                    ]
                }
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
    
    var timelineOption = {
        timeline : {
            data : (function(){
                var a = [];
                for (var i = 2002; i <= 2011; i++) {
                    a.push(i + '-01-01');
                }
                return a;
            })(),
            label : {
                formatter : function(s) {
                    return s.slice(0, 4);
                }
            },
            playInterval : 1000
        },
        options : []
    };
    
    var curYear = 2002;
    option.title.text = curYear + '全国宏观经济指标'
    for (var i = 0, l = option.series.length; i < l; i++) {
        option.series[i].data =  dataMap['data' + option.series[i]._name][curYear]
    }
    timelineOption.options.push(option);
    
    for (curYear = 2003; curYear <= 2011; curYear++) {
        var newSeries = [
                {
                    name:'GDP',
                    _name: 'GDP'
                },
                {
                    name:'金融',
                    _name: 'Financial',
                    yAxisIndex: 1
                },
                {
                    name:'房地产',
                    _name: 'Estate',
                    yAxisIndex: 1
                },
                {
                    name:'第一产业',
                    _name: 'PI',
                    yAxisIndex: 1
                },
                {
                    name:'第二产业',
                    _name: 'SI',
                    yAxisIndex: 1
                },
                {
                    name:'第三产业',
                    _name: 'TI',
                    yAxisIndex: 1
                }
            ];
        
        for (var i = 0, l = newSeries.length; i < l; i++) {
            newSeries[i].data =  dataMap['data' + newSeries[i]._name][curYear]
        }
        timelineOption.options.push({
            title : {
                text : curYear + '全国宏观经济指标'
            },
            series : newSeries
        })
    }
    return timelineOption;
}