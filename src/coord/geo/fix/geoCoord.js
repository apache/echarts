import * as zrUtil from 'zrender/src/core/util';

var geoCoordMap = {
    'Russia': [100, 60],
    'United States': [-99, 38],
    'United States of America': [-99, 38]
};

export default function (geo) {
    zrUtil.each(geo.regions, function (region) {
        var geoCoord = geoCoordMap[region.name];
        if (geoCoord) {
            var cp = region.center;
            cp[0] = geoCoord[0];
            cp[1] = geoCoord[1];
        }
    });
}