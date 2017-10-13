
import './lines/LinesSeries';
import './lines/LinesView';

import echarts from '../echarts';
import linesLayout from './lines/linesLayout';
import linesVisual from './lines/linesVisual';

echarts.registerLayout(linesLayout);
echarts.registerVisual(linesVisual);