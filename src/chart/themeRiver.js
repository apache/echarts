import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import '../component/singleAxis';
import './themeRiver/ThemeRiverSeries';
import './themeRiver/ThemeRiverView';

import themeRiverLayout from './themeRiver/themeRiverLayout';
import themeRiverVisual from './themeRiver/themeRiverVisual';
import dataFilter from '../processor/dataFilter';

echarts.registerLayout(themeRiverLayout);
echarts.registerVisual(themeRiverVisual);
echarts.registerProcessor(zrUtil.curry(dataFilter, 'themeRiver'));