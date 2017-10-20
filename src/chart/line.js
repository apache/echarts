import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './line/LineSeries';
import './line/LineView';
import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';
import dataSample from '../processor/dataSample';

// In case developer forget to include grid component
import '../component/gridSimple';

echarts.registerVisual(zrUtil.curry(
    visualSymbol, 'line', 'circle', 'line'
));
echarts.registerLayout(zrUtil.curry(
    layoutPoints, 'line'
));

// Down sample after filter
echarts.registerProcessor(echarts.PRIORITY.PROCESSOR.STATISTIC, zrUtil.curry(
    dataSample, 'line'
));
