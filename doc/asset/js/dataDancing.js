require.config({
    paths:{ 
        echarts:'example/www/js/echarts',
        'echarts/chart/bar' : 'example/www/js/echarts',
        'echarts/chart/line': 'example/www/js/echarts',
        'echarts/chart/scatter': 'example/www/js/echarts'
    }
});
require(
    [
        'echarts',
        'echarts/chart/bar',
        'echarts/chart/line',
        'echarts/chart/scatter'
    ],
    function(ec) {
        myChart = ec.init(document.getElementById('main'));
        option = {
            title : {
                text: 'Data Dancing',
                x: 'center',
                textStyle: {
                    fontSize: 28
                }
            },
            toolbox: {
                show : true,
                feature : {
                    mark : true,
                    magicType:['line', 'bar'],
                    restore : true,
                    saveAsImage : true
                }
            },
            xAxis : [
                {
                    type : 'category',
                    axisLabel:{show:false},
                    data : (function() {
                        var res = [];
                        for (var i = 0; i < 30; i++) {
                            res.push(i);
                        }
                        return res;
                    })()
                }
            ],
            yAxis : [
                {
                    type : 'value',
                    splitNumber:6,
                    min:-30,
                    max:30,
                    power:1,
                    axisLine:{show:false},
                    axisLabel:{show:false},
                    splitArea : {show : true}
                }
            ],
            animationDuration: 3000,
            animationEasing: 'BounceOut',
            addDataAnimation : false,
            series : [
                {
                    name:'1',
                    type:'bar',
                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    symbol:'none',
                    barMinHeight:0,
                    data : dataDanceing[Math.floor(Math.random()*3)](1)
                },
                {
                    name:'2',
                    type:'bar',
                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    symbol:'none',
                    barMinHeight:0,
                    data : dataDanceing[Math.floor(Math.random()*3)](-1)
                }
            ]
        };
        danceStep1 = option.series[0].data;
        danceStep2 = option.series[1].data;
        start(ecReady = true);
    }
);

