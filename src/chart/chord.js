define(function (require) {

    require('./chord/ChordSeries');
    require('./chord/ChordView');

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    echarts.registerLayout(require('./chord/chordCircularLayout'));

    echarts.registerVisual(zrUtil.curry(require('../visual/dataColor'), 'chord'));

    echarts.registerProcessor(zrUtil.curry(require('../processor/dataFilter'), 'pie'));
});