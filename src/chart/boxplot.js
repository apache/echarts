import * as echarts from '../echarts';
import './boxplot/BoxplotSeries';
import './boxplot/BoxplotView';
import boxplotVisual from './boxplot/boxplotVisual';
import boxplotLayout from './boxplot/boxplotLayout';

echarts.registerVisual(boxplotVisual);
echarts.registerLayout(boxplotLayout);
