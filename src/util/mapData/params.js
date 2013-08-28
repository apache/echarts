/**
 * 地图参数
 * key为地图类型: {
 *     loc: 中心位置
 *     box: 保卫盒子，缩放参照系
 *     getData: 地图数据加载
 * } 
 */
define(function(require) {
    function decode(json){
        if (!json.UTF8Encoding) {
            return json;
        }
        var features = json.features;

        for (var f = 0; f < features.length; f++) {
            var feature = features[f];
            var coordinates = feature.geometry.coordinates;
            var encodeOffsets = feature.geometry.encodeOffsets;

            for (var c = 0; c < coordinates.length; c++) {
                var coordinate = coordinates[c];
                
                if (feature.geometry.type === "Polygon") {
                    coordinates[c] = decodePolygon(
                        coordinate,
                        feature.geometry.encodeOffsets[c]
                    );
                } else if (feature.geometry.type === "MultiPolygon") {
                    for (var c2 = 0; c2 < coordinate.length; c2++) {
                        var polygon = coordinate[c2];
                        coordinate[c2] = decodePolygon(
                            polygon,
                            feature.geometry.encodeOffsets[c][c2]
                        );
                    }
                }
            }
        }
        // Has been decoded
        json.UTF8Encoding = false;
        return json;
    }

    function decodePolygon(coordinate, encodeOffsets) {
        var result = [];
        var prevX = encodeOffsets[0];
        var prevY = encodeOffsets[1];

        for (var i = 0; i < coordinate.length; i+=2) {
            var x = coordinate.charCodeAt(i) - 64
            var y = coordinate.charCodeAt(i+1) - 64;
            // ZigZag decoding
            x = (x >> 1) ^ (-(x & 1));
            y = (y >> 1) ^ (-(y & 1));
            // Delta deocding
            x += prevX;
            y += prevY;

            prevX = x;
            prevY = y;
            // Dequantize
            result.push([x / 1024, y / 1024]);
        }

        return result;
    }

    //box is x, y, width, height when projection scale is 4000
    return {
        'china': {
            loc: [102, 36.7],
            box: [
                -1174.6445229087194, -1437.3577680805693,
                3039.3970214233723, 2531.19589698184
            ],
            getData: function() { 
                return decode(require('./china/0_unicode')); 
            }
        },
        '新疆': {
            loc: [84.9023, 41.748],
            box: [
                -1174.9404317915883, -1136.0130934711678,
                1216.4169237052663, 939.4360818385251
            ],
            getData: function() { return decode(require('./china/65_unicode')); }
        },
        '西藏': {
            loc: [88.7695, 31.6846],
            box: [
                -1061.2905098655508, -273.40253896102865,
                1182.4138890465167, 728.4762434212385
            ],
            getData: function() { return decode(require('./china/54_unicode')); }
        },
        '内蒙古': {
            loc: [110.5977, 45.3408], // [117.5977, 44.3408]
            box: [
                81.92106433333947, -1404.5655158641246,
                1337.913665139638, 1168.7030286278964
            ],
            getData: function() { return decode(require('./china/15_unicode')); }
        },
        '青海': {
            loc: [96.2402, 35.4199],
            box: [
                -398.0407413665446, -404.86540158240564,
                770.5429460357634, 553.4881569694239
            ],
            getData: function() { return decode(require('./china/63_unicode')); }
        },
        '四川': {
            loc: [102.9199, 30.1904],
            box: [
                34.77351011413543, -24.727858097581816,
                654.265749584143, 581.5837904142871
            ],
            getData: function() { return decode(require('./china/51_unicode')); }
        },
        '黑龙江': {
            loc: [128.1445, 48.5156],
            box: [
                1185.0861642873883, -1435.9087566254907,
                680.9449423479143, 618.3772597960831
            ],
            getData: function() { return decode(require('./china/23_unicode')); }
        },
        '甘肃': {
            loc: [99.7129, 37.866],// [95.7129, 40.166]
            box: [
                -197.5222870378875, -631.2015222269291,
                884.6861134736321, 734.2542202456989
            ],
            getData: function() { return decode(require('./china/62_unicode')); }
        },
        '云南': {
            loc: [101.8652, 25.1807],
            box: [
                -4.030270169151834, 326.89754492870105,
                561.4971786143803, 565.9079094851168
            ],
            getData: function() { return decode(require('./china/53_unicode')); }
        },
        '广西': {
            loc: [108.2813, 23.6426],
            box: [
                444.4355364538484, 524.7911424174906,
                490.6548359068431, 384.1667316158848
            ],
            getData: function() { return decode(require('./china/45_unicode')); }
        },
        '湖南': {
            loc: [111.5332, 27.3779],
            box: [
                716.7125751678784, 265.3988842488122,
                346.1702652872375, 377.50144051998274
            ],
            getData: function() { return decode(require('./china/43_unicode')); }
        },
        '陕西': {
            loc: [108.5996, 35.6396], // [109.5996, 35.6396]
            box: [
                508.5948583446903, -399.56997062473215,
                321.038690321553, 559.1002147021181
            ],
            getData: function() { return decode(require('./china/61_unicode')); }
        },
        '广东': {
            loc: [113.4668, 22.8076],
            box: [
                790.2032875493967, 572.9640361040085,
                494.8279567104971, 388.7112686526252
            ],
            getData: function() { return decode(require('./china/44_unicode')); }
        },
        '吉林': {
            loc: [126.4746, 43.5938],
            box: [
                1287.5729431804648, -950.943295028444,
                504.33243011403374, 354.162667814153
            ],
            getData: function() { return decode(require('./china/22_unicode')); }
        },
        '河北': {
            loc: [115.4004, 39.3688], //[115.4004, 37.9688]
            box: [
                940.0156020671719, -646.4007207319194,
                325.33903805510784, 477.4542727272415
            ],
            getData: function() { return decode(require('./china/13_unicode')); }
        },
        '湖北': {
            loc: [112.2363, 31.1572],
            box: [
                683.8325394595918, 45.82949601748078,
                468.66717545627034, 295.2142095820616
            ],
            getData: function() { return decode(require('./china/42_unicode')); }
        },
        '贵州': {
            loc: [106.6113, 26.9385],
            box: [
                392.5021834497175, 337.4483828727408,
                375.50579966539516, 320.9420464446699
            ],
            getData: function() { return decode(require('./china/52_unicode')); }
        },
        '山东': {
            loc: [118.7402, 36.4307],
            box: [
                1035.7855473594757, -382.19242168799906,
                412.5747391303373, 313.152767793266
            ],
            getData: function() { return decode(require('./china/37_unicode')); }
        },
        '江西': {
            loc: [116.0156, 27.29],
            box: [
                1012.6841751377355, 236.50140310944056,
                295.599802392515, 400.86430917822287
            ],
            getData: function() { return decode(require('./china/36_unicode')); }
        },
        '河南': {
            loc: [113.4668, 33.8818],
            box: [
                785.5419798731749, -185.2911232263814,
                362.6977821251186, 340.3902676066224
            ],
            getData: function() { return decode(require('./china/41_unicode')); }
        },
        '辽宁': {
            loc: [122.3438, 41.0889],
            box: [
                1203.0641741691293, -757.0946871553339,
                352.71788824534656, 357.71276541155214
            ],
            getData: function() { return decode(require('./china/21_unicode')); }
        },
        '山西': {
            loc: [112.4121, 37.6611],
            box: [
                776.5185040689469, -493.6204506126494,
                212.68572802329425, 448.08485211774945
            ],
            getData: function() { return decode(require('./china/14_unicode')); }
        },
        '安徽': {
            loc: [117.2461, 32.0361],
            box: [
                1054.014965660052, -80.43770626104327,
                295.73127466484925, 352.03731065611606
            ],
            getData: function() { return decode(require('./china/34_unicode')); }
        },
        '福建': {
            loc: [118.3008, 25.9277],
            box: [
                1172.0955040211252, 341.81292779438445,
                288.99462739279807, 339.42845011348845
            ],
            getData: function() { return decode(require('./china/35_unicode')); }
        },
        '浙江': {
            loc: [120.498, 29.0918],
            box: [
                1272.1789620983063, 123.46272678646208,
                286.17816622252326, 286.73860446060394
            ],
            getData: function() { return decode(require('./china/33_unicode')); }
        },
        '江苏': {
            loc: [119.0586, 32.915], // [120.0586, 32.915]
            box: [
                1125.161343490302, -134.97368204682834,
                356.1806346879009, 291.4961628010442
            ],
            getData: function() { return decode(require('./china/32_unicode')); }
        },
        '重庆': {
            loc: [107.7539, 30.1904],
            box: [
                497.78832088614774, 127.0051229616378,
                291.91221530072164, 280.8880182020781
            ],
            getData: function() { return decode(require('./china/50_unicode')); }
        },
        '宁夏': {
            loc: [105.9961, 37.3096],
            box: [
                441.193675072408, -376.31946967355213,
                183.76989823787306, 293.0024551112753
            ],
            getData: function() { return decode(require('./china/64_unicode')); }
        },
        '海南': {
            loc: [109.9512, 19.2041],
            box: [
                723.8031601361929, 946.050886515855,
                183.33374783084207, 147.66048518654895
            ],
            getData: function() { return decode(require('./china/46_unicode')); }
        },
        '台湾': {
            loc: [120.7254, 23.5986], //[121.0254, 23.5986]
            box: [
                1459.925544038912, 519.7445429876257,
                103.06085087505835, 237.80851484008463
            ],
            getData: function() { return decode(require('./china/71_unicode')); }
        },
        '北京': {
            loc: [116.4551, 40.2539],
            box: [
                1031.6052083127613, -530.1928574952913,
                103.23943439987329, 114.66079087790081
            ],
            getData: function() { return decode(require('./china/11_unicode')); }
        },
        '天津': {
            loc: [117.2219, 39.4189], //[117.4219, 39.4189]
            box: [
                1106.9649995752443, -479.16508616378724,
                71.21176554916747, 120.01987096046025
            ],
            getData: function() { return decode(require('./china/12_unicode')); }
        },
        '上海': {
            loc: [121.4648, 31.2891],
            box: [
                1420.334836525578, 71.79837578328207,
                70.41721601016525, 81.99461244072737
            ],
            getData: function() { return decode(require('./china/31_unicode')); }
        },
        '香港': {
            loc: [114.2578, 22.3242],
            box: [
                1061.983645387268, 769.0837862603122,
                50.65584483626753, 32.17422147262721
            ],
            getData: function() { return decode(require('./china/81_unicode')); }
        },
        '澳门': {
            loc: [113.5547, 22.1604], //[113.5547, 22.1484]
            box: [
                1043.1350056914507, 798.0786255550063,
                5.387452843479423, 7.564113979470676
            ],
            getData: function() { return decode(require('./china/82_unicode')); }
        }
    };
});