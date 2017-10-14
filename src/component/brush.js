/**
 * Brush component entry
 */

require('../echarts').registerPreprocessor(
    require('./brush/preprocessor')
);

require('./brush/visualEncoding');
require('./brush/BrushModel');
require('./brush/BrushView');
require('./brush/brushAction');

require('./toolbox/feature/Brush');
