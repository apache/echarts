import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './scatter/ScatterSeries';
import './scatter/ScatterView';

import './scatter/StreamScatterSeries';
import './scatter/StreamScatterView';

import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';

// In case developer forget to include grid component
import '../component/gridSimple';

echarts.registerVisual(zrUtil.curry(visualSymbol, 'scatter', 'circle', null));
echarts.registerLayout(zrUtil.curry(layoutPoints, 'scatter'));

echarts.registerVisual(zrUtil.curry(visualSymbol, 'streamScatter', 'circle', null));
echarts.registerLayout(zrUtil.curry(layoutPoints, 'streamScatter'));
