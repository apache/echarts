define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./pie/PieSeries');
    require('./pie/PieView');

    echarts.registerVisualCoding('chart', require('./pie/pieVisual'));

    echarts.registerLayout(zrUtil.curry(
        require('../layout/pie'), 'pie'
    ));
});