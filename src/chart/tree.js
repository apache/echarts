import * as echarts from '../echarts';

import './tree/TreeSeries';
import './tree/TreeView';
import './tree/treeAction';

import visualSymbol from '../visual/symbol';
import treeLayout from './tree/treeLayout';

echarts.registerVisual(visualSymbol('tree', 'circle'));
echarts.registerLayout(treeLayout);
