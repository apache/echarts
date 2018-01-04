import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './sunburst/SunburstSeries';
import './sunburst/SunburstView';
import './sunburst/sunburstAction';

import dataColor from '../visual/dataColor';
import sunburstLayout from './sunburst/sunburstLayout';
import dataFilter from '../processor/dataFilter';

echarts.registerVisual(zrUtil.curry(dataColor, 'sunburst'));
echarts.registerLayout(zrUtil.curry(sunburstLayout, 'sunburst'));
echarts.registerProcessor(zrUtil.curry(dataFilter, 'sunburst'));
