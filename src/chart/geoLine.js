define(function (require) {

    require('./geoLine/GeoLineSeries');
    require('./geoLine/GeoLineView');

    require('../echarts').registerLayout(
        require('./geoLine/geoLineLayout')
    );
});