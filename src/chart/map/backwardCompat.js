import * as zrUtil from 'zrender/src/core/util';

export default function (option) {
    // Save geoCoord
    var mapSeries = [];
    zrUtil.each(option.series, function (seriesOpt) {
        if (seriesOpt && seriesOpt.type === 'map') {
            mapSeries.push(seriesOpt);
            seriesOpt.map = seriesOpt.map || seriesOpt.mapType;
            // Put x, y, width, height, x2, y2 in the top level
            zrUtil.defaults(seriesOpt, seriesOpt.mapLocation);
        }
    });
}