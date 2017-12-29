import * as echarts from '../echarts';

import './funnel/FunnelSeries';
import './funnel/FunnelView';

import dataColor from '../visual/dataColor';
import funnelLayout from './funnel/funnelLayout';
import dataFilter from '../processor/dataFilter';

echarts.registerVisual(dataColor('funnel'));
echarts.registerLayout(funnelLayout);
echarts.registerProcessor(dataFilter('funnel'));