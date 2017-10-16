// HINT Markpoint can't be used too much
import * as echarts from '../echarts';

import './marker/MarkPointModel';
import './marker/MarkPointView';

echarts.registerPreprocessor(function (opt) {
    // Make sure markPoint component is enabled
    opt.markPoint = opt.markPoint || {};
});