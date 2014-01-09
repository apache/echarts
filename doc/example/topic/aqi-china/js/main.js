var developMode = true;
if (developMode) {
    // for develop
    require.config({
        paths: {air: 'http://echarts.iconpng.com/china'},
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
            air: 'http://echarts.iconpng.com/china',
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
var DATA_READY = false;
var myChart0;
var myChart1;
var myChart20;
var myChart21;
var myChart22;
var myChart3;
require(
    [
        'echarts',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        'echarts/chart/radar',
        'echarts/chart/map'
    ],
    function(ec) {
        EC_READY = true;
        myChart0 = ec.init(document.getElementById('g0')).showLoading({effect:'bubble'});
        myChart1 = ec.init(document.getElementById('g1')).showLoading({effect:'bubble'});
        myChart20 = ec.init(document.getElementById('g20')).showLoading({effect:'bubble'});
        myChart21 = ec.init(document.getElementById('g21')).showLoading({effect:'bubble'});
        myChart22 = ec.init(document.getElementById('g22')).showLoading({effect:'bubble'});
        myChart3 = ec.init(document.getElementById('g3')).showLoading({effect:'bubble'});
        
        require(
            ['air'],
            function (airData) {
                DATA_READY = true;
                
                var zrColor = require('zrender/tool/color');
                var ecConfig = require('echarts/config');
                var color = ecConfig.color;
                var cidx = 0;
                for (var city in PG) {
                    PG[city].color = zrColor.alpha(
                        //zrColor.getColor(cidx++),
                        color[cidx++ % color.length], 
                        0.6
                    );
                }
                //console.log(airData);
                data.format(airData,testData);
                showTabContent(0, oCurTabIdx);
                showTabContent(1);
                showTabContent(2);
                showTabContent(3, rCurTabIdx);
                myChart0.on(ecConfig.EVENT.MAP_ROAM, extMark);
            }
        );
    }
);

var oCurTabIdx = 'aqi';
var rCurTabIdx = 'aqi';
$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    // e.target // activated tab
    // e.relatedTarget // previous tab
    if (!EC_READY || !DATA_READY) {
        return;
    }
    if (e.target.id.match('o-')) {
        // overview
        oCurTabIdx = e.target.id.replace('o-','');
        showTabContent(0, oCurTabIdx);
    }
    else {
        // ranking
        rCurTabIdx = e.target.id.replace('r-','');
        showTabContent(3, rCurTabIdx);
    }
});

var functionMap = {};
function showTabContent(idx, type) {
    functionMap['chart' + idx](type);
}

var shapeList = [];
var dataWorst;
var overviewContent = {
    aqi : [
        'AQI（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ],
    pm25 : [
        'PM2.5（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ],
    pm10 : [
        'PM10（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ],
    co : [
        'CO（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ],
    no2 : [
        'NO2（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ],
    o3 : [
        'O3（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ],
    so2 : [
        'SO2（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。'
    ]
}
functionMap.chart0 = function (type) {
    myChart0.setOption(option0(type));
    dataWorst = data[type];
    setTimeout(extMark, 200);
    $('#overview-head')[0].innerHTML = overviewContent[type][0];
    $('#overview-content')[0].innerHTML = overviewContent[type][1];
}

function extMark() {
    var map = myChart0.chart.map;
    if (!map.geo2pos('china','北京')) {
        setTimeout(extMark, 200);
        return;
    }
    var zr = myChart0.getZrender();
    zr.delShape(shapeList);
    shapeList = [];
    var x = Math.round(zr.getWidth() - 130);
    var y = 50;
    var pos;
    var city;
    var len = dataWorst.length;
    for (var i = len - 1, l = len - 2; i > l; i--) {
        // 最差10位
        city = dataWorst[i].name;
        pos = map.getPosByGeo('china', cityGeo[city]);
        //pos = map.geo2pos('china', cityGeo[city]);
        shapeList.push({
            shape : 'line',
            id : zr.newShapeId(),
            zlevel : 5,
            style : {
                xStart : pos[0],
                yStart : pos[1],
                xEnd : x,
                yEnd : pos[1],
                //textX : x,
                //textY : pos[1],
                strokeColor : 'orange',
                lineType : 'dashed',
                lineWidth : 1,
                text : city + ' : ' + dataWorst[i].value,
                textPosition: 'end'//'specific'
            }
        });
        y += 30;
    }
    for (var i = 0, l = shapeList.length; i < l; i++) {
        zr.addShape(shapeList[i])
    }
    zr.refresh();
    //map.appendShape('china', shapeList);
}

functionMap.chart1 = function () {
    myChart1.setOption(option1());
}

functionMap.chart2 = function () {
    myChart20.setOption(option2(0));
    myChart21.setOption(option2(1));
    myChart22.setOption(option2(2));
}

functionMap.chart3 = function (type) {
    myChart3.setOption(option3(type));
}

var resizeTicket;
window.onload = function() {
    window.onresize = function() {
        clearTimeout(resizeTicket);
        resizeTicket = setTimeout(function(){
            myChart0.resize();
            myChart1.resize();
            myChart20.resize();
            myChart21.resize();
            myChart22.resize();
            myChart3.resize();
        },200);
    }
}
