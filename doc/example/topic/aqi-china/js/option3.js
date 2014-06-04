function option3 (name) {
    var count = 30;
    var key = name != 'pm25' ? name : 'pm2_5';
    var nameWorst = [];
    var dataWorst = data[name].slice(-count);
    for (var i = 0, l = dataWorst.length; i < l; i++) {
        nameWorst.push(dataWorst[i].name);
    }
    
    var nameBest = [];
    var dataBest = data[name].slice(0,count);
    dataBest.reverse();
    for (var i = 0, l = dataBest.length; i < l; i++) {
        dataBest[i] = {
            name: dataBest[i].name,
            value: - dataBest[i].value
        };
        nameBest.push(dataBest[i].name);
    }
    var option = {
        title : {
            text: '空气质量排行榜（'+name+' 前后30名）',
            subtext: 'data from PM25.in',
            sublink: 'http://www.pm25.in',
            itemGap: 5,
            x:'center'
        },
        tooltip : {
            trigger: 'item'
        },
        toolbox: {
            show : true,
            //orient : 'vertical',
            //x: 'right',
            //y: 'center',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                //magicType: {show: true, type: ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        dataRange: {
            orient: 'horizontal',
            precision: name != 'co' ? 0 : 2,
            min : data[name + 'Min'],
            max : data[name + 'Max'],
            text:['高','低'],           // 文本，默认为数值文本
            calculable : true,
            x: '45%',
            y: 640,
            itemWidth:35,
            color: ['maroon','purple','red','orange','yellow','lightgreen'],
            textStyle:{
                color:'#fff'
            }
        },
        grid:{
            x: 0,
            y: 50,
            x2: 0,
            y2: 0,
            borderWidth:0
        },
        xAxis : [
            {
                type : 'value',
                position: 'top',
                splitLine: {show:false},
                axisLine: {show:false},
                axisLabel : {show:false},
                min: 0,
                max: data[name+'Max']
            },
            {
                type : 'value',
                position: 'bottom',
                splitLine: {show:false},
                axisLine: {show:false},
                min: -data[name+'Max'],
                max: 0,
                axisLabel:{
                    show:false,
                    formatter: function (v){
                        return -v;
                    }
                }
            }
        ],
        yAxis : [
            {
                type : 'category',
                splitLine: {show:false},
                axisLine: {show:false},
                axisLabel : {show:false},
                data : nameWorst
            },
            {
                type : 'category',
                splitLine: {show:false},
                axisLine: {show:false},
                axisLabel : {show:false},
                data : nameBest
            }
        ],
        animation:false,
        series : [
            {
                name: '空气质量（'+name+'）',
                type: 'map',
                mapType: 'china',
                itemStyle:{normal:{label:{show:false}}},
                //roam: true,
                mapLocation: {
                    x: '45%',
                    y: 200,
                    width: '45%'
                },
                data:[
                    {name:'西藏', value:data.cityToData['拉萨'][key]},
                    {name:'青海', value:data.cityToData['西宁'][key]},
                    {name:'宁夏', value:data.cityToData['银川'][key]},
                    {name:'海南', value:data.cityToData['海口'][key]},
                    {name:'甘肃', value:data.cityToData['兰州'][key]},
                    {name:'贵州', value:data.cityToData['贵阳'][key]},
                    {name:'新疆', value:data.cityToData['乌鲁木齐'][key]},
                    {name:'云南', value:data.cityToData['昆明'][key]},
                    {name:'重庆', value:data.cityToData['重庆'][key]},
                    {name:'吉林', value:data.cityToData['长春'][key]},
                    {name:'山西', value:data.cityToData['太原'][key]},
                    {name:'天津', value:data.cityToData['天津'][key]},
                    {name:'江西', value:data.cityToData['南昌'][key]},
                    {name:'广西', value:data.cityToData['南宁'][key]},
                    {name:'陕西', value:data.cityToData['西安'][key]},
                    {name:'黑龙江', value:data.cityToData['哈尔滨'][key]},
                    {name:'内蒙古', value:data.cityToData['呼和浩特'][key]},
                    {name:'安徽', value:data.cityToData['合肥'][key]},
                    {name:'北京', value:(data.cityToData['北京'] || {})[key]},
                    {name:'福建', value:data.cityToData['福州'][key]},
                    {name:'上海', value:data.cityToData['上海'][key]},
                    {name:'湖北', value:data.cityToData['武汉'][key]},
                    {name:'湖南', value:data.cityToData['长沙'][key]},
                    {name:'四川', value:data.cityToData['成都'][key]},
                    {name:'辽宁', value:data.cityToData['沈阳'][key]},
                    {name:'河北', value:data.cityToData['石家庄'][key]},
                    {name:'河南', value:data.cityToData['郑州'][key]},
                    {name:'浙江', value:data.cityToData['杭州'][key]},
                    {name:'山东', value:data.cityToData['济南'][key]},
                    {name:'江苏', value:data.cityToData['南京'][key]},
                    {name:'广东', value:data.cityToData['广州'][key]}
                ]
            },
            {
                name: '空气质量最差（'+name+'）',
                type: 'bar',
                itemStyle : {
                    normal : {
                        color : (function (){
                            var zrColor = require('zrender/tool/color');
                            return zrColor.getLinearGradient(
                                0, 80, 0, 700,
                                //['orangered','yellow','lightskyblue']
                                [[0, 'purple'],[0.5, 'orangered'],[1, 'orange']]
                            )
                        })(),
                        label : {
                            show : true,
                            position: 'right',
                            formatter:'{b} : {c}'
                        }
                    }
                },
                data: dataWorst
            },
            {
                name: '空气质量最好（'+name+'）',
                type: 'bar',
                tooltip:{
                    trigger: 'item',
                    formatter : function (v) {
                        return v[0] + '<br/>' + v[1] + ' : ' + (-v[2]);
                    }
                },
                xAxisIndex:1,
                yAxisIndex:1,
                barMinHeight: 5,
                itemStyle : {
                    normal : {
                        color : (function (){
                            var zrColor = require('zrender/tool/color');
                            return zrColor.getLinearGradient(
                                0, 80, 0, 700,
                                //['orangered','yellow','lightskyblue']
                                [[0, 'lightskyblue'],[1, 'lightgreen']]
                            )
                        })(),
                        label : {
                            show : true,
                            position: 'left',
                            formatter: function (a,b,c) {
                                return b + ' : ' + (-c);
                            }
                        }
                    }
                },
                data: dataBest
            }
        ]
    };
    //console.log(option);
    return option;
}