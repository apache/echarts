	require.config({
        paths:{ 
		     echarts: '../../www/js'  
        }
    });

    require(
        [
            'echarts',
            'echarts/chart/bar',
            'echarts/chart/line'
        ]
    );
	
	// setTimeout 时间延迟5s 看起来更加流畅
	var bigmyChart ;
	//var timer=null;
	
	function disposeBigwar(){

	    //timer=setTimeout(disposeBigwar(),5000);
		if(bigmyChart)
		{
			bigmyChart.dispose();
			bigmyChart=false;
			//clearTimeout(timer);
		}
	}
     	
	
    function setOptionBigwar(){
	    var ec = require('echarts');
        bigmyChart = ec.init(document.getElementById('bigwarship00'));
		var idx=1;
        bigmyChart.setOption({
        timeline : {
		type: 'number',
        data : [12.50,13.10,13.50,14.55,15.10,15.20,16.10,16.50,17.30],
        label: {
            formatter: function(v){
                //return '00:'+ (v > 10 ? v : ('0' + v))
				//也可以拆封字符串
				var num=Math.floor(((v-Math.floor(v))*100));
				return Math.floor(v)+':'+(num>10?num:('0'+num));
            }
        },
		autoPlay : true,
		checkpointStyle: {
			color: '#adff2f'
		},
        playInterval : 5000
      },
    options : [
        {
		        title : {
				text: '大海战全程动态示意图',
				textStyle: {
				color: '#FFFF00'
				},
				subtextStyle: {
					color: '#fff'
				},
				subtext:'BATTLE OF THE YALU RIVER'
				
				},
				tooltip : {
				trigger: 'axis',
				showDelay : 0,
				axisPointer:{
					type : 'cross',
					lineStyle: {
						color:'#fff',
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
			grid: {
				borderWidth: 0,
				x: 10,
				x2: 10
			},
			xAxis : [
				{
					axisLine:false,
					axisLabel:false,
					type : 'value',
					name:'排水量/吨',
					power: 1,
					precision: 2,
					scale:true,
					splitNumber:10,
					min:0,
					max:800,
					splitLine:{
						show:false
					}
				}
			],
			yAxis : [
				{
				    axisLine:false,
					axisLabel:false,
					type : 'value',
					name:'速度/节',
					power: 1,
					precision: 2,
					scale:true,
					min:0,
					max:600,
					splitNumber:10,
					splitLine:{
						show:false
					}
				}
			],
			animationEasing: 'Linear',
			series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [727.46, 566.12]},
					{name: '扬威',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [701.69,540.32]},
					{name: '靖远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [682.71,515.82]},
					{name: '来远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [662.3,486.4]},
					{name: '镇远',kenerRotate:90,symbolSize:15,itemStyle:{normal:{color:'red',label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [650.17,448.67]},
					{name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					value: [590.17,428.67]},//镇远舰
					{name: '定远',kenerRotate:90,symbolSize:15,itemStyle:{normal:{color:'red',label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [644.75,410.61]},
					{name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					value: [590.17,390.37]},//定远舰
					{name: '经远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [662.3,376.8]},
					{name: '致远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [682.71,345.71]},
					{name: '济远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [701.69,321.22]},
					{name: '广甲',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [723.39,294.22]},
					 {name: '日本舰队以单纵队向北洋舰队逼近，北洋舰队以横队应对。12时50分，北洋舰队旗舰定远舰在5000米\n距离上抢先开火。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							position:'right',
							formatter : '{b}',
							textStyle:{color:'blue'}
							}
					   }
					},
					data: [
					{name: '西京丸',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [107.8,167.14]},
					{name: '赤城',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [72.54, 114.49]},
					{name: '比睿',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [185.01,210.12]},
					 {name: '扶桑',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [168.01,162.69]},
					 {name: '松岛',kenerRotate:-30,itemStyle:{normal:{color:'blue',label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [274.58,392.45]},
					 {name: '桥立',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [208.1,262.64]},
					 {name: '千代田',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [247.46,341.02]},
					 {name: '严岛',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [231.19,310.4]},
					 {name: '吉野',kenerRotate:-45,itemStyle:{normal:{color:'blue',label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [261.02,505.1]},
					 {name: '高千惠',kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [218.98,470.82]},
					 {name: '秋津洲',kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [178.31,426.73]},
					 {name: '浪速',kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [148.83,388.65]}
					]
				}
			  ]
        },
        {
		//02
      series : [
				
				{
					name:'北洋舰队',
					data: [
					{name: '超勇',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [543.05,512.32]},
					{name: '靖远',symbolSize:10,kenerRotate:75,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [540.4,491.82]},
					{name: '来远',symbolSize:10,kenerRotate:75,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [526.4,470.4]}, 
					{name: '镇远',symbolSize:15,kenerRotate:90,itemStyle:{normal:{color:'red',label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [502.17,443.67]},
					{name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					value: [448.17,418.67]},//镇远舰
					{name: '定远',symbolSize:15,kenerRotate:90,itemStyle:{normal:{color:'red',label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [502.75,410.61]},
					{name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					value: [448.17,390.37]},//定远舰
					{name: '经远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [526.3,376.8]},
					{name: '致远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [526.3,344.71]},
					{name: '济远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [552.54,321.22]},
					{name: '广甲',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [552.54,294.22]},
					 {name: '日舰装有大量速射炮，火力凶猛。定远舰很快就被击中，提督丁汝昌负伤，仅10分钟后超勇即战沉，扬\n威也燃起大火。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					data: [
					 {name: '西京丸',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [117.29,202.14]},
					{name: '赤城',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [86.1, 151.49]},
					{name: '比睿',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [201.1,262.64]},
					 {name: '扶桑',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [180.01,210.12]},
					 {name: '松岛',kenerRotate:-30,itemStyle:{normal:{color:'blue',label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [297.63,440.2]},
					 {name: '桥立',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [225.19,310.4]},
					 {name: '千代田',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [263.73,389.82]},
					 {name: '严岛',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [239.46,341.02]},
					 {name: '吉野',kenerRotate:-60,itemStyle:{normal:{color:'blue',label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [461.1,565.24]},
					 {name: '高千惠',kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [410.17,556.53]},
					 {name: '秋津洲',kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [349.15,530.82]},
					 {name: '浪速',kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [301.69,512.45]}
					]
				}
				
            ]
        },
        {
		//03
       series : [
					{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					{name: '靖远',symbolSize:10,kenerRotate:75,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,491.82]},
					{name: '来远',symbolSize:10,kenerRotate:75,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,470.4]},
					{name: '镇远',symbolSize:15,kenerRotate:90,itemStyle:{normal:{color:'red',label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [341.75,443.67]},
					{name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,423.67]},//镇远舰
					{name: '定远',symbolSize:15,kenerRotate:90,itemStyle:{normal:{color:'red',label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [339.75,410.61]},
					{name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					value: [295.17,390.61]},//定远舰
					 {name: '经远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [350.93,376.8]},
					 {name: '致远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,344.71]},
					 {name: '济远',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [374.91,321.22]},
					 {name: '广甲',symbolSize:10,kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [375.54,294.22]},
					 {name: '日方弱舰因航速慢，与大队脱离，北洋多舰围攻。但北洋炮弹多为实心弹，威力有限，比睿等舰被命中多弹，\n仍成功逃脱。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:10,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					{name: '赤城',symbolSize:10,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					{name: '比睿',symbolSize:10,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:0,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [122.71,434.08]},
					 {name: '松岛',kenerRotate:-90,itemStyle:{normal:{color:'blue',label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [477.64,585.24]},
					 {name: '桥立',kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [311.19,577.35]},
					 {name: '千代田',kenerRotate:-90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [445.42,588.24]},
					 {name: '严岛',kenerRotate:-90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [387.12,588.24]},
					 {name: '吉野',kenerRotate:-90,itemStyle:{normal:{color:'blue',label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [741.05,585.24]},
					 {name: '高千惠',kenerRotate:-90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [707.12,588.24]},
					 {name: '秋津洲',kenerRotate:-90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [637.97,588.24]},
					 {name: '浪速',kenerRotate:-90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [596.93,588.24]}
					]
				}
            ]
        },
        {
		//04 
            series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					 {name: '靖远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,491.82]},
					 {name: '来远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,470.4]},
					 {name: '镇远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [341.75,443.67]},
					 {name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,423.67]},//镇远舰
					 {name: '定远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [339.75,410.61]},
					 {name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,390.61]},//定远舰
					 {name: '经远',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [350.93,376.8]},
					 {name: '致远',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,344.71]},
					 {name: '济远',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [374.91,321.22]},
					 {name: '广甲',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [375.54,294.22]},
					 {name: '14时15分过后，日本第一游击队向左回转，松岛、千代田、严岛、桥立、扶桑五舰向右回转，对北洋\n舰队形成包围之势，战况急转直下。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					 {name: '赤城',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					 {name: '比睿',symbolSize:0,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [745.08,477.98]},
					 {name: '松岛',kenerRotate:180,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,287.14]},
					 {name: '桥立',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,437.35]},
					 {name: '千代田',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,337.24]},
					 {name: '严岛',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,387.24]},
					 {name: '吉野',kenerRotate:90,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [336.95,588.24]},
					 {name: '高千惠',kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [387.32,588.24]},
					 {name: '秋津洲',kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [444.95,588.24]},
					 {name: '浪速',kenerRotate:90,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [503.73,588.24]}
					]
				}
            ]
        },
        {
		//05
            series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					 {name: '靖远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,491.82]},
					 {name: '来远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,470.4]},
					 {name: '镇远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [341.75,443.67]},
					 {name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,423.67]},//镇远舰
					 {name: '定远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [339.75,410.61]},
					 {name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,390.61]},//定远舰
					 {name: '经远',symbolSize:10,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [364.07,366.7 ]},
					 {name: '致远',symbolSize:10,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [296.27,397.35]},
					 {name: '济远',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [374.91,321.22]},
					 {name: '广甲',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [375.54,294.22]},
					 {name: '15时10分，定远舰舰艏被一枚240毫米炮弹击穿，燃起起火，暂时丧失战力。日本吉野、高千穗、秋津\n洲、浪速四舰趁机集火射击定远舰，情况危殆。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					 {name: '赤城',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					 {name: '比睿',symbolSize:0,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [745.08,477.98]},
					 {name: '松岛',kenerRotate:180,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,287.14]},
					 {name: '桥立',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,437.35]},
					 {name: '千代田',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,337.24]},
					 {name: '严岛',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [745.08,387.24]},
					 
					 //第一舰队
					 {name: '吉野',kenerRotate:135,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [232.54,498.98]},
					 {name: '高千惠',kenerRotate:130,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [267.8,530.82]},
					 {name: '秋津洲',kenerRotate:120,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [311.85,550.18]},
					 {name: '浪速',kenerRotate:100,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [362.37,555.31]}
					]
				}
            ]
        },
        {
		//06
            series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					 {name: '靖远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,491.82]},
					 {name: '来远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,470.4]},
					 {name: '镇远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [341.75,443.67]},
					 {name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,423.67]},//镇远舰
					 {name: '定远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [339.75,410.61]},
					 {name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,390.61]},//定远舰
					 {name: '经远',symbolSize:10,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [364.07,366.7]},
					 {name: '致远',symbolSize:0,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [296.27,397.35]},
					 {name: '济远',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [320.68,363.06]},
					 {name: '广甲',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [307.12,333.67]},
					 {name: '危急时刻，致远舰加速前出，以吸引日舰火力保护旗舰定远。致远在向日舰冲击时不幸中弹爆炸，侧翻沉没,\n舰长邓世昌选择与舰同沉，壮烈殉国。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					 {name: '赤城',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					 {name: '比睿',symbolSize:0,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:0,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [708.85,453.67]},
					 {name: '松岛',kenerRotate:160,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [618.98,470.82]},
					 {name: '桥立',kenerRotate:0,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [708.85,490.41]},
					 {name: '千代田',kenerRotate:135,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [643.39,503.88]},
					 {name: '严岛',kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [684.07,521.02]},
					 
					 //第一舰队
					 {name: '吉野',kenerRotate:135,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [205.42,461.02]},
					 {name: '高千惠',kenerRotate:130,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [247.46,508.78]},
					 {name: '秋津洲',kenerRotate:120,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [286.78,541.84]},
					 {name: '浪速',kenerRotate:100,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [330.17,554.08]}
					]
				}
            ]
        },
        {
		//07
            series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					 {name: '靖远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,491.82]},
					 {name: '来远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,470.4]},
					 {name: '镇远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [341.75,443.67]},
					 {name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,423.67]},//镇远舰
					 {name: '定远',symbolSize:15,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [339.75,410.61]},
					 {name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [295.17,390.61]},//定远舰
					 {name: '经远',kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [364.07,366.7]},
					 {name: '致远',symbolSize:0,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [296.27,397.35]},
					 {name: '济远',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [385.68,403.06]},
					 {name: '广甲',symbolSize:10,kenerRotate:65,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [376.12,391.67]},
					 {name: '致远沉没后，济远、广甲临阵脱逃，经远等舰也因起火陆续撤离。15时30分，镇远舰一发305毫米巨弹\n命中日方旗舰松岛。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					 {name: '赤城',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					 {name: '比睿',symbolSize:0,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:0,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [708.85,453.67]},
					 {name: '松岛',kenerRotate:160,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [618.98,470.82]},
					  {name: '桥立',kenerRotate:0,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [708.85,490.41]},
					 {name: '千代田',kenerRotate:135,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [643.39,503.88]},
					 {name: '严岛',kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [684.07,521.02]},
					
					 //第一舰队
					 {name: '吉野',kenerRotate:135,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [205.42,461.02]},
					 {name: '高千惠',kenerRotate:130,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [247.46,508.78]},
					 {name: '秋津洲',kenerRotate:120,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [286.78,541.84]},
					 {name: '浪速',kenerRotate:100,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [330.17,554.08]}
					]
				}
            ]
        },
        {
		//08
            series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					 {name: '靖远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,491.82]},
					 {name: '来远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [351.3,470.4]},
					 {name: '镇远',symbolSize:15,kenerRotate:-115,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [360,430.41]},
					 {name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [405.17,410.67]},//镇远舰
					 {name: '定远',symbolSize:15,kenerRotate:-105,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [339.75,410.61]},
					 {name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [392.17,380.61]},//定远舰
					 {name: '经远',symbolSize:10,kenerRotate:5,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [285.05,418.24]},
					 {name: '致远',symbolSize:0,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [296.27,397.35]},
					 {name: '济远',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [294.92,366.73]},
					 {name: '广甲',symbolSize:10,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [263.22,396.67]},
					 {name: '吉野等舰选择追击北洋逃舰。而战场中央，日方5舰30余门速射炮不停开火，定镇两舰上弹如雨下、烈火熊\n熊，但北洋官兵边救火边还击，奉陪到底。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
					
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					 {name: '赤城',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					 {name: '比睿',symbolSize:0,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [600,453.67]},
					 {name: '松岛',kenerRotate:180,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [600,251.63]},
					{name: '桥立',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [600,402.41]},
					{name: '千代田',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [600,301.63]},
					 {name: '严岛',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [600,351.02]},
					 
					 //第一舰队
					 {name: '吉野',kenerRotate:-90,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [189.15,240.61]},
					 {name: '高千惠',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [162.03,272.45]},
					 {name: '秋津洲',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [162.03,320.2]},
					 {name: '浪速',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [162.03,367.96]}
					]
				}
            ]
        },
        {
		//09
            series : [
				{
					name:'北洋舰队',
					type:'scatter',
					symbolSize:10,
					symbol:'diamond',
					kenerRotate:90,
					itemStyle: {
					normal : {
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'black'}
							}
					   }
					},
					data: [
					{name: '超勇',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [563.46, 535.12]},
					{name: '扬威',symbolSize:0,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					value: [543.05,512.32]},
					 {name: '靖远',symbolSize:10,kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [494.24,572.45]},
					 {name: '来远',symbolSize:10,kenerRotate:-45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [529.49,574.9]},
					 {name: '镇远',symbolSize:15,kenerRotate:-165,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [391.19,349.59]},
					 {name: '镇远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [436.17,329.67]},//镇远舰
					 {name: '定远',symbolSize:15,kenerRotate:-175,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [369.48,309.18]},
					 {name: '定远舰',kenerRotate:0,symbolSize:0,itemStyle:{normal:{color:'red',label:{show:true,textStyle:{fontSize:'12',color:'red'}}}},
					 value: [410.17,280.61]},//定远舰
					 {name: '经远',symbolSize:0,kenerRotate:5,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [285.05,418.24]},
					 {name: '致远',symbolSize:0,kenerRotate:45,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [296.27,397.35]},
					 {name: '济远',symbolSize:0,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [294.92,366.73]},
					 {name: '广甲',symbolSize:0,kenerRotate:25,itemStyle:{normal:{label:{show:false,textStyle:{fontSize:'12'}}}},
					 value: [263.22,396.67]},
					 {name: '日方吉野等舰随后又击沉经远舰。至17时30分，日方松岛等舰对定远、镇远的高强度炮击已持续近两小时\n，定镇仍岿然不动。日方上下深感绝望，司令伊东祐亨担心僵持下去会遭鱼雷艇夜袭，遂下令撤离。',
					 kenerRotate:0,symbolSize:1,itemStyle:{normal:{label:{show:true,textStyle:{fontSize:'12'}}}},
					 value: [400.68,2.0]}
					]
				},
				{
					name:'日本联合舰队',
					type:'scatter',
					symbol:'diamond',
					symbolSize:10,
					itemStyle: {
					normal : {
					    color:'#27727B',
						label : {
							show: true,
							formatter : '{b}',
							textStyle:{color:'#27727B'}
							}
					   }
					},
					data: [
					 {name: '西京丸',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [94.24,330]},
					 {name: '赤城',symbolSize:0,kenerRotate:30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [124.07, 260.2]},
					 {name: '比睿',symbolSize:0,kenerRotate:-30,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [483.39,350.82]},
					 {name: '扶桑',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value:  [570,453.67]},
					 {name: '松岛',kenerRotate:180,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [570,251.63]},
					  {name: '桥立',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [570,402.41]},
					 {name: '千代田',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [570,301.63]},
					 {name: '严岛',kenerRotate:180,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [570,351.02]},
					
					 //第一舰队
					 {name: '吉野',kenerRotate:40,itemStyle:{normal:{label:{show:true,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [181.02,519.8]},
					 {name: '高千惠',kenerRotate:40,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [185.08,485.51]},
					 {name: '秋津洲',kenerRotate:40,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [194.58,450]},
					 {name: '浪速',kenerRotate:40,itemStyle:{normal:{label:{show:false,textStyle:{color:'#27727B',fontSize:'12'}}}},
					 value: [204.42,407.14]}
					]
				}
            ]
        }
    ]
    }
  );
 }
		
