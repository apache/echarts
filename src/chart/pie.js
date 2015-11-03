define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./pie/PieSeries');
    require('./pie/PieView');

    echarts.registerVisualCoding(
        'chart',  zrUtil.curry(require('../visual/dataColor'), 'pie')
    );

    echarts.registerLayout(zrUtil.curry(
        require('./pie/pieLayout'), 'pie'
    ));

    echarts.registerProcessor(
        'filter', zrUtil.curry(require('../processor/dataFilter'), 'pie')
    );
});