define(function (require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');

    require('./graph/GraphSeries');
    require('./graph/GraphView');

    echarts.registerVisualCoding('chart', zrUtil.curry(
        require('../visual/symbol'), 'graph', 'circle', null
    ));

    echarts.registerLayout(require('./graph/simpleLayout'));
});