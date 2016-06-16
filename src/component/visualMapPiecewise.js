/**
 * DataZoom component entry
 */
define(function (require) {

    require('../echarts').registerPreprocessor(
        require('./visualMap/preprocessor')
    );

    require('./visualMap/typeDefaulter');
    require('./visualMap/visualEncoding');
    require('./visualMap/PiecewiseModel');
    require('./visualMap/PiecewiseView');
    require('./visualMap/visualMapAction');

});