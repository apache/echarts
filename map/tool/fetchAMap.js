var request = require('request');
var fs = require('fs');

var provinceList = ['台湾省', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省','黑龙江省',  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省','河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省', '四川省', '贵州省', '云南省', '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'];
// var provinceList = ['台湾', '河北', '山西', '内蒙古', '辽宁', '吉林','黑龙江',  '江苏', '浙江', '安徽', '福建', '江西', '山东','河南', '湖北', '湖南', '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'];

var centralCityFullList = ['北京市', '天津市', '上海市', '重庆市', '香港特别行政区', '澳门特别行政区'
];

var API_BASE = 'http://restapi.amap.com/v3/config/';
var API_KEY = 'd619ce5126cfe80ad9c645fcc1b54e52';

function makeRequestUrl (obj, type) {
    var paramStr = '';
    for (var name in obj) {
        paramStr += (paramStr ? '&' : '?') + name + '=' + encodeURIComponent(obj[name]);
    }
    paramStr += '&key=' + API_KEY + '&output=json';
    // console.log(API_BASE + type + paramStr);
    return API_BASE + type + paramStr;
}

function makeDistritSearchUrl(obj) {
    return makeRequestUrl({
        extensions: 'all',
        keywords: obj.keywords,
        subdistrict: 1
    }, 'district');
}

provinceList.forEach(function (provinceName) {
    request(makeDistritSearchUrl({
        keywords: provinceName,
        level: 'province'
    }), function (err, response, body) {
        if (!fs.existsSync('./tmp/' + provinceName)) {
            fs.mkdirSync('./tmp/' + provinceName);
        }
        fs.writeFileSync('./tmp/' + provinceName +'.json', body, 'utf-8');

        var res = JSON.parse(body);
        res.districts[0].districts.forEach(function (city) {
            request(makeDistritSearchUrl({
                keywords: city.name,
                level: 'city'
            }), function (err, response, body) {
                fs.writeFileSync('./tmp/' + provinceName + '/' + city.name +'.json', body, 'utf-8');
            });
        });
    });
});

centralCityFullList.forEach(function (cityName) {
    request(makeDistritSearchUrl({
        keywords: cityName,
        level: 'city'
    }), function (err, response, body) {
        fs.writeFileSync('./tmp/' + cityName +'.json', body, 'utf-8');
    });
});