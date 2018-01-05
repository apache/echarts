import * as echarts from '../echarts';

import './graph/GraphSeries';
import './graph/GraphView';
import './graph/graphAction';

import categoryFilter from './graph/categoryFilter';
import visualSymbol from '../visual/symbol';
import categoryVisual from './graph/categoryVisual';
import edgeVisual from './graph/edgeVisual';
import simpleLayout from './graph/simpleLayout';
import circularLayout from './graph/circularLayout';
import forceLayout from './graph/forceLayout';
import createView from './graph/createView';

echarts.registerProcessor(categoryFilter);

echarts.registerVisual(visualSymbol('graph', 'circle', null));
echarts.registerVisual(categoryVisual);
echarts.registerVisual(edgeVisual);

echarts.registerLayout(simpleLayout);
echarts.registerLayout(circularLayout);
echarts.registerLayout(forceLayout);

// Graph view coordinate system
echarts.registerCoordinateSystem('graphView', {
    create: createView
});