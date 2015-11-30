var fs = require('fs');
var compress = require('./compress');
var simplify = require('./simplify');
var pinyin = require('pinyin');

var jsTplStr = fs.readFileSync('./jsTpl.js', 'utf-8');

var provinceList = ['台湾', '河北', '山西', '内蒙古', '辽宁', '吉林','黑龙江',  '江苏', '浙江', '安徽', '福建', '江西', '山东','河南', '湖北', '湖南', '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'];

var provinceFullList = ['台湾省', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省','黑龙江省',  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省','河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省', '四川省', '贵州省', '云南省', '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'];

var centralCityFullList = ['北京市', '天津市', '上海市', '重庆市', '香港特别行政区', '澳门特别行政区'
];

var centralCityList = ['北京', '天津', '上海', '重庆', '香港', '澳门'];


// var provinceShortFullMap = provinceList.reduce(function (obj, val, idx) {
//     return (obj[val] = provinceFullList[idx]);
// }, {});
var provinceFullShortMap = provinceFullList.reduce(function (obj, val, idx) {
    obj[val] = provinceList[idx];
    return obj;
}, {});
var centralCityFullShortMap = centralCityFullList.reduce(function (obj, val, idx) {
    obj[val] = centralCityList[idx];
    return obj;
}, {});

function polygonArea(pts) {
    var area = 0;
    for (var i = pts.length - 1, j = 0; j < pts.length;) {
        var pt0 = pts[0];
        var pt1 = pts[1];
        i = j;
        j++;
        area += pt0[0] * pt1[1] - pt1[0] * pt0[1];
    }
    return Math.abs(area);
}

function makeFeature(district, minArea, simplifyRatio) {
    var boundaries = district.polyline.split('|').map(function (str) {
        return str.split(';').map(function (strPt) {
            var pt = strPt.split(',');
            return [+pt[0], +pt[1]];
        });
    }).map(function (polygon) {
        return simplify(polygon, simplifyRatio, true);
    }).filter(function (polygon) {
        // Remove small area isload
        return polygonArea(polygon) > minArea;
    });
    if (district.name === '海南省') {
        var maxArea = 0;
        var maxAreaPolygon;
        for (var i = 0; i < boundaries.length; i++) {
            var area = polygonArea(boundaries[i]);
            if (area > maxArea) {
                maxArea = area;
                maxAreaPolygon = boundaries[i];
            }
        }
        // 去除南海诸岛
        boundaries = [maxAreaPolygon];
    }
    var feature = {
        id: district.adcode,
        geometry: {
            type: boundaries.length > 1 ? 'MultiPolygon' : 'Polygon',
            coordinates: boundaries.length > 1 ? [boundaries] : boundaries
        },
        properties: {
            cp: district.center.split(',').map(function (a) {return +a;}),
            name: centralCityFullShortMap[district.name]
                || provinceFullShortMap[district.name] || district.name,
            childNum: boundaries.length
        }
    };

    return feature;
}


function readProvince(provinceName) {
    return JSON.parse(fs.readFileSync('./tmp/' + provinceName + '.json', 'utf-8'));
}

function readCity(provinceName, cityName) {
    return JSON.parse(fs.readFileSync('./tmp/' + provinceName + '/' + cityName + '.json', 'utf-8'));
}

function makeChina() {
    var geoJson = {
        type: 'FeatureCollection',
        features: provinceFullList.map(function (provinceName) {
        var json = readProvince(provinceName);
            return makeFeature(json.districts[0], 7, 0.015);
        })
    };
    geoJson.features = geoJson.features.concat(centralCityFullList.map(function (cityName) {
        var json = readProvince(cityName);
        return makeFeature(json.districts[0], 7, 0.015);
    }));
    var jsonStr = JSON.stringify(compress(geoJson));
    fs.writeFileSync(
        '../json/china.json',
        jsonStr,
        'utf-8'
    );
    fs.writeFileSync(
        '../js/china.js',
        jsTplStr.replace('{{name}}', 'china')
            .replace('{{data}}', jsonStr),
        'utf-8'
    );
}

function makeProvince(provinceName) {

    var provinceDetail = readProvince(provinceName);

    var geoJson = {
        type: 'FeatureCollection',
        features: provinceDetail.districts[0].districts.map(function (city) {
            var cityCode = city.citycode;
            var cityDetail = readCity(provinceName, city.name);
            return makeFeature(cityDetail.districts.filter(function (distrct) {
                return distrct.citycode === cityCode;
            })[0], 0, 0.0005);
        })
    };

    var jsonStr = JSON.stringify(compress(geoJson));
    var pinyinName = pinyin(provinceFullShortMap[provinceName], {
        // heteronym: true,
        style: pinyin.STYLE_NORMAL
    }).join('');
    fs.writeFileSync(
        '../json/province/' + pinyinName + '.json',
        jsonStr,
        'utf-8'
    );

    fs.writeFileSync(
        '../js/province/' + pinyinName + '.js',
        jsTplStr.replace('{{name}}', provinceFullShortMap[provinceName])
            .replace('{{data}}', jsonStr),
        'utf-8'
    );
}

makeChina();

provinceFullList.forEach(function (provinceName) {
    if (provinceName === '台湾省') {
        return;
    }
    console.log('Generating ' + provinceName);
    makeProvince(provinceName);
});

var worldNameMap = {
    // 'United States': 'United States of America',
    // 'Côte d\'Ivoire': 'Ivory Coast',
    // 'Central African Rep.': 'Central African Republic',
    // 'S. Sudan': 'South Sudan',
    // 'Dem. Rep. Congo': 'Democratic Republic of the Congo',
    'Republic of Congo': 'Republic of the Congo'
};
// World
var worldGeo = JSON.parse(fs.readFileSync('./world/tmp/world.json', 'utf-8'));
var taiwanFeature;
var chinaFeature;
worldGeo.features = worldGeo.features.filter(function (feature) {
    if (feature.properties && feature.properties.name === 'Taiwan') {
        taiwanFeature = feature;
        return false;
    }
    if (feature.properties && feature.properties.name === 'China') {
        chinaFeature = feature;
    }
    return feature.geometry && feature.properties
        && feature.properties.name !== 'Antarctica';
}).map(function (feature) {
    var res = {
        geometry: {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates
        },
        properties: {
            name: worldNameMap[feature.properties.sovereignt]
                || feature.properties.sovereignt,
            childNum: feature.geometry.coordinates.length
       }
    };
    if (feature.properties.cp) {
        res.properties.cp = feature.properties.cp;
    }
    return res;
});

if (taiwanFeature) {
    chinaFeature.geometry.coordinates.push(taiwanFeature.geometry.coordinates);
    chinaFeature.properties.childNum++;
}

var worldGeoStr = JSON.stringify(worldGeo);
fs.writeFileSync('../json/world.json', worldGeoStr , 'utf-8');
fs.writeFileSync(
    '../js/world.js',
    jsTplStr.replace('{{name}}', 'world')
        .replace('{{data}}', worldGeoStr),
    'utf-8'
);