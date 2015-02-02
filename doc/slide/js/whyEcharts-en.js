var developMode = false;

if (developMode) {
    window.esl = null;
    window.define = null;
    window.require = null;
    (function () {
        var script = document.createElement('script');
        script.async = true;

        var pathname = location.pathname;

        var pathSegs = pathname.slice(pathname.indexOf('doc')).split('/');
        var pathLevelArr = new Array(pathSegs.length - 1);
        script.src = pathLevelArr.join('../') + 'asset/js/esl/esl.js';
        if (script.readyState) {
            script.onreadystatechange = fireLoad;
        }
        else {
            script.onload = fireLoad;
        }
        (document.getElementsByTagName('head')[0] || document.body).appendChild(script);
        
        function fireLoad() {
            script.onload = script.onreadystatechange = null;
            setTimeout(loadedListener,100);
        }
        function loadedListener() {
            // for develop
            require.config({
                paths : {
                    webkitDep : '../../doc/example/webkit-dep'
                },
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
            launchExample();
        }
    })();
}
else {
    // for echarts online home page
    require.config({
        paths:{ 
            echarts: '../../doc/example/www/js',
            webkitDep : '../../doc/example/webkit-dep'
        }
    });
    launchExample();
}

var theme = {
    backgroundColor:'#fff',
     color: [
        '#5d9cec', '#62c87f', '#f15755', '#fc863f', '#7053b6',
        '#6ed5e6','#ffce55',  '#f57bc1', '#dcb186', '#647c9d'
    ],
    symbolList : [
        'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond',
        'circle', 'rectangle', 'triangle', 'diamond' 
    ],
    k: {
        itemStyle: {
            normal: {
                color: '#ff3200',          // 阳线填充颜色
                color0: '#00aa11',      // 阴线填充颜色
                lineStyle: {
                    width: 1,
                    color: '#ff3200',   // 阳线边框颜色
                    color0: '#00aa11'   // 阴线边框颜色
                }
            }
        }
    }
}
var echarts;
var webkitDepData;

var isExampleLaunched;
function launchExample() {
    if (isExampleLaunched) {
        return;
    }

    // 按需加载
    isExampleLaunched = 1;
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
            'echarts/chart/chord',
            'echarts/chart/map',
            'echarts/chart/gauge',
            'echarts/chart/funnel'
        ],
        function (ec, wd) {
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
            optionMap.force2.series[0] = webkitDepData;
            optionMap.force2.color = ['#ff7f50','#87cefa','#da70d6','#32cd32','#6495ed',
                    '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
                    '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
                    '#6699FF','#ff6666','#3cb371','#b8860b','#30e0e0'];
            if (typeof curEvent != 'undefined') {
                clearTimeout(showChartTimer);
                getCurParams();
                showChart()
                //showChartTimer = setTimeout(showChart, 500);
            }
        }
    );
}


var curEvent;
var showChartTimer;
Reveal.addEventListener( 'ready', function (event){
    clearTimeout(showChartTimer);
    curEvent = event;
    getCurParams();
    showChartTimer = setTimeout(showChart, 800);
});

Reveal.addEventListener( 'slidechanged', function (event){
    clearTimeout(showChartTimer);
    curEvent = event;
    getCurParams();
    showChartTimer = setTimeout(showChart, 800);
});

var myChart;
var myChart2;
var myChart3;
var timeTicket;
var dom;
var optionKey;
function getCurParams(){
    clearInterval(timeTicket);
    var len = curEvent.currentSlide.childNodes.length;
    while(--len) {
        dom = curEvent.currentSlide.childNodes[len];
        if (dom.className == 'main'){
            optionKey = dom.getAttribute('optionKey');
            if (optionKey == 'multiCharts') {
                if (myChart2 && myChart2.dispose) {
                    myChart2.getDom().className = 'main';
                    myChart2.dispose();
                    myChart2 = null;
                }
                if (myChart3 && myChart3.dispose) {
                    myChart3.getDom().className = 'main';
                    myChart3.dispose();
                    myChart3 = null;
                }
            }
            return;
        }
    }
    optionKey = false;
}
function showChart() {
    if (!echarts) {return;}
    if (myChart && myChart.dispose) {
        myChart.getDom().className = 'main';
        myChart.dispose();
        myChart = null;
    }
    if (optionKey) {
        myChart = echarts.init(dom, theme);
        var option = optionMap[optionKey];
        dom.className = 'main noLoading';
        myChart.setOption(option);
        if (functionMap[optionKey]) {
            functionMap[optionKey]();
        }
    }
}

