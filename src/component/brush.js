/**
 * Brush component entry
 */
define(function (require) {

    require('../echarts').registerPreprocessor(
        require('./brush/preprocessor')
    );

    require('./brush/visualEncoding');
    require('./brush/BrushModel');
    require('./brush/BrushView');
    require('./brush/BrushAction');

});