var fs = require('fs');
// http://international.caixin.com/2013-09-06/100579154.html
var dataSource = [
    ['美国','叙利亚反对派',100,'green'],
    ['美国','阿萨德',100,'red'],
    ['美国','伊朗',100,'red'],
    ['美国','塞西',100,'yellow'],
    ['美国','哈马斯',100,'red'],
    ['美国','以色列',100,'green'],
    ['美国','穆斯林兄弟会',100,'yellow'],
    ['美国','基地组织',100,'red'],
    ['俄罗斯','叙利亚反对派',100,'red'],
    ['俄罗斯','阿萨德',100,'green'],
    ['伊朗','叙利亚反对派',100,'red'],
    ['伊朗','阿萨德',100,'green'],
    ['伊朗','黎巴嫩什叶派',100,'green'],
    ['伊朗','哈马斯',100,'green'],
    ['以色列','叙利亚反对派',100,'green'],
    ['以色列','阿萨德',100,'red'],
    ['以色列','哈马斯',100,'red'],
    ['土耳其','塞西',100,'red'],
    ['土耳其','穆斯林兄弟会',100,'green'],
    ['土耳其','叙利亚反对派',100,'green'],
    ['土耳其','阿萨德',100,'red'],
    ['卡塔尔','叙利亚反对派',100,'green'],
    ['卡塔尔','阿萨德',100,'red'],
    ['卡塔尔','塞西',100,'red'],
    ['卡塔尔','穆斯林兄弟会',100,'green'],
    ['卡塔尔','哈马斯',100,'green'],
    ['沙特','叙利亚反对派',100,'green'],
    ['沙特','黎巴嫩逊尼派',100,'green'],
    ['沙特','塞西',100,'green'],
    ['沙特','穆斯林兄弟会',100,'red'],
    ['塞西','穆斯林兄弟会',100,'red'],
    ['黎巴嫩逊尼派','叙利亚反对派',100,'green'],
    ['黎巴嫩逊尼派','阿萨德',100,'red'],
    ['黎巴嫩什叶派','叙利亚反对派',100,'red'],
    ['黎巴嫩什叶派','阿萨德',100,'green'],
    ['哈马斯','叙利亚反对派',100,'green'],
    ['哈马斯','塞西',100,'red'],
    ['穆斯林兄弟会','阿萨德',100,'red'],
    ['基地组织','叙利亚反对派',100,'green'],
    ['基地组织','阿萨德',100,'red'],
    ['基地组织','沙特',100,'red']
];
var groupIndices = {};
var count = 0;
for (var i = 0; i < dataSource.length; i++) {
    var country = dataSource[i][0];
    var country2 = dataSource[i][1];
    if (groupIndices[country] === undefined) {
        groupIndices[country] = count++;
    }
    if (groupIndices[country2] === undefined) {
        groupIndices[country2] = count++;
    }
}
for (var i = 0; i < dataSource.length; i++) {
    var target = dataSource[i][1];
    if (groupIndices[target] === undefined) {
        groupIndices[target] = count++;
    }
}
var attitudeMap = {
    'green' : 0,
    'red' : 1,
    'yellow' : 2
}
var series = [{
    name : '支持',
    type : 'chord',
    showScaleText : false,
    data : [],
    matrix : []
}, {
    name : '反对',
    type : 'chord',
    showScaleText : false,
    data : [],
    matrix : []
}, {
    name : '未表态',
    type : 'chord',
    showScaleText : false,
    data : [],
    matrix : []
}];
for (var k = 0; k < 3; k++) {
    series[k].matrix = [];
    for(var countryName in groupIndices) {
        var idx = groupIndices[countryName];
        series[k].data[idx] = {
            name : countryName
        }
    }
    for (var i = 0; i < count; i++) {
        series[k].matrix[i] = [];
        for (var j = 0; j < count; j++) {
            series[k].matrix[i][j] = 0;
        }
    }
}
for (var i = 0; i < dataSource.length; i++) {
    var sourceIdx = groupIndices[dataSource[i][0]];
    var targetIdx = groupIndices[dataSource[i][1]];
    var val = dataSource[i][2];
    var serieIdx = attitudeMap[dataSource[i][3]];
    var matrix = series[serieIdx].matrix;
    matrix[sourceIdx][targetIdx] += 100;
    matrix[targetIdx][sourceIdx] += 10;
}

var res = {
    title : {
        text : "中东地区的敌友关系",
        subtext: '数据来自财新网',
        x:'right',
        y:'bottom'
    },
    legend : {
        data : Object.keys(groupIndices),
        orient : 'vertical',
        x : 'left'
    },
    series : series 
}

fs.writeFileSync("middle-east.js", 'define(' + JSON.stringify(series) + ')');