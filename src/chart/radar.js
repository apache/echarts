
import * as echarts from '../echarts';

// Must use radar component
import '../component/radar';
import './radar/RadarSeries';
import './radar/RadarView';

import dataColor from '../visual/dataColor';
import visualSymbol from '../visual/symbol';
import radarLayout from './radar/radarLayout';
import dataFilter from '../processor/dataFilter';
import backwardCompat from './radar/backwardCompat';

echarts.registerVisual(dataColor('radar'));
echarts.registerVisual(visualSymbol('radar', 'circle'));
echarts.registerLayout(radarLayout);
echarts.registerProcessor(dataFilter('radar'));
echarts.registerPreprocessor(backwardCompat);