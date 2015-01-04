    require.config({
        paths:{ 
             echarts: '../../www/js'  
        }
    });


    require(
        [
            'echarts',
            'echarts/chart/bar',
        ]
    );
	//(1) national 
	
	var national ;
	function disposeNation00(){
	    //setTimeout(disposeNation00(),5000);
		if(national)
		{
			national.dispose();
			national=false;
		}
		disposeNation00Test();
	}
    	
    function setOptionNation00() {
	
	    setOptionNation00Test();
	
        var ec = require('echarts');
        national = ec.init(document.getElementById('national00'));
        national.setOption({
        
		title : {
        text: '中日战前国力对比',
        subtext: '数据来自新浪军事、腾讯军事'
    },
    tooltip : {
        trigger: 'axis'
    },
    legend: {
        data:['大清', '日本']
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
    xAxis : [
        {
            type : 'value',
            boundaryGap : [0, 0.01]
        }
    ],
    yAxis : [
        {
            type : 'category',
            data : ['人口总数','国土面积','年政府财政收入']
        }
    ],
    series : [
        {
		    name:'大清',
            type:'bar',
			barMinHeight:5,
			itemStyle : { normal: {  
					label : {
					formatter:function(a,b,c)
					{
					switch(b)
						{
							case '人口总数':
							var res_value=c+'万人口';
							break;
							case '国土面积':
							var res_value=c+'万平方公里';
							break;
							case '年政府财政收入':
							var res_value=c+'万两白银';
							break;
						}
					return res_value;
					},show: true,textStyle:{color:'#704214'}}}},
            data:[40000,1000, 8867]
			//itemStyle : { normal: {label : {position: 'inside'}}}
        },
        {
		  name:'日本',
            type:'bar',
			barMinHeight:5,
			itemStyle : { normal: {  
					label : {
					formatter:function(a,b,c)
					{
					switch(b)
						{
							case '人口总数':
							var res_value=c+'万人口';
							break;
							case '国土面积':
							var res_value=c+'万平方公里';
							break;
							case '年政府财政收入':
							var res_value=c+'万两白银';
							break;
						}
					return res_value;
					},
					show: true,textStyle:{color:'#008B8B'}}}},
            data:[4000, 37, 7885]
        }
    ]
});

}

//(2) national_Test  
var national_Test;
	function disposeNation00Test(){
	    //setTimeout(disposeNation00Test(),5000);
		if(national_Test)
		{
			national_Test.dispose();
			national_Test=false;
		}
		
	}
	
    function setOptionNation00Test() {
	
	var ec = require('echarts');
    national_Test = ec.init(document.getElementById('national00Test'));
    national_Test.setOption({
        
    title :{
        text : '战中、战后对比'
    },
    tooltip : {
        //trigger: 'axis'
		trigger: 'item'
    },
    legend: {
	    show:false,
	    x : 'center',
        y : 'bottom',
        data:['大清', '日本']
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
    xAxis : [
        {
            type : 'value',
            boundaryGap : [0, 0.01]
        }
    ],
    yAxis : [
        {
            type : 'category',
            data : ['动员兵力','炮舰数量','水雷艇','战舰总吨位','死伤总数']
        }
    ],
    series : [
        {
            name:'大清',
            type:'bar',
			barMinHeight:5,
			itemStyle : { normal: {  
					label : {
					formatter:function(a,b,c)
					{
					switch(b)
						{
								case '动员兵力':
								var res_value=c*10000+'人';
								break;
								case '炮舰数量':
								var res_value=c+'艘';
								break;
								case '水雷艇':
								var res_value=c+'艘';
								break;
								case '战舰总吨位':
								var res_value=c+'万吨';
								break;
								case '死伤总数':
								var res_value=c+'万人';
								break;
						}
					return res_value;
					},
					show: true,textStyle:{color:'#008B8B'}}}},
            data:[96.2463,82,25,8.5000,3.5000]
			//itemStyle : { normal: {label : {position: 'inside'}}}
        },
        {
		    name:'日本',
            type:'bar',
			barMinHeight:5,
			itemStyle : { normal: {  
					label : {
					formatter:function(a,b,c)
					{
					switch(b)
						{
							case '动员兵力':
								var res_value=c*10000+'人';
								break;
								case '炮舰数量':
								var res_value=c+'艘';
								break;
								case '水雷艇':
								var res_value=c+'艘';
								break;
								case '战舰总吨位':
								var res_value=c+'万吨';
								break;
								case '死伤总数':
								var res_value=c*10000+'人';
								break;
						}
					return res_value;
					},show: true,textStyle:{color:'#704214'}}}},
            data:[24.0616,28,24,5.9106,1.3488]
        }
    ]
   
	   
		});

}
  