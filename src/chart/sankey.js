import * as echarts from '../echarts';

import './sankey/SankeySeries';
import './sankey/SankeyView';

import sankeyLayout from './sankey/sankeyLayout';
import sankeyVisual from './sankey/sankeyVisual';

echarts.registerLayout(sankeyLayout);
echarts.registerVisual(sankeyVisual);