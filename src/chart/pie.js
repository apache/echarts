import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './pie/PieSeries';
import './pie/PieView';

import createDataSelectAction from '../action/createDataSelectAction';
import dataColor from '../visual/dataColor';
import pieLayout from './pie/pieLayout';
import dataFilter from '../processor/dataFilter';

createDataSelectAction('pie', [{
    type: 'pieToggleSelect',
    event: 'pieselectchanged',
    method: 'toggleSelected'
}, {
    type: 'pieSelect',
    event: 'pieselected',
    method: 'select'
}, {
    type: 'pieUnSelect',
    event: 'pieunselected',
    method: 'unSelect'
}]);

echarts.registerVisual(dataColor('pie'));
echarts.registerLayout(zrUtil.curry(pieLayout, 'pie'));
echarts.registerProcessor(dataFilter('pie'));