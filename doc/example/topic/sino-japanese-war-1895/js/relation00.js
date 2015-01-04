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
			'echarts/chart/force'
        ]
    );
	 // load function 
	 
	 //(1) relations 秦朝
	var relation0;
	
	function disposeRelation00(){
	    //setTimeout(disposeRelation00(),5000);
		if(relation0)
		{
			relation0.dispose();
			relation0=false;
		}
		disposeRelation01();// dispose
	}
	
    function setOptionRelation00() {
        
		setOptionRelation01();
		var ec = require('echarts');
        relation0 = ec.init(document.getElementById('relation00'));
        relation0.setOption({
			title : {
			text: '清廷内部，深陷“党”争',
			subtext: '数据来自戚其章：《甲午战争史》',
			x:'right',
			y:'bottom'
		},
		tooltip : {
			trigger: 'item',
			formatter: '{a} : {b}'
		},
		toolbox: {
			show : true,
			feature : {
				restore : {show: true},
				saveAsImage : {show: true}
			}
		},
		legend: {
			x: 'left',
			data:['主战派','主和派']
		},
		series : [
			{
				type:'force',
				name : "人物关系",
				categories : [
					{
						name: '决策人物'
					},
					{
						name: '主战派'
					},
					{
						name:'主和派'
					}
				],
				itemStyle: {
					normal: {
						label: {
							show: true,
							textStyle: {
								color: '#333'
							}
						},
						nodeStyle : {
							brushType : 'both',
							strokeColor : 'rgba(255,215,0,0.4)',
							lineWidth : 1
						}
					},
					emphasis: {
						label: {
							show: false
						},
						nodeStyle : {
							//r: 30
						},
						linkStyle : {}
					}
				},
				useWorker: false,
				minRadius : 15,
				maxRadius : 25,
				gravity: 1.1,
				scaling: 1.1,
				linkSymbol: 'arrow',
				nodes:[
					{category:0, name: '慈禧太后', value : 10},
					{category:1, name: '光绪帝',value : 8},
					{category:1, name: '裕绂',value : 3},
					{category:1, name: '叶应增',value : 3},
					{category:1, name: '翁同龢',value : 7},
					{category:1, name: '志锐',value : 5},
					{category:2, name: '李鸿章',value : 8},
					{category:2, name: '奕昕',value : 6},
					{category:2, name: '陈京莹',value : 4},
					{category:2, name: '聂士成',value : 4},
					{category:2, name: '叶志超',value : 1},
				],
				links : [
					{source : '光绪帝', target : '慈禧太后', weight : 1},
					{source : '裕绂', target : '慈禧太后', weight : 2},
					{source : '叶应增', target : '慈禧太后', weight : 1},
					{source : '翁同龢', target : '慈禧太后', weight : 2},
					{source : '光绪帝', target : '翁同龢', weight : 5},
					{source : '志锐', target : '慈禧太后', weight : 3},
					{source : '李鸿章', target : '慈禧太后', weight : 6},
					{source : '奕昕', target : '慈禧太后', weight : 6},
					{source : '陈京莹', target : '慈禧太后', weight : 2},
					{source : '聂士成', target : '慈禧太后', weight : 1},
					{source : '叶志超', target : '慈禧太后', weight : 1},
					{source : '叶应增', target : '翁同龢', weight : 1},
					{source : '李鸿章', target : '光绪帝', weight : 1},
					{source : '李鸿章', target : '翁同龢', weight : 1},
					{source : '聂士成', target : '李鸿章', weight : 1},
					{source : '奕昕', target : '李鸿章', weight : 6}
				]
			}
		]
            });

}

	// relation (2) 日本人物
	var relation1;
	
	function disposeRelation01(){
	    setTimeout(disposeRelation01(),5000);
		if(relation1)
		{
			relation1.dispose();
			relation1=false;
		}
	}
    function setOptionRelation01() {
		
		var ec = require('echarts');
        relation1 = ec.init(document.getElementById('relation01'));
        relation1.setOption({
			title : {
			text: '日本：即使找不到正当借口也誓要兴战',
			subtext: '数据来自日本外务省编：《日本外交文书》',
			x:'right',
			y:'bottom'
		},
		tooltip : {
			trigger: 'item',
			formatter: '{a} : {b}'
		},
		toolbox: {
			show : true,
			feature : {
				restore : {show: true},
				saveAsImage : {show: true}
			}
		},
		legend: {
			x: 'left',
			data:['关键人物']
		},
		series : [
			{
				type:'force',
				name : "人物关系",
				categories : [
					{
						name: '决策人物'
					},
					{
						name: '关键人物'
					}
				],
				itemStyle: {
					normal: {
						label: {
							show: true,
							textStyle: {
								color: '#333'
							}
						},
						nodeStyle : {
							brushType : 'both',
							strokeColor : 'rgba(255,215,0,0.4)',
							lineWidth : 1
						}
					},
					emphasis: {
						label: {
							show: false
							// textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
						},
						nodeStyle : {
							//r: 30
						},
						linkStyle : {}
					}
				},
				useWorker: false,
				minRadius : 15,
				maxRadius : 25,
				gravity: 1.1,
				scaling: 1.1,
				linkSymbol: 'arrow',
				nodes:[
					{category:0, name: '日本天皇', value : 10},
					{category:1, name: '坪井航三',value : 2},
					{category:1, name: '上村彦之丞',value : 3},
					{category:1, name: '东乡平八郎',value : 3},
					{category:1, name: '桦山资纪',value : 6},
					{category:1, name: '陆奥宗光',value : 5},
					{category:1, name: '伊东祐亨',value : 7},
					{category:1, name: '伊藤博文',value : 9},
					{category:1, name: '山县有朋',value : 6}
				],
				links : [
					{source : '坪井航三', target : '日本天皇', weight : 1},
					{source : '上村彦之丞', target : '日本天皇', weight : 2},
					{source : '东乡平八郎', target : '日本天皇', weight : 1},
					{source : '桦山资纪', target : '日本天皇', weight : 2},
					{source : '陆奥宗光', target : '日本天皇', weight : 3},
					{source : '伊东祐亨', target : '日本天皇', weight : 6},
					{source : '伊藤博文', target : '日本天皇', weight : 6},
					{source : '东乡平八郎', target : '上村彦之丞', weight : 1},
					{source : '伊东祐亨', target : '上村彦之丞', weight : 1},
					{source : '伊东祐亨', target : '东乡平八郎', weight : 1},
					{source : '伊东祐亨', target : '桦山资纪', weight : 1},
					{source : '山县有朋', target : '日本天皇', weight : 1},
					{source : '伊藤博文', target : '陆奥宗光', weight : 6},
					{source : '伊藤博文', target : '东乡平八郎', weight : 1},
					{source : '山县有朋', target : '伊藤博文', weight : 5}
				]
			}
		]
            });

}
