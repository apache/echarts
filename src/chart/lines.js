define(function (require) {

    require('./lines/LinesSeries');
    require('./lines/LinesView');

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');
    echarts.registerLayout(
        require('./lines/linesLayout')
    );

    echarts.registerVisual(
        zrUtil.curry(require('../visual/seriesColor'), 'lines', 'lineStyle')
    );
});