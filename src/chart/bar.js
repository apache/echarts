import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import {layout, largeLayout} from '../layout/barGrid';

import '../coord/cartesian/Grid';
import './bar/BarSeries';
import './bar/BarView';
// In case developer forget to include grid component
import '../component/gridSimple';


echarts.registerLayout(zrUtil.curry(layout, 'bar'));
// Should after normal bar layout, otherwise it is blocked by normal bar layout.
echarts.registerLayout(largeLayout);

echarts.registerVisual({
    seriesType: 'bar',
    reset: function (seriesModel) {
        // Visual coding for legend
        seriesModel.getData().setVisual('legendSymbol', 'roundRect');
    }
});
