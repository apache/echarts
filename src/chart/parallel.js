import * as echarts from '../echarts';
import '../component/parallel';
import './parallel/ParallelSeries';
import './parallel/ParallelView';
import parallelVisual from './parallel/parallelVisual';

echarts.registerVisual(parallelVisual);
