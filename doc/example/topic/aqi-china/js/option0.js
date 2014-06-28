function option0 (name) {
    var color = eColorMap[name];
    var option = {
        title : {
            text: '空气质量（'+name+'）',
            subtext: 'data from PM25.in',
            sublink: 'http://www.pm25.in'
        },
        tooltip : {
            trigger: 'item'
        },
        toolbox: {
            show : true,
            //orient : 'vertical',
            x: 'right',
            //y: 'center',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        dataRange: {
            min : data[name + 'Min'],
            max : data[name + 'Max'],
            calculable : true,
            color: ['maroon','purple','red','orange','yellow','lightgreen']
        },
        series : [
            {
                type: 'map',
                mapType: 'china',
                mapLocation: {
                    //x:'left'
                },
                hoverable: false,
                roam:true,
                itemStyle:{
                    //normal:{label:{show:true}}
                },
                data : [],
                markPoint: {
                    symbolSize: 5,       // 标注大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
                    itemStyle: {
                        normal: {
                            borderColor: '#87cefa',
                            borderWidth: 1,            // 标注边线线宽，单位px，默认为1
                            label: {
                                show: false
                            }
                        },
                        emphasis: {
                            borderColor: '#1e90ff',
                            borderWidth: 5,
                            label: {
                                show: false
                            }
                        }
                    },
                    data : data[name]
                },
                geoCoord : data.geoCoord
            }
        ]
    };
    return option;
}