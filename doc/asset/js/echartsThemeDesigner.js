var myChart = [];
var domCode = document.getElementById('sidebar-code');
var domGraphic = document.getElementById('graphic');
var domMain = $("[md='main']");
var iconResize = document.getElementById('icon-resize');
var needRefresh = false;

function autoResize() {
    if ($(iconResize).hasClass('glyphicon-resize-full')) {
        focusCode();
        iconResize.className = 'glyphicon glyphicon-resize-small';
    }
    else {
        focusGraphic();
        iconResize.className = 'glyphicon glyphicon-resize-full';
    }
}

function focusCode() {
    domCode.className = 'col-md-8 ani';
    domGraphic.className = 'col-md-4 ani';
}

function focusGraphic() {
    domCode.className = 'col-md-4 ani';
    domGraphic.className = 'col-md-8 ani';
    if (needRefresh) {
        myChart[0].showLoading();
        myChart[1].showLoading();
        myChart[2].showLoading();
        myChart[3].showLoading();
        window.location = '#refresh';
        setTimeout(refresh, 500);
    }
}

var editor = CodeMirror.fromTextArea(
    document.getElementById("code"),
    { lineNumbers: true }
);
editor.setOption("theme", 'monokai');

editor.on('change', function(){needRefresh = true;});

function refresh(isBtnRefresh){
    if (isBtnRefresh) {
        needRefresh = true;
        focusGraphic();
        return;
    }
    needRefresh = false;
    refreshAll();
}

function refreshAll() {
    (new Function(editor.doc.getValue()))();
    for (var i = 0, l = domMain.length; i < l; i++) {
        myChart[i].hideLoading();
        myChart[i].setTheme(theme);
    }
}

var developMode = false;
if (developMode) {
    // for develop
    require.config({
        packages: [
            {
                name: 'echarts',
                location: '../../src',
                main: 'echarts'
            },
            {
                name: 'zrender',
                //location: 'http://ecomfe.github.io/zrender/src',
                location: '../../../zrender/src',
                main: 'zrender'
            }
        ]
    });
}
else {
    // for echarts online home page
    var fileLocation = './www/js/echarts-map';
    require.config({
        paths:{ 
            echarts: fileLocation,
            'echarts/chart/line': fileLocation,
            'echarts/chart/bar': fileLocation,
            'echarts/chart/scatter': fileLocation,
            'echarts/chart/k': fileLocation,
            'echarts/chart/pie': fileLocation,
            'echarts/chart/radar': fileLocation,
            'echarts/chart/map': fileLocation,
            'echarts/chart/chord': fileLocation,
            'echarts/chart/force': fileLocation,
            'echarts/chart/gauge': fileLocation,
            'echarts/chart/funnel': fileLocation
        }
    });
}

// 按需加载
require(
    [
        'echarts',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        'echarts/chart/k',
        'echarts/chart/pie',
        'echarts/chart/radar',
        'echarts/chart/force',
        'echarts/chart/chord',
        'echarts/chart/map',
        'echarts/chart/gauge',
        'echarts/chart/funnel'
    ],
    requireCallback
);


var echarts;
function requireCallback (ec) {
    (new Function(editor.doc.getValue()))();
    echarts = ec;
    for (var i = 0, l = domMain.length; i < l; i++) {
        myChart[i] = echarts.init(domMain[i], theme);
        myChart[i].setOption(option[i]);
    }
    
    window.onresize = function(){
        for (var i = 0, l = myChart.length; i < l; i++) {
            myChart[i].resize && myChart[i].resize();
        }
    };
    
    window.saveAsImage = function(){
        var domG = document.getElementById('graphic');
        var domGWidth = domG.clientWidth;
        var domGHeight = domG.clientHeight;
    
        var zrDom = document.createElement('div');
        zrDom.style.position = 'absolute';
        zrDom.style.left = '-4000px';
        zrDom.style.width = domGWidth * 2 + 'px';
        zrDom.style.height = (domGHeight / 2)+ 'px';
        document.body.appendChild(zrDom);
        
        var _zr = require('zrender').init(zrDom);
        /*
        _zr.addShape({
            shape:'rectangle',
            style : {
                x : 0,
                y : 0,
                width : domGWidth * 2,
                height : domGHeight / 2,
                color: theme.backgroundColor || '#fff'
            }
        });
        */
        var domGLeft = 0;// domG.offsetLeft;
        var domGTop = 0;//domG.offsetTop;
        var ImageShape = require('zrender/shape/Image');
        for (var i = 0, l = domMain.length; i < l; i++) {
            _zr.addShape(new ImageShape({
                style : {
                    x : domMain[i].offsetParent.offsetLeft - domGLeft + (i < 6 ? 0: domGWidth),
                    y : domMain[i].offsetParent.offsetTop - domGTop - (i < 6 ? 0: 1200),
                    image : myChart[i].getDataURL()
                }
            }));
        }
        _zr.render();
        
        setTimeout(function() {
            var bgColor = theme.backgroundColor
                          && theme.backgroundColor.replace(' ','') == 'rgba(0,0,0,0)'
                          ? '#fff' : theme.backgroundColor;
            var image = _zr.toDataURL('image/png', bgColor);
            _zr.dispose();
            zrDom.parentNode.removeChild(zrDom);
            zrDom = null;
            
            var downloadDiv = document.createElement('div');
            downloadDiv.id = '__saveAsImage_download_wrap__';
            downloadDiv.style.cssText = 'position:fixed;'
                + 'z-index:99999;'
                + 'display:block;'
                + 'top:0;left:0;'
                + 'background-color:rgba(33,33,33,0.5);'
                + 'text-align:center;'
                + 'width:100%;'
                + 'height:100%;'
                + 'line-height:' 
                + document.documentElement.clientHeight + 'px;';
        
            var downloadLink = document.createElement('a');
            downloadLink.href = image
            downloadLink.setAttribute('download', 'EChartsTheme.png');
            downloadLink.innerHTML = '<img style="height:80%" src="' + image 
                + '" title="'
                + (!!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1)
                   ? '右键->图片另存为'
                   : '点击保存')
                + '"/>';
            
            downloadDiv.appendChild(downloadLink);
            document.body.appendChild(downloadDiv);
            
            downloadDiv.onclick = function () {
                var d = document.getElementById(
                    '__saveAsImage_download_wrap__'
                );
                d.onclick = null;
                d.innerHTML = '';
                document.body.removeChild(d);
                d = null;
            };
                
            downloadLink = null;
            downloadDiv = null;
        }, 100);
    }

}

