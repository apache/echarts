
import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

// Must use radar component
import '../component/radar';
import './radar/RadarSeries';
import './radar/RadarView';

import dataColor from '../visual/dataColor';
import visualSymbol from '../visual/symbol';
import radarLayout from './radar/radarLayout';
import dataFilter from '../processor/dataFilter';
import backwardCompat from './radar/backwardCompat';

echarts.registerVisual(zrUtil.curry(dataColor, 'radar'));
echarts.registerVisual(zrUtil.curry(visualSymbol, 'radar', 'circle', null));
echarts.registerLayout(radarLayout);
echarts.registerProcessor(zrUtil.curry(dataFilter, 'radar'));
echarts.registerPreprocessor(backwardCompat);