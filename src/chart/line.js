define(function (require) {

    require('./line/LineSeries');
    require('./line/LineView');

    require('./line/lineVisual');

    var zrUtil = require('zrender/core/util');
    require('../echarts').registerLayout(zrUtil.curry(
        require('../layout/points'), 'line'
    ));
});