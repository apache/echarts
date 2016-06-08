define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./scatter/ScatterSeries');
    require('./scatter/ScatterView');

    echarts.registerVisual(zrUtil.curry(
        require('../visual/symbol'), 'scatter', 'circle', null
    ));
    echarts.registerLayout(zrUtil.curry(
        require('../layout/points'), 'scatter'
    ));

    // In case developer forget to include grid component
    require('../component/grid');
});