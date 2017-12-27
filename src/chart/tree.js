import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './tree/TreeSeries';
import './tree/TreeView';
import './tree/treeAction';

import visualSymbol from '../visual/symbol';
import orthogonalLayout from './tree/orthogonalLayout';
import radialLayout from './tree/radialLayout';

echarts.registerVisual(visualSymbol('tree', 'circle'));
echarts.registerLayout(orthogonalLayout);
echarts.registerLayout(radialLayout);
