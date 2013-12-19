function option2 (name) {
    var option = {
        title : {
            x: 'center',
            y: 'top',
            textStyle:{
                fontSize: 14
            }
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            itemWidth:8,
            itemGap: 5,
            x: 'left',
            y: 'bottom'
        },
        series : [
            {
                type: 'map',
                mapType: 'china'
            }
        ]
    };
    var color = eColorMap[name];
    option.title.text = eNameMap[name] + ' (亿元)';
    option.title.textStyle.color = color;
    option.dataRange.color = [
        color, 
        require('zrender/tool/color').lift(color, -0.8)
    ];
    option.dataRange.max = dataMap['data' + name][curYear + 'max'];
    
    for (var i = 0, l = option.series.length; i < l; i++) {
        option.series[i].name = eNameMap[name] + '(' + curYear + ')';
        option.series[i].data = 
            dataMap['data' + name][curYear]
    }
    
    return option;
}