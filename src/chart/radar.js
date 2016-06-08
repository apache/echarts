define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    // Must use radar component
    require('../component/radar');

    require('./radar/RadarSeries');
    require('./radar/RadarView');

    echarts.registerVisual(zrUtil.curry(require('../visual/dataColor'), 'radar'));
    echarts.registerVisual(zrUtil.curry(
        require('../visual/symbol'), 'radar', 'circle', null
    ));
    echarts.registerLayout(require('./radar/radarLayout'));

    echarts.registerProcessor(
        zrUtil.curry(require('../processor/dataFilter'), 'radar')
    );

    echarts.registerPreprocessor(require('./radar/backwardCompat'));
});