// HINT Markpoint can't be used too much
define(function (require) {

    require('./marker/MarkPointModel');
    require('./marker/MarkPointView');

    require('../echarts').registerPreprocessor(function (opt) {
        // Make sure markPoint component is enabled
        opt.markPoint = opt.markPoint || {};
    });
});