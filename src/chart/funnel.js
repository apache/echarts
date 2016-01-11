define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./funnel/FunnelSeries');
    require('./funnel/FunnelView');

    echarts.registerVisualCoding(
        'chart',  zrUtil.curry(require('../visual/dataColor'), 'funnel')
    );
    echarts.registerLayout(require('./funnel/funnelLayout'));

    echarts.registerProcessor(
        'filter', zrUtil.curry(require('../processor/dataFilter'), 'funnel')
    );
});