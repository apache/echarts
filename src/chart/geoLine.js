define(function (require) {

    require('./geoLine/GeoLineSeries');
    require('./geoLine/GeoLineView');

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');
    echarts.registerLayout(
        require('./geoLine/geoLineLayout')
    );

    echarts.registerVisualCoding(
        'chart', zrUtil.curry(require('../visual/seriesColor'), 'geoLine', 'lineStyle')
    );
});