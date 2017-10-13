import {util as zrUtil} from 'zrender';
import '../coord/cartesian/Grid';
import './bar/BarSeries';
import './bar/BarView';

import barLayoutGrid from '../layout/barGrid';
import echarts from '../echarts';

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
