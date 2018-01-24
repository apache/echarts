// FIXME Better way to pack data in graphic element

import * as echarts from '../echarts';

import './axisPointer';
import './tooltip/TooltipModel';
import './tooltip/TooltipView';


/**
 * @action
 * @property {string} type
 * @property {number} seriesIndex
 * @property {number} dataIndex
 * @property {number} [x]
 * @property {number} [y]
 */
echarts.registerAction(
    {
        type: 'showTip',
        event: 'showTip',
        update: 'tooltip:manuallyShowTip'
    },
    // noop
    function () {}
);

echarts.registerAction(
    {
        type: 'hideTip',
        event: 'hideTip',
        update: 'tooltip:manuallyHideTip'
    },
    // noop
    function () {}
);