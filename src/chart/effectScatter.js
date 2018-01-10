import * as echarts from '../echarts';

import './effectScatter/EffectScatterSeries';
import './effectScatter/EffectScatterView';

import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';

echarts.registerVisual(visualSymbol('effectScatter', 'circle'));
echarts.registerLayout(layoutPoints('effectScatter'));