import * as echarts from '../echarts';
import {util as zrUtil} from 'zrender';
import barLayoutGrid from '../layout/barGrid';

import '../coord/cartesian/Grid';
import './bar/BarSeries';
import './bar/BarView';
// In case developer forget to include grid component
import '../component/gridSimple';


echarts.registerLayout(zrUtil.curry(barLayoutGrid, 'bar'));

// Visual coding for legend
echarts.registerVisual(function (ecModel) {
    ecModel.eachSeriesByType('bar', function (seriesModel) {
        var data = seriesModel.getData();
        data.setVisual('legendSymbol', 'roundRect');
    });
});
