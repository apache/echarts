import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './effectScatter/EffectScatterSeries';
import './effectScatter/EffectScatterView';

import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';

echarts.registerVisual(zrUtil.curry(
    visualSymbol, 'effectScatter', 'circle', null
));
echarts.registerLayout(zrUtil.curry(
    layoutPoints, 'effectScatter'
));