var axisData = [
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
];
var kData = [ // 开盘，收盘，最低，最高
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
];

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
                dataView : {show: true, readOnly: false},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        series : [
            {
                name:'Browser proportion',
                type:'pie',
                radius : ['30%', '70%'],
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
            data:['Sales']
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                magicType : {show: true, type: ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                axisLabel : {
                    rotate: 45
                },
                data : function (){
                    var list = [];
                    for (var i = 1; i <= 30; i++) {
                        list.push('11 - ' + i);
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
                name:'Sales',
                type:'bar',
                data:[
                    123,121,120,122,127,130,128,127,129,132,
                    2380,140,138,135,130,125,120,120,118,115,
                    105,95,100,94,85,83,78,80,73,68
                ]
            }
        ]
    },
    dataView : {
        tooltip : {
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        legend: {
            data:['Profit', 'Expense', 'Income']
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                magicType: {show: true, type : ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'value',
                splitArea: {show : true}
            }
        ],
        yAxis : [
            {
                type : 'category',
                data : ['Mon','Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            }
        ],
        series : [
            {
                name:'Profit',
                type:'bar',
                itemStyle : { normal: {
                    color: 'rgba(248, 83, 0, 1)',
                    label : {show: true, position: 'inside'}}
                },
                data:[200, 170, 240, 244, 200, 220, 210]
            },
            {
                name:'Income',
                type:'bar',
                stack: '总量',
                barWidth : 5,
                itemStyle: {normal: {
                    color: 'rgba(255, 160, 0, 0.8)',//'rgba(138, 43, 226, 0.6)',
                    label : {show: true}
                }},
                data:[320, 302, 341, 374, 390, 450, 420]
            },
            {
                name:'Expense',
                type:'bar',
                stack: '总量',
                itemStyle: {normal: {
                    color: 'rgba(30, 144, 255, 0.6)',
                    label : {show: true, position: 'left'}
                }},
                data:[-120, -132, -101, -134, -190, -230, -210]
            }
        ]
    },
    magicType : {
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data:['Intent','Preorder','Deal']
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                magicType: {show: true, type : ['line', 'bar', 'stack', 'tiled']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                boundaryGap : true,
                data : ['Mon','Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            }
        ],
        yAxis : [
            {
                type : 'value'
            }
        ],
        series : [
            {
                name:'Intent',
                type:'bar',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[1320, 1132, 601, 234, 120, 90, 20]
            },
            {
                name:'Preorder',
                type:'bar',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[30, 182, 434, 791, 390, 30, 10]
            },
            {
                name:'Deal',
                type:'bar',
                smooth:true,
                itemStyle: {normal: {areaStyle: {type: 'default'}}},
                data:[10, 12, 21, 54, 260, 830, 710]
            }
        ]
    },
    magicType2: (function(){
        var labelTop = {
            normal : {
                label : {
                    show : true,
                    position : 'center',
                    formatter : '{b}',
                    textStyle: {
                        baseline : 'bottom'
                    }
                },
                labelLine : {
                    show : false
                }
            }
        };
        var labelFromatter = {
            normal : {
                label : {
                    formatter : function (a,b,c){return 100 - c + '%'},
                    textStyle: {
                        baseline : 'top'
                    }
                }
            },
        }
        var labelBottom = {
            normal : {
                color: '#ccc',
                label : {
                    show : true,
                    position : 'center'
                },
                labelLine : {
                    show : false
                }
            },
            emphasis: {
                color: 'rgba(0,0,0,0)'
            }
        };
        var radius = [40, 55];
        return {
            legend: {
                x : 'center',
                y : 'center',
                data:[
                    'GoogleMaps','Facebook','Youtube','Google+','Weixin',
                    'Twitter', 'Skype', 'Messenger', 'Whatsapp', 'Instagram'
                ]
            },
            title : {
                text: 'The App World',
                subtext: 'from global web index',
                x: 'center'
            },
            toolbox: {
                show : true,
                feature : {
                    dataView : {show: true, readOnly: false},
                    magicType : {
                        show: true, 
                        type: ['pie', 'funnel'],
                        option: {
                            funnel: {
                                width: '20%',
                                height: '30%',
                                itemStyle : {
                                    normal : {
                                        label : {
                                            formatter : function (a,b,c){return 'other\n' + c + '%\n'},
                                            textStyle: {
                                                baseline : 'middle'
                                            }
                                        }
                                    },
                                } 
                            }
                        }
                    },
                    restore : {show: true},
                    saveAsImage : {show: true}
                }
            },
            series : [
                {
                    type : 'pie',
                    center : ['10%', '30%'],
                    radius : radius,
                    x: '0%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:46, itemStyle : labelBottom},
                        {name:'GoogleMaps', value:54,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['30%', '30%'],
                    radius : radius,
                    x:'20%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:56, itemStyle : labelBottom},
                        {name:'Facebook', value:44,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['50%', '30%'],
                    radius : radius,
                    x:'40%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:65, itemStyle : labelBottom},
                        {name:'Youtube', value:35,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['70%', '30%'],
                    radius : radius,
                    x:'60%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:70, itemStyle : labelBottom},
                        {name:'Google+', value:30,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['90%', '30%'],
                    radius : radius,
                    x:'80%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:73, itemStyle : labelBottom},
                        {name:'Weixin', value:27,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['10%', '70%'],
                    radius : radius,
                    y: '55%',   // for funnel
                    x: '0%',    // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:78, itemStyle : labelBottom},
                        {name:'Twitter', value:22,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['30%', '70%'],
                    radius : radius,
                    y: '55%',   // for funnel
                    x:'20%',    // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:78, itemStyle : labelBottom},
                        {name:'Skype', value:22,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['50%', '70%'],
                    radius : radius,
                    y: '55%',   // for funnel
                    x:'40%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:78, itemStyle : labelBottom},
                        {name:'Messenger', value:22,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['70%', '70%'],
                    radius : radius,
                    y: '55%',   // for funnel
                    x:'60%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:83, itemStyle : labelBottom},
                        {name:'Whatsapp', value:17,itemStyle : labelTop}
                    ]
                },
                {
                    type : 'pie',
                    center : ['90%', '70%'],
                    radius : radius,
                    y: '55%',   // for funnel
                    x:'80%', // for funnel
                    itemStyle : labelFromatter,
                    data : [
                        {name:'other', value:89, itemStyle : labelBottom},
                        {name:'Instagram', value:11,itemStyle : labelTop}
                    ]
                }
            ]
        };
    })(),
    dataRange1 : {
        title : {
            text: '2011 GDP of China (Billion yuan)',
            subtext: 'data from National Bureau of Statistics of China'
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            max: 55000,
            text:['High','Low'],           // 文本，默认为数值文本
            color:[ 'red', 'yellow'],//颜色 
            calculable : true
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
        series : [
            {
                name: '2011 GDP of China',
                type: 'map',
                mapType: 'china',
                itemStyle:{
                    normal:{label:{show:true}},
                    emphasis:{color:'rgba(104,255,104,0.5)'}
                },
                data:[
                    {name:'西藏', value:605.83},
                    {name:'青海', value:1670.44},
                    {name:'宁夏', value:2102.21},
                    {name:'海南', value:2522.66},
                    {name:'甘肃', value:5020.37},
                    {name:'贵州', value:5701.84},
                    {name:'新疆', value:6610.05},
                    {name:'云南', value:8893.12},
                    {name:'重庆', value:10011.37},
                    {name:'吉林', value:10568.83},
                    {name:'山西', value:11237.55},
                    {name:'天津', value:11307.28},
                    {name:'江西', value:11702.82},
                    {name:'广西', value:11720.87},
                    {name:'陕西', value:12512.3},
                    {name:'黑龙江', value:12582},
                    {name:'内蒙古', value:14359.88},
                    {name:'安徽', value:15300.65},
                    {name:'北京', value:16251.93},
                    {name:'福建', value:17560.18},
                    {name:'上海', value:19195.69},
                    {name:'湖北', value:19632.26},
                    {name:'湖南', value:19669.56},
                    {name:'四川', value:21026.68},
                    {name:'辽宁', value:22226.7},
                    {name:'河北', value:24515.76},
                    {name:'河南', value:26931.03},
                    {name:'浙江', value:32318.85},
                    {name:'山东', value:45361.85},
                    {name:'江苏', value:49110.27},
                    {name:'广东', value:53210.28}
                ]
            }
        ]
    },
    dataZoom1 : {
        tooltip : {
            trigger: 'axis',
            formatter: function (params) {
                var res = params[1][1];
                res += '<br/>' + params[1][0];
                res += '<br/>  Opening : ' + params[1][2][0];
                res += '<br/>  Close : ' + params[1][2][1];
                res += '<br/>  Highest : ' + params[1][2][3];
                res += '<br/>  Lowest : ' + params[1][2][2];
                res += '<br/><br/>' + params[0][0];
                res += ' : ' + params[0][2];
                return res;
            }
        },
        legend: {
            data:['Shanghai Stock Index','Turnover']
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
        dataZoom : {
            show : true,
            realtime: true,
            start : 0,
            end : 50
        },
        xAxis : [
            {
                type : 'category',
                boundaryGap : true,
                axisTick: {onGap:false},
                data : axisData
            }
        ],
        yAxis : [
            {
                type : 'value',
                scale:true,
                splitNumber: 9,
                boundaryGap: [0.05, 0.05],
                splitArea : {show : true}
            },
            {
                type : 'value',
                scale:true,
                splitNumber: 9,
                boundaryGap: [0.05, 0.05],
                axisLabel: {
                    formatter: function (v) {
                        return (v/1000000).toFixed(1) + ' M'
                    }
                },
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'Turnover',
                type:'line',
                yAxisIndex: 1,
                symbol: 'none',
                itemStyle:{
                    normal:{
                        color:'#1e90ff'
                    }
                },
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
                ],
                markPoint : {
                    symbol: 'emptyPin',
                    itemStyle : {
                        normal : {
                            color:'#1e90ff',
                            label : {
                                show:true,
                                position:'top',
                                formatter: function (params) {
                                    return (params.value/1000000).toFixed(1) + ' M'
                                }
                            }
                        }
                    },
                    data : [
                        {type : 'max', name: '最大值', symbolSize:5},
                        {type : 'min', name: '最小值', symbolSize:5}
                    ]
                },
                markLine : {
                    symbol : 'none',
                    itemStyle : {
                        normal : {
                            color:'#1e90ff',
                            label : {
                                show:true,
                                formatter: function (params) {
                                    return (params.value/1000000).toFixed(1) + ' M'
                                }
                            }
                        }
                    },
                    data : [
                        {type : 'average', name: '平均值'}
                    ]
                }
            },
            {
                name:'Shanghai Stock Index',
                type:'k',
                data: kData
            }
        ]
    },
    multiCharts : (function (){
        functionMap.multiCharts = function (){
            var option2 = {
                tooltip : {
                    trigger: 'axis',
                    showDelay: 0
                },
                legend: {
                    y : -30,
                    data:['Shanghai Stock Index','Turnover','Virtual']
                },
                toolbox: {
                    y : -30,
                    show : true,
                    feature : {
                        mark : {show: true},
                        dataZoom : {show: true},
                        dataView : {show: true, readOnly: false},
                        magicType : {show: true, type: ['line', 'bar']},
                        restore : {show: true},
                        saveAsImage : {show: true}
                    }
                },
                dataZoom : {
                    show : true,
                    realtime: true,
                    start : 0,
                    end : 50
                },
                grid: {
                    x: 80,
                    y:5,
                    x2:20,
                    y2:40
                },
                xAxis : [
                    {
                        type : 'category',
                        position:'top',
                        boundaryGap : true,
                        axisLabel:{show:false},
                        axisTick: {onGap:false},
                        splitLine: {show:false},
                        data : axisData
                    }
                ],
                yAxis : [
                    {
                        type : 'value',
                        scale:true,
                        splitNumber: 3,
                        boundaryGap: [0.05, 0.05],
                        axisLabel: {
                            formatter: function (v) {
                                return (v/1000000).toFixed(1) + ' M'
                            }
                        },
                        splitArea : {show : true}
                    }
                ],
                series : [
                    {
                        name:'Turnover',
                        type:'line',
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
            };
            document.getElementById('mcMain2').className = 'main noLoading';
            myChart2 = echarts.init(document.getElementById('mcMain2'),theme);
            myChart2.setOption(option2);

            var option3 = {
                tooltip : {
                    trigger: 'axis',
                    showDelay: 0
                },
                legend: {
                    y : -30,
                    data:['Shanghai Stock Index','Turnover','Virtual']
                },
                toolbox: {
                    y : -30,
                    show : true,
                    feature : {
                        mark : {show: true},
                        dataZoom : {show: true},
                        dataView : {show: true, readOnly: false},
                        magicType : {show: true, type: ['line', 'bar']},
                        restore : {show: true},
                        saveAsImage : {show: true}
                    }
                },
                dataZoom : {
                    y:200,
                    show : true,
                    realtime: true,
                    start : 0,
                    end : 50
                },
                grid: {
                    x: 80,
                    y:5,
                    x2:20,
                    y2:30
                },
                xAxis : [
                    {
                        type : 'category',
                        position:'bottom',
                        boundaryGap : true,
                        axisTick: {onGap:false},
                        splitLine: {show:false},
                        data : axisData
                    }
                ],
                yAxis : [
                    {
                        type : 'value',
                        scale:true,
                        splitNumber:3,
                        boundaryGap: [0.05, 0.05],
                        axisLabel: {
                            fordmattder: function (v) {
                                 return Math.round(v/10000) + ' 万'
                            }
                        },
                        splitArea : {show : true}
                    }
                ],
                series : [
                    {
                        name:'Virtual',
                        type:'bar',
                        symbol: 'none',
                        data:[
                            560434, 226738, 696370, 249697, 248563, 
                            620504, 555496, 525337, 270968, 458354, 
                            933507, 896523, 365702, 633095, 722230, 
                            662783, 875798, 776423, 105979, 882629, 
                            598278, 231253, 430465, 672208, 253648, 
                            608589, 884386, 739994, 263709, 776889, 
                            692859, 105780, 848675, 755207, 397426, 
                            478607, 859532, 854862, 983288, 857084, 
                            759358, 733589, 669975, 775965, 688035, 
                            736666, 733504, 709025, 623270, 569688, 
                            586275, 669558, 599865, 688825, 953830,
                            822450, 822755, 789772, 844832, 652558, 
                            598776, 783570, 862560, 794092, 839084, 
                            965298, 828048, 799480, 756647, 665826, 
                            102257, 248870, 288435, 302528, 529046, 
                            105205, 920253, 999206, 203525, 435588, 
                            103546, 703990, 964868, 923778, 742688,
                            752658, 805835, 797452
                        ]
                    }
                ]
            };
            document.getElementById('mcMain3').className = 'main noLoading';
            myChart3 = echarts.init(document.getElementById('mcMain3'),theme);
            myChart3.setOption(option3);

            myChart.connect([myChart2, myChart3]);
            myChart2.connect([myChart, myChart3]);
            myChart3.connect([myChart, myChart2])
        }
        return {
            title : {
                text: '2013 Shanghai Stock Index'
            },
            tooltip : {
                trigger: 'axis',
                showDelay: 0,             // 显示延迟，添加显示延迟可以避免频繁切换，单位ms
                formatter: function (params) {
                    var res = params[0][1];
                    res += '<br/>' + params[0][0];
                    res += '<br/>  Opening : ' + params[0][2][0];
                    res += '<br/>  Close : ' + params[0][2][1];
                    res += '<br/>  Highest : ' + params[0][2][3];
                    res += '<br/>  Lowest : ' + params[0][2][2];
                    return res;
                }
            },
            legend: {
                data:['Shanghai Stock Index','Turnover','Virtual']
            },
            toolbox: {
                show : true,
                feature : {
                    mark : {show: true},
                    dataZoom : {show: true},
                    magicType : {show: true, type: ['line', 'bar']},
                    restore : {show: true},
                    saveAsImage : {show: true}
                }
            },
            dataZoom : {
                y: 250,
                show : true,
                realtime: true,
                start : 0,
                end : 50
            },
            grid: {
                x: 80,
                y: 40,
                x2:20,
                y2:25
            },
            xAxis : [
                {
                    type : 'category',
                    boundaryGap : true,
                    axisTick: {onGap:false},
                    splitLine: {show:false},
                    data : axisData
                }
            ],
            yAxis : [
                {
                    type : 'value',
                    scale:true,
                    boundaryGap: [0.05, 0.05],
                    splitArea : {show : true}
                }
            ],
            series : [
                {
                    name:'Shanghai Stock Index',
                    type:'k',
                    data: kData
                },
                {
                    name:'Turnover',
                    type:'line',
                    symbol: 'none',
                    data:[]
                },
                {
                    name:'Virtual',
                    type:'bar',data:[]
                }
                
            ]
        };
    })(),
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
                scale:true
            }
        ],
        yAxis : [
            {
                type : 'value',
                scale:true,
                splitArea : {show : true}
            }
        ],
        series : [
            {
                name:'sin',
                type:'scatter',
                large: true,
                symbol:'circle',
                data: (function () {
                    var d = [];
                    var len = 25000;
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
                symbol:'circle',
                data: (function () {
                    var d = [];
                    var len = 25000;
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
    force1 : {
        tooltip : {
            trigger: 'item',
            formatter: '{a} : {b}'
        },
        toolbox: {
            show : true,
            feature : {
                restore : {show: true},
                magicType: {show: true, type: ['force', 'chord']},
                saveAsImage : {show: true}
            }
        },
        legend: {
            x: 'left',
            data:['Family','Friends']
        },
        series : [
            {
                type:'force',
                ribbonType: false,
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
                        name: 'Family',
                        itemStyle: {
                            normal: {
                                color : '#87cdfa'
                            }
                        }
                    },
                    {
                        name:'Friends',
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
                    {category:0, name: 'Steve Jobs', value : 10},
                    {category:1, name: 'Lisa Jobs',value : 2},
                    {category:1, name: 'Paul Jobs',value : 3},
                    {category:1, name: 'Clara Jobs',value : 3},
                    {category:1, name: 'Laurene Powell',value : 7},
                    {category:2, name: 'Steven Wozniak',value : 5},
                    {category:2, name: 'Obama',value : 8},
                    {category:2, name: 'Bill Gates',value : 9},
                    {category:2, name: 'Jonathan Ive',value : 4},
                    {category:2, name: 'Tim Cook',value : 4},
                    {category:2, name: 'Long Wayne',value : 1},
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
    },
    force2 : {
        tooltip : {
            trigger: 'item'
        },
        legend : {
            data : ['HTMLElement', 'WebGL', 'SVG', 'CSS', 'Other'],
            orient : 'vertical',
            x : 'left'
        },
        series : []
    },
    dynamic : (function(){
        functionMap.dynamic = function() {
            var lastData = 11;
            var axisData;            
            timeTicket = setInterval(function (){
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
                text: 'Dynamic Data',
                subtext: 'Fictitious data'
            },
            tooltip : {
                trigger: 'axis'
            },
            legend: {
                data:['Last traded price', 'Pre-queue']
            },
            toolbox: {
                show : true,
                feature : {
                    mark : {show: true},
                    dataView : {show: true, readOnly: false},
                    magicType: {show: true, type : ['line', 'bar']},
                    restore : {show: true},
                    saveAsImage : {show: true}
                }
            },
            AAdataZoom : {
                show : false,
                realtime: true,
                start : 0,
                end : 50
            },
            grid:{y2:30,y:70},
            xAxis : [
                {
                    type : 'category',
                    boundaryGap : true,
                    axisLine: {onZero: false},
                    data : (function (){
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
                    axisLine: {onZero: false},
                    data : (function (){
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
                    name : 'Price',
                    boundaryGap: [0.2, 0.2],
                    splitNumber:5,
                    splitArea : {show : true}
                },
                {
                    type : 'value',
                    splitNumber:5,
                    scale: true,
                    name : 'Pre-volume',
                    boundaryGap: [0.2, 0.2]
                }
            ],
            series : [
                {
                    name:'Pre-queue',
                    type:'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    itemStyle: {
                        normal: {
                            color : 'rgba(85,206,85,0.4)'
                        }
                    },
                    data:(function (){
                        var res = [];
                        var len = 10;
                        while (len--) {
                            res.push(Math.round(Math.random() * 1000));
                        }
                        return res;
                    })()
                },
                {
                    name:'Last traded price',
                    type:'line',
                    itemStyle: {
                        normal: {
                            // areaStyle: {type: 'default'},
                            lineStyle: {
                                shadowColor : 'rgba(0,0,0,0.4)'
                            }
                        }
                    },
                    data:(function (){
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
        color : [
            '#FBB367','#80B1D2','#FB8070','#CC99FF','#B0D961',
            '#99CCCC','#BEBBD8','#FFCC99','#8DD3C8','#FF9999',
            '#CCEAC4','#BB81BC','#FBCCEC','#CCFF66','#99CC66',
            '#66CC66','#FF6666','#FFED6F','#ff7f50','#87cefa',
        ],
        title : {
            text : 'Friend and foe relations in the Middle East',
            subtext: 'data from Caixin',
            sublink: 'http://international.caixin.com/2013-09-06/100579154.html',
            x:'right',
            y:'bottom'
        },
        toolbox: {
            show : true,
            feature : {
                restore : {show: true},
                magicType: {show: true, type: ['force', 'chord']},
                saveAsImage : {show: true}
            }
        },
        tooltip : {
            trigger: 'item',
            formatter : function (params) {
                if (params.name && params.name.indexOf('-') != -1) {
                    return params.name.replace('-', ' ' + params.seriesName + ' ')
                    }
                else {
                    return params.name ? params.name : params.data.id
                }
            }
        },
        legend : {
            data : [
                'United States',
                'Syrian opposition',
                'Assad',
                'Iran',
                'Cecilia',
                'Hamas',
                'Israel',
                'Muslim Brotherhood',
                'Al-Qaeda',
                'Russia',
                'Lebanese Shiites',
                'Turkey',
                'Qatar',
                'Saudi',
                'Lebanese Sunnis',
                '',
                'Support',
                'Opposition',
                'Undecided'
            ],
            orient : 'vertical',
            x : 'left'
        },
        series : [
            {
                "name": "Support",
                "type": "chord",
                "showScaleText": false,
                "clockWise": false,
                "data": [
                    {"name": "United States"},
                    {"name": "Syrian opposition"},
                    {"name": "Assad"},
                    {"name": "Iran"},
                    {"name": "Cecilia"},
                    {"name": "Hamas"},
                    {"name": "Israel"},
                    {"name": "Muslim Brotherhood"},
                    {"name": "Al-Qaeda"},
                    {"name": "Russia"},
                    {"name": "Lebanese Shiites"},
                    {"name": "Turkey"},
                    {"name": "Qatar"},
                    {"name": "Saudi"},
                    {"name": "Lebanese Sunnis"}
                ],
                "matrix": [
                    [0,100,0,0,0,0,100,0,0,0,0,0,0,0,0],
                    [10,0,0,0,0,10,10,0,10,0,0,10,10,10,10],
                    [0,0,0,10,0,0,0,0,0,10,10,0,0,0,0],
                    [0,0,100,0,0,100,0,0,0,0,100,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,10,0],
                    [0,100,0,10,0,0,0,0,0,0,0,0,10,0,0],
                    [10,100,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,10,10,0,0],
                    [0,100,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,100,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,100,10,0,0,0,0,0,0,0,0,0,0,0],
                    [0,100,0,0,0,0,0,100,0,0,0,0,0,0,0],
                    [0,100,0,0,0,100,0,100,0,0,0,0,0,0,0],
                    [0,100,0,0,100,0,0,0,0,0,0,0,0,0,100],
                    [0,100,0,0,0,0,0,0,0,0,0,0,0,10,0]
                ]
            },
            {
                "name": "Opposition",
                "type": "chord",
                "insertToSerie": "Support",
                "data": [
                    {"name": "United States"},
                    {"name": "Syrian opposition"},
                    {"name": "Assad"},
                    {"name": "Iran"},
                    {"name": "Cecilia"},
                    {"name": "Hamas"},
                    {"name": "Israel"},
                    {"name": "Muslim Brotherhood"},
                    {"name": "Al-Qaeda"},
                    {"name": "Russia"},
                    {"name": "Lebanese Shiites"},
                    {"name": "Turkey"},
                    {"name": "Qatar"},
                    {"name": "Saudi"},
                    {"name": "Lebanese Sunnis"}
                ],
                "matrix": [
                    [0,0,100,100,0,100,0,0,100,0,0,0,0,0,0],
                    [0,0,0,10,0,0,0,0,0,10,10,0,0,0,0],
                    [10,0,0,0,0,0,10,10,10,0,0,10,10,0,10],
                    [10,100,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,10,0,100,0,0,0,10,10,0,0],
                    [10,0,0,0,100,0,10,0,0,0,0,0,0,0,0],
                    [0,0,100,0,0,100,0,0,0,0,0,0,0,0,0],
                    [0,0,100,0,10,0,0,0,0,0,0,0,0,10,0],
                    [10,0,100,0,0,0,0,0,0,0,0,0,0,100,0],
                    [0,100,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,100,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,100,0,100,0,0,0,0,0,0,0,0,0,0],
                    [0,0,100,0,100,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,100,10,0,0,0,0,0,0],
                    [0,0,100,0,0,0,0,0,0,0,0,0,0,0,0]
                ]
            },
            {
                "name": "Undecided",
                "type": "chord",
                "insertToSerie": "Support",
                "data": [
                    {"name": "United States"},
                    {"name": "Syrian opposition"},
                    {"name": "Assad"},
                    {"name": "Iran"},
                    {"name": "Cecilia"},
                    {"name": "Hamas"},
                    {"name": "Israel"},
                    {"name": "Muslim Brotherhood"},
                    {"name": "Al-Qaeda"},
                    {"name": "Russia"},
                    {"name": "Lebanese Shiites"},
                    {"name": "Turkey"},
                    {"name": "Qatar"},
                    {"name": "Saudi"},
                    {"name": "Lebanese Sunnis"}
                ],
                "matrix": [
                    [0,0,0,0,100,0,0,100,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [10,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [10,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
                ]
            }
        ]
    },
    stack : {
        tooltip : {
            trigger: 'axis',
            axisPointer:{
                type:'shadow'
            }
        },
        legend: {
            data:['Direct access','Email marketing','Affiliate advertising','Video ads','Search engine','Baidu','Google','Bing','Others']
        },
        toolbox: {
            show : true,
            orient: 'vertical',
            x: 'right',
            y: 'center',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                magicType: {show: true, type : ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        xAxis : [
            {
                type : 'category',
                data : ['Mon','Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
                name:'Direct access',
                type:'bar',
                data:[320, 332, 301, 334, 390, 330, 320]
            },
            {
                name:'Email marketing',
                type:'bar',
                stack: 'ADS',
                data:[120, 132, 101, 134, 90, 230, 210]
            },
            {
                name:'Affiliate advertising',
                type:'bar',
                stack: 'ADS',
                data:[220, 182, 191, 234, 290, 330, 310]
            },
            {
                name:'Video ads',
                type:'bar',
                stack: 'ADS',
                data:[150, 232, 201, 154, 190, 330, 410]
            },
            {
                name:'Search engine',
                type:'bar',
                data:[862, 1018, 964, 1026, 1679, 1600, 1570]
            },
            {
                name:'Baidu',
                type:'bar',
                barWidth : 5,
                stack: 'Search engine',
                data:[620, 732, 701, 734, 1090, 1130, 1120]
            },
            {
                name:'Google',
                type:'bar',
                stack: 'Search engine',
                data:[120, 132, 101, 134, 290, 230, 220]
            },
            {
                name:'Bing',
                type:'bar',
                stack: 'Search engine',
                data:[60, 72, 71, 74, 190, 130, 110]
            },
            {
                name:'Others',
                type:'bar',
                stack: 'Search engine',
                data:[62, 82, 91, 84, 109, 110, 120]
            }
        ]
    },
    gf : {
        color : [
            'rgba(255, 69, 0, 0.5)',
            'rgba(255, 150, 0, 0.5)',
            'rgba(255, 200, 0, 0.5)',
            'rgba(155, 200, 50, 0.5)',
            'rgba(55, 200, 100, 0.5)'
        ],
        title : {
            text: 'BI Component',
            subtext: 'Fictitious data'
        },
        tooltip : {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c}%"
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
            data : ['view','click','visit','consult','order']
        },
        series : [
            {
                name:'Key Indicator',
                type:'gauge',
                center: ['25%','50%'],
                splitNumber: 10,       // 分割段数，默认为5
                axisLine: {            // 坐标轴线
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: [[0.2, '#228b22'],[0.8, '#48b'],[1, 'rgb(255, 80, 20)']], 
                        width: 8
                    }
                },
                axisTick: {            // 坐标轴小标记
                    splitNumber: 10,   // 每份split细分多少段
                    length :12,        // 属性length控制线长
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: 'auto'
                    }
                },
                axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        color: 'auto'
                    }
                },
                splitLine: {           // 分隔线
                    show: true,        // 默认显示，属性show控制显示与否
                    length :30,         // 属性length控制线长
                    lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                        color: 'auto'
                    }
                },
                pointer : {
                    width : 5
                },
                title : {
                    show : true,
                    offsetCenter: [0, '-40%'],       // x, y，单位px
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        fontWeight: 'bolder'
                    }
                },
                detail : {
                    formatter:'{value}%',
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        color: 'auto',
                        fontWeight: 'bolder'
                    }
                },
                data:[{value: 85, name: 'Completion Rate'}]
            },
            {
                name:'Expect',
                type:'funnel',
                x: '45%',
                width: '45%',
                itemStyle: {
                    normal: {
                        label: {
                            formatter: '{b} expect'
                        },
                        labelLine: {
                            show : false
                        }
                    },
                    emphasis: {
                        label: {
                            position:'inside',
                            formatter: '{b} expect : {c}%'
                        }
                    }
                },
                data:[
                    {value:60, name:'visit'},
                    {value:40, name:'consult'},
                    {value:20, name:'order'},
                    {value:80, name:'click'},
                    {value:100, name:'view'}
                ]
            },
            {
                name:'Actual',
                type:'funnel',
                x: '45%',
                width: '45%',
                maxSize: '80%',
                itemStyle: {
                    normal: {
                        borderColor: '#fff',
                        borderWidth: 2,
                        label: {
                            position: 'inside',
                            formatter: '{c}%',
                            textStyle: {
                                color: '#fff'
                            }
                        }
                    },
                    emphasis: {
                        label: {
                            position:'inside',
                            formatter: '{b}actual : {c}%'
                        }
                    }
                },
                data:[
                    {value:30, name:'visit'},
                    {value:10, name:'consult'},
                    {value:5, name:'order'},
                    {value:50, name:'click'},
                    {value:80, name:'view'}
                ]
            }
        ]
    },
    mix1 : {
        color: ['#ff7f50','#87cefa','#da70d6','#ff69b4','#ba55d3','#32cd32','#6495ed'],
        tooltip : {
            trigger: 'axis'
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                magicType: {show: true, type : ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        calculable : true,
        legend: {
            x : 'left',
            data:['Evaporation','Precipitation','Average temperature','','Evaporation (day)','Evaporation (night)','Precipitation (day)','Precipitation (night)']
        },
        xAxis : [
            {
                type : 'category',
                data : ['Jan','Feb','Mar','Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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
                name:'sum',
                type:'pie',
                tooltip : {
                    trigger: 'item',
                    formatter: '{a} <br/>{b} : {c} ({d}%)'
                },
                center: [260,130],
                radius : [0, 50],
                itemStyle :　{
                    normal : {
                        labelLine : {
                            length : 20
                        }
                    }
                },
                data:[
                    {value:356.5, name:'Precipitation (day)'},
                    {value:220.4, name:'Precipitation (night)'},
                    {value:59.0, name:'Evaporation (night)'},
                    {value:440.5, name:'Evaporation (day)'}
                ]
            },
            {
                name:'Evaporation',
                type:'bar',
                data:[2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3]
            },
            {
                name:'Precipitation',
                type:'bar',
                data:[2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3]
            },
            {
                name:'Average temperature',
                type:'line',
                yAxisIndex: 1,
                data:[2.0, 2.2, 3.3, 4.5, 6.3, 10.2, 20.3, 23.4, 23.0, 16.5, 12.0, 6.2]
            }
        ]
    },
    mix2 : (function (){
        var sData1 = (function () {
            var d = [];
            var len = 40;
            var value;
            while (len--) {
                d.push([
                    Math.round(Math.random()*10) * (Math.round(Math.random()*10) > 5 ? 1 : -1),
                    Math.round(Math.random()*10) * (Math.round(Math.random()*10) > 5 ? 1 : -1),
                    Math.round(Math.random()*20)
                ]);
            }
            return d;
        })();
        var sData2 = (function () {
            var d = [];
            var len = sData1.length;
            for (var i = 0; i < len; i++) {
                d.push([
                    sData1[i][0],
                    sData1[i][1],
                    Math.round(Math.random()*15)
                ]);
            }
            return d;
        })();

        functionMap.mix2 = function (){
            var xAxis = myChart.component.xAxis.getAxis(0);
            var yAxis = myChart.component.yAxis.getAxis(0);
            var len = sData1.length;
            var option = myChart.getOption();
            option.series = option.series.slice(0,2);
            option.legend = {
                data : ['series 1', 'series 2']
            };
            while (len--) {
                option.series.push({
                    type: 'pie',
                    itemStyle : {
                        normal : {
                            label : {
                                show : false
                            },
                            labelLine : {
                                show : false
                            }
                        }
                    },
                    //radius : [(sData1[len][2] + sData2[len][2])/2.5, (sData1[len][2] + sData2[len][2])/2.5 + 15],
                    radius : (sData1[len][2] + sData2[len][2])/2.5 + 15,
                    center: [
                        xAxis.getCoord(sData1[len][0]), 
                        yAxis.getCoord(sData1[len][1])
                    ],
                    data: [
                        {name: 'series 1', value: sData1[len][2]},
                        {name: 'series 2', value: sData2[len][2]}
                    ]
                })
            }
            option.animation = true;
            myChart.setOption(option);
        }

        return {
            color : ['rgba(255, 69, 0, 0.5)', 'rgba(30, 144, 255, 0.5)'],
            title : {
                text: 'Scatter Pie',
                subtext : 'Mixed （random data）'
            },
            tooltip : {
                trigger: 'item',
                 formatter: "{b} : {c} ({d}%)"
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
            xAxis : [
                {
                    type : 'value',
                    splitNumber: 2,
                    splitLine : {lineStyle:{color:'#48b',width:2}},
                    splitArea: {show:true},
                    axisLine : {show:false}
                }
            ],
            yAxis : [
                {
                    type : 'value',
                    splitNumber: 2,
                    splitLine : {lineStyle:{color:'#48b',width:2}},
                    splitArea : {show : true},
                    axisLine : {show:false}
                }
            ],
            animation: false,
            series : [
                {
                    type:'scatter',
                    symbol: 'none',
                    data: sData1
                },
                {
                    type:'scatter',
                    symbol: 'none',
                    data: sData2
                }
            ]
        };
        
    })(),
    mix3 : {
        title : {
            text: '2011 GDP of China',
            subtext: 'data from National Bureau of Statistics of China'
        },
        tooltip : {
            trigger: 'item'
        },
        legend: {
            x:'right',
            selectedMode:false,
            data:['北京','上海','广东']
        },
        dataRange: {
            orient: 'horizontal',
            min: 0,
            max: 55000,
            text:['High','Low'],            // 文本，默认为数值文本
            splitNumber:0
        },
        toolbox: {
            show : true,
            orient: 'vertical',
            x:'right',
            y:'center',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false}
            }
        },
        series : [
            {
                name: '2011 GDP of China',
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
                    {name:'西藏', value:605.83},
                    {name:'青海', value:1670.44},
                    {name:'宁夏', value:2102.21},
                    {name:'海南', value:2522.66},
                    {name:'甘肃', value:5020.37},
                    {name:'贵州', value:5701.84},
                    {name:'新疆', value:6610.05},
                    {name:'云南', value:8893.12},
                    {name:'重庆', value:10011.37},
                    {name:'吉林', value:10568.83},
                    {name:'山西', value:11237.55},
                    {name:'天津', value:11307.28},
                    {name:'江西', value:11702.82},
                    {name:'广西', value:11720.87},
                    {name:'陕西', value:12512.3},
                    {name:'黑龙江', value:12582},
                    {name:'内蒙古', value:14359.88},
                    {name:'安徽', value:15300.65},
                    {name:'北京', value:16251.93, selected:true},
                    {name:'福建', value:17560.18},
                    {name:'上海', value:19195.69, selected:true},
                    {name:'湖北', value:19632.26},
                    {name:'湖南', value:19669.56},
                    {name:'四川', value:21026.68},
                    {name:'辽宁', value:22226.7},
                    {name:'河北', value:24515.76},
                    {name:'河南', value:26931.03},
                    {name:'浙江', value:32318.85},
                    {name:'山东', value:45361.85},
                    {name:'江苏', value:49110.27},
                    {name:'广东', value:53210.28, selected:true}
                ]
            },
            {
                name:'2011 GDP of China',
                type:'pie',
                roseType : 'area',
                tooltip: {
                    trigger: 'item',
                    formatter: "{a} <br/>{b} : {c} ({d}%)"
                },
                center: [700, 225],
                radius: [30, 120],
                data:[
                    {name: '北京', value: 16251.93},
                    {name: '上海', value: 19195.69},
                    {name: '广东', value: 53210.28}
                ]
            }
        ],
        animation: (function () {
            functionMap.mix3 = function () {
                var ecConfig = require('echarts/config');
                myChart.on(ecConfig.EVENT.MAP_SELECTED, function (param){
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
    lasagna : (function () {
         functionMap.lasagna = function () {
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
                        mark : {show: true},
                        dataView : {show: true, readOnly: false},
                        restore : {show: true},
                        saveAsImage : {show: true}
                    }
                },
                series : (function (){
                    var series = [];
                    for (var i = 0; i < 30; i++) {
                        series.push({
                            name:'Browser proportion（fictitious）',
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
                    series[0].markPoint = {
                        symbol:'emptyCircle',
                        symbolSize:series[0].radius[0],
                        effect:{show:true,scaleSize:13,color:'rgba(250,225,50,0.8)',shadowBlur:10,period:30},
                        data:[{x:'50%',y:'50%'}]
                    };
                    return series;
                })(),
                calculable : (function (){
                    setTimeout(function (){
                        if (!myChart) {
                            return;
                        }
                        var _ZR = myChart.getZrender();
                        var TextShape = require('zrender/shape/Text');
                        // 补充千层饼
                        _ZR.addShape(new TextShape({
                            style : {
                                x : _ZR.getWidth() / 2,
                                y : _ZR.getHeight() / 2,
                                color: '#666',
                                text : 'Pass',
                                textAlign : 'center'
                            }
                        }));
                        _ZR.addShape(new TextShape({
                            style : {
                                x : _ZR.getWidth() / 2 + 200,
                                y : _ZR.getHeight() / 2,
                                brushType:'fill',
                                color: 'orange',
                                text : 'Future',
                                textAlign : 'left',
                                textFont:'normal 20px 微软雅黑'
                            }
                        }));
                        _ZR.refresh();
                    }, 2000);
                    return false;
                })()
            }, true);
        }
        functionMap.wormhole = function() {
            myChart.clear();
            myChart.getZrender().clear();
            myChart.setOption({
                color : (function(){
                    var zrColor = require('zrender/tool/color');
                    return zrColor.getStepColors('yellow', 'red', 28);
                })(),
                title : {
                    text: 'Browser Data',
                    subtext: 'Virtual Data',
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
                        mark : {show: true},
                        dataView : {show: true, readOnly: false},
                        restore : {show: true},
                        saveAsImage : {show: true}
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
                        center : ['50%', 240],
                        radius : 150
                    }
                ],
                calculable : false,
                series : (function(){
                    var series = [];
                    for (var i = 1; i <= 28; i++) {
                        series.push({
                            name:'Browser (Virtual Data)',
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
    })(),
    effect1 : (function() {
        var effect = {
            show: true,
            scaleSize: 1,//require('zrender/tool/env').canvasSupported ? 1 : 2,
            period: 30,             // 运动周期，无单位，值越大越慢
            color: '#fff',
            shadowColor: 'rgba(220,220,220,0.4)',
            shadowBlur : 5 
        };
        function itemStyle(idx) {
            return {
                normal: {
                    color:'#fff',
                    borderWidth:1,
                    borderColor:['rgba(30,144,255,1)','lime'][idx],
                    lineStyle: {
                        //shadowColor : ['rgba(30,144,255,1)','lime'][idx], //默认透明
                        //shadowBlur: 10,
                        //shadowOffsetX: 0,
                        //shadowOffsetY: 0,
                        type: 'solid'
                    }
                }
            }
        };
        functionMap.effect1 = function() {
            myChart.setOption({
            backgroundColor: 'rgba(0,0,0,0)',
                color: ['rgba(30,144,255,1)','lime'],
                title : {
                    text: "China's Railway",
                    subtext:'data from wiki',
                    sublink: 'http://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E9%93%81%E8%B7%AF%E8%BF%90%E8%BE%93',
                    x:'center',
                    textStyle : {
                        color: '#fff'
                    }
                },
                tooltip : {
                    trigger: 'item',
                    formatter: function(v) {
                        return v[1].replace(':', ' > ');
                    }
                },
                legend: {
                    orient: 'vertical',
                    x:'left',
                    selectedMode:'single',
                    data:['8 NS channel', '8 EW channel'],
                    textStyle : {
                        color: '#fff'
                    }
                },
                toolbox: {
                    show : true,
                    orient : 'vertical',
                    x: 'right',
                    y: 'center',
                    feature : {
                        mark : {show: true},
                        dataView : {show: true, readOnly: false},
                        restore : {show: true},
                        saveAsImage : {show: true}
                    }
                },
                series : [
                    {
                        name: '8 NS channel',
                        type: 'map',
                        roam: true,
                        hoverable: false,
                        mapType: 'china',
                        itemStyle:{
                            normal:{
                                borderColor:'rgba(100,149,237,1)',
                                borderWidth:0.5,
                                areaStyle:{
                                    color: '#333'
                                }
                            }
                        },
                        data:[],
                        markLine : {
                            symbol: ['circle', 'circle'],  
                            symbolSize : 1,
                            effect : effect,
                            itemStyle : itemStyle(0),
                            smooth:true,
                            data : [
                                [{name:'北京'}, {name:'哈尔滨'}],
                                [{name:'哈尔滨'}, {name:'满洲里'}],
                                
                                [{name:'沈阳'}, {name:'大连'}],
                                [{name:'大连'}, {name:'烟台'}],
                                [{name:'烟台'}, {name:'青岛'}],
                                [{name:'青岛'}, {name:'淮安'}],
                                [{name:'淮安'}, {name:'上海'}],
                                [{name:'上海'}, {name:'杭州'}],
                                [{name:'杭州'}, {name:'宁波'}],
                                [{name:'宁波'}, {name:'温州'}],
                                [{name:'温州'}, {name:'福州'}],
                                [{name:'福州'}, {name:'厦门'}],
                                [{name:'厦门'}, {name:'广州'}],
                                [{name:'广州'}, {name:'湛江'}],
                                
                                [{name:'北京'}, {name:'天津'}],
                                [{name:'天津'}, {name:'济南'}],
                                [{name:'济南'}, {name:'南京'}],
                                [{name:'南京'}, {name:'上海'}],
                                
                                [{name:'北京'}, {name:'南昌'}],
                                [{name:'南昌'}, {name:'深圳'}],
                                [{name:'深圳'}, {name:'九龙红磡'}],
                                
                                [{name:'北京'}, {name:'郑州'}],
                                [{name:'郑州'}, {name:'武汉'}],
                                [{name:'武汉'}, {name:'广州'}],
                                
                                [{name:'大同'}, {name:'太原'}],
                                [{name:'太原'}, {name:'焦作'}],
                                [{name:'焦作'}, {name:'洛阳'}],
                                [{name:'洛阳'}, {name:'柳州'}],
                                [{name:'柳州'}, {name:'湛江'}],
                                
                                [{name:'包头'}, {name:'西安'}],
                                [{name:'西安'}, {name:'重庆'}],
                                [{name:'重庆'}, {name:'贵阳'}],
                                [{name:'贵阳'}, {name:'柳州'}],
                                [{name:'柳州'}, {name:'南宁'}],
                                
                                [{name:'兰州'}, {name:'成都'}],
                                [{name:'成都'}, {name:'昆明'}]
                            ]
                        }
                    },
                    {
                        name: '8 EW channel',
                        type: 'map',
                        mapType: 'china',
                        data:[],
                        markLine : {
                            symbol: ['circle', 'circle'],  
                            symbolSize : 1,
                            effect : effect,
                            itemStyle : itemStyle(1),
                            smooth:true,
                            data : [
                                [{name:'北京'}, {name:'兰州'}],
                                [{name:'兰州'}, {name:'拉萨'}],
                                
                                [{name:'大同'}, {name:'秦皇岛'}],
                                
                                [{name:'神木'}, {name:'黄骅'}],
                                
                                [{name:'太原'}, {name:'德州'}],
                                [{name:'德州'}, {name:'龙口'}],
                                [{name:'龙口'}, {name:'烟台'}],
                                
                                [{name:'太原'}, {name:'德州'}],
                                [{name:'德州'}, {name:'济南'}],
                                [{name:'济南'}, {name:'青岛'}],
                                
                                [{name:'长治'}, {name:'邯郸'}],
                                [{name:'邯郸'}, {name:'济南'}],
                                [{name:'济南'}, {name:'青岛'}],
                                
                                [{name:'瓦塘'}, {name:'临汾'}],
                                [{name:'临汾'}, {name:'长治'}],
                                [{name:'长治'}, {name:'汤阴'}],
                                [{name:'汤阴'}, {name:'台前'}],
                                [{name:'台前'}, {name:'兖州'}],
                                [{name:'兖州'}, {name:'日照'}],
                                
                                [{name:'侯马'}, {name:'月山'}],
                                [{name:'月山'}, {name:'新乡'}],
                                [{name:'新乡'}, {name:'兖州'}],
                                [{name:'兖州'}, {name:'日照'}],
                                
                                [{name:'连云港'}, {name:'郑州'}],
                                [{name:'郑州'}, {name:'兰州'}],
                                [{name:'兰州'}, {name:'乌鲁木齐'}],
                                [{name:'乌鲁木齐'}, {name:'阿拉山口'}],
                                
                                [{name:'西安'}, {name:'南阳'}],
                                [{name:'南阳'}, {name:'信阳'}],
                                [{name:'信阳'}, {name:'合肥'}],
                                [{name:'合肥'}, {name:'南京'}],
                                [{name:'南京'}, {name:'启东'}],
                                
                                [{name:'重庆'}, {name:'武汉'}],
                                [{name:'武汉'}, {name:'九江'}],
                                [{name:'九江'}, {name:'铜陵'}],
                                [{name:'铜陵'}, {name:'南京'}],
                                [{name:'南京'}, {name:'上海'}],
                                
                                [{name:'上海'}, {name:'怀化'}],
                                [{name:'怀化'}, {name:'重庆'}],
                                [{name:'重庆'}, {name:'成都'}],
                                [{name:'成都'}, {name:'贵阳'}],
                                [{name:'贵阳'}, {name:'昆明'}],
                                
                                [{name:'昆明'}, {name:'南宁'}],
                                [{name:'南宁'}, {name:'黎塘'}],
                                [{name:'黎塘'}, {name:'湛江'}]
                            ]
                        },
                        geoCoord: {
                            '阿拉山口':[82.5757,45.1706],
                            '包头':[109.8403,40.6574],
                            '北京':[116.4075,39.9040],
                            '成都':[104.0665,30.5723],
                            '大连':[121.6147,38.9140],
                            '大同':[113.3001,40.0768],
                            '德州':[116.3575,37.4341],
                            '福州':[119.2965,26.0745],
                            '广州':[113.2644,23.1292],
                            '贵阳':[106.6302,26.6477],
                            '哈尔滨':[126.5363,45.8023],
                            '邯郸':[114.5391,36.6256],
                            '杭州':[120.1551,30.2741],
                            '合肥':[117.2272,31.8206],
                            '侯马':[111.3720,35.6191],
                            '怀化':[109.9985,27.5550],
                            '淮安':[119.0153,33.6104],
                            '黄骅':[117.3300,38.3714],
                            '济南':[117.1205,36.6510],
                            '焦作':[113.2418,35.2159],
                            '九江':[116.0019,29.7051],
                            '九龙红磡':[114.1870,22.3076],
                            '昆明':[102.8329,24.8801],
                            '拉萨':[91.1409,29.6456],
                            '兰州':[103.8343,36.0611],
                            '黎塘':[109.1363,23.2066],
                            '连云港':[119.2216,34.5967],
                            '临汾':[111.5190,36.0880],
                            '柳州':[109.4160,24.3255],
                            '龙口':[120.4778,37.6461],
                            '洛阳':[112.4540,34.6197],
                            '满洲里':[117.3787,49.5978],
                            '南昌':[115.8581,28.6832],
                            '南京':[118.7969,32.0603],
                            '南宁':[108.3661,22.8172],
                            '南阳':[112.5283,32.9908],
                            '宁波':[121.5440,29.8683],
                            '启东':[121.6574,31.8082],
                            '秦皇岛':[119.6005,39.9354],
                            '青岛':[120.3826,36.0671],
                            '日照':[119.5269,35.4164],
                            '厦门':[118.0894,24.4798],
                            '上海':[121.4737,31.2304],
                            '深圳':[114.0579,22.5431],
                            '神木':[110.4871,38.8610],
                            '沈阳':[123.4315,41.8057],
                            '台前':[115.8717,35.9701],
                            '太原':[112.5489,37.8706],
                            '汤阴':[114.3572,35.9218],
                            '天津':[117.2010,39.0842],
                            '铜陵':[117.8121,30.9454],
                            '瓦塘':[109.7600,23.3161],
                            '温州':[120.6994,27.9943],
                            '乌鲁木齐':[87.6168,43.8256],
                            '武汉':[114.3054,30.5931],
                            '西安':[108.9402,34.3416],
                            '新乡':[113.9268,35.3030],
                            '信阳':[114.0913,32.1470],
                            '烟台':[121.4479,37.4638],
                            '兖州':[116.7838,35.5531],
                            '月山':[113.0550,35.2104],
                            '湛江':[110.3594,21.2707],
                            '长治':[113.1163,36.1954],
                            '郑州':[113.6254,34.7466],
                            '重庆':[106.5516,29.5630]
                        }
                    }
                ]
            }, true);
        }
        return {};
    })(),
    effect2 : {
        backgroundColor: 'rgba(0,0,0,0)',
        color: ['gold','aqua','lime'],
        title : {
            text: 'Simulated Migrate',
            subtext:'Fictitious data',
            x:'center',
            textStyle : {
                color: '#fff'
            }
        },
        tooltip : {
            trigger: 'item',
            formatter: function(v) {
                return v[1].replace(':', ' > ');
            }
        },
        legend: {
            orient: 'vertical',
            x:'left',
            data:['Beijing Top10', 'Shanghai Top10', 'Guangzhou Top10'],
            selectedMode: 'single',
            selected:{
                'Shanghai Top10' : false,
                'Guangzhou Top10' : false
            },
            textStyle : {
                color: '#fff'
            }
        },
        toolbox: {
            show : true,
            orient : 'vertical',
            x: 'right',
            y: 'center',
            feature : {
                mark : {show: true},
                dataView : {show: true, readOnly: false},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        dataRange: {
            min : 0,
            max : 100,
            calculable : true,
            color: ['#ff3333', 'orange', 'yellow','lime','aqua'],
            textStyle:{
                color:'#fff'
            }
        },
        series : [
            {
                name: 'all',
                type: 'map',
                roam: true,
                hoverable: false,
                mapType: 'china',
                itemStyle:{
                    normal:{
                        borderColor:'rgba(100,149,237,1)',
                        borderWidth:0.5,
                        areaStyle:{
                            color: '#333'
                        }
                    }
                },
                data:[],
                markLine : {
                    smooth:true,
                    symbol: ['none', 'circle'],  
                    symbolSize : 1,
                    itemStyle : {
                        normal: {
                            color:'#fff',
                            borderWidth:1,
                            borderColor:'rgba(30,144,255,0.5)'
                        }
                    },
                    data : [
                        [{name:'北京'},{name:'包头'}],
                        [{name:'北京'},{name:'北海'}],
                        [{name:'北京'},{name:'广州'}],
                        [{name:'北京'},{name:'郑州'}],
                        [{name:'北京'},{name:'长春'}],
                        [{name:'北京'},{name:'长治'}],
                        [{name:'北京'},{name:'重庆'}],
                        [{name:'北京'},{name:'长沙'}],
                        [{name:'北京'},{name:'成都'}],
                        [{name:'北京'},{name:'常州'}],
                        [{name:'北京'},{name:'丹东'}],
                        [{name:'北京'},{name:'大连'}],
                        [{name:'北京'},{name:'东营'}],
                        [{name:'北京'},{name:'延安'}],
                        [{name:'北京'},{name:'福州'}],
                        [{name:'北京'},{name:'海口'}],
                        [{name:'北京'},{name:'呼和浩特'}],
                        [{name:'北京'},{name:'合肥'}],
                        [{name:'北京'},{name:'杭州'}],
                        [{name:'北京'},{name:'哈尔滨'}],
                        [{name:'北京'},{name:'舟山'}],
                        [{name:'北京'},{name:'银川'}],
                        [{name:'北京'},{name:'衢州'}],
                        [{name:'北京'},{name:'南昌'}],
                        [{name:'北京'},{name:'昆明'}],
                        [{name:'北京'},{name:'贵阳'}],
                        [{name:'北京'},{name:'兰州'}],
                        [{name:'北京'},{name:'拉萨'}],
                        [{name:'北京'},{name:'连云港'}],
                        [{name:'北京'},{name:'临沂'}],
                        [{name:'北京'},{name:'柳州'}],
                        [{name:'北京'},{name:'宁波'}],
                        [{name:'北京'},{name:'南京'}],
                        [{name:'北京'},{name:'南宁'}],
                        [{name:'北京'},{name:'南通'}],
                        [{name:'北京'},{name:'上海'}],
                        [{name:'北京'},{name:'沈阳'}],
                        [{name:'北京'},{name:'西安'}],
                        [{name:'北京'},{name:'汕头'}],
                        [{name:'北京'},{name:'深圳'}],
                        [{name:'北京'},{name:'青岛'}],
                        [{name:'北京'},{name:'济南'}],
                        [{name:'北京'},{name:'太原'}],
                        [{name:'北京'},{name:'乌鲁木齐'}],
                        [{name:'北京'},{name:'潍坊'}],
                        [{name:'北京'},{name:'威海'}],
                        [{name:'北京'},{name:'温州'}],
                        [{name:'北京'},{name:'武汉'}],
                        [{name:'北京'},{name:'无锡'}],
                        [{name:'北京'},{name:'厦门'}],
                        [{name:'北京'},{name:'西宁'}],
                        [{name:'北京'},{name:'徐州'}],
                        [{name:'北京'},{name:'烟台'}],
                        [{name:'北京'},{name:'盐城'}],
                        [{name:'北京'},{name:'珠海'}],
                        [{name:'上海'},{name:'包头'}],
                        [{name:'上海'},{name:'北海'}],
                        [{name:'上海'},{name:'广州'}],
                        [{name:'上海'},{name:'郑州'}],
                        [{name:'上海'},{name:'长春'}],
                        [{name:'上海'},{name:'重庆'}],
                        [{name:'上海'},{name:'长沙'}],
                        [{name:'上海'},{name:'成都'}],
                        [{name:'上海'},{name:'丹东'}],
                        [{name:'上海'},{name:'大连'}],
                        [{name:'上海'},{name:'福州'}],
                        [{name:'上海'},{name:'海口'}],
                        [{name:'上海'},{name:'呼和浩特'}],
                        [{name:'上海'},{name:'合肥'}],
                        [{name:'上海'},{name:'哈尔滨'}],
                        [{name:'上海'},{name:'舟山'}],
                        [{name:'上海'},{name:'银川'}],
                        [{name:'上海'},{name:'南昌'}],
                        [{name:'上海'},{name:'昆明'}],
                        [{name:'上海'},{name:'贵阳'}],
                        [{name:'上海'},{name:'兰州'}],
                        [{name:'上海'},{name:'拉萨'}],
                        [{name:'上海'},{name:'连云港'}],
                        [{name:'上海'},{name:'临沂'}],
                        [{name:'上海'},{name:'柳州'}],
                        [{name:'上海'},{name:'宁波'}],
                        [{name:'上海'},{name:'南宁'}],
                        [{name:'上海'},{name:'北京'}],
                        [{name:'上海'},{name:'沈阳'}],
                        [{name:'上海'},{name:'秦皇岛'}],
                        [{name:'上海'},{name:'西安'}],
                        [{name:'上海'},{name:'石家庄'}],
                        [{name:'上海'},{name:'汕头'}],
                        [{name:'上海'},{name:'深圳'}],
                        [{name:'上海'},{name:'青岛'}],
                        [{name:'上海'},{name:'济南'}],
                        [{name:'上海'},{name:'天津'}],
                        [{name:'上海'},{name:'太原'}],
                        [{name:'上海'},{name:'乌鲁木齐'}],
                        [{name:'上海'},{name:'潍坊'}],
                        [{name:'上海'},{name:'威海'}],
                        [{name:'上海'},{name:'温州'}],
                        [{name:'上海'},{name:'武汉'}],
                        [{name:'上海'},{name:'厦门'}],
                        [{name:'上海'},{name:'西宁'}],
                        [{name:'上海'},{name:'徐州'}],
                        [{name:'上海'},{name:'烟台'}],
                        [{name:'上海'},{name:'珠海'}],
                        [{name:'广州'},{name:'北海'}],
                        [{name:'广州'},{name:'郑州'}],
                        [{name:'广州'},{name:'长春'}],
                        [{name:'广州'},{name:'重庆'}],
                        [{name:'广州'},{name:'长沙'}],
                        [{name:'广州'},{name:'成都'}],
                        [{name:'广州'},{name:'常州'}],
                        [{name:'广州'},{name:'大连'}],
                        [{name:'广州'},{name:'福州'}],
                        [{name:'广州'},{name:'海口'}],
                        [{name:'广州'},{name:'呼和浩特'}],
                        [{name:'广州'},{name:'合肥'}],
                        [{name:'广州'},{name:'杭州'}],
                        [{name:'广州'},{name:'哈尔滨'}],
                        [{name:'广州'},{name:'舟山'}],
                        [{name:'广州'},{name:'银川'}],
                        [{name:'广州'},{name:'南昌'}],
                        [{name:'广州'},{name:'昆明'}],
                        [{name:'广州'},{name:'贵阳'}],
                        [{name:'广州'},{name:'兰州'}],
                        [{name:'广州'},{name:'拉萨'}],
                        [{name:'广州'},{name:'连云港'}],
                        [{name:'广州'},{name:'临沂'}],
                        [{name:'广州'},{name:'柳州'}],
                        [{name:'广州'},{name:'宁波'}],
                        [{name:'广州'},{name:'南京'}],
                        [{name:'广州'},{name:'南宁'}],
                        [{name:'广州'},{name:'南通'}],
                        [{name:'广州'},{name:'北京'}],
                        [{name:'广州'},{name:'上海'}],
                        [{name:'广州'},{name:'沈阳'}],
                        [{name:'广州'},{name:'西安'}],
                        [{name:'广州'},{name:'石家庄'}],
                        [{name:'广州'},{name:'汕头'}],
                        [{name:'广州'},{name:'青岛'}],
                        [{name:'广州'},{name:'济南'}],
                        [{name:'广州'},{name:'天津'}],
                        [{name:'广州'},{name:'太原'}],
                        [{name:'广州'},{name:'乌鲁木齐'}],
                        [{name:'广州'},{name:'温州'}],
                        [{name:'广州'},{name:'武汉'}],
                        [{name:'广州'},{name:'无锡'}],
                        [{name:'广州'},{name:'厦门'}],
                        [{name:'广州'},{name:'西宁'}],
                        [{name:'广州'},{name:'徐州'}],
                        [{name:'广州'},{name:'烟台'}],
                        [{name:'广州'},{name:'盐城'}]
                    ]
                },
                geoCoord: {
                    '上海': [121.4648,31.2891],
                    '东莞': [113.8953,22.901],
                    '东营': [118.7073,37.5513],
                    '中山': [113.4229,22.478],
                    '临汾': [111.4783,36.1615],
                    '临沂': [118.3118,35.2936],
                    '丹东': [124.541,40.4242],
                    '丽水': [119.5642,28.1854],
                    '乌鲁木齐': [87.9236,43.5883],
                    '佛山': [112.8955,23.1097],
                    '保定': [115.0488,39.0948],
                    '兰州': [103.5901,36.3043],
                    '包头': [110.3467,41.4899],
                    '北京': [116.4551,40.2539],
                    '北海': [109.314,21.6211],
                    '南京': [118.8062,31.9208],
                    '南宁': [108.479,23.1152],
                    '南昌': [116.0046,28.6633],
                    '南通': [121.1023,32.1625],
                    '厦门': [118.1689,24.6478],
                    '台州': [121.1353,28.6688],
                    '合肥': [117.29,32.0581],
                    '呼和浩特': [111.4124,40.4901],
                    '咸阳': [108.4131,34.8706],
                    '哈尔滨': [127.9688,45.368],
                    '唐山': [118.4766,39.6826],
                    '嘉兴': [120.9155,30.6354],
                    '大同': [113.7854,39.8035],
                    '大连': [122.2229,39.4409],
                    '天津': [117.4219,39.4189],
                    '太原': [112.3352,37.9413],
                    '威海': [121.9482,37.1393],
                    '宁波': [121.5967,29.6466],
                    '宝鸡': [107.1826,34.3433],
                    '宿迁': [118.5535,33.7775],
                    '常州': [119.4543,31.5582],
                    '广州': [113.5107,23.2196],
                    '廊坊': [116.521,39.0509],
                    '延安': [109.1052,36.4252],
                    '张家口': [115.1477,40.8527],
                    '徐州': [117.5208,34.3268],
                    '德州': [116.6858,37.2107],
                    '惠州': [114.6204,23.1647],
                    '成都': [103.9526,30.7617],
                    '扬州': [119.4653,32.8162],
                    '承德': [117.5757,41.4075],
                    '拉萨': [91.1865,30.1465],
                    '无锡': [120.3442,31.5527],
                    '日照': [119.2786,35.5023],
                    '昆明': [102.9199,25.4663],
                    '杭州': [119.5313,29.8773],
                    '枣庄': [117.323,34.8926],
                    '柳州': [109.3799,24.9774],
                    '株洲': [113.5327,27.0319],
                    '武汉': [114.3896,30.6628],
                    '汕头': [117.1692,23.3405],
                    '江门': [112.6318,22.1484],
                    '沈阳': [123.1238,42.1216],
                    '沧州': [116.8286,38.2104],
                    '河源': [114.917,23.9722],
                    '泉州': [118.3228,25.1147],
                    '泰安': [117.0264,36.0516],
                    '泰州': [120.0586,32.5525],
                    '济南': [117.1582,36.8701],
                    '济宁': [116.8286,35.3375],
                    '海口': [110.3893,19.8516],
                    '淄博': [118.0371,36.6064],
                    '淮安': [118.927,33.4039],
                    '深圳': [114.5435,22.5439],
                    '清远': [112.9175,24.3292],
                    '温州': [120.498,27.8119],
                    '渭南': [109.7864,35.0299],
                    '湖州': [119.8608,30.7782],
                    '湘潭': [112.5439,27.7075],
                    '滨州': [117.8174,37.4963],
                    '潍坊': [119.0918,36.524],
                    '烟台': [120.7397,37.5128],
                    '玉溪': [101.9312,23.8898],
                    '珠海': [113.7305,22.1155],
                    '盐城': [120.2234,33.5577],
                    '盘锦': [121.9482,41.0449],
                    '石家庄': [114.4995,38.1006],
                    '福州': [119.4543,25.9222],
                    '秦皇岛': [119.2126,40.0232],
                    '绍兴': [120.564,29.7565],
                    '聊城': [115.9167,36.4032],
                    '肇庆': [112.1265,23.5822],
                    '舟山': [122.2559,30.2234],
                    '苏州': [120.6519,31.3989],
                    '莱芜': [117.6526,36.2714],
                    '菏泽': [115.6201,35.2057],
                    '营口': [122.4316,40.4297],
                    '葫芦岛': [120.1575,40.578],
                    '衡水': [115.8838,37.7161],
                    '衢州': [118.6853,28.8666],
                    '西宁': [101.4038,36.8207],
                    '西安': [109.1162,34.2004],
                    '贵阳': [106.6992,26.7682],
                    '连云港': [119.1248,34.552],
                    '邢台': [114.8071,37.2821],
                    '邯郸': [114.4775,36.535],
                    '郑州': [113.4668,34.6234],
                    '鄂尔多斯': [108.9734,39.2487],
                    '重庆': [107.7539,30.1904],
                    '金华': [120.0037,29.1028],
                    '铜川': [109.0393,35.1947],
                    '银川': [106.3586,38.1775],
                    '镇江': [119.4763,31.9702],
                    '长春': [125.8154,44.2584],
                    '长沙': [113.0823,28.2568],
                    '长治': [112.8625,36.4746],
                    '阳泉': [113.4778,38.0951],
                    '青岛': [120.4651,36.3373],
                    '韶关': [113.7964,24.7028]
                }
            },
            {
                name: 'Beijing Top10',
                type: 'map',
                mapType: 'china',
                data:[],
                markLine : {
                    smooth:true,
                    effect : {
                        show: true,
                        scaleSize: 1,
                        period: 30,
                        color: '#fff',
                        shadowBlur: 10
                    },
                    itemStyle : {
                        normal: {
                            borderWidth:1,
                            lineStyle: {
                                type: 'solid',
                                shadowBlur: 10
                            }
                        }
                    },
                    data : [
                        [{name:'北京'}, {name:'上海',value:95}],
                        [{name:'北京'}, {name:'广州',value:90}],
                        [{name:'北京'}, {name:'大连',value:80}],
                        [{name:'北京'}, {name:'南宁',value:70}],
                        [{name:'北京'}, {name:'南昌',value:60}],
                        [{name:'北京'}, {name:'拉萨',value:50}],
                        [{name:'北京'}, {name:'长春',value:40}],
                        [{name:'北京'}, {name:'包头',value:30}],
                        [{name:'北京'}, {name:'重庆',value:20}],
                        [{name:'北京'}, {name:'常州',value:10}]
                    ]
                },
                markPoint : {
                    symbol:'emptyCircle',
                    symbolSize : function(v){
                        return 10 + v/10
                    },
                    effect : {
                        show: true,
                        shadowBlur : 0
                    },
                    itemStyle:{
                        normal:{
                            label:{show:false}
                        }
                    },
                    data : [
                        {name:'上海',value:95},
                        {name:'广州',value:90},
                        {name:'大连',value:80},
                        {name:'南宁',value:70},
                        {name:'南昌',value:60},
                        {name:'拉萨',value:50},
                        {name:'长春',value:40},
                        {name:'包头',value:30},
                        {name:'重庆',value:20},
                        {name:'常州',value:10}
                    ]
                }
            },
            {
                name: 'Shanghai Top10',
                type: 'map',
                mapType: 'china',
                data:[],
                markLine : {
                    smooth:true,
                    effect : {
                        show: true,
                        scaleSize: 1,
                        period: 30,
                        color: '#fff',
                        shadowBlur: 10
                    },
                    itemStyle : {
                        normal: {
                            borderWidth:1,
                            lineStyle: {
                                type: 'solid',
                                shadowBlur: 10
                            }
                        }
                    },
                    data : [
                        [{name:'上海'},{name:'包头',value:95}],
                        [{name:'上海'},{name:'昆明',value:90}],
                        [{name:'上海'},{name:'广州',value:80}],
                        [{name:'上海'},{name:'郑州',value:70}],
                        [{name:'上海'},{name:'长春',value:60}],
                        [{name:'上海'},{name:'重庆',value:50}],
                        [{name:'上海'},{name:'长沙',value:40}],
                        [{name:'上海'},{name:'北京',value:30}],
                        [{name:'上海'},{name:'丹东',value:20}],
                        [{name:'上海'},{name:'大连',value:10}]
                    ]
                },
                markPoint : {
                    symbol:'emptyCircle',
                    symbolSize : function(v){
                        return 10 + v/10
                    },
                    effect : {
                        show: true,
                        shadowBlur : 0
                    },
                    itemStyle:{
                        normal:{
                            label:{show:false}
                        }
                    },
                    data : [
                        {name:'包头',value:95},
                        {name:'昆明',value:90},
                        {name:'广州',value:80},
                        {name:'郑州',value:70},
                        {name:'长春',value:60},
                        {name:'重庆',value:50},
                        {name:'长沙',value:40},
                        {name:'北京',value:30},
                        {name:'丹东',value:20},
                        {name:'大连',value:10}
                    ]
                }
            },
            {
                name: 'Guangzhou Top10',
                type: 'map',
                mapType: 'china',
                data:[],
                markLine : {
                    smooth:true,
                    effect : {
                        show: true,
                        scaleSize: 1,
                        period: 30,
                        color: '#fff',
                        shadowBlur: 10
                    },
                    itemStyle : {
                        normal: {
                            borderWidth:1,
                            lineStyle: {
                                type: 'solid',
                                shadowBlur: 10
                            }
                        }
                    },
                    data : [
                        [{name:'广州'},{name:'福州',value:95}],
                        [{name:'广州'},{name:'太原',value:90}],
                        [{name:'广州'},{name:'长春',value:80}],
                        [{name:'广州'},{name:'重庆',value:70}],
                        [{name:'广州'},{name:'西安',value:60}],
                        [{name:'广州'},{name:'成都',value:50}],
                        [{name:'广州'},{name:'常州',value:40}],
                        [{name:'广州'},{name:'北京',value:30}],
                        [{name:'广州'},{name:'北海',value:20}],
                        [{name:'广州'},{name:'海口',value:10}]
                    ]
                },
                markPoint : {
                    symbol:'emptyCircle',
                    symbolSize : function(v){
                        return 10 + v/10
                    },
                    effect : {
                        show: true,
                        shadowBlur : 0
                    },
                    itemStyle:{
                        normal:{
                            label:{show:false}
                        }
                    },
                    data : [
                        {name:'福州',value:95},
                        {name:'太原',value:90},
                        {name:'长春',value:80},
                        {name:'重庆',value:70},
                        {name:'西安',value:60},
                        {name:'成都',value:50},
                        {name:'常州',value:40},
                        {name:'北京',value:30},
                        {name:'北海',value:20},
                        {name:'海口',value:10}
                    ]
                }
            }
        ]
    },
    effect3 : (function(){
        var placeList = [
            {name:'海门', geoCoord:[121.15, 31.89]},
            {name:'鄂尔多斯', geoCoord:[109.781327, 39.608266]},
            {name:'招远', geoCoord:[120.38, 37.35]},
            {name:'舟山', geoCoord:[122.207216, 29.985295]},
            {name:'齐齐哈尔', geoCoord:[123.97, 47.33]},
            {name:'盐城', geoCoord:[120.13, 33.38]},
            {name:'赤峰', geoCoord:[118.87, 42.28]},
            {name:'青岛', geoCoord:[120.33, 36.07]},
            {name:'乳山', geoCoord:[121.52, 36.89]},
            {name:'金昌', geoCoord:[102.188043, 38.520089]},
            {name:'泉州', geoCoord:[118.58, 24.93]},
            {name:'莱西', geoCoord:[120.53, 36.86]},
            {name:'日照', geoCoord:[119.46, 35.42]},
            {name:'胶南', geoCoord:[119.97, 35.88]},
            {name:'南通', geoCoord:[121.05, 32.08]},
            {name:'拉萨', geoCoord:[91.11, 29.97]},
            {name:'云浮', geoCoord:[112.02, 22.93]},
            {name:'梅州', geoCoord:[116.1, 24.55]},
            {name:'文登', geoCoord:[122.05, 37.2]},
            {name:'上海', geoCoord:[121.48, 31.22]},
            {name:'攀枝花', geoCoord:[101.718637, 26.582347]},
            {name:'威海', geoCoord:[122.1, 37.5]},
            {name:'承德', geoCoord:[117.93, 40.97]},
            {name:'厦门', geoCoord:[118.1, 24.46]},
            {name:'汕尾', geoCoord:[115.375279, 22.786211]},
            {name:'潮州', geoCoord:[116.63, 23.68]},
            {name:'丹东', geoCoord:[124.37, 40.13]},
            {name:'太仓', geoCoord:[121.1, 31.45]},
            {name:'曲靖', geoCoord:[103.79, 25.51]},
            {name:'烟台', geoCoord:[121.39, 37.52]},
            {name:'福州', geoCoord:[119.3, 26.08]},
            {name:'瓦房店', geoCoord:[121.979603, 39.627114]},
            {name:'即墨', geoCoord:[120.45, 36.38]},
            {name:'抚顺', geoCoord:[123.97, 41.97]},
            {name:'玉溪', geoCoord:[102.52, 24.35]},
            {name:'张家口', geoCoord:[114.87, 40.82]},
            {name:'阳泉', geoCoord:[113.57, 37.85]},
            {name:'莱州', geoCoord:[119.942327, 37.177017]},
            {name:'湖州', geoCoord:[120.1, 30.86]},
            {name:'汕头', geoCoord:[116.69, 23.39]},
            {name:'昆山', geoCoord:[120.95, 31.39]},
            {name:'宁波', geoCoord:[121.56, 29.86]},
            {name:'湛江', geoCoord:[110.359377, 21.270708]},
            {name:'揭阳', geoCoord:[116.35, 23.55]},
            {name:'荣成', geoCoord:[122.41, 37.16]},
            {name:'连云港', geoCoord:[119.16, 34.59]},
            {name:'葫芦岛', geoCoord:[120.836932, 40.711052]},
            {name:'常熟', geoCoord:[120.74, 31.64]},
            {name:'东莞', geoCoord:[113.75, 23.04]},
            {name:'河源', geoCoord:[114.68, 23.73]},
            {name:'淮安', geoCoord:[119.15, 33.5]},
            {name:'泰州', geoCoord:[119.9, 32.49]},
            {name:'南宁', geoCoord:[108.33, 22.84]},
            {name:'营口', geoCoord:[122.18, 40.65]},
            {name:'惠州', geoCoord:[114.4, 23.09]},
            {name:'江阴', geoCoord:[120.26, 31.91]},
            {name:'蓬莱', geoCoord:[120.75, 37.8]},
            {name:'韶关', geoCoord:[113.62, 24.84]},
            {name:'嘉峪关', geoCoord:[98.289152, 39.77313]},
            {name:'广州', geoCoord:[113.23, 23.16]},
            {name:'延安', geoCoord:[109.47, 36.6]},
            {name:'太原', geoCoord:[112.53, 37.87]},
            {name:'清远', geoCoord:[113.01, 23.7]},
            {name:'中山', geoCoord:[113.38, 22.52]},
            {name:'昆明', geoCoord:[102.73, 25.04]},
            {name:'寿光', geoCoord:[118.73, 36.86]},
            {name:'盘锦', geoCoord:[122.070714, 41.119997]},
            {name:'长治', geoCoord:[113.08, 36.18]},
            {name:'深圳', geoCoord:[114.07, 22.62]},
            {name:'珠海', geoCoord:[113.52, 22.3]},
            {name:'宿迁', geoCoord:[118.3, 33.96]},
            {name:'咸阳', geoCoord:[108.72, 34.36]},
            {name:'铜川', geoCoord:[109.11, 35.09]},
            {name:'平度', geoCoord:[119.97, 36.77]},
            {name:'佛山', geoCoord:[113.11, 23.05]},
            {name:'海口', geoCoord:[110.35, 20.02]},
            {name:'江门', geoCoord:[113.06, 22.61]},
            {name:'章丘', geoCoord:[117.53, 36.72]},
            {name:'肇庆', geoCoord:[112.44, 23.05]},
            {name:'大连', geoCoord:[121.62, 38.92]},
            {name:'临汾', geoCoord:[111.5, 36.08]},
            {name:'吴江', geoCoord:[120.63, 31.16]},
            {name:'石嘴山', geoCoord:[106.39, 39.04]},
            {name:'沈阳', geoCoord:[123.38, 41.8]},
            {name:'苏州', geoCoord:[120.62, 31.32]},
            {name:'茂名', geoCoord:[110.88, 21.68]},
            {name:'嘉兴', geoCoord:[120.76, 30.77]},
            {name:'长春', geoCoord:[125.35, 43.88]},
            {name:'胶州', geoCoord:[120.03336, 36.264622]},
            {name:'银川', geoCoord:[106.27, 38.47]},
            {name:'张家港', geoCoord:[120.555821, 31.875428]},
            {name:'三门峡', geoCoord:[111.19, 34.76]},
            {name:'锦州', geoCoord:[121.15, 41.13]},
            {name:'南昌', geoCoord:[115.89, 28.68]},
            {name:'柳州', geoCoord:[109.4, 24.33]},
            {name:'三亚', geoCoord:[109.511909, 18.252847]},
            {name:'自贡', geoCoord:[104.778442, 29.33903]},
            {name:'吉林', geoCoord:[126.57, 43.87]},
            {name:'阳江', geoCoord:[111.95, 21.85]},
            {name:'泸州', geoCoord:[105.39, 28.91]},
            {name:'西宁', geoCoord:[101.74, 36.56]},
            {name:'宜宾', geoCoord:[104.56, 29.77]},
            {name:'呼和浩特', geoCoord:[111.65, 40.82]},
            {name:'成都', geoCoord:[104.06, 30.67]},
            {name:'大同', geoCoord:[113.3, 40.12]},
            {name:'镇江', geoCoord:[119.44, 32.2]},
            {name:'桂林', geoCoord:[110.28, 25.29]},
            {name:'张家界', geoCoord:[110.479191, 29.117096]},
            {name:'宜兴', geoCoord:[119.82, 31.36]},
            {name:'北海', geoCoord:[109.12, 21.49]},
            {name:'西安', geoCoord:[108.95, 34.27]},
            {name:'金坛', geoCoord:[119.56, 31.74]},
            {name:'东营', geoCoord:[118.49, 37.46]},
            {name:'牡丹江', geoCoord:[129.58, 44.6]},
            {name:'遵义', geoCoord:[106.9, 27.7]},
            {name:'绍兴', geoCoord:[120.58, 30.01]},
            {name:'扬州', geoCoord:[119.42, 32.39]},
            {name:'常州', geoCoord:[119.95, 31.79]},
            {name:'潍坊', geoCoord:[119.1, 36.62]},
            {name:'重庆', geoCoord:[106.54, 29.59]},
            {name:'台州', geoCoord:[121.420757, 28.656386]},
            {name:'南京', geoCoord:[118.78, 32.04]},
            {name:'滨州', geoCoord:[118.03, 37.36]},
            {name:'贵阳', geoCoord:[106.71, 26.57]},
            {name:'无锡', geoCoord:[120.29, 31.59]},
            {name:'本溪', geoCoord:[123.73, 41.3]},
            {name:'克拉玛依', geoCoord:[84.77, 45.59]},
            {name:'渭南', geoCoord:[109.5, 34.52]},
            {name:'马鞍山', geoCoord:[118.48, 31.56]},
            {name:'宝鸡', geoCoord:[107.15, 34.38]},
            {name:'焦作', geoCoord:[113.21, 35.24]},
            {name:'句容', geoCoord:[119.16, 31.95]},
            {name:'北京', geoCoord:[116.46, 39.92]},
            {name:'徐州', geoCoord:[117.2, 34.26]},
            {name:'衡水', geoCoord:[115.72, 37.72]},
            {name:'包头', geoCoord:[110, 40.58]},
            {name:'绵阳', geoCoord:[104.73, 31.48]},
            {name:'乌鲁木齐', geoCoord:[87.68, 43.77]},
            {name:'枣庄', geoCoord:[117.57, 34.86]},
            {name:'杭州', geoCoord:[120.19, 30.26]},
            {name:'淄博', geoCoord:[118.05, 36.78]},
            {name:'鞍山', geoCoord:[122.85, 41.12]},
            {name:'溧阳', geoCoord:[119.48, 31.43]},
            {name:'库尔勒', geoCoord:[86.06, 41.68]},
            {name:'安阳', geoCoord:[114.35, 36.1]},
            {name:'开封', geoCoord:[114.35, 34.79]},
            {name:'济南', geoCoord:[117, 36.65]},
            {name:'德阳', geoCoord:[104.37, 31.13]},
            {name:'温州', geoCoord:[120.65, 28.01]},
            {name:'九江', geoCoord:[115.97, 29.71]},
            {name:'邯郸', geoCoord:[114.47, 36.6]},
            {name:'临安', geoCoord:[119.72, 30.23]},
            {name:'兰州', geoCoord:[103.73, 36.03]},
            {name:'沧州', geoCoord:[116.83, 38.33]},
            {name:'临沂', geoCoord:[118.35, 35.05]},
            {name:'南充', geoCoord:[106.110698, 30.837793]},
            {name:'天津', geoCoord:[117.2, 39.13]},
            {name:'富阳', geoCoord:[119.95, 30.07]},
            {name:'泰安', geoCoord:[117.13, 36.18]},
            {name:'诸暨', geoCoord:[120.23, 29.71]},
            {name:'郑州', geoCoord:[113.65, 34.76]},
            {name:'哈尔滨', geoCoord:[126.63, 45.75]},
            {name:'聊城', geoCoord:[115.97, 36.45]},
            {name:'芜湖', geoCoord:[118.38, 31.33]},
            {name:'唐山', geoCoord:[118.02, 39.63]},
            {name:'平顶山', geoCoord:[113.29, 33.75]},
            {name:'邢台', geoCoord:[114.48, 37.05]},
            {name:'德州', geoCoord:[116.29, 37.45]},
            {name:'济宁', geoCoord:[116.59, 35.38]},
            {name:'荆州', geoCoord:[112.239741, 30.335165]},
            {name:'宜昌', geoCoord:[111.3, 30.7]},
            {name:'义乌', geoCoord:[120.06, 29.32]},
            {name:'丽水', geoCoord:[119.92, 28.45]},
            {name:'洛阳', geoCoord:[112.44, 34.7]},
            {name:'秦皇岛', geoCoord:[119.57, 39.95]},
            {name:'株洲', geoCoord:[113.16, 27.83]},
            {name:'石家庄', geoCoord:[114.48, 38.03]},
            {name:'莱芜', geoCoord:[117.67, 36.19]},
            {name:'常德', geoCoord:[111.69, 29.05]},
            {name:'保定', geoCoord:[115.48, 38.85]},
            {name:'湘潭', geoCoord:[112.91, 27.87]},
            {name:'金华', geoCoord:[119.64, 29.12]},
            {name:'岳阳', geoCoord:[113.09, 29.37]},
            {name:'长沙', geoCoord:[113, 28.21]},
            {name:'衢州', geoCoord:[118.88, 28.97]},
            {name:'廊坊', geoCoord:[116.7, 39.53]},
            {name:'菏泽', geoCoord:[115.480656, 35.23375]},
            {name:'合肥', geoCoord:[117.27, 31.86]},
            {name:'武汉', geoCoord:[114.31, 30.52]},
            {name:'大庆', geoCoord:[125.03, 46.58]}
        ]
        return {
            backgroundColor: 'rgba(0,0,0,0)',
            color: [
                'rgba(255, 255, 255, 0.8)',
                'rgba(14, 241, 242, 0.8)',
                'rgba(37, 140, 249, 0.8)'
            ],
            title : {
                text: 'Baidu Renqi',
                link: 'http://renqi.baidu.com',
                subtext: 'Fictitious data',
                x: 'center',
                textStyle : {
                    color: '#fff'
                }
            },
            legend: {
                orient: 'vertical',
                x:'left',
                data:['high','middle','low'],
                textStyle : {
                    color: '#fff'
                }
            },
            toolbox: {
                show : true,
                orient : 'vertical',
                x: 'right',
                y: 'center',
                feature : {
                    mark : {show: true},
                    dataView : {show: true, readOnly: false},
                    restore : {show: true},
                    saveAsImage : {show: true}
                }
            },
            series : [
                {
                    name: 'low',
                    type: 'map',
                    mapType: 'china',
                    itemStyle:{
                        normal:{
                            borderColor:'rgba(100,149,237,1)',
                            borderWidth:0.5,
                            areaStyle:{
                                color: '#333'
                            }
                        }
                    },
                    data : [],
                    markPoint : {
                        symbolSize: 2,
                        large: true,
                        effect : {
                            show: true
                        },
                        data : (function(){
                            var data = [];
                            var len = 3000;
                            var geoCoord
                            while(len--) {
                                geoCoord = placeList[len % placeList.length].geoCoord;
                                data.push({
                                    name : placeList[len % placeList.length].name + len,
                                    value : 10,
                                    geoCoord : [
                                        geoCoord[0] + Math.random() * 5 * -1,
                                        geoCoord[1] + Math.random() * 3 * -1
                                    ]
                                })
                            }
                            return data;
                        })()
                    }
                },
                {
                    name: 'middle',
                    type: 'map',
                    mapType: 'china',
                    data : [],
                    markPoint : {
                        symbolSize: 3,
                        large: true,
                        effect : {
                            show: true
                        },
                        data : (function(){
                            var data = [];
                            var len = 1000;
                            var geoCoord
                            while(len--) {
                                geoCoord = placeList[len % placeList.length].geoCoord;
                                data.push({
                                    name : placeList[len % placeList.length].name + len,
                                    value : 50,
                                    geoCoord : [
                                        geoCoord[0] + Math.random() * 3 * -1,
                                        geoCoord[1] + Math.random() * 3 * -1
                                    ]
                                })
                            }
                            return data;
                        })()
                    }
                },
                {
                    name: 'high',
                    type: 'map',
                    mapType: 'china',
                    hoverable: false,
                    roam:true,
                    data : [],
                    markPoint : {
                        symbol : 'diamond',
                        symbolSize: 6,
                        large: true,
                        effect : {
                            show: true
                        },
                        data : (function(){
                            var data = [];
                            var len = placeList.length;
                            while(len--) {
                                data.push({
                                    name : placeList[len].name,
                                    value : 90,
                                    geoCoord : placeList[len].geoCoord
                                })
                            }
                            return data;
                        })()
                    }
                }
            ]
        };
    })(),
    adddddd : {}
}
if (document.location.href.indexOf('local') == -1) {
    var _bdhmProtocol = (("https:" == document.location.protocol) ? " https://" : " http://");
    document.write(unescape("%3Cscript src='" + _bdhmProtocol + "hm.baidu.com/h.js%3Fb78830c9a5dad062d08b90b2bc0cf5da' type='text/javascript'%3E%3C/script%3E"));   
}