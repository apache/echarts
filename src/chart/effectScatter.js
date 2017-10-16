import * as echarts from '../echarts';
import {util as zrUtil} from 'zrender';

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