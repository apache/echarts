import * as echarts from '../../echarts';

/**
 * @event legendScroll
 * @type {Object}
 * @property {string} type 'legendScroll'
 * @property {string} scrollDataIndex
 */
echarts.registerAction(
    'legendScroll', 'legendscroll',
    function (payload, ecModel) {
        var scrollDataIndex = payload.scrollDataIndex;

        scrollDataIndex != null && ecModel.eachComponent(
            {mainType: 'legend', subType: 'scroll', query: payload},
            function (legendModel) {
                legendModel.setScrollDataIndex(scrollDataIndex);
            }
        );
    }
);