define(function (require) {

    var zrUtil = require('zrender/core/util');

    return function (option) {
        // Save geoCoord
        var mapSeries = [];
        zrUtil.each(option.series, function (seriesOpt) {
            if (seriesOpt.type === 'map') {
                mapSeries.push(seriesOpt);
            }
        });

        zrUtil.each(mapSeries, function (seriesOpt) {
            seriesOpt.map = seriesOpt.map || seriesOpt.mapType;
            // Put x, y, width, height, x2, y2 in the top level
            zrUtil.defaults(seriesOpt, seriesOpt.mapLocation);
        });
    };
});