function option2 (idx, selected) {
    var option = {
        tooltip : {
            trigger: 'item'
        },
        toolbox: {
            //orient: 'vertical',
            x: 'center',
            y: 'top',
            show : true,
            feature : {
                mark : {show: true},
                dataZoom : {show: true},
                dataView : {show: true, readOnly: false},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        legend : {
            data: ['城市'],
            selectedMode: false,
            orient: 'vertical',
            x: 'right'
        },
        grid: {
            x : 45,
            y : 30,
            x2 : 35,
            y2 : 30,
        },
        xAxis : [
            {
                name: idx != 0 ? 'PM25' : '亿元',
                type : 'value',
                //power: 1,
                scale: false
            }
        ],
        yAxis : [
            {
                name: idx != 1 ? '万人' : '亿元',
                type : 'value',
                //power: 1,
                scale: false,
                splitArea : {show : true}
            }
        ],
        animation:false,
        series : [
            {
                name:'城市',
                type:'scatter',
                
                symbolSize: function (value){
                    return Math.round(value[2] / sizeCtrl);
                }
            }
        ]
    };
    
    var scatterData = [];
    var sizeCtrl;
    var tipFormatter;
    switch(idx+'') {
        case '0':
            sizeCtrl = 10;
            tipFormatter = function (v) {
                return v[1] + '<br>'
                       + 'GDP : ' + v[2][0] + '（亿元）<br/>'
                       + '人口 : ' + v[2][1] + '（万人）<br/>'
                       + 'PM2.5 : ' + v[2][2];
            }
            for (var city in selected) {
                if (selected[city]) {
                    scatterData.push({
                        name: city,
                        value: [
                            PG[city].gdp,
                            PG[city].pop,
                            data.cityToData[city].pm2_5
                        ],
                        itemStyle:{normal:{color:PG[city].color}}
                    });
                }
            }
            break;
        case '1':
            sizeCtrl = 80;
            tipFormatter = function (v) {
                return v[1] + '<br>'
                       + 'PM2.5 : ' + v[2][0] + '<br/>'
                       + 'GDP : ' + v[2][1] + '（亿元）<br/>'
                       + '人口 : ' + v[2][2] + '（万人）';
            }
            for (var city in selected) {
                if (selected[city]) {
                    scatterData.push({
                        name: city,
                        value: [
                            data.cityToData[city].pm2_5,
                            PG[city].gdp,
                            PG[city].pop
                        ],
                        itemStyle:{normal:{color:PG[city].color}}
                    });
                }
            }
            break;
        case '2':
            sizeCtrl = 500;
            tipFormatter = function (v) {
                return v[1] + '<br>'
                       + 'PM2.5  : ' + v[2][0] + '<br/>'
                       + '人口  : ' + v[2][1] + '（万人）<br/>'
                       + 'GDP : ' + v[2][2] + '（亿元）';
            }
            for (var city in selected) {
                if (selected[city]) {
                    scatterData.push({
                        name: city,
                        value: [
                            data.cityToData[city].pm2_5,
                            PG[city].pop,
                            PG[city].gdp
                        ],
                        itemStyle:{normal:{color:PG[city].color}}
                    });
                }
            }
    }
    option.tooltip.formatter = tipFormatter;
    option.series[0].data = scatterData;
    
    return option;
}