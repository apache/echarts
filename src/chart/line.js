import * as echarts from '../echarts';

import './line/LineSeries';
import './line/LineView';
import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';
import dataSample from '../processor/dataSample';

// In case developer forget to include grid component
import '../component/gridSimple';

echarts.registerVisual(visualSymbol('line', 'circle', 'line'));
echarts.registerLayout(layoutPoints('line'));

// Down sample after filter
echarts.registerProcessor(
    echarts.PRIORITY.PROCESSOR.STATISTIC,
    dataSample('line')
);
