function option3 (name) {
    var option = {
        title : {
            text: 'GDP',
            subtext: '数据来自国家统计局',
            x:'right',
            textStyle:{}
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            max : dataMap['dataA' + name][2011 + 'max'],
            text:['高','低'],           // 文本，默认为数值文本
            calculable : true,
            x: 'left'
        },
        series : [
            {
                type: 'map',
                mapType: 'china',
                mapLocation: {
                    y: 'top',
                    height : 340
                },
                itemStyle:{
                    normal:{label:{show:true}}
                }
            }
        ]
    };
    
    option.title.text = '人均' + eNameMap[name];
    var color = eColorMap[name];
    option.title.textStyle.color = color;
    option.dataRange.color = [
        color, 
        require('zrender/tool/color').lift(color, -0.9)
    ];
    // console.log(option.dataRange.color,name)
    
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
    option.series[0].name = '人均' + eNameMap[name] + '(' + curYear + ')';
    option.series[0].data =  dataMap['dataA' + name][curYear]
    
    timelineOption.options.push(option);
    for (curYear = 2003; curYear <= 2011; curYear++) {
        var newSeries = {
                type: 'map',
                mapType: 'china',
                itemStyle:{
                    normal:{label:{show:true}}
                }
            };
        newSeries.name = '人均' + eNameMap[name] + '(' + curYear + ')';
        newSeries.data =  dataMap['dataA' + name][curYear]
        timelineOption.options.push({
            series : [newSeries]
        })
    }
    return timelineOption;
}