var theme;
var option = {
    0 : {
        title : {
            text: '【ECharts主题定制】折柱混搭',
            subtext: '纯属虚构'
        },
        tooltip : {
            trigger: 'axis'
        },
        toolbox: {
            show : true,
            feature : {
                magicType: {show: true, type: ['line', 'bar']},
                dataView : {show: true, readOnly: false},
                restore : {show: true}
            }
        },
        legend: {
            data:['降水量','蒸发量','最高温度','最低温度']
        },
        xAxis : [
            {
                type : 'category',
                data : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
            }
        ],
        yAxis : [
            {
                type : 'value',
                name : '水量',
                axisLabel : {
                    formatter: '{value} ml'
                }
            },
            {
                type : 'value',
                name : '温度',
                axisLabel : {
                    formatter: '{value} °C'
                },
                splitLine : {show : false}
            }
        ],
        series : [
            {
                name:'降水量',
                type:'bar',
                stack:'1',
                data:[12.0, 14.9, 17.0, 23.2, 35.6, 76.7, 105.6, 112.2, 52.6, 30.0, 19.4, 13.3]
            },
            {
                name:'蒸发量',
                type:'bar',
                data:[22.2, 25.9, 29.0, 36.4, 58.7, 90.7, 145.6, 122.2, 78.7, 48.8, 26.0, 22.3]
            },
            {
                name:'最高温度',
                type:'line',
                yAxisIndex: 1,
                data:[2.0, 2.2, 3.3, 4.5, 6.3, 10.2, 20.3, 23.4, 23.0, 16.5, 12.0, 6.2]
            },
            {
                name:'最低温度',
                type:'line',
                yAxisIndex: 1,
                data:[-5.0, -2.2, 0, 1.0, 3.2, 6.2, 10.3, 14.7, 13.5, 10.5, 6.0, 3.2]
            }
        ]
    },
    1 : {
        title : {
            text: '条形图'
        },
        legend: {
            x:'right',
            data:['直接','邮件','联盟','视频','搜索']
        },
        toolbox: {
            show : true,
            orient : 'vertical',
            x : 'right',
            y : 'center',
            feature : {
                magicType: {show: true, type: ['line', 'bar']},
                restore : {show: true}
            }
        },
        tooltip : {
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        grid : {
            x : 45,
            y : 40,
            x2 : 35
        },
        xAxis : [
            {
                type : 'value'
            }
        ],
        yAxis : [
            {
                type : 'category',
                data : ['周一','周二','周三','周四','周五','周六','周日']
            }
        ],
        series : [
            {
                name:'直接',
                type:'bar',
                stack: '广告',
                data:[220, 232, 301, 334, 390, 330, 320]
            },
            {
                name:'邮件',
                type:'bar',
                stack: '广告',
                data:[80, 102, 101, 134, 90, 230, 210]
            },
            {
                name:'联盟',
                type:'bar',
                stack: '广告',
                data:[180, 182, 191, 234, 290, 330, 310]
            },
            {
                name:'视频',
                type:'bar',
                stack: '广告',
                data:[110, 132, 201, 154, 190, 330, 510]
            },
            {
                name:'搜索',
                type:'bar',
                data:[662, 748, 864, 1026, 1162, 1100, 1430],
                markLine : {
                    data : [
                        [
                            {name : '周最低', yAxis: '周一', xAxis: 690, value:50},
                            {name : '周最高', yAxis: '周五', xAxis: 1190}
                        ]
                    ]
                }
            }
        ]
    },
    2 : {
        title : {
            text: '折线区域图'
        },
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            x:'right',
            data:['意向','预购','成交']
        },
        toolbox: {
            show : true,
            orient : 'vertical',
            x : 'right',
            y : 'center',
            feature : {
                magicType: {show: true, type: ['line', 'bar']},
                restore : {show: true}
            }
        },
        grid : {
            x : 45,
            y : 40,
            x2 : 35
        },
        xAxis : [
            {
                type : 'category',
                boundaryGap : false,
                data : ['周一','周二','周三','周四','周五','周六','周日']
            }
        ],
        yAxis : [
            {
                type : 'value'
            }
        ],
        series : [
            {
                name:'成交',
                type:'line',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[10, 12, 21, 54, 260, 830, 710],
                markPoint : {
                    data : [
                        {name : '周最高', value : 830, xAxis: '周六', yAxis: 860}
                    ]
                }
            },
            {
                name:'预购',
                type:'line',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[30, 182, 434, 790, 390, 30, 10],
                markPoint : {
                    data : [
                        {name : '周最高', value : 790, xAxis: '周四', yAxis: 830}
                    ]
                }
            },
            {
                name:'意向',
                type:'line',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[1320, 1132, 601, 234, 120, 90, 20]
            }
        ]
    },
    3 : {
        title : {
            text: 'K线图'
        },
        tooltip : {
            trigger: 'axis',
            formatter: function(params) {
                var res = params[1][1];
                res += '<br/>' + params[1][0];
                res += '<br/>  开盘 : ' + params[1][2][0] + '  最高 : ' + params[1][2][3];
                res += '<br/>  收盘 : ' + params[1][2][1] + '  最低 : ' + params[1][2][2];
                res += '<br/>' + params[0][0];
                res += ' : ' + params[0][2];
                return res;
            }
        },
        legend: {
            data:['上证指数','成交金额(万)']
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                dataZoom : {show: true},
                magicType: {show: true, type: ['line', 'bar']},
                dataView : {show: true, readOnly: false},
                restore : {show: true}
            }
        },
        dataZoom : {
            show : true,
            realtime: true,
            start : 50,
            end : 100
        },
        xAxis : [
            {
                type : 'category',
                boundaryGap : true,
                axisTick: {onGap:false},
                data : [
                    "2013/1/24", "2013/1/25", "2013/1/28", "2013/1/29", "2013/1/30",
                    "2013/1/31", "2013/2/1", "2013/2/4", "2013/2/5", "2013/2/6", 
                    "2013/2/7", "2013/2/8", "2013/2/18", "2013/2/19", "2013/2/20", 
                    "2013/2/21", "2013/2/22", "2013/2/25", "2013/2/26", "2013/2/27", 
                    "2013/2/28", "2013/3/1", "2013/3/4", "2013/3/5", "2013/3/6", 
                    "2013/3/7", "2013/3/8", "2013/3/11", "2013/3/12", "2013/3/13", 
                    "2013/3/14", "2013/3/15", "2013/3/18", "2013/3/19", "2013/3/20", 
                    "2013/3/21", "2013/3/22", "2013/3/25", "2013/3/26", "2013/3/27", 
                    "2013/3/28", "2013/3/29", "2013/4/1", "2013/4/2", "2013/4/3", 
                    "2013/4/8", "2013/4/9", "2013/4/10", "2013/4/11", "2013/4/12", 
                    "2013/4/15", "2013/4/16", "2013/4/17", "2013/4/18", "2013/4/19", 
                    "2013/4/22", "2013/4/23", "2013/4/24", "2013/4/25", "2013/4/26", 
                    "2013/5/2", "2013/5/3", "2013/5/6", "2013/5/7", "2013/5/8", 
                    "2013/5/9", "2013/5/10", "2013/5/13", "2013/5/14", "2013/5/15", 
                    "2013/5/16", "2013/5/17", "2013/5/20", "2013/5/21", "2013/5/22", 
                    "2013/5/23", "2013/5/24", "2013/5/27", "2013/5/28", "2013/5/29", 
                    "2013/5/30", "2013/5/31", "2013/6/3", "2013/6/4", "2013/6/5", 
                    "2013/6/6", "2013/6/7", "2013/6/13"
                ]
            }
        ],
        yAxis : [
            {
                type : 'value',
                name : '指数',
                scale:true,
                precision: 2,
                splitNumber: 7,
                boundaryGap: [0.05, 0.05]
            },
            {
                type : 'value',
                name : '成交量',
                scale:true,
                splitNumber: 7,
                boundaryGap: [0.05, 0.05]
            }
        ],
        series : [
            {
                name:'成交金额(万)',
                type:'line',
                yAxisIndex: 1,
                symbol: 'none',
                data:[
                    13560434, 8026738.5, 11691637, 12491697, 12485603, 
                    11620504, 12555496, 15253370, 12709611, 10458354, 
                    10933507, 9896523, 10365702, 10633095, 9722230, 
                    12662783, 8757982, 7764234, 10591719, 8826293, 
                    11591827, 11153111, 14304651, 11672120, 12536480, 
                    12608589, 8843860, 7391994.5, 10063709, 7768895.5, 
                    6921859, 10157810, 8148617.5, 7551207, 11397426, 
                    10478607, 8595132, 8541862, 9181132, 8570842, 
                    10759351, 7335819, 6699753.5, 7759666.5, 6880135.5, 
                    7366616.5, 7313504, 7109021.5, 6213270, 5619688, 
                    5816217.5, 6695584.5, 5998655.5, 6188812.5, 9538301,
                    8224500, 8221751.5, 7897721, 8448324, 6525151, 
                    5987761, 7831570, 8162560.5, 7904092, 8139084.5, 
                    9116529, 8128014, 7919148, 7566047, 6665826.5, 
                    10225527, 11124881, 12884353, 11302521, 11529046, 
                    11105205, 9202153, 9992016, 12035250, 11431155, 
                    10354677, 10070399, 9164861, 9237718, 7114268, 
                    7526158.5, 8105835, 7971452.5
                ]
            },
            {
                name:'上证指数',
                type:'k',
                data:[ // 开盘，收盘，最低，最高
                    [2320.26,2302.6,2287.3,2362.94],
                    [2300,2291.3,2288.26,2308.38],
                    [2295.35,2346.5,2295.35,2346.92],
                    [2347.22,2358.98,2337.35,2363.8],
                    [2360.75,2382.48,2347.89,2383.76],
                    [2383.43,2385.42,2371.23,2391.82],
                    [2377.41,2419.02,2369.57,2421.15],
                    [2425.92,2428.15,2417.58,2440.38],
                    [2411,2433.13,2403.3,2437.42],
                    [2432.68,2434.48,2427.7,2441.73],
                    [2430.69,2418.53,2394.22,2433.89],
                    [2416.62,2432.4,2414.4,2443.03],
                    [2441.91,2421.56,2415.43,2444.8],
                    [2420.26,2382.91,2373.53,2427.07],
                    [2383.49,2397.18,2370.61,2397.94],
                    [2378.82,2325.95,2309.17,2378.82],
                    [2322.94,2314.16,2308.76,2330.88],
                    [2320.62,2325.82,2315.01,2338.78],
                    [2313.74,2293.34,2289.89,2340.71],
                    [2297.77,2313.22,2292.03,2324.63],
                    [2322.32,2365.59,2308.92,2366.16],
                    [2364.54,2359.51,2330.86,2369.65],
                    [2332.08,2273.4,2259.25,2333.54],
                    [2274.81,2326.31,2270.1,2328.14],
                    [2333.61,2347.18,2321.6,2351.44],
                    [2340.44,2324.29,2304.27,2352.02],
                    [2326.42,2318.61,2314.59,2333.67],
                    [2314.68,2310.59,2296.58,2320.96],
                    [2309.16,2286.6,2264.83,2333.29],
                    [2282.17,2263.97,2253.25,2286.33],
                    [2255.77,2270.28,2253.31,2276.22],
                    [2269.31,2278.4,2250,2312.08],
                    [2267.29,2240.02,2239.21,2276.05],
                    [2244.26,2257.43,2232.02,2261.31],
                    [2257.74,2317.37,2257.42,2317.86],
                    [2318.21,2324.24,2311.6,2330.81],
                    [2321.4,2328.28,2314.97,2332],
                    [2334.74,2326.72,2319.91,2344.89],
                    [2318.58,2297.67,2281.12,2319.99],
                    [2299.38,2301.26,2289,2323.48],
                    [2273.55,2236.3,2232.91,2273.55],
                    [2238.49,2236.62,2228.81,2246.87],
                    [2229.46,2234.4,2227.31,2243.95],
                    [2234.9,2227.74,2220.44,2253.42],
                    [2232.69,2225.29,2217.25,2241.34],
                    [2196.24,2211.59,2180.67,2212.59],
                    [2215.47,2225.77,2215.47,2234.73],
                    [2224.93,2226.13,2212.56,2233.04],
                    [2236.98,2219.55,2217.26,2242.48],
                    [2218.09,2206.78,2204.44,2226.26],
                    [2199.91,2181.94,2177.39,2204.99],
                    [2169.63,2194.85,2165.78,2196.43],
                    [2195.03,2193.8,2178.47,2197.51],
                    [2181.82,2197.6,2175.44,2206.03],
                    [2201.12,2244.64,2200.58,2250.11],
                    [2236.4,2242.17,2232.26,2245.12],
                    [2242.62,2184.54,2182.81,2242.62],
                    [2187.35,2218.32,2184.11,2226.12],
                    [2213.19,2199.31,2191.85,2224.63],
                    [2203.89,2177.91,2173.86,2210.58],
                    [2170.78,2174.12,2161.14,2179.65],
                    [2179.05,2205.5,2179.05,2222.81],
                    [2212.5,2231.17,2212.5,2236.07],
                    [2227.86,2235.57,2219.44,2240.26],
                    [2242.39,2246.3,2235.42,2255.21],
                    [2246.96,2232.97,2221.38,2247.86],
                    [2228.82,2246.83,2225.81,2247.67],
                    [2247.68,2241.92,2231.36,2250.85],
                    [2238.9,2217.01,2205.87,2239.93],
                    [2217.09,2224.8,2213.58,2225.19],
                    [2221.34,2251.81,2210.77,2252.87],
                    [2249.81,2282.87,2248.41,2288.09],
                    [2286.33,2299.99,2281.9,2309.39],
                    [2297.11,2305.11,2290.12,2305.3],
                    [2303.75,2302.4,2292.43,2314.18],
                    [2293.81,2275.67,2274.1,2304.95],
                    [2281.45,2288.53,2270.25,2292.59],
                    [2286.66,2293.08,2283.94,2301.7],
                    [2293.4,2321.32,2281.47,2322.1],
                    [2323.54,2324.02,2321.17,2334.33],
                    [2316.25,2317.75,2310.49,2325.72],
                    [2320.74,2300.59,2299.37,2325.53],
                    [2300.21,2299.25,2294.11,2313.43],
                    [2297.1,2272.42,2264.76,2297.1],
                    [2270.71,2270.93,2260.87,2276.86],
                    [2264.43,2242.11,2240.07,2266.69],
                    [2242.26,2210.9,2205.07,2250.63],
                    [2190.1,2148.35,2126.22,2190.1]
                ]
            }
        ],
        animation: true
    },
    4 : {
        title : {
            text: '散点图'
        },
        tooltip : {
            trigger: 'item',
            formatter : function(value) {
                return value[0] + ' :<br/>'
                       + value[2][0] + 'cm ' 
                       + value[2][1] + 'kg ';
            }
        },
        legend: {
            x:'right',
            data:['女性','男性']
        },
        toolbox: {
            show : true,
            orient : 'vertical',
            x : 'right',
            y : 'center',
            feature : {
                dataZoom : {show: true},
                restore : {show: true}
            }
        },
        grid : {
            x : 55,
            y : 40,
            x2 : 35,
            y2 : 30
        },
        xAxis : [
            {
                type : 'value',
                power: 1,
                precision: 2,
                scale:true,
                axisLabel : {
                    formatter: '{value} cm'
                }
            }
        ],
        yAxis : [
            {
                type : 'value',
                power: 1,
                precision: 2,
                scale:true,
                axisLabel : {
                    formatter: '{value} kg'
                }
            }
        ],
        series : [
            {
                name:'女性',
                type:'scatter',
                data: [[161.2, 51.6], [167.5, 59.0], [159.5, 49.2], [157.0, 63.0], [155.8, 53.6],
                    [170.0, 59.0], [159.1, 47.6], [166.0, 69.8], [176.2, 66.8], [160.2, 75.2],
                    [172.5, 55.2], [170.9, 54.2], [172.9, 62.5], [153.4, 42.0], [160.0, 50.0],
                    [147.2, 49.8], [168.2, 49.2], [175.0, 73.2], [157.0, 47.8], [167.6, 68.8],
                    [159.5, 50.6], [175.0, 82.5], [166.8, 57.2], [176.5, 87.8], [170.2, 72.8],
                    [174.0, 54.5], [173.0, 59.8], [179.9, 67.3], [170.5, 67.8], [160.0, 47.0],
                    [154.4, 46.2], [162.0, 55.0], [176.5, 83.0], [160.0, 54.4], [152.0, 45.8],
                    [162.1, 53.6], [170.0, 73.2], [160.2, 52.1], [161.3, 67.9], [166.4, 56.6],
                    [168.9, 62.3], [163.8, 58.5], [167.6, 54.5], [160.0, 50.2], [161.3, 60.3],
                    [167.6, 58.3], [165.1, 56.2], [160.0, 50.2], [170.0, 72.9], [157.5, 59.8],
                    [167.6, 61.0], [160.7, 69.1], [163.2, 55.9], [152.4, 46.5], [157.5, 54.3],
                    [168.3, 54.8], [180.3, 60.7], [165.5, 60.0], [165.0, 62.0], [164.5, 60.3],
                    [156.0, 52.7], [160.0, 74.3], [163.0, 62.0], [165.7, 73.1], [161.0, 80.0],
                    [162.0, 54.7], [166.0, 53.2], [174.0, 75.7], [172.7, 61.1], [167.6, 55.7],
                    [151.1, 48.7], [164.5, 52.3], [163.5, 50.0], [152.0, 59.3], [169.0, 62.5],
                    [164.0, 55.7], [161.2, 54.8], [155.0, 45.9], [170.0, 70.6], [176.2, 67.2],
                    [170.0, 69.4], [162.5, 58.2], [170.3, 64.8], [164.1, 71.6], [169.5, 52.8],
                    [163.2, 59.8], [154.5, 49.0], [159.8, 50.0], [173.2, 69.2], [170.0, 55.9],
                    [161.4, 63.4], [169.0, 58.2], [166.2, 58.6], [159.4, 45.7], [162.5, 52.2],
                    [159.0, 48.6], [162.8, 57.8], [159.0, 55.6], [179.8, 66.8], [162.9, 59.4],
                    [161.0, 53.6], [151.1, 73.2], [168.2, 53.4], [168.9, 69.0], [173.2, 58.4],
                    [171.8, 56.2], [178.0, 70.6], [164.3, 59.8], [163.0, 72.0], [168.5, 65.2],
                    [166.8, 56.6], [172.7, 105.2], [163.5, 51.8], [169.4, 63.4], [167.8, 59.0],
                    [159.5, 47.6], [167.6, 63.0], [161.2, 55.2], [160.0, 45.0], [163.2, 54.0],
                    [162.2, 50.2], [161.3, 60.2], [149.5, 44.8], [157.5, 58.8], [163.2, 56.4],
                    [172.7, 62.0], [155.0, 49.2], [156.5, 67.2], [164.0, 53.8], [160.9, 54.4],
                    [162.8, 58.0], [167.0, 59.8], [160.0, 54.8], [160.0, 43.2], [168.9, 60.5],
                    [158.2, 46.4], [156.0, 64.4], [160.0, 48.8], [167.1, 62.2], [158.0, 55.5],
                    [167.6, 57.8], [156.0, 54.6], [162.1, 59.2], [173.4, 52.7], [159.8, 53.2],
                    [170.5, 64.5], [159.2, 51.8], [157.5, 56.0], [161.3, 63.6], [162.6, 63.2],
                    [160.0, 59.5], [168.9, 56.8], [165.1, 64.1], [162.6, 50.0], [165.1, 72.3],
                    [166.4, 55.0], [160.0, 55.9], [152.4, 60.4], [170.2, 69.1], [162.6, 84.5],
                    [170.2, 55.9], [158.8, 55.5], [172.7, 69.5], [167.6, 76.4], [162.6, 61.4],
                    [167.6, 65.9], [156.2, 58.6], [175.2, 66.8], [172.1, 56.6], [162.6, 58.6],
                    [160.0, 55.9], [165.1, 59.1], [182.9, 81.8], [166.4, 70.7], [165.1, 56.8],
                    [177.8, 60.0], [165.1, 58.2], [175.3, 72.7], [154.9, 54.1], [158.8, 49.1],
                    [172.7, 75.9], [168.9, 55.0], [161.3, 57.3], [167.6, 55.0], [165.1, 65.5],
                    [175.3, 65.5], [157.5, 48.6], [163.8, 58.6], [167.6, 63.6], [165.1, 55.2],
                    [165.1, 62.7], [168.9, 56.6], [162.6, 53.9], [164.5, 63.2], [176.5, 73.6],
                    [168.9, 62.0], [175.3, 63.6], [159.4, 53.2], [160.0, 53.4], [170.2, 55.0],
                    [162.6, 70.5], [167.6, 54.5], [162.6, 54.5], [160.7, 55.9], [160.0, 59.0],
                    [157.5, 63.6], [162.6, 54.5], [152.4, 47.3], [170.2, 67.7], [165.1, 80.9],
                    [172.7, 70.5], [165.1, 60.9], [170.2, 63.6], [170.2, 54.5], [170.2, 59.1],
                    [161.3, 70.5], [167.6, 52.7], [167.6, 62.7], [165.1, 86.3], [162.6, 66.4],
                    [152.4, 67.3], [168.9, 63.0], [170.2, 73.6], [175.2, 62.3], [175.2, 57.7],
                    [160.0, 55.4], [165.1, 104.1], [174.0, 55.5], [170.2, 77.3], [160.0, 80.5],
                    [167.6, 64.5], [167.6, 72.3], [167.6, 61.4], [154.9, 58.2], [162.6, 81.8],
                    [175.3, 63.6], [171.4, 53.4], [157.5, 54.5], [165.1, 53.6], [160.0, 60.0],
                    [174.0, 73.6], [162.6, 61.4], [174.0, 55.5], [162.6, 63.6], [161.3, 60.9],
                    [156.2, 60.0], [149.9, 46.8], [169.5, 57.3], [160.0, 64.1], [175.3, 63.6],
                    [169.5, 67.3], [160.0, 75.5], [172.7, 68.2], [162.6, 61.4], [157.5, 76.8],
                    [176.5, 71.8], [164.4, 55.5], [160.7, 48.6], [174.0, 66.4], [163.8, 67.3]
                ]
            },
            {
                name:'男性',
                type:'scatter',
                data: [[174.0, 65.6], [175.3, 71.8], [193.5, 80.7], [186.5, 72.6], [187.2, 78.8],
                    [181.5, 74.8], [184.0, 86.4], [184.5, 78.4], [175.0, 62.0], [184.0, 81.6],
                    [180.0, 76.6], [177.8, 83.6], [192.0, 90.0], [176.0, 74.6], [174.0, 71.0],
                    [184.0, 79.6], [192.7, 93.8], [171.5, 70.0], [173.0, 72.4], [176.0, 85.9],
                    [176.0, 78.8], [180.5, 77.8], [172.7, 66.2], [176.0, 86.4], [173.5, 81.8],
                    [178.0, 89.6], [180.3, 82.8], [180.3, 76.4], [164.5, 63.2], [173.0, 60.9],
                    [183.5, 74.8], [175.5, 70.0], [188.0, 72.4], [189.2, 84.1], [172.8, 69.1],
                    [170.0, 59.5], [182.0, 67.2], [170.0, 61.3], [177.8, 68.6], [184.2, 80.1],
                    [186.7, 87.8], [171.4, 84.7], [172.7, 73.4], [175.3, 72.1], [180.3, 82.6],
                    [182.9, 88.7], [188.0, 84.1], [177.2, 94.1], [172.1, 74.9], [167.0, 59.1],
                    [169.5, 75.6], [174.0, 86.2], [172.7, 75.3], [182.2, 87.1], [164.1, 55.2],
                    [163.0, 57.0], [171.5, 61.4], [184.2, 76.8], [174.0, 86.8], [174.0, 72.2],
                    [177.0, 71.6], [186.0, 84.8], [167.0, 68.2], [171.8, 66.1], [182.0, 72.0],
                    [167.0, 64.6], [177.8, 74.8], [164.5, 70.0], [192.0, 101.6], [175.5, 63.2],
                    [171.2, 79.1], [181.6, 78.9], [167.4, 67.7], [181.1, 66.0], [177.0, 68.2],
                    [174.5, 63.9], [177.5, 72.0], [170.5, 56.8], [182.4, 74.5], [197.1, 90.9],
                    [180.1, 93.0], [175.5, 80.9], [180.6, 72.7], [184.4, 68.0], [175.5, 70.9],
                    [180.6, 72.5], [177.0, 72.5], [177.1, 83.4], [181.6, 75.5], [176.5, 73.0],
                    [175.0, 70.2], [174.0, 73.4], [165.1, 70.5], [177.0, 68.9], [192.0, 102.3],
                    [176.5, 68.4], [169.4, 65.9], [182.1, 75.7], [179.8, 84.5], [175.3, 87.7],
                    [184.9, 86.4], [177.3, 73.2], [167.4, 53.9], [178.1, 72.0], [168.9, 55.5],
                    [157.2, 58.4], [180.3, 83.2], [170.2, 72.7], [177.8, 64.1], [172.7, 72.3],
                    [165.1, 65.0], [186.7, 86.4], [165.1, 65.0], [174.0, 88.6], [175.3, 84.1],
                    [185.4, 66.8], [177.8, 75.5], [180.3, 93.2], [180.3, 82.7], [177.8, 58.0],
                    [177.8, 79.5], [177.8, 78.6], [177.8, 71.8], [177.8, 116.4], [163.8, 72.2],
                    [188.0, 83.6], [198.1, 85.5], [175.3, 90.9], [166.4, 85.9], [190.5, 89.1],
                    [166.4, 75.0], [177.8, 77.7], [179.7, 86.4], [172.7, 90.9], [190.5, 73.6],
                    [185.4, 76.4], [168.9, 69.1], [167.6, 84.5], [175.3, 64.5], [170.2, 69.1],
                    [190.5, 108.6], [177.8, 86.4], [190.5, 80.9], [177.8, 87.7], [184.2, 94.5],
                    [176.5, 80.2], [177.8, 72.0], [180.3, 71.4], [171.4, 72.7], [172.7, 84.1],
                    [172.7, 76.8], [177.8, 63.6], [177.8, 80.9], [182.9, 80.9], [170.2, 85.5],
                    [167.6, 68.6], [175.3, 67.7], [165.1, 66.4], [185.4, 102.3], [181.6, 70.5],
                    [172.7, 95.9], [190.5, 84.1], [179.1, 87.3], [175.3, 71.8], [170.2, 65.9],
                    [193.0, 95.9], [171.4, 91.4], [177.8, 81.8], [177.8, 96.8], [167.6, 69.1],
                    [167.6, 82.7], [180.3, 75.5], [182.9, 79.5], [176.5, 73.6], [186.7, 91.8],
                    [188.0, 84.1], [188.0, 85.9], [177.8, 81.8], [174.0, 82.5], [177.8, 80.5],
                    [171.4, 70.0], [185.4, 81.8], [185.4, 84.1], [188.0, 90.5], [188.0, 91.4],
                    [182.9, 89.1], [176.5, 85.0], [175.3, 69.1], [175.3, 73.6], [188.0, 80.5],
                    [188.0, 82.7], [175.3, 86.4], [170.5, 67.7], [179.1, 92.7], [177.8, 93.6],
                    [175.3, 70.9], [182.9, 75.0], [170.8, 93.2], [188.0, 93.2], [180.3, 77.7],
                    [177.8, 61.4], [185.4, 94.1], [168.9, 75.0], [185.4, 83.6], [180.3, 85.5],
                    [174.0, 73.9], [167.6, 66.8], [182.9, 87.3], [160.0, 72.3], [180.3, 88.6],
                    [167.6, 75.5], [186.7, 101.4], [175.3, 91.1], [175.3, 67.3], [175.9, 77.7],
                    [175.3, 81.8], [179.1, 75.5], [181.6, 84.5], [177.8, 76.6], [182.9, 85.0],
                    [177.8, 102.5], [184.2, 77.3], [179.1, 71.8], [176.5, 87.9], [188.0, 94.3],
                    [174.0, 70.9], [167.6, 64.5], [170.2, 77.3], [167.6, 72.3], [188.0, 87.3],
                    [174.0, 80.0], [176.5, 82.3], [180.3, 73.6], [167.6, 74.1], [188.0, 85.9],
                    [180.3, 73.2], [167.6, 76.3], [183.0, 65.9], [183.0, 90.9], [179.1, 89.1],
                    [170.2, 62.3], [177.8, 82.7], [179.1, 79.1], [190.5, 98.2], [177.8, 84.1],
                    [180.3, 83.2], [180.3, 83.2]
                ]
            }
        ],
        animation: true
    },
    5 : {
        title : {
            text: '气泡图'
        },
        tooltip : {
            trigger: 'item'
        },
        legend: {
            x:'right',
            data:['scatter1','scatter2']
        },
        toolbox: {
            show : true,
            orient : 'vertical',
            x : 'right',
            y : 'center',
            feature : {
                dataZoom : {show: true},
                restore : {show: true}
            }
        },
        grid : {
            x : 55,
            y : 40,
            x2 : 35,
            y2 : 30
        },
        xAxis : [
            {
                type : 'value',
                power: 1,
                scale: true
            }
        ],
        yAxis : [
            {
                type : 'value',
                power: 1,
                scale: true
            }
        ],
        series : [
            {
                name:'scatter1',
                type:'scatter',
                symbolSize: function(value){
                    return Math.round(value[2] / 5);
                },
                data: (function() {
                    var d = [];
                    var len = 30;
                    while (len--) {
                        d.push([
                            (Math.random()*100).toFixed(2) - 0,
                            (Math.random()*100).toFixed(2) - 0,
                            (Math.random()*100).toFixed(2) - 0
                        ]);
                    }
                    return d;
                })()
            },
            {
                name:'scatter2',
                type:'scatter',
                symbolSize: function(value){
                    return Math.round(value[2] / 5);
                },
                data: (function() {
                    var d = [];
                    var len = 30;
                    while (len--) {
                        d.push([
                            (Math.random()*100).toFixed(2) - 0,
                            (Math.random()*100).toFixed(2) - 0,
                            (Math.random()*100).toFixed(2) - 0
                        ]);
                    }
                    return d;
                })()
            }
        ],
        animation: true
    },
    6 : {
        title : {
            text: '地图',
            subtext: '纯属虚构',
            x:'center'
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            max: 1000,
            text:['高','低'],           // 文本，默认为数值文本
            calculable : true
        },
        toolbox: {
            show : true,
            orient : 'vertical',
            x: 'right',
            y: 'center',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                restore : {show: true}
            }
        },
        series : [
            {
                name: '地图',
                type: 'map',
                mapType: 'china',
                data:[
                    {name: '北京',value: Math.round(Math.random()*1000)},
                    {name: '天津',value: Math.round(Math.random()*1000)},
                    {name: '上海',value: Math.round(Math.random()*1000)},
                    {name: '重庆',value: Math.round(Math.random()*1000)},
                    {name: '河北',value: Math.round(Math.random()*1000)},
                    {name: '河南',value: Math.round(Math.random()*1000)},
                    {name: '云南',value: Math.round(Math.random()*1000)},
                    {name: '辽宁',value: Math.round(Math.random()*1000)},
                    {name: '黑龙江',value: Math.round(Math.random()*1000)},
                    {name: '湖南',value: Math.round(Math.random()*1000)},
                    {name: '安徽',value: Math.round(Math.random()*1000)},
                    {name: '山东',value: Math.round(Math.random()*1000)},
                    {name: '新疆',value: Math.round(Math.random()*1000)},
                    {name: '江苏',value: Math.round(Math.random()*1000)},
                    {name: '浙江',value: Math.round(Math.random()*1000)},
                    {name: '江西',value: Math.round(Math.random()*1000)},
                    {name: '湖北',value: Math.round(Math.random()*1000)},
                    {name: '广西',value: Math.round(Math.random()*1000)},
                    {name: '甘肃',value: Math.round(Math.random()*1000)},
                    {name: '山西',value: Math.round(Math.random()*1000)},
                    {name: '内蒙古',value: Math.round(Math.random()*1000)},
                    {name: '陕西',value: Math.round(Math.random()*1000)},
                    {name: '吉林',value: Math.round(Math.random()*1000)},
                    {name: '福建',value: Math.round(Math.random()*1000)},
                    {name: '贵州',value: Math.round(Math.random()*1000)},
                    {name: '广东',value: Math.round(Math.random()*1000)},
                    {name: '青海',value: Math.round(Math.random()*1000)},
                    {name: '西藏',value: Math.round(Math.random()*1000)},
                    {name: '四川',value: Math.round(Math.random()*1000)},
                    {name: '宁夏',value: Math.round(Math.random()*1000)},
                    {name: '海南',value: Math.round(Math.random()*1000)},
                    {name: '台湾',value: Math.round(Math.random()*1000)},
                    {name: '香港',value: Math.round(Math.random()*1000)},
                    {name: '澳门',value: Math.round(Math.random()*1000)},
                    {name: '南海诸岛',value: Math.round(Math.random()*1000)}
                ]
            }
        ],
        animation: true
    },
    7 : {
        title : {
            text: '饼图'
        },
        tooltip : {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
            orient : 'vertical',
            x : 'right',
            data:['直接访问','邮件营销','联盟广告','视频广告','搜索引擎']
        },
        series : [
            {
                name:'访问来源',
                type:'pie',
                selectedMode: 'single',
                data:[
                    {value:335, name:'直接访问'},
                    {value:310, name:'邮件营销'},
                    {value:234, name:'联盟广告'},
                    {value:135, name:'视频广告'},
                    {value:1548, name:'搜索引擎'}
                ]
            }
        ],
        animation: true
    },
    8 : {
        title : {
            text: '雷达图'
        },
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            orient : 'vertical',
            x : 'right',
            data:['预算分配','实际开销']
        },
        polar : [
           {
               indicator : [
                   { text: '销售', max: 6000},
                   { text: '管理', max: 16000},
                   { text: '信息技术', max: 30000},
                   { text: '客服', max: 38000},
                   { text: '研发', max: 52000},
                   { text: '市场', max: 25000}
                ]
            }
        ],
        series : [
            {
                name: '预算 vs 开销',
                type: 'radar',
                data : [
                    {
                        value : [4300, 10000, 28000, 35000, 50000, 19000],
                        name : '预算分配'
                    },
                     {
                        value : [5000, 14000, 28000, 31000, 42000, 21000],
                        name : '实际开销'
                    }
                ]
            }
        ],
        animation: true
    },
    9 : {
        title : {
            text: '和弦图'
        },
        tooltip : {
            trigger: 'item'
        },
        legend: {
            orient : 'vertical',
            x : 'right',
            data:['group1','group2', 'group3', 'group4']
        },
        series : [
            {
                type:'chord',
                data : [
                    {name : 'group1'},
                    {name : 'group2'},
                    {name : 'group3'},
                    {name : 'group4'}
                ],
                matrix : [
                    [11975,  5871, 8916, 2868],
                    [ 1951, 10048, 2060, 6171],
                    [ 8010, 16145, 8090, 8045],
                    [ 1013,   990,  940, 6907]
                ]
            }
        ]
    },
    10 : (function(){
        var nodes = [];
        var links = [];
        var constMaxDepth = 2;
        var constMaxChildren = 6;
        var constMinChildren = 2;
        var constMaxRadius = 10;
        var constMinRadius = 2;
        
        function rangeRandom(min, max) {
            return Math.random() * (max - min) + min;
        }
        
        function createRandomNode(depth) {
            var node = {
                name : 'NODE_' + nodes.length,
                value : rangeRandom(constMinRadius, constMaxRadius),
                // Custom properties
                id : nodes.length,
                depth : depth,
                category : depth === constMaxDepth ? 0 : 1
            }
            nodes.push(node);
        
            return node;
        }
        
        function forceMockThreeData() {
            var depth = 0;
            var rootNode = {
                name : 'ROOT',
                value : rangeRandom(constMinRadius, constMaxRadius),
                // Custom properties
                id : 0,
                depth : 0,
                category : 2
            }
            nodes.push(rootNode);
        
            function mock(parentNode, depth) {
                var nChildren = Math.round(rangeRandom(constMinChildren, constMaxChildren));
                
                for (var i = 0; i < nChildren; i++) {
                    var childNode = createRandomNode(depth);
                    links.push({
                        source : parentNode.id,
                        target : childNode.id,
                        weight : 1 
                    });
                    if (depth < constMaxDepth) {
                        mock(childNode, depth + 1);
                    }
                }
            }
        
            mock(rootNode, 0);
        }
        
        forceMockThreeData();
        
        return {
            title : {
                text: '力导向布局图'
            },
            tooltip : {
                trigger: 'item',
                formatter: '{a} : {b}'
            },
            legend: {
                orient : 'vertical',
                x : 'right',
                data:['叶子节点','非叶子节点', '根节点']
            },
            series : [
                {
                    type:'force',
                    name : "Force tree",
                    categories : [
                        { name: '叶子节点' },
                        { name: '非叶子节点' },
                        { name: '根节点' }
                    ],
                    minRadius : constMinRadius,
                    maxRadius : constMaxRadius,
                    nodes : nodes,
                    links : links
                }
            ],
            animation: true
        } 
    })()
};

var curSwitch = true;
var docSwidth = document.getElementById('doc-switch');
var docContiner = document.getElementById('doc-continer');
var docConHeight = docContiner.offsetHeight;
docContiner.style.height = docConHeight + 'px';
function docSwitch(){
    curSwitch = !curSwitch;
    if (curSwitch) {
        docContiner.style.height = docConHeight + 'px';
        docSwidth.innerHTML = '- 文档图示';
    }
    else {
        docContiner.style.height = '30px';
        docSwidth.innerHTML = '+ 文档图示';
    }
    return false;
}
window.onload = function(){
    setTimeout(function(){
        curSwitch = true;
        docSwitch();
    }, 1000);
};
