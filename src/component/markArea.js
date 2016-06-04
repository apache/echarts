define(function (require) {

    require('./marker/MarkAreaModel');
    require('./marker/MarkAreaView');

    require('../echarts').registerPreprocessor(function (opt) {
        // Make sure markArea component is enabled
        opt.markArea = opt.markArea || {};
    });
});