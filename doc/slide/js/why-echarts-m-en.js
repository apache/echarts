var myChart;

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
];

var optionMap = {
    calculable : {
        title: {
            text: 'Drag-Recalculate',
            subtext: 'Try to drag the desired items together.'
        },
        tooltip : {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
            y: 60,
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
                center: ['50%', '65%'],     // 默认全局居中
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
    magicType : {
        title: {
            text: 'Magic Switch',
            subtext: 'More interpretation of this same data.'
        },
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            y: 60,
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
        grid: {
            y:100
        },
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
    dataRange : {
        title : {
            text: 'Scale Roaming',
            subtext: 'Focus on the interested data.'
        },
        tooltip : {
            trigger: 'item'
        },
        dataRange: {
            min: 0,
            max: 55000,
            x: 'left',
            text:['High','Low'],           // 文本，默认为数值文本
            color:[ 'red', 'yellow'],//颜色 
            calculable : true,
            realtime: false
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
    dataZoom : {
        title : {
            text: 'Space Zoom',
            subtext: 'Focus on the interested data.'
        },
        tooltip : {
            trigger: 'axis',
            formatter: function (params) {
                var res = params[0].seriesName + ' ' + params[0].name;
                res += '<br/>  Opening : ' + params[0].value[0] + '  Highest : ' + params[0].value[3];
                res += '<br/>  Close : ' + params[0].value[1] + '  Lowest : ' + params[0].value[2];
                return res;
            }
        },
        toolbox: {
            y: 'top',
            orient:'vertical',
            show : true,
            feature : {
                restore : {show: true},
                dataZoom : {show: true}
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
            }
        ],
        series : [
            {
                name:'Shanghai Stock Index',
                type:'k',
                data: kData
            }
        ]
    },
    timeline : {
        timeline : {
            autoPlay:true,
            data : [1,2,3,4,5 ],
            type: 'number'
        },
        options : [
            {
                title : {
                    x:'right',
                    text: 'Mixed Timeline',
                    subtext: 'Expand the dimension of time.'
                },
                tooltip : {
                    trigger: 'item',
                    formatter: "{a} <br/>{b} : {c} ({d}%)"
                },
                legend: {
                    orient: 'vertical',
                    x: 'left',
                    data:['Chrome','Firefox','Safari','IE9+','IE8-']
                },
                toolbox: {
                    show : true,
                    orient: 'vertical',
                    x: 'right',
                    y: 'center',
                    feature : {
                        mark : {show: true},
                        dataView : {show: true, readOnly: false},
                        magicType : {
                            show: true, 
                            type: ['pie', 'funnel'],
                            option: {
                                funnel: {
                                    x: '25%',
                                    width: '50%',
                                    funnelAlign: 'left',
                                    max: 1700
                                }
                            }
                        },
                        restore : {show: true},
                        saveAsImage : {show: true}
                    }
                },
                series : [
                    {
                        name:'Browser proportion',
                        type:'pie',
                        center: ['45%', '50%'],
                        radius: '50%',
                        data:[
                            {value: 1 * 128 + 80,  name:'Chrome'},
                            {value: 1 * 64  + 160,  name:'Firefox'},
                            {value: 1 * 32  + 320,  name:'Safari'},
                            {value: 1 * 16  + 640,  name:'IE9+'},
                            {value: 1 * 8  + 1280, name:'IE8-'}
                        ]
                    }
                ]
            },
            {
                series : [
                    {
                        name:'Browser proportion',
                        type:'pie',
                        data:[
                            {value: 3 * 128 + 80,  name:'Chrome'},
                            {value: 3 * 64  + 160,  name:'Firefox'},
                            {value: 3 * 32  + 320,  name:'Safari'},
                            {value: 3 * 16  + 640,  name:'IE9+'},
                            {value: 3 * 8  + 1280, name:'IE8-'}
                        ]
                    }
                ]
            },
            {
                series : [
                    {
                        name:'Browser proportion',
                        type:'pie',
                        data:[
                            {value: 5 * 128 + 80,  name:'Chrome'},
                            {value: 5 * 64  + 160,  name:'Firefox'},
                            {value: 5 * 32  + 320,  name:'Safari'},
                            {value: 5 * 16  + 640,  name:'IE9+'},
                            {value: 5 * 8  + 1280, name:'IE8-'}
                        ]
                    }
                ]
            },
            {
                series : [
                    {
                        name:'Browser proportion',
                        type:'pie',
                        data:[
                            {value: 7 * 128 + 80,  name:'Chrome'},
                            {value: 7 * 64  + 160,  name:'Firefox'},
                            {value: 7 * 32  + 320,  name:'Safari'},
                            {value: 7 * 16  + 640,  name:'IE9+'},
                            {value: 7 * 8  + 1280, name:'IE8-'}
                        ]
                    }
                ]
            },
            {
                series : [
                    {
                        name:'Browser proportion',
                        type:'pie',
                        data:[
                            {value: 14 * 128 + 80,  name:'Chrome'},
                            {value: 13 * 64  + 160,  name:'Firefox'},
                            {value: 12 * 32  + 320,  name:'Safari'},
                            {value: 12 * 16  + 640,  name:'IE9+'},
                            {value: 12 * 8  + 1280, name:'IE8-'}
                        ]
                    }
                ]
            }
        ]
    },
    scatter : {
        title : {
            text: 'Large-scale',
            subtext: 'We can show 200,000 data in one second.'
        },
        tooltip : {
            trigger: 'item'
        },
        legend: {
            x:'left',
            y:'bottom',
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
                scale:true,
                show: false
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
                    var len = 5000;
                    var x = 0;
                    while (len--) {
                        x = (Math.random() * 8).toFixed(3) - 0;
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
                    var len = 5000;
                    var x = 0;
                    while (len--) {
                        x = (Math.random() * 8).toFixed(3) - 0;
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
    force : {
        title : {
            text: 'Force-directed layout',
            subtext: 'Elegant display of networks.'
        },
        tooltip : {
            trigger: 'item',
            formatter: '{a} : {b}'
        },
        toolbox: {
            show : true,
            feature : {
                magicType: {show: true, type: ['force', 'chord']},
                restore : {show: true}
            }
        },
        legend: {
            x:'left',
            y:'bottom',
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
                radius: '40%',
                minRadius: 5,
                maxRadius: 10,
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
                    {category:2, name: 'Long Wayne',value : 1}
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
    gauge :{
        title : {
            text: 'BI Component',
            subtext: 'Show the key indicators for performance management.'
        },
        color : [
            'rgba(255, 69, 0, 0.5)',
            'rgba(255, 150, 0, 0.5)',
            'rgba(255, 200, 0, 0.5)',
            'rgba(155, 200, 50, 0.5)',
            'rgba(55, 200, 100, 0.5)'
        ],
        tooltip : {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c}%"
        },
        series : [
            {
                name:'Key',
                type:'gauge',
                center : ['50%', '60%'],    // 默认全局居中
                radius : '80%',
                startAngle: 225,
                endAngle : -45,
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
                    width : 5,
                    color: 'auto'
                },
                title : {
                    show : true,
                    offsetCenter: [0, '-30%'],       // x, y，单位px
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        fontWeight: 'bolder'
                    }
                },
                detail : {
                    formatter:'{value}%',
                    offsetCenter: [0, '40%'],
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        color: 'auto',
                        fontWeight: 'bolder'
                    }
                },
                data:[{value: 85, name: 'Completion\nRate'}]
            }
        ]
    },
    funnel :{
        title : {
            text: 'BI Component',
            subtext: 'Funnel plot is widely used in marketing analysis.'
        },
        color : [
            'rgba(255, 69, 0, 0.5)',
            'rgba(255, 150, 0, 0.5)',
            'rgba(255, 200, 0, 0.5)',
            'rgba(155, 200, 50, 0.5)',
            'rgba(55, 200, 100, 0.5)'
        ],
        tooltip : {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c}%"
        },
        legend: {
            y: 'bottom',
            data : ['view','click','visit','', 'consult','order']
        },
        series : [
            {
                name:'Expect',
                type:'funnel',
                y: 60,
                x2: 80,
                itemStyle: {
                    normal: {
                        label: {
                            formatter: '{b} Expect'
                        },
                        labelLine: {
                            show : false
                        }
                    },
                    emphasis: {
                        label: {
                            position:'inside',
                            formatter: '{b} Expect : {c}%'
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
                y: 60,
                x2: 80,
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
                            formatter: '{b} Actual : {c}%'
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
    mix :(function(){
        // original
        var data = [30, 20, 54, 21, 90, 30, 10];

        var gap = 0;
        var total = 0;
        var maxIndex;
        var dataArray = (function(){
            var max = Math.max.apply(Math, data);
            var min = Math.min.apply(Math, data);
            gap = Math.round((max - min));
            var nd = [{value:data[0] + gap,symbol:'none'}];
            for (var i = 0, l = data.length; i < l; i++) {
                if (data[i] == max) {
                    maxIndex = i;
                }
                total += data[i];
                nd.push(data[i] + gap);
            }
            nd.push({value:data[data.length - 1] + gap,symbol:'none'});
            return nd;
        })();

        var option = {
            backgroundColor:'#fff',
            title : {
                text: 'Mixed Charts',
                subtext: 'Show the best mashup to your data.',
                x: 'center'
            },
            legend: {
                data:['Sale', 'Percentage'],
                y: 50,
                selectedMode: false
            },
            tooltip : {
                trigger: 'item',
                formatter: function(params){
                    if (params.seriesName == 'Percentage') {
                        return 'Sale : ' + total + '<br/>'
                               + params.name + ' : ' + params.value + '<br/>'
                               + 'Percentage : ' +  params.percent + '%';
                    }
                    else if (params.name != 'Percentage'){
                        update(params);
                        return params.seriesName + '<br/>'
                               + params.name + ' : ' + params.value;
                    }
                },
                axisPointer: {
                    type: 'none'
                }
            },
            toolbox: {
                show : true,
                feature : {
                    saveAsImage : {show: true}
                }
            },
            grid:{
                backgroundColor:'#ccc',
                borderWidth:0,
                x: 40,
                x2: 50,
            },
            xAxis : [
                {
                    type : 'category',
                    boundaryGap : false,
                    show : false,
                    data : ['placeHolder','Mon','Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun','placeHolder']
                }
            ],
            yAxis : [
                {
                    type : 'value',
                    boundaryGap:[0,0.5],
                    show : false
                }
            ],
            animation: false,
            series : [
                {
                    name:'Sale',
                    type:'line',
                    symbol: 'emptyCircle',
                    symbolSize: 6,
                    showAllSymbol:true,
                    smooth:true,
                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    data: dataArray
                },
                {
                    name:'placeHolder',
                    type:'pie',
                    tooltip: {show:false},
                    radius : [100, 600],
                    itemStyle: {
                        normal: {color: '#fff',label:{show:false},labelLine:{show:false}},
                        emphasis: {color:'rgba(0,0,0,0)'}
                    },
                    data:[
                      {value:100, name:'placeHolder'}
                    ]
                },
                {
                    name:'Percentage',
                    type:'pie',
                    clickable: false,
                    clockWise: true,
                    radius : [110, 125],
                    data:[
                      {
                          itemStyle: {normal: {
                              label:{
                                  position:'inside',
                                  formatter: '\n{b} : {c}\n( {d}% )',
                                  textStyle: {
                                      fontSize: 15,
                                      baseline: 'top',
                                      color: '#1e90ff'
                                  }
                              },
                              labelLine:{show:false}
                          }}
                      },
                      {
                          name:'Other',
                          tooltip: {show:false},
                          itemStyle: {normal: {color: '#fff',label:{show:false},labelLine:{show:false}}}
                      }
                    ]
                }
            ]
        };
        function changePieSeries(params) {
            var curData = params.value - gap;
            option.series[2].startAngle = -90 + (curData / total * 360) / 2;
            option.series[2].data[0].name = params.name;
            option.series[2].data[0].value = curData;
            option.series[2].data[1].value = total - curData;
            
            for (var i = 1, l = option.series[0].data.length - 1; i < l; i++) {
                if (option.series[0].data[i].symbol) {
                    option.series[0].data[i].symbol = 'emptyCircle';
                    option.series[0].data[i].symbolSize = 6;
                }
            }
            option.series[0].data[params.dataIndex] = {
                name : params.name,
                value : params.value,
                symbol: 'emptyDiamond',
                symbolSize: 10
            }
        }
        function update(params){
            changePieSeries(params);
            option.animation = true;
            myChart.setOption(option);
        }
        changePieSeries({
            name : option.xAxis[0].data[maxIndex + 1],
            value : option.series[0].data[maxIndex + 1],
            dataIndex: maxIndex + 1
        });

        return option;
    })(),
    effect2:  {
        title : {
            text: 'Glare Effect',
            subtext: 'Ability to attract the eye.'
        },
        color: ['gold','aqua','lime'],
        tooltip : {
            trigger: 'item',
            formatter: '{b}'
        },
        legend: {
            y: 'bottom',
            data:['Beijing', 'Shanghai', 'Guangzhou'],
            selectedMode: 'single',
            selected:{
                'Shanghai' : false,
                'Guangzhou' : false
            }
        },
        toolbox: {
            show : true,
            x: 'right',
            y: 'top',
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
            realtime: false,
            x: 'left',
            color: ['#ff3333', 'orange', 'yellow','lime','aqua']
        },
        series : [
            {
                name: '全国',
                type: 'map',
                roam: true,
                hoverable: false,
                mapType: 'china',
                itemStyle:{
                    normal:{
                        borderColor:'rgba(100,149,237,1)',
                        borderWidth:0.5,
                        areaStyle:{
                            color: '#1b1b1b'
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
                        [{name:'上海'},{name:'北京'}],
                        [{name:'上海'},{name:'沈阳'}],
                        [{name:'上海'},{name:'秦皇岛'}],
                        [{name:'上海'},{name:'西安'}],
                        [{name:'上海'},{name:'石家庄'}],
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
                    ],
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
                name: 'Beijing',
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
                    symbolSize : function (v){
                        return 10 + v/10
                    },
                    effect : {
                        show: true,
                        shadowBlur : 0
                    },
                    itemStyle:{
                        normal:{
                            label:{show:false}
                        },
                        emphasis: {
                            label:{position:'top'}
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
                name: 'Shanghai',
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
                    symbolSize : function (v){
                        return 10 + v/10
                    },
                    effect : {
                        show: true,
                        shadowBlur : 0
                    },
                    itemStyle:{
                        normal:{
                            label:{show:false}
                        },
                        emphasis: {
                            label:{position:'top'}
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
                name: 'Guangzhou',
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
                    symbolSize : function (v){
                        return 10 + v/10
                    },
                    effect : {
                        show: true,
                        shadowBlur : 0
                    },
                    itemStyle:{
                        normal:{
                            label:{show:false}
                        },
                        emphasis: {
                            label:{position:'top'}
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
    effect3:{
        title : {
            text: 'Glare Effect',
            subtext: 'Ability to attract the eye'
        },
        color: [
            'rgba(250, 250, 210, 0.8)',
            'rgba(14, 241, 242, 0.8)',
            'rgba(37, 140, 249, 0.8)'
        ],
        legend: {
            y:'bottom',
            data:['high','middle','low']
        },
        toolbox: {
            show : true,
            x: 'right',
            y: 'top',
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
                        borderWidth:1.5,
                        areaStyle:{
                            color: '#1b1b1b'
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
                        var len = 2000;
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
                        var len = 500;
                        var geoCoord
                        while(len--) {
                            geoCoord = placeList[len % placeList.length].geoCoord;
                            data.push({
                                name : placeList[len % placeList.length].name + len,
                                value : 50,
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
    }
}

function initChart(index) {
    disposeChart();
    var dom = $('section.active .main')[0];
    if (dom) {        
        var key  = $(dom).attr('optionKey');
        myChart = echarts.init(dom, 'infographic');
        myChart.setOption(optionMap[key]);
    }
}

function disposeChart() {
    if (myChart) {
        myChart.dispose();
        myChart = null;
    }
}
require.config({
    paths:{ 
        echarts: './js/dist',
    }
});
$(function(){
    require(
        [
            'echarts',
            'echarts/chart/line',
            'echarts/chart/bar',
            'echarts/chart/scatter',
            'echarts/chart/k',
            'echarts/chart/pie',
            'echarts/chart/force',
            'echarts/chart/chord',
            'echarts/chart/map',
            'echarts/chart/gauge',
            'echarts/chart/funnel'
        ],
        function (ec) {
            echarts = ec;
            resize();
            $('.page div').click(pageHandler);
            window.onresize = function(){
                resize();
            }
        }
    );
});

function resize() {
    var height = document.documentElement.clientHeight - 50 + 'px';
    var width = document.documentElement.clientWidth + 'px';
    $('#content').height(height).width(width);
    $('.section').height(height).width(width);
    $('.main').height(document.documentElement.clientHeight - 65 + 'px');
    myChart && myChart.resize();
}
function bindPageHandler() {

}
function pageHandler() {
    var upOrdown = $(this)[0].className;
    if (upOrdown == 'page-down') {
        if ($(this).html() == 'Again') {
            window.location.reload();
            return;
        }
        if (!$('.active').removeClass('active').css('left', '-100%')
                         .next().addClass('active').css('left', 0).next()[0]
        ) {
            $(this).html('Again');
        }
        else {
            $(this).html('Next 》');
        }
        $(this).prev().removeClass('disabled');
    }
    else if (upOrdown == 'page-up') {
        !$('.active').removeClass('active').css('left', '100%')
                     .prev().addClass('active').css('left', 0).prev()[0]
        && $(this).addClass('disabled');
        $(this).next().removeClass('disabled').html('Next 》');
    }
    initChart();
}
if (document.location.href.indexOf('local') == -1) {
    var _bdhmProtocol = (("https:" == document.location.protocol) ? " https://" : " http://");
    document.write(unescape("%3Cscript src='" + _bdhmProtocol + "hm.baidu.com/h.js%3Fb78830c9a5dad062d08b90b2bc0cf5da' type='text/javascript'%3E%3C/script%3E"));   
}