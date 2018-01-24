import * as echarts from '../echarts';

import './marker/MarkAreaModel';
import './marker/MarkAreaView';

echarts.registerPreprocessor(function (opt) {
    // Make sure markArea component is enabled
    opt.markArea = opt.markArea || {};
});