require.config({
    paths:{ 
        echarts: '../../doc/example/www/js/echarts-map',
        'echarts/chart/line': '../../doc/example/www/js/echarts-map',
        'echarts/chart/bar': '../../doc/example/www/js/echarts-map',
        'echarts/chart/scatter': '../../doc/example/www/js/echarts-map',
        'echarts/chart/k': '../../doc/example/www/js/echarts-map',
        'echarts/chart/pie': '../../doc/example/www/js/echarts-map',
        'echarts/chart/radar': '../../doc/example/www/js/echarts-map',
        'echarts/chart/map': '../../doc/example/www/js/echarts-map',
        'echarts/chart/force': '../../doc/example/www/js/echarts-map',
        webkitDep : '../../doc/example/webkit-dep'
    }
});

var echarts;
var webkitDepData;
require(
    [
        'echarts',
        'webkitDep',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        'echarts/chart/k',
        'echarts/chart/pie',
        'echarts/chart/radar',
        'echarts/chart/force',
        'echarts/chart/map'
    ],
    function(ec, wd) {
        echarts = ec;
        webkitDepData = wd;
        webkitDepData.minRadius = 5;
        webkitDepData.maxRadius = 8;
        webkitDepData.density = 1.1;
        webkitDepData.attractiveness = 1.3;
        webkitDepData.itemStyle = {
            normal : {
                linkStyle : {
                    opacity : 0.6
                }
            }
        }
        if (typeof curEvent != 'undefined') {
            showChart(curEvent);
        }
    }
);

var curEvent;
Reveal.addEventListener( 'ready', function(event){
    curEvent = event;
});


Reveal.addEventListener( 'slidechanged', showChart);

var myChart;
var timeTicket;
function showChart(event) {
	clearInterval(timeTicket);
    if (myChart && myChart.dispose) {
        myChart.dispose();
        myChart = null;
    }
    var len = event.currentSlide.childNodes.length;
    var dom;
    var optionKey;
    while(--len) {
        dom = event.currentSlide.childNodes[len];
        if (dom.className == 'main'){
            myChart = echarts.init(dom);
            optionKey = dom.getAttribute('optionKey');
            myChart.setOption(optionMap[optionKey]);
            if (functionMap[optionKey]) {
                functionMap[optionKey]();
            }
            return;
        }
    }
}

