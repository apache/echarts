/**
 * DataZoom component entry
 */
define(function (require) {

    var echarts = require('../echarts');

    echarts.registerPreprocessor(require('./timeline/preprocessor'));

    require('./timeline/typeDefaulter');
    require('./timeline/timelineAction');
    require('./timeline/SliderTimelineModel');
    require('./timeline/SliderTimelineView');

});