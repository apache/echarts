import * as echarts from '../echarts';
import {util as zrUtil} from 'zrender';

import './scatter/ScatterSeries';
import './scatter/ScatterView';

import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';

// In case developer forget to include grid component
import '../component/gridSimple';

echarts.registerVisual(zrUtil.curry(visualSymbol, 'scatter', 'circle', null));
echarts.registerLayout(zrUtil.curry(layoutPoints, 'scatter'));