var functionMap = {};
var optionMap = {
    'calculable1' : {
        tooltip : {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
            orient : 'vertical',
            x : 'left',
            data:['Chrome','Firefox','Safari','IE9+','IE8','IE7','IE6-']
        },
        toolbox: {
            show : true,
            feature : {
                dataView : {readOnly: false},
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        series : [
            {
                name:'浏览器占比',
                type:'pie',
                data:[
                    {value:535, name:'Chrome'},
                    {value:310, name:'Firefox'},
                    {value:234, name:'Safari'},
                    {value:235, name:'IE9+'},
                    {value:1035, name:'IE8'},
                    {value:1305, name:'IE7'},
                    {value:948, name:'IE6-'}
                ]
            }
        ]
    },
    'calculable2' : {
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            x: 'left',
            data:['销售量']
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                axisLabel : {
                    rotate: 45
                },
                data : function(){
                    var list = [];
                    for (var i = 1; i <= 30; i++) {
                        list.push('2012-11-' + i);
                    }
                    return list;
                }()
            }
        ],
        yAxis : [
            {
                type : 'value',
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'销售量',
                type:'bar',
                data:[
                    123,121,120,122,127,130,128,127,129,132,
                    1480,140,138,135,130,125,120,120,118,115,
                    105,95,100,94,85,83,78,80,73,68
                ]
            }
        ]
    },
    dataView : {
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data:['邮件营销','联盟广告','视频广告','直接访问','搜索引擎']
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                boundaryGap : false,
                data : ['周一','周二','周三','周四','周五','周六','周日']
            }
        ],
        yAxis : [
            {
                type : 'value',
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'邮件营销',
                type:'line',
                stack: '总量',
                data:[120, 132, 101, 134, 90, 230, 210]
            },
            {
                name:'联盟广告',
                type:'line',
                stack: '总量',
                data:[220, 182, 191, 234, 290, 330, 310]
            },
            {
                name:'视频广告',
                type:'line',
                stack: '总量',
                data:[150, 232, 201, 154, 190, 330, 410]
            },
            {
                name:'直接访问',
                type:'line',
                stack: '总量',
                data:[320, 332, 301, 334, 390, 330, 320]
            },
            {
                name:'搜索引擎',
                type:'line',
                stack: '总量',
                data:[820, 932, 901, 934, 1290, 1330, 1320]
            }
        ]
    },
    magicType : {
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data:['意向','预购','成交']
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                boundaryGap : true,
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
                type:'bar',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[10, 12, 21, 54, 260, 830, 710]
            },
            {
                name:'预购',
                type:'bar',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[30, 182, 434, 791, 390, 30, 10]
            },
            {
                name:'意向',
                type:'bar',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[1320, 1132, 601, 234, 120, 90, 20]
            }
        ]
    },
    dataRange1 : {
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            max: 1000,
            text:['高','低'],           // 文本，默认为数值文本
            color:[ 'red', 'yellow'],//颜色 
            calculable : true
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataView : {readOnly: false},
                restore : true,
                saveAsImage : true
            }
        },
        series : [
            {
                name: '销售量',
                type: 'map',
                mapType: 'china',
                height: 400,
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
                    {name: '澳门',value: Math.round(Math.random()*1000)}
                ]
            }
        ]
    },
    dataZoom1 : {
        tooltip : {
            trigger: 'axis',
            formatter: function(params) {
                var res = params[0][1];
                res += '<br/>' + params[0][0];
                res += '<br/>  开盘 : ' + params[0][2][0] + '  最高 : ' + params[0][2][3];
                res += '<br/>  收盘 : ' + params[0][2][1] + '  最低 : ' + params[0][2][2];
                res += '<br/>' + params[1][0];
                res += ' : ' + params[1][2];
                return res;
            }
        },
        legend: {
            data:['上证指数','成交金额(万)']
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataZoom : true,
                dataView : {readOnly: false},
                restore : true,
                saveAsImage : true
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
                scale:true,
                precision: 2,
                splitNumber: 9,
                boundaryGap: [0.05, 0.05],
                splitArea : {show : true}
            },
            {
                type : 'value',
                scale:true,
                splitNumber: 9,
                boundaryGap: [0.05, 0.05],
                splitArea : {show : true}
            }
        ],
        series : [
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
            },
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
            }
        ]
    },
    scatter : {
        tooltip : {
            trigger: 'item'
        },
        legend: {
            data:['sin','cos']
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataZoom : true,
                dataView : {readOnly: false},
                restore : true,
                saveAsImage : true
            }
        },
        xAxis : [
            {
                type : 'value',
                power: 1,
                precision: 2,
                scale:true
            }
        ],
        yAxis : [
            {
                type : 'value',
                power: 1,
                precision: 2,
                scale:true,
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'sin',
                type:'scatter',
                large: true,
                data: (function() {
                    var d = [];
                    var len = 10000;
                    var x = 0;
                    while (len--) {
                        x = (Math.random() * 10).toFixed(3) - 0;
                        d.push([
                            x,
                            //Math.random() * 10
                            (Math.sin(x) - x * (len % 2 ? 0.1 : -0.1) * Math.random()).toFixed(3) - 0
                        ]);
                    }
                    return d;
                })()
            },
            {
                name:'cos',
                type:'scatter',
                large: true,
                data: (function() {
                    var d = [];
                    var len = 10000;
                    var x = 0;
                    while (len--) {
                        x = (Math.random() * 10).toFixed(3) - 0;
                        d.push([
                            x,
                            //Math.random() * 10
                            (Math.cos(x) - x * (len % 2 ? 0.1 : -0.1) * Math.random()).toFixed(3) - 0
                        ]);
                    }
                    return d;
                })()
            }
        ]
    },
    force : (function() {
            functionMap.force = function() {
                myChart.setOption({
                    tooltip : {
                        trigger: 'item',
                        formatter: '{a} : {b}'
                    },
                    legend: {
                        x: 'left',
                        data:['家人','朋友']
                    },
                    series : [
                        {
                            type:'force',
                            categories : [
                                {
                                    name: '人物',
                                    itemStyle: {
                                        normal: {
                                            color : '#ff7f50'
                                        }
                                    }
                                },
                                {
                                    name: '家人',
                                    itemStyle: {
                                        normal: {
                                            color : '#87cdfa'
                                        }
                                    }
                                },
                                {
                                    name:'朋友',
                                    itemStyle: {
                                        normal: {
                                            color : '#9acd32'
                                        }
                                    }
                                }
                            ],
                            itemStyle: {
                                normal: {
                                    label: {
                                        show: true,
                                        textStyle: {
                                            color: '#800080'
                                        }
                                    },
                                    nodeStyle : {
                                        brushType : 'both',
                                        strokeColor : 'rgba(255,215,0,0.4)',
                                        lineWidth : 8
                                    }
                                },
                                emphasis: {
                                    label: {
                                        show: false
                                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                                    },
                                    nodeStyle : {
                                        r: 30
                                    },
                                    linkStyle : {}
                                }
                            },
                            minRadius : 15,
                            maxRadius : 25,
                            density : 0.05,
                            attractiveness: 1.2,
                            nodes:[
                                {category:0, name: '乔布斯', value : 10},
                                {category:1, name: '丽萨-乔布斯',value : 2},
                                {category:1, name: '保罗-乔布斯',value : 3},
                                {category:1, name: '克拉拉-乔布斯',value : 3},
                                {category:1, name: '劳伦-鲍威尔',value : 7},
                                {category:2, name: '史蒂夫-沃兹尼艾克',value : 5},
                                {category:2, name: '奥巴马',value : 8},
                                {category:2, name: '比尔-盖茨',value : 9},
                                {category:2, name: '乔纳森-艾夫',value : 4},
                                {category:2, name: '蒂姆-库克',value : 4},
                                {category:2, name: '龙-韦恩',value : 1},
                            ],
                            links : [
                                {source : 1, target : 0, weight : 1},
                                {source : 2, target : 0, weight : 2},
                                {source : 3, target : 0, weight : 1},
                                {source : 4, target : 0, weight : 2},
                                {source : 5, target : 0, weight : 3},
                                {source : 6, target : 0, weight : 6},
                                {source : 7, target : 0, weight : 6},
                                {source : 8, target : 0, weight : 1},
                                {source : 9, target : 0, weight : 1},
                                {source : 10, target : 0, weight : 1},
                                {source : 3, target : 2, weight : 1},
                                {source : 6, target : 2, weight : 1},
                                {source : 6, target : 3, weight : 1},
                                {source : 6, target : 4, weight : 1},
                                {source : 6, target : 5, weight : 1},
                                {source : 7, target : 6, weight : 6},
                                {source : 7, target : 3, weight : 1},
                                {source : 9, target : 6, weight : 1}
                            ]
                        }
                    ]
                }, true);
            }
            functionMap.force2 = function() {
                myChart.setOption({
                    tooltip : {
                        trigger: 'item'
                    },
                    legend : {
                        data : ['HTMLElement', 'WebGL', 'SVG', 'CSS', 'Other'],
                        orient : 'vertical',
                        x : 'left'
                    },
                    series : [webkitDepData]
                }, true);
            }
            return {};
    })(),
    
    dynamic : (function(){
    	functionMap.dynamic = function() {
    		var lastData = 11;
			var axisData;			
			timeTicket = setInterval(function(){
			    lastData += Math.random() * ((Math.round(Math.random() * 10) % 2) == 0 ? 1 : -1);
			    lastData = lastData.toFixed(1) - 0;
			    axisData = (new Date()).toLocaleTimeString().replace(/^\D*/,'');
			    
			    // 动态数据接口 addData
			    myChart.addData([
			        [
			            0,        // 系列索引
			            Math.round(Math.random() * 1000), // 新增数据
			            true,     // 新增数据是否从队列头部插入
			            false     // 是否增加队列长度，false则自定删除原有数据，队头插入删队尾，队尾插入删队头
			        ],
			        [
			            1,        // 系列索引
			            lastData, // 新增数据
			            false,    // 新增数据是否从队列头部插入
			            false,    // 是否增加队列长度，false则自定删除原有数据，队头插入删队尾，队尾插入删队头
			            axisData  // 坐标轴标签
			        ]
			    ]);
			}, 1500);
    	};
    	return {
	        title : {
	            text: '动态数据',
	            subtext: '纯属虚构'
	        },
	        tooltip : {
	            trigger: 'axis'
	        },
	        legend: {
	            data:['最新成交价', '预购队列']
	        },
	        toolbox: {
	            show : true,
	            feature : {
	                mark : true,
	                dataView : {readOnly: false},
	                magicType:['line', 'bar'],
	                restore : true,
	                saveAsImage : true
	            }
	        },
	        dataZoom : {
	            show : false,
	            realtime: true,
	            start : 50,
	            end : 100
	        },
	        xAxis : [
	            {
	                type : 'category',
	                boundaryGap : true,
	                data : (function(){
	                    var now = new Date();
	                    var res = [];
	                    var len = 10;
	                    while (len--) {
	                        res.unshift(now.toLocaleTimeString().replace(/^\D*/,''));
	                        now = new Date(now - 2000);
	                    }
	                    return res;
	                })()
	            },
	            {
	                type : 'category',
	                boundaryGap : true,
	                splitline : {show : false},
	                data : (function(){
	                    var res = [];
	                    var len = 10;
	                    while (len--) {
	                        res.push(len + 1);
	                    }
	                    return res;
	                })()
	            }
	        ],
	        yAxis : [
	            {
	                type : 'value',
	                scale: true,
	                precision:1,
	                power:1,
	                name : '价格',
	                boundaryGap: [0.2, 0.2],
	                splitArea : {show : true}
	            },
	            {
	                type : 'value',
	                scale: true,
	                name : '预购量',
	                boundaryGap: [0.2, 0.2]
	            }
	        ],
	        series : [
	            {
	                name:'预购队列',
	                type:'bar',
	                xAxisIndex: 1,
	                yAxisIndex: 1,
	                itemStyle: {
	                    normal: {
	                        color : 'rgba(135,206,205,0.4)'
	                    }
	                },
	                data:(function(){
	                    var res = [];
	                    var len = 10;
	                    while (len--) {
	                        res.push(Math.round(Math.random() * 1000));
	                    }
	                    return res;
	                })()
	            },
	            {
	                name:'最新成交价',
	                type:'line',
	                itemStyle: {
	                    normal: {
	                        // areaStyle: {type: 'default'},
	                        lineStyle: {
	                            shadowColor : 'rgba(0,0,0,0.4)'
	                        }
	                    }
	                },
	                data:(function(){
	                    var res = [];
	                    var len = 10;
	                    while (len--) {
	                        res.push((Math.random()*10 + 5).toFixed(1) - 0);
	                    }
	                    return res;
	                })()
	            }
	        ]
	    }
    })(),
    legendSelected : {
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data:['直接访问','邮件营销','联盟广告','视频广告','搜索引擎']
        },
        toolbox: {
            show : true,
            orient: 'vertical',
            x: 'right',
            y: 'center',
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                data : ['周一','周二','周三','周四','周五','周六','周日']
            }
        ],
        yAxis : [
            {
                type : 'value',
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'直接访问',
                type:'bar',
                data:[320, 332, 301, 334, 390, 330, 320]
            },
            {
                name:'邮件营销',
                type:'bar',
                data:[120, 132, 101, 134, 90, 230, 210]
            },
            {
                name:'联盟广告',
                type:'bar',
                data:[420, 482, 491, 434, 390, 430, 510]
            },
            {
                name:'视频广告',
                type:'bar',
                data:[150, 232, 201, 154, 190, 330, 410]
            },
            {
                name:'搜索引擎',
                type:'bar',
                data:[862, 1018, 964, 1026, 1479, 1400, 1470]
            }
        ]
    },
    stack : {
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data:['直接访问','邮件营销','联盟广告','视频广告','搜索引擎','百度','谷歌','必应','其他']
        },
        toolbox: {
            show : true,
            orient: 'vertical',
            x: 'right',
            y: 'center',
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                data : ['周一','周二','周三','周四','周五','周六','周日']
            }
        ],
        yAxis : [
            {
                type : 'value',
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'直接访问',
                type:'bar',
                data:[320, 332, 301, 334, 390, 330, 320]
            },
            {
                name:'邮件营销',
                type:'bar',
                stack: '广告',
                data:[120, 132, 101, 134, 90, 230, 210]
            },
            {
                name:'联盟广告',
                type:'bar',
                stack: '广告',
                data:[220, 182, 191, 234, 290, 330, 310]
            },
            {
                name:'视频广告',
                type:'bar',
                stack: '广告',
                data:[150, 232, 201, 154, 190, 330, 410]
            },
            {
                name:'搜索引擎',
                type:'bar',
                data:[862, 1018, 964, 1026, 1679, 1600, 1570]
            },
            {
                name:'百度',
                type:'bar',
                barWidth : 5,
                stack: '搜索引擎',
                data:[620, 732, 701, 734, 1090, 1130, 1120]
            },
            {
                name:'谷歌',
                type:'bar',
                stack: '搜索引擎',
                data:[120, 132, 101, 134, 290, 230, 220]
            },
            {
                name:'必应',
                type:'bar',
                stack: '搜索引擎',
                data:[60, 72, 71, 74, 190, 130, 110]
            },
            {
                name:'其他',
                type:'bar',
                stack: '搜索引擎',
                data:[62, 82, 91, 84, 109, 110, 120]
            }
        ]
    },
    mix1 : {
        tooltip : {
            trigger: 'axis'
        },
        toolbox: {
            show : true,
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        legend: {
            data:['蒸发量','降水量','平均温度']
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
                axisLabel : {
                    formatter: '{value} ml'
                },
                splitArea : {show : true}
            },
            {
                type : 'value',
                axisLabel : {
                    formatter: '{value} °C'
                },
                splitLine : {show : false}
            }
        ],
        series : [

            {
                name:'蒸发量',
                type:'bar',
                data:[2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3]
            },
            {
                name:'降水量',
                type:'bar',
                data:[2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3]
            },
            {
                name:'平均温度',
                type:'line',
                yAxisIndex: 1,
                data:[2.0, 2.2, 3.3, 4.5, 6.3, 10.2, 20.3, 23.4, 23.0, 16.5, 12.0, 6.2]
            }
        ]
    },
    mix2 : {
        tooltip : {
            trigger: 'axis'
        },
        toolbox: {
            show : true,
            y: 'bottom',
            feature : {
                mark : true,
                dataView : {readOnly: false},
                magicType:['line', 'bar'],
                restore : true,
                saveAsImage : true
            }
        },
        calculable : true,
        legend: {
            data:['直接访问','邮件营销','联盟广告','视频广告','搜索引擎','百度','谷歌','必应','其他']
        },
        xAxis : [
            {
                type : 'category',
                splitLine : {show : false},
                data : ['周一','周二','周三','周四','周五','周六','周日']
            }
        ],
        yAxis : [
            {
                type : 'value',
                position: 'right',
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'直接访问',
                type:'bar',
                data:[320, 332, 301, 334, 390, 330, 320]
            },
            {
                name:'邮件营销',
                type:'bar',
                tooltip : {trigger: 'item'},
                stack: '广告',
                data:[120, 132, 101, 134, 90, 230, 210]
            },
            {
                name:'联盟广告',
                type:'bar',
                tooltip : {trigger: 'item'},
                stack: '广告',
                data:[220, 182, 191, 234, 290, 330, 310]
            },
            {
                name:'视频广告',
                type:'bar',
                tooltip : {trigger: 'item'},
                stack: '广告',
                data:[150, 232, 201, 154, 190, 330, 410]
            },
            {
                name:'搜索引擎',
                type:'line',
                data:[862, 1018, 964, 1026, 1679, 1600, 1570]
            },
            {
                name:'搜索引擎细分',
                type:'pie',
                tooltip : {
                    trigger: 'item',
                    formatter: '{a} <br/>{b} : {c} ({d}%)'
                },
                center: [160,130],
                radius : [0, 50],
                itemStyle :　{
                    normal : {
                        labelLine : {
                            length : 20
                        }
                    }
                },
                data:[
                    {value:1048, name:'百度'},
                    {value:251, name:'谷歌'},
                    {value:147, name:'必应'},
                    {value:102, name:'其他'}
                ]
            }
        ]
    },
    mix3 : {
        tooltip : {
            trigger: 'item'
        },
        legend: {
            x:'right',
            data:['北京','上海','广东']
        },
        dataRange: {
            orient: 'horizontal',
            min: 0,
            max: 1000,
            text:['高','低'],           // 文本，默认为数值文本
            splitNumber:0
        },
        toolbox: {
            show : true,
            orient: 'vertical',
            x:'right',
            y:'center',
            feature : {
                mark : true,
                dataView : {readOnly: false}
            }
        },
        series : [
            {
                name: 'iphone销量',
                type: 'map',
                mapType: 'china',
                mapLocation: {
                    x: 'left'
                },
                selectedMode : 'multiple',
                itemStyle:{
                    normal:{label:{show:true}},
                    emphasis:{label:{show:true}}
                },
                data:[
                    {name: '北京',value: 790,selected:true},
                    {name: '天津',value: Math.round(Math.random()*1000)},
                    {name: '上海',value: 940,selected:true},
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
                    {name: '广东',value: 978,selected:true},
                    {name: '青海',value: Math.round(Math.random()*1000)},
                    {name: '西藏',value: Math.round(Math.random()*1000)},
                    {name: '四川',value: Math.round(Math.random()*1000)},
                    {name: '宁夏',value: Math.round(Math.random()*1000)},
                    {name: '海南',value: Math.round(Math.random()*1000)},
                    {name: '台湾',value: Math.round(Math.random()*1000)},
                    {name: '香港',value: Math.round(Math.random()*1000)},
                    {name: '澳门',value: Math.round(Math.random()*1000)}
                ]
            },
            {
                name:'各省销量',
                type:'pie',
                tooltip: {
                    trigger: 'item',
                    formatter: "{a} <br/>{b} : {c} ({d}%)"
                },
                center: [700, 225],
                radius: [50, 120],
                data:[
                    {name: '北京', value: 790},
                    {name: '上海', value: 940},
                    {name: '广东', value: 978}
                ]
            }
        ],
        animation: (function() {
            functionMap.mix3 = function() {
                var ecConfig = require('echarts/config');
                myChart.on(ecConfig.EVENT.MAP_SELECTED, function(param){
                    var selected = param.selected;
                    var option = optionMap.mix3;
                    var mapSeries = option.series[0];
                    var data = [];
                    var legendData = [];
                    var name;
                    for (var p = 0, len = mapSeries.data.length; p < len; p++) {
                        name = mapSeries.data[p].name;
                        mapSeries.data[p].selected = selected[name];
                        if (selected[name]) {
                            data.push({
                                name: name,
                                value: mapSeries.data[p].value
                            });
                            legendData.push(name);
                        }
                    }
                    option.legend.data = legendData;
                    option.series[1].data = data;
                    myChart.setOption(option, true);
                })
            }
            return false;
        })()
    },
    lasagna : (function() {
    	 functionMap.lasagna = function() {
            myChart.setOption({
		        tooltip : {
		            trigger: 'item',
		            formatter: "{a} <br/>{b} : {c} ({d}%)"
		        },
		        legend: {
		            orient : 'vertical',
		            x : 'left',
		            data:['Chrome','Firefox','Safari','IE9+','IE8-']
		        },
		        toolbox: {
		            show : true,
		            feature : {
		                mark : true,
		                dataView : {readOnly: false},
		                restore : true,
		                saveAsImage : true
		            }
		        },
		        series : (function(){
		            var series = [];
		            for (var i = 0; i < 30; i++) {
		                series.push({
		                    name:'浏览器（数据纯属虚构）',
		                    type:'pie',
		                    itemStyle : {normal : {
		                        label : {show : i > 28},
		                        labelLine : {show : i > 28, length:20}
		                    }},
		                    radius : [i * 4 + 40, i * 4 + 43],
		                    data:[
		                        {value: i * 128 + 80,  name:'Chrome'},
		                        {value: i * 64  + 160,  name:'Firefox'},
		                        {value: i * 32  + 320,  name:'Safari'},
		                        {value: i * 16  + 640,  name:'IE9+'},
		                        {value: i * 8  + 1280, name:'IE8-'}
		                    ]
		                })
		            }
		            return series;
		        })(),
		        calculable : (function(){
		            functionMap.mix4 = function() {
		                setTimeout(function(){
		                    if (!myChart) {
		                        return;
		                    }
		                    var _ZR = myChart.getZrender();
		                    // 补充千层饼
		                    _ZR.addShape({
		                        shape : 'text',
		                        style : {
		                            x : _ZR.getWidth() / 2,
		                            y : _ZR.getHeight() / 2,
		                            color: '#bbb',
		                            text : '恶梦的过去',
		                            textAlign : 'center'
		                        }
		                    });
		                    _ZR.addShape({
		                        shape : 'text',
		                        style : {
		                            x : _ZR.getWidth() / 2 + 200,
		                            y : _ZR.getHeight() / 2,
		                            brushType:'both',
		                            color: 'orange',
		                            strokeColor: 'yellow',
		                            text : '美好的未来',
		                            textAlign : 'left',
		                            textFont:'normal 20px 微软雅黑'
		                        }
		                    });
		                    _ZR.refresh();
		                }, 2000);
		            }
		            return false;
		        })()
		    }, true);
        }
        functionMap.wormhole = function() {
        	myChart.setOption({
			    color : (function(){
			        var zrColor = require('zrender/tool/color');
			        return zrColor.getStepColors('yellow', 'red', 28);
			    })(),
			    title : {
			        text: '浏览器占比变化',
			        subtext: '纯属虚构',
			        x:'right',
			        y:'bottom'
			    },
			    tooltip : {
			        trigger: 'item',
        			backgroundColor : 'rgba(0,0,250,0.2)'
			    },
			    legend: {
			       // orient : 'vertical',
			        //x : 'center',
			        data: function(){
			                var list = [];
			                for (var i = 1; i <=28; i++) {
			                    list.push(i + 2000);
			                }
			                return list;
			            }()
			    },
			    toolbox: {
			        show : true,
			        orient : 'vertical',
			        y:'center',
			        feature : {
			            mark : true,
			            dataView : {readOnly: false},
			            restore : true,
			            saveAsImage : true
			        }
			    },
			   polar : [
			       {
			           indicator : [
			               { text: 'IE8-', max: 400},
			               { text: 'IE9+', max: 400},
			               { text: 'Safari', max: 400},
			               { text: 'Firefox', max: 400},
			               { text: 'Chrome', max: 400}
			            ],
			            center : [,240],
			            radius : 150
			        }
			    ],
			    calculable : false,
			    series : (function(){
			        var series = [];
			        for (var i = 1; i <= 28; i++) {
			            series.push({
			                name:'浏览器（数据纯属虚构）',
			                type:'radar',
			                symbol:'none',
			                itemStyle: {
			                    normal: {
			                        lineStyle: {
			                          width:1
			                        }
			                    },
			                    emphasis : {
			                        areaStyle: {color:'rgba(0,250,0,0.3)'}
			                    }

			                },
			                data:[
			                  {
			                    value:[
			                        (40 - i) * 10,
			                        (38 - i) * 4 + 60,
			                        i * 5 + 10,
			                        i * 9,
			                        i * i /2
			                    ],
			                    name:i + 2000
			                  }
			                ]
			            })
			        }
			        return series;
			    })()
			}, true);
        }
    	return {};
    })()
}