import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import '../coord/cartesian/Grid';
import './bar/PictorialBarSeries';
import './bar/PictorialBarView';

import { layout } from '../layout/barGrid';
import visualSymbol from '../visual/symbol';

// In case developer forget to include grid component
import '../component/gridSimple';

echarts.registerLayout(zrUtil.curry(
    layout, 'pictorialBar'
));
echarts.registerVisual(visualSymbol('pictorialBar', 'roundRect'));
