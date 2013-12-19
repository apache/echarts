function option3 (name) {
    var option = {
        title : {
            text: 'GDP',
            x:'right',
            textStyle:{}
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            text:['高','低'],           // 文本，默认为数值文本
            calculable : true,
            x: 'left'
        },
        series : [
            {
                type: 'map',
                mapType: 'china',
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
        require('zrender/tool/color').lift(color, -0.8)
    ];
//    console.log(option.dataRange.color,name)
    
    var max = dataMap['dataA' + name][curYear + 'max'];
    option.dataRange.max = max;
    var newRange = {
        start : 0,
        end : 100
    };
    if (curRange) {
        if (curRange.start != 0) {
            // 不是最低
            newRange.start = curRange.start < max
                             ? (curRange.start / max * 100)
                             : 99;
        }
        if (curRange.end > 0) {
            // 不是最高
            newRange.end = curRange.end < max
                           ? (curRange.end / max * 100)
                           : 99;
        } 
    }
    //console.log(newRange,curRange)
    option.dataRange.range = newRange;

    for (var i = 0, l = option.series.length; i < l; i++) {
        option.series[i].name = '人均' + eNameMap[name] + '(' + curYear + ')';
        option.series[i].data = 
            dataMap['dataA' + name][curYear]
    }
    return option;
}