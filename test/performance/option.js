var randomDataLength = 10000;
var randomData = (function (){
    var l = [];
    var len = randomDataLength;
    while(len--) {
        l.push(Math.round(Math.random()* 1000));
    }
    return l;
})();

function option(chartType, n) {
    var opt = {
        animation:false,
        title : {
            text: chartType + '性能测试',
            subtext: '自动生成' + n + '数据'
        },
        tooltip : {
            trigger: 'axis'
        },
        legend: {
            data:['性能测试']
        },
        toolbox: {
            show : true,
            feature : {
                mark : {show: true},
                //dataZoom : {show: true},
                dataView : {show: true, readOnly: false},
                magicType : {show: true, type: ['line', 'bar']},
                restore : {show: true},
                saveAsImage : {show: true}
            }
        },
        dataRange: {
            min: 0,
            max: 1000,
            calculable : true,
            color: ['orangered','yellow','lightskyblue']
        },
        series : [
            {
                name:'性能测试',
                type: chartType,
                mapType: 'world',
                roam: true,
                large:true,
                data: function (){
                    switch(chartType) {
                        case 'scatter' :
                            return scatterData(n);
                        case 'k' :
                            return kData(n);
                        case 'radar' :
                            return radarData(n);
                        case 'pie' :
                            return pieData(n);
                        case 'map' :
                            return mapData(n);
                        default :
                            var list = [];
                            for (var i = 1; i <= n; i++) {
                                list.push({
                                    value : randomData[i % randomDataLength],
                                    name : i
                                });
                            }
                            return list;
                    }
                }()
            }
        ]
    };
    if (chartType == 'line' 
        || chartType == 'bar' 
        || chartType == 'k' 
    ) {
        opt.xAxis = [
            {
                type : 'category',
                data :  function (){
                    var list = [];
                    for (var i = 1; i <= n; i++) {
                        list.push(i);
                    }
                    return list;
                }()
            }
        ];
        opt.yAxis = [
            {
                type : 'value'
            }
        ];
    }
    else if (chartType == 'scatter') {
        opt.xAxis = [
            {
                type : 'value'
            }
        ];
        opt.yAxis = [
            {
                type : 'value'
            }
        ];
    }
    else if (chartType == 'radar') {
        opt.polar = [
           {
               indicator : [
                   { text: '1', max: 1000},
                   { text: '2', max: 1000},
                   { text: '3', max: 1000},
                   { text: '4', max: 1000},
                   { text: '3', max: 1000}
                ]
            }
        ];
    }
    else if (chartType == 'chord') {
        opt.series = chordSeries();
    }
    return opt;
}

function scatterData(n){
    var list = [];
    for (var i = 1; i <= n; i++) {
        list.push([
            i , randomData[i % randomDataLength]
        ]);
    }
    return list;
}
function kData(n){
    var list = [];
    for (var i = 1; i <= n; i++) {
        list.push([
            randomData[i % randomDataLength],
            randomData[(i+1) % randomDataLength],
            randomData[(i+2) % randomDataLength],
            randomData[(i+3) % randomDataLength]
        ]);
    }
    return list;
}

function radarData(n){
    var list = [];
    n = n > 200 ? 200 : n;
    for (var i = 1; i <= n; i++) {
        list.push({
            value : [
                randomData[i % randomDataLength],
                randomData[(i+1) % randomDataLength],
                randomData[(i+2) % randomDataLength],
                randomData[(i+3) % randomDataLength],
                randomData[(i+4) % randomDataLength]
            ],
            name : i
        });
    }
    return list;
}

function pieData(n){
    var list = [];
    n = n > 200 ? 200 : n;
    for (var i = 1; i <= n; i++) {
        list.push({
            value : randomData[i % randomDataLength],
            name : i
        });
    }
    return list;
}

