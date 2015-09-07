define(function (require) {

    var zrUtil = require('zrender/core/util');

    require('./scatter/scatterVisual');

    require('./scatter/ScatterSeries');
    require('./scatter/ScatterView');

    require('../echarts').registerLayout(zrUtil.curry(
        require('../layout/points'), 'scatter'
    ));
});