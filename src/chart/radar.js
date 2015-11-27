define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./radar/RadarSeries');
    require('./radar/RadarView');

    echarts.registerVisualCoding('chart', zrUtil.curry(
        require('../visual/symbol'), 'radar', 'circle', null
    ));
    echarts.registerLayout(zrUtil.curry(
        require('../layout/points'), 'radar'
    ));

    echarts.registerPreprocessor(require('./radar/backwardCompat'));
});