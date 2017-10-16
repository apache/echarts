import * as echarts from '../echarts';
import {util as zrUtil} from 'zrender';

import './funnel/FunnelSeries';
import './funnel/FunnelView';

import dataColor from '../visual/dataColor';
import funnelLayout from './funnel/funnelLayout';
import dataFilter from '../processor/dataFilter';

echarts.registerVisual(zrUtil.curry(dataColor, 'funnel'));
echarts.registerLayout(funnelLayout);
echarts.registerProcessor(zrUtil.curry(dataFilter, 'funnel'));