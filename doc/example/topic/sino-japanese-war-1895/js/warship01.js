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
            'echarts/chart/radar',
            'echarts/chart/scatter',
            'echarts/chart/funnel'
        ]
    );
	
	
	// (1) 体制对比
	var myChart0 ;
	function disposeWarship00(){
	    //setTimeout(disposeWarship00(),5000);
		if(myChart0)
		{
			myChart0.dispose();
			myChart0=false;
		}

		// 02
		disposeWarship01();
		disposeWarship01Test();
		// 03
		disposeWarship02();
		// 04
		disposeWarship03();
		// 05
		disposeWarship04();
		disposeWarship04Test();
		
	}
	
	function setOptionWarship00() {
		//01
		var ec = require('echarts');
 	    myChart0 = ec.init(document.getElementById('warship00'));
	
        myChart0.setOption({
        title : {
        text: '中日海军体制对比',
        subtext: '消息来自腾讯军事、搜狐军事'
    },
    tooltip : {
        trigger: 'item',
        formatter: "{a} <br/>{b}"
    },
    toolbox: {
        show : true,
        feature : {
            mark : {show: true},
            dataView : {show: true, readOnly: false},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    legend: {
        data : ['北洋舰队','南阳舰队','福建舰队','广东舰队']
    },
    calculable : true,
    series : [
        {
            name:'清朝海军分属节制',
            type:'funnel',
			x:'20%',
            width: '40%',
			itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        position: 'left'
                    }
                }
            },
            data:[
                {value:80, name:'直隶总督：北洋舰队'},
                {value:40, name:'两江总督：南阳舰队'},
                {value:20, name:'船政大臣：福建舰队'},
                {value:60, name:'两广总督：广东舰队'}
            ]
        },
        {
            name:'日本海军统一管辖',
            type:'funnel',
            x : '50%',
            sort : 'ascending',
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        position: 'right'
                    }
                }
            },
            data:[
                {value:60, name:'日本联合舰队'}
            ]
        }
      ]
    });
	
	//02
	setOptionWarship01();
	setOptionWarship01Test();
	//03
	setOptionWarship02();
	//04
	setOptionWarship03();
	//05
	setOptionWarship04();
	setOptionWarship04Test();
	
  }
	

	// (2) 军力对比
	var myChart1 ;
	function disposeWarship01(){
	    //setTimeout(disposeWarship01(),5000);
		if(myChart1)
		{
			myChart1.dispose();
			myChart1=false;
		}
	}
	
    function setOptionWarship01() {
		
		var ec = require('echarts');
        //data : ['总排水量','总兵力','鱼雷发射管','编队马力','火炮数量','平均航速']
        var myChart1 = ec.init(document.getElementById('warship01'));
        myChart1.setOption({
		title: {
        text: '中日海军军力对比',
        subtext: '北洋舰队整体实力不及日本',
        sublink: ''
        },
        tooltip : {
        trigger: 'axis',
        axisPointer : {            
            type : 'shadow'        
        }
    },
    legend: {
        data:['北洋舰队','日本海军']
    },
    toolbox: {
        show : true,
        orient: 'vertical',
        x: 'right',
        y: 'center',
        feature : { 
            mark : {show: true},
            dataView : {show: true, readOnly: false},
            magicType : {show: true, type: ['line', 'bar', 'stack', 'tiled']},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    calculable : true,
    xAxis : [
        {
            type : 'category',
            data : ['总兵力/人','鱼雷发射管/架','火炮数量/门','平均航速/节']
        }
    ],
    yAxis : [
        {
			axisLine:false,
			axisLabel:false
        }
    ],
    series : [
        {
            name:'北洋舰队',
            type:'bar',
			barMinHeight:5,
			itemStyle: {normal: { 
			label:{show:true,formatter:function(a,b,c){
						switch(b)
						{
							case '总兵力/人':
							var res= c ;
							break;
							case '鱼雷发射管/架':
							var res= c ;
							break;
							case '火炮数量/门':
							var res= c ;
							break;
							case '平均航速/节':
							var res= c;
							break;
						}
						return  res;
						}}
			}},
            data:[ 2126, 556, 195, 10.2]
			//data:[32100, 2126, 556, 42200, 195, 10.2]
        },
        {
            name:'日本海军',
            type:'bar',
			barMinHeight:5,
            //stack: '总量',
			//itemStyle : { normal: { color:'#B399FF',
			itemStyle : { normal: { 
			label : {show: true, formatter:function(a,b,c){
						switch(b)
						{
							case '总兵力/人':
							var res= c ;
							break;
							case '鱼雷发射管/架':
							var res= c ;
							break;
							case '火炮数量/门':
							var res= c ;
							break;
							case '平均航速/节':
							var res= c;
							break;
						}
						return  res;
						},position: 'top'}}},
            data:[ 3916, 568, 268, 14.5]
			//data:[40840, 3916, 568, 68900, 268, 14.5]
        }
    ]
  });
}

// (2) 军力对比 Test部分

	var myChart1bottom ;
	function disposeWarship01Test(){
	    //setTimeout(disposeWarship01Test(),5000);
		if(myChart1bottom)
		{
			myChart1bottom.dispose();
			myChart1bottom=false;
		}
	}
    function setOptionWarship01Test() {
		var ec = require('echarts');
		myChart1bottom = ec.init(document.getElementById('warship01_bottom'));
        myChart1bottom.setOption({
		tooltip : {
        trigger: 'axis',
		formatter:function(a,b,c){
		        var res_jiawu= a[0][0]+'<br/>'+a[0][3];
				for(var i=0;i<a.length;i++)
				{		
					switch(a[0][3])
					{
						case '总排水量':
						res_jiawu+='<br/>'+a[i][1]+':'+a[i][2]+'吨';	
						break;
						case '编队马力':
						res_jiawu+='<br/>'+a[i][1]+':'+a[i][2]+'匹';
						break;
						case '大口径火炮数':
						res_jiawu+='<br/>'+a[i][1]+':'+a[i][2]+'门';
						break;
						case '火炮：一分钟投弹数量':
						res_jiawu+='<br/>'+a[i][1]+':'+a[i][2]+'发';
						break;
						case '火炮：一分钟投射重量':
						res_jiawu+='<br/>'+a[i][1]+':'+a[i][2]+'千克';
						break;
						case '速射炮数量':
						res_jiawu+='<br/>'+a[i][1]+':'+a[i][2]+'门';
						break;
					}	
				}
				return res_jiawu;
			}
    },
    legend: {
        orient : 'vertical',
        x : 'right',
        y : 'bottom',
        data:['北洋舰队','日本联合舰队']
    },
    toolbox: {
        show : true,
        feature : {
            mark : {show: true},
            dataView : {show: true, readOnly: false},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    polar : [
       {
           indicator : [
               { text: '总排水量', max: 50000},
               { text: '编队马力', max: 70000},
               { text: '大口径火炮数', max: 200},
               { text: '火炮：一分钟投弹数量', max: 300},
               { text: '火炮：一分钟投射重量', max: 6000},
               { text: '速射炮数量', max: 100}
            ]
        }
    ],
    calculable : true,
    series : [
        {
            name: '北洋舰队 vs 日本联合舰队',
            type: 'radar',
            data : [
                {
                    value : [32100, 42200, 58, 22, 1864, 0],
                    name : '北洋舰队'
			
                },
                 {
                    value : [40840, 68900, 104, 232,5965, 89],
                    name : '日本联合舰队',
							itemStyle:{
						normal:{
							
							label:{
								show:true,
								textStyle:{color:'green'},
								formatter:function(a,b,c){
										switch(b)
										{
											case '总排水量':
											var res= c +'吨';
											break;
											case '编队马力':
											var res= c +'匹';
											break;
											case '大口径火炮数':
											var res= c +'门';
											break;
											case '火炮：一分钟投弹数量':
											var res= c + '发';
											break;
											case '火炮：一分钟投射重量':
											var res= c +'千克';
											break;
											case '速射炮数量':
											var res= c +'门';
											break;
										}
									   return res;
								}
							}
						}
					}
                }
            ]
        }
    ]
  });	
		
}

// (3) 军舰对比

	var myChart2 ;
	function disposeWarship02(){
	    //setTimeout(disposeWarship02(),5000);
		if(myChart2)
		{
			myChart2.dispose();
			myChart2=false;
		}
	}
	
	function setOptionWarship02() {
	
	    var ec = require('echarts');
	    myChart2 = ec.init(document.getElementById('warship02'));
        myChart2.setOption({
		title : {
        text: '中日海军参战军舰对比'
        },
        tooltip : {
        trigger: 'axis',
        showDelay : 0,
        axisPointer:{
            type : 'cross',
            lineStyle: {
                type : 'dashed',
                width : 1
            }	
        },
        formatter : function (value) {
            if (value[2].length > 1) {
                return value[0] + ' :<br/>'
                   + '排水量：'+value[2][0] + '吨 ' +'<br/>'
                   + '船速：'+value[2][1] + '节 ';
            }
            else {
                return value[0] + ' :<br/>'
                   + 
				   value[1] + ' : '
                   + value[2] + '节 ';
            }
        }

    },
    legend: {
        data:['北洋舰队','日本联合舰队']
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
			name:'排水量/吨',
            power: 1,
            precision: 2,
            scale:true,
			splitNumber:10,
			min:400,
			max:8000,
            axisLabel : {
                formatter: '{value} '
            }
        }
    ],
    yAxis : [
        {
            type : 'value',
			name:'速度/节',
            power: 1,
            precision: 2,
            scale:true,
			min:10,
			max:26,
			splitNumber:10,
            axisLabel : {
                formatter: '{value} '
            }
        }
    ],
    series : [
        {
            name:'北洋舰队',
            type:'scatter',
			symbolSize:10,
			itemStyle: {
			normal : {
				label : {
					show: true,
					formatter : '{b}',
					textStyle:{color:'#FF4D00'}
				    }
			   }
		    },
			//北洋舰队 主要舰队有13艘  
			//1广丙 2广甲 3超勇 4平远  5济远  6经远  7致远  8定远旗舰

			data: [
			{name: '广丙舰',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [1000, 17]},
			{name: '广甲舰',symbolSize:10,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [1209,15]},
			{name: '超勇与扬威舰',symbolSize:10,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [1350,15]},
			{name: '平远舰',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [ 2100,14.5]},
			 {name: '济远舰',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [2300,15]},
			 {name: '经远与来远舰',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [2900,15.5]},
			 {name: '致远与靖远舰',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [2300,18]},
			 {name: '定远旗舰与镇远旗舰',itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
             value: [7335,14.5]}
            ],
            markLine : {
                data : [
                    {type : 'average', name: '平均航速'}
                ]
            }
			
        },
        {
            name:'日本联合舰队',
            type:'scatter',
			symbolSize:10,
			itemStyle: {
			normal : {
				label : {
					show: true,
					formatter : '{b}',
					textStyle:{color:'#27727B'}
				    }
			   }
		    },
			//日本联合舰队有13艘 型号相同的归为同一类（主炮、排水、速度）
			//1赤城 2比睿 3扶桑  4西京丸  5松岛  6桥立  7高千惠   8千代田  9吉野  10秋津洲 
			
			data: [
			{name: '赤城舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
             value: [622, 10.25]},
			{name: '比睿舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [2284,13.2]},
			 {name: '扶桑舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value:  [3777,13]},
			 {name: '西京丸舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [4100,15]},
			 {name: '松岛与严岛舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [4278,16]},
			 {name: '桥立舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [4278,17.5]},
			 {name: '高千惠与浪速舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [3709,18]},
			 {name: '千代田舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [2439,19]},
			 {name: '吉野舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [4216,22.5]},
			 {name: '秋津洲舰',itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
		     value: [3150,26]}
            ],
            markLine : {
                data : [
                    {type : 'average', name: '平均航速'}
                ]
            }
        }
    ]
		
   });
}
	
// (4) 军舰造价对比

	var myChart03 ;
	function disposeWarship03(){
	    //setTimeout(disposeWarship03(),5000);
		if(myChart03)
		{
			myChart03.dispose();
			myChart03=false;
		}
	}
	function setOptionWarship03() {
	
	var ec = require('echarts');
    myChart03 = ec.init(document.getElementById('warship03'));
	myChart03.setOption({
	title: {
	text: '中日主力战舰造价对比',
	x:'left',
	y:'top'
    },
    tooltip : {
        trigger: 'axis',
        axisPointer : {            // 坐标轴指示器，坐标轴触发有效
            type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
        }
    },
    legend: {
        data:['北洋舰队','日本联合舰队']
    },
    toolbox: {
        show : true,
        orient: 'vertical',
        x: 'right',
        y: 'center',
        feature : { 
            mark : {show: true},
            dataView : {show: true, readOnly: false},
            magicType : {show: true, type: ['line', 'bar', 'stack', 'tiled']},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    calculable : true,
    xAxis : [
        {
            type : 'category',
            data : ['定远 vs 吉野','镇远 vs 松岛','致远 vs 严岛','靖远 vs 桥力','经远 vs 秋津洲']
        }
    ],
    yAxis : [
        {
			axisLine:false,
			axisLabel:false
        }
    ],
    series : [
        {
            name:'北洋舰队',
            type:'bar',
			barMinHeight:5,
			itemStyle: {normal: { 
			label:{show:true,formatter:function(a,b,c){
						switch(b)
						{
							case '定远 vs 吉野':
							var res= c ;
							break;
							case '镇远 vs 松岛':
							var res= c ;
							break;
							case '致远 vs 严岛':
							var res= c ;
							break;
							case '靖远 vs 桥力':
							var res= c;
							break;
							case '经远 vs 秋津洲':
							var res= c;
							break;
						}
						return  res+'万两';
						}}
						//},textStyle:{color:'#27727B'}}
			}},
            data:[ 141, 141, 83, 83, 84]
        },
        {
            name:'日本联合舰队',
            type:'bar',
			barMinHeight:5,
			itemStyle : { normal: { color:'#00BFFF',
			label : {show: true, formatter:function(a,b,c){
						switch(b)
						{
							case '定远 vs 吉野':
							var res= c ;
							break;
							case '镇远 vs 松岛':
							var res= c ;
							break;
							case '致远 vs 严岛':
							var res= c ;
							break;
							case '靖远 vs 桥力':
							var res= c;
							break;
							case '经远 vs 秋津洲':
							var res= c;
							break;
						}
						return  res+'\n'+'万两';
						},position: 'inside'}}},
            data:[ 182, 160, 160, 160,137]
        }
    ]
});		
}

// (5) 军费对比
	var myChart4 ;
	function disposeWarship04(){
	    //setTimeout(disposeWarship04(),5000);
		if(myChart4)
		{
			myChart4.dispose();
			myChart4=false;
		}
	}
	function setOptionWarship04() {
	
	    var ec = require('echarts');
		myChart4 = ec.init(document.getElementById('warship04'));
        myChart4.setOption({
	    tooltip : {
        trigger: 'axis'
    },
    toolbox: {
        show : true,
        feature : {
            mark : {show: true},
            dataView : {show: true, readOnly: false},
            magicType: {show: true, type: ['line', 'bar']},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    calculable : true,
    legend: {
        data:['北洋舰队军费','日本海军军费','日中军费比值']
    },
    xAxis : [
        {
            type : 'category',
            data : ['1876年','1877年','1878年','1880年','1881年','1882年','1884年','1885年','1886年','1888年','1889年','1893年']
        }
    ],
    yAxis : [
        {
            type : 'value',
            name : '白银',
            axisLabel : {
                formatter: '{value} 万两'
            }
        },
        {
            type : 'value',
            name : '日本军费/北洋军费'
        }
    ],
    series : [

        {
            name:'北洋舰队军费',
            type:'bar',
            data:[200.0, 200.0, 57.0, 57.2, 410.6, 160.7, 210.6, 600.2, 198.6, 200.0, 200.4, 210.3],
			markLine:{
				data:[
					 {type : 'average', name: '平均值'}
				]
			}
        },
        {
            name:'日本海军军费',
            type:'bar',
            data:[400.0, 401.0, 200.0, 230.4, 600.7, 360.7, 670.6, 830.2, 760.7, 818.8, 1100.0, 760.3],
		  // data:[200.0, 200.0, 57.0, 57.2, 410.6, 160.7, 210.6, 600.2, 198.6, 200.0, 200.4, 210.3]
				markLine:{
				data:[
					 {type : 'average', name: '平均值'}
				]
			}
        },
        {
            name:'日中军费比值',
            type:'line',
            yAxisIndex: 1,
            data:[2.0, 2.005, 3.5, 4.03, 1.462, 2.245, 3.184, 1.383, 3.830,4.094, 5.49, 3.62]
        }
    ]

});
}

    // (5) Test部分
	var myChartbottom04 ;
	function disposeWarship04Test(){
	    //setTimeout(disposeWarship04Test(),5000);
		if(myChartbottom04)
		{
			myChartbottom04.dispose();
			myChartbottom04=false;
		}
	}
    function setOptionWarship04Test(){
		var ec = require('echarts');
		myChartbottom04 = ec.init(document.getElementById('warship04_bottom'));
        myChartbottom04.setOption({
		tooltip : {
        show: true,
        trigger: 'item'
    },
    legend: {
        data:['北洋舰队','日本海军']
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
    xAxis : [
        {
            type : 'category',
            data : ['舰队军费总投入']
        }
    ],
    yAxis : [
        {
            type : 'value',
            name : '白银',
            axisLabel : {
                formatter: '{value} 万两'
            }
        }
    ],
    series : [
        {
		    name:'北洋舰队',
            type:'bar',
            barWidth: 80,         
            itemStyle: {
                normal: { 
                    borderRadius: 5,
                    color : (function (){
                        var zrColor = require('zrender/tool/color');
                        return zrColor.getLinearGradient(
                            0, 400, 0, 300,
                            [[0, 'green'],[1, '#FF8033']]
                        )
                    })(),
                    label : {
                        show : true,
                        textStyle : {
                            fontSize : '15',
                            fontFamily : '微软雅黑',
                            fontWeight : 'bold'
                        },
						formatter:function(a,b,c){
						var spendmony= c + '\n'+'万两';
						return  spendmony;
						}
						
                    }
                }
            },
            data:[{value:3300, 
			itemStyle : { normal: {label : {position: 'inside'}}}}
			]
        },
        {
            name:'日本海军',
            type:'bar',
            barWidth: 80,
            itemStyle: {
                normal: { 
                    borderRadius: 5,
                    color : (function (){
                        var zrColor = require('zrender/tool/color');
                        return zrColor.getLinearGradient(
                            0, 0, 1000, 0,
                            [[0, 'rgba(30,144,255,0.8)'],[1, '#00BFFF']]
                        )
                    })(),
                    label : {
                        show : true,
                        textStyle : {
                            fontSize : '15',
                            fontFamily : '微软雅黑',
                            fontWeight : 'bold'
                        },
						formatter:function(a,b,c){
						var spendmony= c + '\n'+'万两';
						return  spendmony;
						}
                    }
                }
            },
            data:[{value:8800, 
			itemStyle : { normal: {label : {position: 'inside'}}}}
			]
        }
    ]
		});

}
























