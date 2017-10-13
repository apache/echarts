import echarts from '../echarts';
import {util as zrUtil} from 'zrender';

import './tree/TreeSeries';
import './tree/TreeView';
import './tree/treeAction';

import visualSymbol from '../visual/symbol';
import orthogonalLayout from './tree/orthogonalLayout';
import radialLayout from './tree/radialLayout';

echarts.registerVisual(zrUtil.curry(visualSymbol, 'tree', 'circle', null));
echarts.registerLayout(orthogonalLayout);
echarts.registerLayout(radialLayout);
