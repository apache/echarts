define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./scatter/ScatterSeries');
    require('./scatter/ScatterView');

    echarts.registerVisualCoding('chart', zrUtil.curry(
        require('../visual/symbol'), 'scatter', 'circle', null
    ));
    echarts.registerLayout(zrUtil.curry(
        require('../layout/points'), 'scatter'
    ));
});