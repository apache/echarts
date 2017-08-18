// Fix for 钓鱼岛
define(function (require) {

    var Region = require('../Region');
    var zrUtil = require('zrender/core/util');

    var geoCoord = [126, 25];

    var points = [
        [
            [123.45165252685547, 25.73527164402261],
            [123.49731445312499, 25.73527164402261],
            [123.49731445312499, 25.750734064600884],
            [123.45165252685547, 25.750734064600884],
            [123.45165252685547, 25.73527164402261]
        ]
    ];
    return function (geo) {
        if (geo.map === 'china') {
            for (var i = 0, len = geo.regions.length; i < len; ++i) {
                if (geo.regions[i].name === '台湾') {
                    geo.regions[i].geometries.push({
                        type: 'polygon',
                        exterior: points[0]
                    });
                }
            }
        }
    };
});
