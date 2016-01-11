define(function (require) {

    var zrUtil = require('zrender/core/util');

    var coordsOffsetMap = {
        '南海诸岛' : [32, 80],
        // 全国
        '广东': [0, -10],
        '香港': [10, 5],
        '澳门': [-10, 10],
        //'北京': [-10, 0],
        '天津': [5, 5]
    };

    return function (geo) {
        zrUtil.each(geo.regions, function (region) {
            var coordFix = coordsOffsetMap[region.name];
            if (coordFix) {
                var cp = region.center;
                cp[0] += coordFix[0] / 10.5;
                cp[1] += -coordFix[1] / (10.5 / 0.75);
            }
        });
    };
});