function chordSeries() {
    return [
        {
            "name": "性能测试",
            "type": "chord",
            "showScaleText": false,
            "data": [
                {"name": "美国"},
                {"name": "叙利亚反对派"},
                {"name": "阿萨德"},
                {"name": "伊朗"},
                {"name": "塞西"},
                {"name": "哈马斯"},
                {"name": "以色列"},
                {"name": "穆斯林兄弟会"},
                {"name": "基地组织"},
                {"name": "俄罗斯"},
                {"name": "黎巴嫩什叶派"},
                {"name": "土耳其"},
                {"name": "卡塔尔"},
                {"name": "沙特"},
                {"name": "黎巴嫩逊尼派"}
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
            "name": "反对",
            "type": "chord",
            "showScaleText": false,
            "data": [
                {"name": "美国"},
                {"name": "叙利亚反对派"},
                {"name": "阿萨德"},
                {"name": "伊朗"},
                {"name": "塞西"},
                {"name": "哈马斯"},
                {"name": "以色列"},
                {"name": "穆斯林兄弟会"},
                {"name": "基地组织"},
                {"name": "俄罗斯"},
                {"name": "黎巴嫩什叶派"},
                {"name": "土耳其"},
                {"name": "卡塔尔"},
                {"name": "沙特"},
                {"name": "黎巴嫩逊尼派"}
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
            "name": "未表态",
            "type": "chord",
            "showScaleText": false,
            "data": [
                {"name": "美国"},
                {"name": "叙利亚反对派"},
                {"name": "阿萨德"},
                {"name": "伊朗"},
                {"name": "塞西"},
                {"name": "哈马斯"},
                {"name": "以色列"},
                {"name": "穆斯林兄弟会"},
                {"name": "基地组织"},
                {"name": "俄罗斯"},
                {"name": "黎巴嫩什叶派"},
                {"name": "土耳其"},
                {"name": "卡塔尔"},
                {"name": "沙特"},
                {"name": "黎巴嫩逊尼派"}
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
    ];
}

function mapData(n) {
    var countryList = [
        'Afghanistan','Angola','Albania','United Arab Emirates','Argentina','Armenia',
        'French Southern and Antarctic Lands','Australia','Austria','Azerbaijan','Burundi',
        'Belgium','Benin','Burkina Faso','Bangladesh','Bulgaria','The Bahamas',
        'Bosnia and Herzegovina','Belarus','Belize','Bermuda','Bolivia','Brazil','Brunei',
        'Bhutan','Botswana','Central African Republic','Canada','Switzerland','Chile','China',
        'Ivory Coast','Cameroon','Democratic Republic of the Congo','Republic of the Congo',
        'Colombia','Costa Rica','Cuba','Northern Cyprus','Cyprus','Czech Republic','Germany',
        'Djibouti','Denmark','Dominican Republic','Algeria','Ecuador','Egypt','Eritrea','Spain',
        'Estonia','Ethiopia','Finland','Fiji','Falkland Islands','France','Gabon','United Kingdom',
        'Georgia','Ghana','Guinea','Gambia','Guinea Bissau','Equatorial Guinea','Greece',
        'Greenland','Guatemala','French Guiana','Guyana','Honduras','Croatia','Haiti','Hungary',
        'Indonesia','India','Ireland','Iran','Iraq','Iceland','Israel','Italy','Jamaica','Jordan',
        'Japan','Kazakhstan','Kenya','Kyrgyzstan','Cambodia','South Korea','Kosovo','Kuwait',
        'Laos','Lebanon','Liberia','Libya','Sri Lanka','Lesotho','Lithuania','Luxembourg','Latvia',
        'Morocco','Moldova','Madagascar','Mexico','Macedonia','Mali','Myanmar','Montenegro',
        'Mongolia','Mozambique','Mauritania','Malawi','Malaysia','Namibia','New Caledonia','Niger',
        'Nigeria','Nicaragua','Netherlands','Norway','Nepal','New Zealand','Oman','Pakistan',
        'Panama','Peru','Philippines','Papua New Guinea','Poland','Puerto Rico','North Korea',
        'Portugal','Paraguay','Qatar','Romania','Russia','Rwanda','Western Sahara','Saudi Arabia',
        'Sudan','South Sudan','Senegal','Solomon Islands','Sierra Leone','El Salvador','Somaliland',
        'Somalia','Republic of Serbia','Suriname','Slovakia','Slovenia','Sweden','Swaziland',
        'Syria','Chad','Togo','Thailand','Tajikistan','Turkmenistan','East Timor',
        'Trinidad and Tobago','Tunisia','Turkey','United Republic of Tanzania','Uganda','Ukraine',
        'Uruguay','United States of America','Uzbekistan','Venezuela','Vietnam','Vanuatu',
        'West Bank','Yemen','South Africa','Zambia','Zimbabwe'
    ];
    var list = [];
    for (var i = 0, l = countryList.length; i < l; i ++) {
        list.push({
            name : countryList[i],
            value : randomData[(i + n) % randomDataLength]
        });
    }
    return list;
}
