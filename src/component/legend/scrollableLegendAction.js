/**
 * @file Legend action
 */
define(function(require) {

    /**
     * @event legendScroll
     * @type {Object}
     * @property {string} type 'legendScroll'
     * @property {string} scrollDataIndex
     */
    require('../../echarts').registerAction(
        'legendScroll', 'legendscrolled',
        function (payload, ecModel) {
            var scrollDataIndex = payload.scrollDataIndex;
            var legendModel = ecModel.findComponents({mainType: 'legend', subType: 'scroll'})[0];

            if (scrollDataIndex != null && legendModel) {
                legendModel.setScrollDataIndex(scrollDataIndex);
            }
        }
    );
});