// FIXME Better way to pack data in graphic element
define(function (require) {

    require('./tooltip/TooltipModel');

    require('./tooltip/TooltipView');

    // Show tip action
    /**
     * @action
     * @property {string} type
     * @property {number} seriesIndex
     * @property {number} dataIndex
     * @property {number} [x]
     * @property {number} [y]
     */
    require('../echarts').registerAction(
        {
            type: 'showTip',
            event: 'showTip',
            update: 'tooltip:manuallyShowTip'
        },
        // noop
        function () {}
    );
    // Hide tip action
    require('../echarts').registerAction(
        {
            type: 'hideTip',
            event: 'hideTip',
            update: 'tooltip:manuallyHideTip'
        },
        // noop
        function () {}
    );
});