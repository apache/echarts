/**
 * DataZoom component entry
 */

require('../echarts').registerPreprocessor(
    require('./visualMap/preprocessor')
);

require('./visualMap/typeDefaulter');
require('./visualMap/visualEncoding');
require('./visualMap/ContinuousModel');
require('./visualMap/ContinuousView');
require('./visualMap/visualMapAction');
