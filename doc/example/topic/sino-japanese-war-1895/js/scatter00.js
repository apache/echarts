    require.config({
        paths:{ 
             echarts: '../../www/js'  
        }
    });


    require(
        [
            'echarts',
            'echarts/chart/bar',
            'echarts/chart/line',
			'echarts/chart/scatter'
        ]
    );
	
	var scatter0 ;
	function disposeScatter00(){
	    //setTimeout(disposeScatter00(),5000);
		if(scatter0)
		{
			scatter0.dispose();
			scatter0=false;
		}
	}
    function setOptionScatter00() {
		
		var ec = require('echarts');
        scatter0 = ec.init(document.getElementById('scatter00'));
        scatter0.setOption({
        title : {
        text: '北洋舰队殉国将领'
        },
        tooltip : {
        trigger: 'item',
        showDelay : 0,
        axisPointer:{
            type : 'cross',
            lineStyle: {
                type : 'dashed',
                width : 1
            }	
        },
        formatter : function (value) {
			return  '北洋水师:'+value[0]+'<br/>'+value[1];
        }

    },
    legend: {
        data:['水师提督','水师管带']
    },
    toolbox: {
        show : true,
        feature : {
            mark : {show: true},
            dataZoom : {show: true},
            dataView : {show: true, readOnly: false},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    xAxis : [
        {
            type : 'value',
            power: 1,
            precision: 2,
            scale:true,
			splitNumber:10,
			min:0,
			max:800,
			axisLabel:false,
			axisLine:false
        }
    ],
    yAxis : [
        {
            type : 'value',
            power: 1,
            precision: 2,
            scale:true,
			min:0,
			max:600,
			splitNumber:10,
			axisLabel:false,
			axisLine:false
        }
    ],
    series : [
        {
            name:'水师提督',
            type:'scatter',
			symbolSize:50,
			itemStyle: {
			normal : {
				label : {
					show: true,
				    formatter : function(a,b,c)
					{
					switch(b)
					{
					 case '丁汝昌':
					 var res_name=b+'\n'+'['+a+']\n\n'+'在威海保卫战中弹尽\n粮绝后自杀殉国。';
					 break;
					 
					  case '刘步蟾':
					 var res_name=b+'\n'+'['+a+']\n\n'+'远舰舰管带，在\n威海保卫战中弹尽\n粮绝后自杀殉国。';
					 break;
					 
					  case '林泰曾':
					 var res_name=b+'\n'+'['+a+']\n\n'+'镇远舰管带，镇\n远号入港时触礁受\n损，自认失职后自杀。';
					 break;
					 
					  case '林永升':
					 var res_name=b+'\n'+'['+a+']\n\n'+'经远舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					 
					  case '林履中':
					 var res_name=b+'\n'+'['+a+']\n\n'+'扬威舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					 
					  case '黄建勋':
					 var res_name=b+'\n'+'['+a+']\n\n'+'超勇舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					 
					  case '邓世昌':
					 var res_name=b+'\n'+'['+a+']\n\n'+'致远舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					}
						return  res_name;
					},
					textStyle:{color:'#FF4D00'}
				    }
			   }
		    },
			data: [
			{name: '丁汝昌',symbol: 'image://./images/12001.png',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
             value: [138.53,400.38]}
            ]
			
        },
        {
            name:'水师管带',
            type:'scatter',
			symbolSize:50,
			itemStyle: {
			normal : {
				color:'#27727B',
				label : {
					show: true,
					formatter : function(a,b,c)
					{
					switch(b)
					{
					 case '丁汝昌':
					 var res_name=b+'\n'+'['+a+']\n\n'+'在威海保卫战中弹尽\n粮绝后自杀殉国。';
					 break;
					 
					  case '刘步蟾':
					 var res_name=b+'\n'+'['+a+']\n\n'+'远舰舰管带，在\n威海保卫战中弹尽\n粮绝后自杀殉国。';
					 break;
					 
					  case '林泰曾':
					 var res_name=b+'\n'+'['+a+']\n\n'+'镇远舰管带，镇\n远号入港时触礁受\n损，自认失职后自杀。';
					 break;
					 
					  case '林永升':
					 var res_name=b+'\n'+'['+a+']\n\n'+'经远舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					 
					  case '林履中':
					 var res_name=b+'\n'+'['+a+']\n\n'+'扬威舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					 
					  case '黄建勋':
					 var res_name=b+'\n'+'['+a+']\n\n'+'超勇舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					 
					  case '邓世昌':
					 var res_name=b+'\n'+'['+a+']\n\n'+'致远舰管带，大\n东沟海战中壮烈牺牲。';
					 break;
					}
						return  res_name;
					},
					textStyle:{ fontFamily:'sans-serif',color:'#27727B'}
				    }
			   }
		    },
			data: [
			{name: '刘步蟾',symbol: 'image://./images/12004.png', itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
             value: [420.9, 400.38]},
			{name: '邓世昌',symbol: 'image://./images/12002.png', itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
		     value: [704,400.38]},
			{name: '林泰曾',symbol: 'image://./images/12006.png', itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
		     value: [138.53,100]},
			{name: '林永升',symbol: 'image://./images/12007.png', itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
		     value: [738.9,100]},
			{name: '林履中',symbol: 'image://./images/12005.png', itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
		     value: [538.8,100]},
			{name: '黄建勋',symbol: 'image://./images/12003.png', itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'14'}}}},
		     value: [338.53,100]}
            ]
        }
    ]
            });

        }
