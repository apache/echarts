var developMode = false;
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
    function (ec) {
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
                //airData = testData;
                $('#time')[0].innerHTML = airData[0].time_point.replace(/[T|Z]/g, ' ')
                var ecConfig = require('echarts/config');
                
                //console.log(airData);
                data.format(airData,testData);
                showTabContent(0, oCurTabIdx);
                showTabContent(1);
                showTabContent(2);
                showTabContent(3, rCurTabIdx);
                myChart0.on(ecConfig.EVENT.MAP_ROAM, extMark);
                
                myChart1.on(ecConfig.EVENT.LEGEND_SELECTED, legendShare);
                myChart1.on(ecConfig.EVENT.RESTORE, legendShare);
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

var extShapeList = [];
var dataWorst;
var overviewContent = {
    aqi : [
        'AQI（空气质量指数）',
        '空气质量指数（Air Quality Index，简称AQI）定义为定量描述空气质量状况的无量纲指数，其数值越大说明空气污染状况越严重，对人体健康的危害也就越大。参与空气质量评价的主要污染物为细颗粒物（pm2.5）、可吸入颗粒物（pm10）、二氧化硫（SO2）、二氧化氮（NO2）、臭氧（O3）、一氧化碳（CO）等六项。<br/><br/>2012年上半年出台规定，将用空气质量指数（AQI）替代原有的空气污染指数（API）。AQI共分六级，从一级优，二级良，三级轻度污染，四级中度污染，直至五级重度污染，六级严重污染。当PM2.5日均值浓度达到150微克/立方米时，AQI即达到200；当PM2.5日均浓度达到250微克/立方米时，AQI即达300；PM2.5日均浓度达到500微克/立方米时，对应的AQI指数达到500。',
        'http://baike.baidu.com/view/3251379.htm'
    ],
    pm25 : [
        'PM2.5（细颗粒物）',
        '细颗粒物又称细粒、细颗粒、PM2.5。细颗粒物指环境空气中空气动力学当量直径小于等于 2.5 微米的颗粒物，也称PM2.5、可入肺颗粒物。它能较长时间悬浮于空气中，其在空气中含量（浓度）越高，就代表空气污染越严重。虽然PM2.5只是地球大气成分中含量很少的组分，但它对空气质量和能见度等有重要的影响。与较粗的大气颗粒物相比，PM2.5粒径小，面积大，活性强，易附带有毒、有害物质（例如，重金属、微生物等），且在大气中的停留时间长、输送距离远，因而对人体健康和大气环境质量的影响更大。<br/><br/>2013年2月，全国科学技术名词审定委员会将PM2.5的中文名称命名为细颗粒物。细颗粒物的化学成分主要包括有机碳（OC）、元素碳（EC）、硝酸盐、硫酸盐、铵盐、钠盐（Na+）等。',
        'http://baike.baidu.com/view/4251816.htm'
    ],
    pm10 : [
        'PM10（可吸入颗粒物）',
        'PM10（particulate matter）有些颗粒物因粒径大或颜色黑可以为肉眼所见，比如烟尘。有些则小到使用电子显微镜才可观察到。通常把空气动力学当量直径在10微米以下的颗粒物称为PM10，又称为可吸入颗粒物或飘尘。可吸入颗粒物的浓度以每立方米空气中可吸入颗粒物的微克数表示。2012年1月10日北京出现大雾天，官方首次公布PM10最高浓度。<br/><br/>可吸入颗粒物（PM10）在环境空气中持续的时间很长，对人体健康和大气能见度影响都很大。　一些颗粒物来自污染源的直接排放，比如烟囱与车辆。另一些则是由环境空气中硫的氧化物、氮氧化物、挥发性有机化合物及其它化合物互相作用形成的细小颗粒物，它们的化学和物理组成依地点、气候、一年中的季节不同而变化很大。',
        'http://baike.baidu.com/view/941151.htm'
    ],
    co : [
        'CO（一氧化碳）',
        '标准状况下一氧化碳（carbon monoxide, CO）纯品为无色、无臭、无刺激性的气体。一氧化碳进入人体之后会和血液中的血红蛋白结合，产生碳氧血红蛋白，进而使血红蛋白不能与氧气结合，从而引起机体组织出现缺氧，导致人体窒息死亡，因此一氧化碳具有毒性。一氧化碳是无色、无臭、无味的气体，故易于忽略而致中毒。常见于家庭居室通风差的情况下，煤炉产生的煤气或液化气管道漏气或工业生产煤气以及矿井中的一氧化碳吸入而致中毒。<br/><br/> 最常见的一氧化碳中毒症状，如头痛，恶心，呕吐，头晕，疲劳和虚弱的感觉。一氧化碳中毒中毒症状包括视网膜出血，以及异常樱桃红色的血。 暴露在一氧化碳中可能严重损害心脏和中枢神经系统，会有后遗症。一氧化碳可能令孕妇胎儿产生严重的不良影响。',
        'http://baike.baidu.com/view/4705.htm'
    ],
    no2 : [
        'NO2（二氧化氮）',
        '二氧化氮（NO2）是一种棕红色、高度活性的气态物质。二氧化氮在臭氧的形成过程中起着重要作用。人为产生的二氧化氮主要来自高温燃烧过程的释放，比如机动车、电厂废气的排放等。 二氧化氮还是酸雨的成因之一，所带来的环境效应多种多样，包括：对湿地和陆生植物物种之间竞争与组成变化的影响，大气能见度的降低，地表水的酸化，富营养化（由于水中富含氮、磷等营养物藻类大量繁殖而导致缺氧）以及增加水体中有害于鱼类和其它水生生物的毒素含量。<br/><br/>氮氧化物主要损害呼吸道。吸入气体初期仅有轻微的眼及上呼吸道刺激症状，如咽部不适、干咳等。常经数小时至十几小时或更长时间潜伏期后发生迟发性肺水肿、成人呼吸窘迫综合征，出现胸闷、呼吸窘迫、咳嗽、咯泡沫痰、紫绀等。可并发气胸及纵隔气肿。肺水肿消退后两周左右可出现迟发性阻塞性细支气管炎。',
        'http://baike.baidu.com/view/77656.htm'
    ],
    o3 : [
        'O3（臭氧）',
        '臭氧（O3)是氧气（O2）的同素异形体，在常温下，它是一种有特殊臭味的蓝色气体。臭氧主要存在于距地球表面20~35公里的同温层下部的臭氧层中。在常温常压下，稳定性极差，在常温下可自行分解为氧气。臭氧具有强烈的刺激性，吸入过量对人体健康有一定危害。不可燃。化学性质是单质。纯净物。<br/><br/>低浓度的臭氧可消毒。一般森林地区臭氧浓度即可达到0.1ppm） 但超标的臭氧则是个无形杀手！在夏季，由于工业和汽车废气的影响，尤其在大城市周围和农林地区在地表臭氧会形成和聚集。地表臭氧对人体，尤其是对眼睛，呼吸道等有侵蚀和损害作用。地表臭氧也对农作物或森林有害。',
        'http://baike.baidu.com/view/18827.htm'
    ],
    so2 : [
        'SO2（二氧化硫）',
        '二氧化硫（SO2）是最常见的硫氧化物。无色气体，有强烈刺激性气味。大气主要污染物之一。火山爆发时会喷出该气体，在许多工业过程中也会产生二氧化硫。由于煤和石油通常都含有硫化合物，因此燃烧时会生成二氧化硫。当二氧化硫溶于水中，会形成亚硫酸（酸雨的主要成分）。若把SO2进一步氧化，通常在催化剂如二氧化氮的存在下，便会生成硫酸。这就是对使用这些燃料作为能源的环境效果的担心的原因之一。<br/><br/>易被湿润的粘膜表面吸收生成亚硫酸、硫酸。对眼及呼吸道粘膜有强烈的刺激作用。大量吸入可引起肺水肿、喉水肿、声带痉挛而致窒息。对大气可造成严重污染。容易被空气中的粉尘催化氧化，进而形成硫酸型酸雨。（化学式2SO2+2H2O+O2=2H2SO4）对植物的危害尤为严重。',
        'http://baike.baidu.com/view/27248.htm'
    ]
}
functionMap.chart0 = function (type) {
    myChart0.hideLoading();
    myChart0.setOption(option0(type));
    dataWorst = data[type];
    setTimeout(extMark, 100);
    $('#overview-head')[0].innerHTML = overviewContent[type][0];
    $('#overview-content')[0].innerHTML = overviewContent[type][1];
    $('#overview-link')[0].href = overviewContent[type][2];
}

function extMark() {
    var map = myChart0.chart.map;
    if (!map || !map.geo2pos('china','北京')) {
        setTimeout(extMark, 1000);
        return;
    }
    var zr = myChart0.getZrender();
    zr.delShape(extShapeList);
    extShapeList = [];
    var x = Math.round(zr.getWidth() - 130);
    var y = 50;
    var pos;
    var city;
    var len = dataWorst.length;
    var lineShape = require('zrender/shape/Line');
    for (var i = len - 1, l = len - 2; i > l; i--) {
        // 最差10位
        city = dataWorst[i].name;
        pos = map.getPosByGeo('china', cityGeo[city]);
        //pos = map.geo2pos('china', cityGeo[city]);
        extShapeList.push(new lineShape({
            shape : 'line',
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
        }));
        y += 30;
    }
    for (var i = 0, l = extShapeList.length; i < l; i++) {
        zr.addShape(extShapeList[i])
    }
    zr.refresh();
    //map.appendShape('china', extShapeList);
}

functionMap.chart1 = function () {
    myChart1.hideLoading();
    myChart1.setOption(option1());
}

functionMap.chart2 = function () {
    legendShare();
}
function legendShare() {
    var zrColor = require('zrender/tool/color');
    /*
    var color = ecConfig.color;
    var cidx = 0;
    for (var city in PG) {
        PG[city].color = zrColor.alpha(
            //zrColor.getColor(cidx++),
            color[cidx++ % color.length], 
            0.6
        );
    }
    */
    var legend = myChart1.component.legend;
    var selected = legend.getSelectedMap();
    for (var city in selected) {
        if (selected[city]) {
           // console.log(city)
            PG[city].color = zrColor.alpha(legend.getColor(city), 0.6);
        }
    }
    myChart20.hideLoading();
    myChart21.hideLoading();
    myChart22.hideLoading();
    myChart20.setOption(option2(0, selected), true);
    myChart21.setOption(option2(1, selected), true);
    myChart22.setOption(option2(2, selected), true);
}

functionMap.chart3 = function (type) {
    myChart3.hideLoading();
    myChart3.setOption(option3(type));
}

var resizeTicket;
window.onload = function () {
    window.onresize = function () {
        clearTimeout(resizeTicket);
        resizeTicket = setTimeout(function (){
            myChart0.resize();
            myChart1.resize();
            myChart20.resize();
            myChart21.resize();
            myChart22.resize();
            myChart3.resize();
        },200);
    }
}
