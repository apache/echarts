//经济指标命名映射
var eNameMap = {
    'GDP' : 'GDP',
    'Financial' : '金融',
    'Estate' : '房地产',
    'PI' : '第一产业',
    'SI' : '第二产业',
    'TI' : '第三产业'
};
//颜色映射
var eColorMap = {
    'GDP' : '#1e90ff',
    'Financial' : '#ff7f50',
    'Estate' : '#da70d6',
    'PI' : '#32cd32',
    'SI' : '#6495ed',
    'TI' : '#ff69b4'
};
//---------

var developMode = false;
if (developMode) {
    // for develop
    require.config({
        packages: [
            {
                name: 'echarts',
                location: '../../../../src',
                main: 'echarts'
            },
            {
                name: 'zrender',
                //location: 'http://ecomfe.github.io/zrender/src',
                location: '../../../../../zrender/src',
                main: 'zrender'
            }
        ]
    });
}
else {
    var fileLocation = '../../www/js/echarts-map';
    require.config({
        paths:{ 
            echarts:fileLocation,
            'echarts/chart/bar' : fileLocation,
            'echarts/chart/line': fileLocation,
            'echarts/chart/scatter': fileLocation,
            'echarts/chart/k': fileLocation,
            'echarts/chart/pie': fileLocation,
            'echarts/chart/radar': fileLocation,
            'echarts/chart/map': fileLocation,
            'echarts/chart/chord': fileLocation,
            'echarts/chart/force': fileLocation
        }
    });
}


var EC_READY = false;
var myChart0;
require(
    [
        'echarts',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        //'echarts/chart/k',
        'echarts/chart/pie',
        'echarts/chart/radar',
        //'echarts/chart/force',
        //'echarts/chart/chord',
        'echarts/chart/map'
    ],
    function (ec) {
        EC_READY = true;
        myChart0 = ec.init(document.getElementById('g0')).setOption(option0()); 
        showTabContent(1);
    }
);

var curTabIdx = 1;
$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    // e.target // activated tab
    // e.relatedTarget // previous tab
    if (!EC_READY) {
        return;
    }
    hideTabContent(curTabIdx);
    curTabIdx = e.target.id.replace('tab','');
    showTabContent(curTabIdx);
});

var curYear = '2002';
$('button').on('click', function (e) {
    $('#' + curYear)[0].className = 'btn btn-info';
    curYear = e.target.id;
    $('#' + curYear)[0].className = 'btn btn-success';
    showTabContent(curTabIdx);
});

var curEIndex = 'GDP';
$('input:radio[name="optionsRadios"]').on('change', function (e) {
    curRange = false;
    curEIndex = e.target.value;
    showTabContent(curTabIdx);
});

var functionMap = {};
function showTabContent(idx) {
    functionMap['chart' + idx](idx);
}
function hideTabContent(idx) {
    functionMap['chart' + idx + 'dispose'](idx);
}

// last chart
var myChart3;
var curSelected = {
    'GDP' : true,
    '金融' : false,
    '房地产' : true,
    '第一产业' : false,
    '第二产业' : false,
    '第三产业' : false
};
functionMap.chart3 = function (idx) {
    functionMap.chart3dispose(idx);
    myChart3 = require('echarts').init(document.getElementById('g' + idx));
    myChart3.setOption(option1(curSelected));
    // 图例状态保持
    myChart3.on(require('echarts/config').EVENT.LEGEND_SELECTED, function (param){
        curSelected = param.selected;
    });
}
functionMap.chart3dispose = function () {
    if (myChart3) {
        myChart3.dispose();
        myChart3 = false;
    }
}

// second chart
var myChart20;
var myChart21;
var myChart22;
var myChart23;
var myChart24;
var myChart25;
functionMap.chart2 = function (idx) {
    functionMap.chart2dispose(idx);
    var ec = require('echarts');
    myChart20 = ec.init(document.getElementById('g20'));
    myChart21 = ec.init(document.getElementById('g21'));
    myChart22 = ec.init(document.getElementById('g22'));
    myChart23 = ec.init(document.getElementById('g23'));
    myChart24 = ec.init(document.getElementById('g24'));
    myChart25 = ec.init(document.getElementById('g25'));
    
    myChart20.setOption(option2('GDP'));
    myChart21.setOption(option2('Financial'));
    myChart22.setOption(option2('Estate'));
    myChart23.setOption(option2('PI'));
    myChart24.setOption(option2('SI'));
    myChart25.setOption(option2('TI'));
}
functionMap.chart2dispose = function () {
    if (myChart20) {
        myChart20.dispose();
        myChart21.dispose();
        myChart22.dispose();
        myChart23.dispose();
        myChart24.dispose();
        myChart25.dispose();
        myChart20 = false; 
        myChart21 = false;
        myChart22 = false;
        myChart23 = false;
        myChart24 = false;
        myChart25 = false;
    }
}

// first chart
var myChart1;
var curRange = false;
functionMap.chart1 = function (idx) {
    functionMap.chart1dispose(idx);
    myChart1 = require('echarts').init(document.getElementById('g' + idx));
    myChart1.setOption(option3(curEIndex));
}
functionMap.chart1dispose = function () {
    if (myChart1) {
        myChart1.dispose();
        myChart1 = false; 
    }
}
var resizeTicket;
window.onload = function () {
    window.onresize = function () {
        clearTimeout(resizeTicket);
        resizeTicket = setTimeout(function (){
            myChart0.resize();
            if (curTabIdx == 1) {
                myChart1.resize();
            }
            else if (curTabIdx == 2) {
                myChart20.resize();
                myChart21.resize();
                myChart22.resize();
                myChart23.resize();
                myChart24.resize();
                myChart25.resize();
            }
            else {
                
                myChart3.resize();
            }
        },200);
    }
}
