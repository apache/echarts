import * as echarts from '../echarts';

import './treemap/TreemapSeries';
import './treemap/TreemapView';
import './treemap/treemapAction';

import treemapVisual from './treemap/treemapVisual';
import treemapLayout from './treemap/treemapLayout';

echarts.registerVisual(treemapVisual);
echarts.registerLayout(treemapLayout);