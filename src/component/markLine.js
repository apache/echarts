import * as echarts from '../echarts';

import './marker/MarkLineModel';
import './marker/MarkLineView';

echarts.registerPreprocessor(function (opt) {
    // Make sure markLine component is enabled
    opt.markLine = opt.markLine || {};
});