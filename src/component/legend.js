
// Do not contain scrollable legend, for sake of file size.

import * as echarts from '../echarts';

import './legend/LegendModel';
import './legend/legendAction';
import './legend/LegendView';

import legendFilter from './legend/legendFilter';
import Component from '../model/Component';

// Series Filter
echarts.registerProcessor(legendFilter);

Component.registerSubTypeDefaulter('legend', function () {
    // Default 'plain' when no type specified.
    return 'plain';
});
