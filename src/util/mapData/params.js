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
                
                if (feature.geometry.type === 'Polygon') {
                    coordinates[c] = decodePolygon(
                        coordinate,
                        encodeOffsets[c]
                    );
                } else if (feature.geometry.type === 'MultiPolygon') {
                    for (var c2 = 0; c2 < coordinate.length; c2++) {
                        var polygon = coordinate[c2];
                        coordinate[c2] = decodePolygon(
                            polygon,
                            encodeOffsets[c][c2]
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
            var x = coordinate.charCodeAt(i) - 64;
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
        'world': {
            getData: function(callback) { 
                require(['./geoJson/world.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        'china': {
            getData: function(callback) { 
                require(['./geoJson/china.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '新疆': {
            getData: function(callback) { 
                require(['./geoJson/xin_jiang.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '西藏': {
            getData: function(callback) { 
                require(['./geoJson/xi_zang.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '内蒙古': {
            getData: function(callback) { 
                require(['./geoJson/nei_meng_gu.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '青海': {
            getData: function(callback) { 
                require(['./geoJson/qing_hai.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '四川': {
            getData: function(callback) { 
                require(['./geoJson/si_chuan.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '黑龙江': {
            getData: function(callback) { 
                require(['./geoJson/hei_long_jiang.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '甘肃': {
            getData: function(callback) { 
                require(['./geoJson/gan_su.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '云南': {
            getData: function(callback) { 
                require(['./geoJson/yun_nan.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '广西': {
            getData: function(callback) { 
                require(['./geoJson/guang_xi.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '湖南': {
            getData: function(callback) { 
                require(['./geoJson/hu_nan.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '陕西': {
            getData: function(callback) { 
                require(['./geoJson/shan_xi_1.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '广东': {
            getData: function(callback) { 
                require(['./geoJson/guang_dong.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '吉林': {
            getData: function(callback) { 
                require(['./geoJson/ji_lin.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '河北': {
            getData: function(callback) { 
                require(['./geoJson/he_bei.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '湖北': {
            getData: function(callback) { 
                require(['./geoJson/hu_bei.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '贵州': {
            getData: function(callback) { 
                require(['./geoJson/gui_zhou.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '山东': {
            getData: function(callback) { 
                require(['./geoJson/shan_dong.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '江西': {
            getData: function(callback) { 
                require(['./geoJson/jiang_xi.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '河南': {
            getData: function(callback) { 
                require(['./geoJson/he_nan.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '辽宁': {
            getData: function(callback) { 
                require(['./geoJson/liao_ning.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '山西': {
            getData: function(callback) { 
                require(['./geoJson/shan_xi_2.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '安徽': {
            getData: function(callback) { 
                require(['./geoJson/an_hui.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '福建': {
            getData: function(callback) { 
                require(['./geoJson/fu_jian.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '浙江': {
            getData: function(callback) { 
                require(['./geoJson/zhe_jiang.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '江苏': {
            getData: function(callback) { 
                require(['./geoJson/jiang_su.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '重庆': {
            getData: function(callback) { 
                require(['./geoJson/chong_qing.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '宁夏': {
            getData: function(callback) { 
                require(['./geoJson/ning_xia.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '海南': {
            getData: function(callback) { 
                require(['./geoJson/hai_nan.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '台湾': {
            getData: function(callback) { 
                require(['./geoJson/tai_wan.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '北京': {
            getData: function(callback) { 
                require(['./geoJson/bei_jing.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '天津': {
            getData: function(callback) { 
                require(['./geoJson/tian_jin.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '上海': {
            getData: function(callback) { 
                require(['./geoJson/shang_hai.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '香港': {
            getData: function(callback) { 
                require(['./geoJson/xiang_gang.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        },
        '澳门': {
            getData: function(callback) { 
                require(['./geoJson/ao_men.geo.js'], function(md){
                    callback(decode(md));
                });
            }
        }
    };
});