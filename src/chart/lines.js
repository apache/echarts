import * as echarts from '../echarts';

import './lines/LinesSeries';
import './lines/LinesView';

import linesLayout from './lines/linesLayout';
import linesVisual from './lines/linesVisual';

echarts.registerLayout(linesLayout);
echarts.registerVisual(linesVisual);