// ------------------------------------
var dataDanceing = [
    function(n) {
        var res = [];
        var p = Math.round(Math.random()*10) % 2 == 0;
        for (var i = 0; i < 30; i++) {
            res[p ? 'push' : 'unshift'](i * n);
        }
        //console.log('1--',res);
        return res;
    },
    function(n) {
        var res = [];
        var p = Math.round(Math.random()*10) % 2 == 0;
        for (var i = 0; i < 30; i++) {
            i % 2 == 0 
            ? res[p ? 'push' : 'unshift']((p ? i : (30 - i)) * n) 
            : res[p ? 'unshift' : 'push']((p ? i : (30 - i)) * n);
        }
        //console.log('2--',res);
        return res;
    },
    function(n) {
        var res = [];
        var p = Math.round(Math.random()*10) % 2 == 0;
        for (var i = 0; i < 60; i++) {
            res[p ? 'push' : 'unshift']((i - 30) * n);
        }
        //console.log('3--',res);
        return res;
    },
    function(n) {
        var res = [];
        var p = Math.round(Math.random()*10) % 2 == 0;
        for (var i = 0; i < 30; i++) {
            res[p ? 'push' : 'unshift']((i * n) * (i % 2 == 0 ? 1 : -1));
        }
        //console.log('3--',res);
        return res;
    }
];
var myChart;
var option;
var ecReady = false;
var password = false;
var mReady = false;
var danceStep1;
var danceStep2;
var timeTicket;
var playing = false;
function start(){
    if (ecReady && password && mReady && !playing) {
        if (!document.createElement('canvas').getContext) {
            alert('亲，换个浏览器吧');
            password = false;
            playing = false;
            return;
        }
        document.getElementById('main-wrap').className = 'ddshow';
        audioV3.play();
        playing = true;
        myChart.setOption(option, true);
        setTimeout(function(){
            timeTicket = setInterval(function(){
                if (danceStep1.length == 0 && playing) {
                    danceStep1 = dataDanceing[Math.floor(Math.random()*dataDanceing.length)](Math.round(Math.random()*10)%2==0?1:-1);
                }
                if (danceStep2.length == 0 && playing) {
                    danceStep2 = dataDanceing[Math.floor(Math.random()*dataDanceing.length)](Math.round(Math.random()*10)%2==0?1:-1);
                }
                if (danceStep1.length > 0 && danceStep2.length) {
                    // 动态数据接口 addData
                    myChart.addData([
                        [
                            0,        // 系列索引
                            danceStep1.pop(), // 新增数据
                            false,     // 新增数据是否从队列头部插入
                            false     // 是否增加队列长度，false则自定删除原有数据，队头插入删队尾，队尾插入删队头
                        ],
                        [
                            1,        // 系列索引
                            danceStep2.pop(), // 新增数据
                            false,    // 新增数据是否从队列头部插入
                            false,    // 是否增加队列长度，false则自定删除原有数据，队头插入删队尾，队尾插入删队头
                        ]
                    ]);
                }
                else {
                    clearInterval(timeTicket);
                    setTimeout(function(){
                        option.series[0].data = dataDanceing[1](1);
                        option.series[1].data = dataDanceing[1](-1);
                        var _backupSeries = option.series;
                        var es = [[],[2,3,4,5,6,7,8],[2,5,8],[2,5,8],[],[3,4,5,6,7],[2,8],[2,8],[],[2,3,4,5,6,7,8],[5],[2,3,4,5,6,7,8],[],[4,5,6,7,8],[2,3,6],[4,5,6,7,8],[],[2,3,4,5,6,7,8],[2,5],[2,3,4,6,7,8],[],[2],[2,3,4,5,6,7,8],[2],[],[3,4,8],[2,5,8],[2,6,7]];
                        var data= [];
                        for (var i = 0, l = es.length; i < l; i++) {
                            for (var j = 0, k = es[i].length; j < k; j++) {
                                data.push([i + 1, 4.5 * (8 - es[i][j]) + 2, 1])
                            }
                        }
                        option.series = [
                            {
                                type:'scatter',
                                symbol:'rectangle',
                                symbolSize:6,
                                data: data.splice(0,13)
                            },
                            {
                                type:'scatter',
                                symbol:'circle',
                                symbolSize:6,
                                data: data
                            },
                            {
                                type:'bar',
                                itemStyle: {normal: {
                                    color: (function(){
                                        var zrColor = require('zrender/tool/color');
                                        return zrColor.getLinearGradient(
                                            0, 200, 0, 400,
                                            [[0, 'rgba(144,238,144,0.8)'],[0.8, 'rgba(255,255,0,0.8)']]
                                        );
                                    })(),
                                    areaStyle: {type: 'default'}
                                }},
                                symbol:'none',
                                barMinHeight:0,
                                data : dataDanceing[1](-1)
                            }
                        ];
                        option.title.text= 'Welcome';
                        myChart.setOption(option, true);
                        option.series = _backupSeries;
                        option.title.text = 'Data Dancing';
                    },500);
                }
            }, 100);
        },3800);
    }
}

// --------------------
var audioV3 = document.getElementById('audioV3');
audioV3.addEventListener && audioV3.addEventListener(
    'ended',
    function(){
        playing = false;
    }
)
audioV3.addEventListener && audioV3.addEventListener(
    'canplaythrough',
    function() {
        start(mReady = true);
    }
);
audioV3.src = 'asset/img/dataDancing.mp3';

// -----------
var k = [101,99,104,97,114,116,115];
var progress = 0;
document.body.addEventListener && document.body.addEventListener(
    'keypress',
    function(p) {
        var curCode = p.keyCode;
        if (k[progress] == p.keyCode) {
            progress++;
        }
        else {
            progress = 0;
        }
        progress == k.length && start(password = true, progress = 0);
    }
)