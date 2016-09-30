/**
 * @file Timeilne action
 */
define(function(require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');

    echarts.registerAction(

        {type: 'timelineChange', event: 'timelineChanged', update: 'prepareAndUpdate'},

        function (payload, ecModel) {

            var timelineModel = ecModel.getComponent('timeline');
            if (timelineModel && payload.currentIndex != null) {
                timelineModel.setCurrentIndex(payload.currentIndex);

                if (!timelineModel.get('loop', true) && timelineModel.isIndexMax()) {
                    timelineModel.setPlayState(false);
                }
            }

            // Set normalized currentIndex to payload.
            ecModel.resetOption('timeline');

            return zrUtil.defaults({
                currentIndex: timelineModel.option.currentIndex
            }, payload);
        }
    );

    echarts.registerAction(

        {type: 'timelinePlayChange', event: 'timelinePlayChanged', update: 'update'},

        function (payload, ecModel) {
            var timelineModel = ecModel.getComponent('timeline');
            if (timelineModel && payload.playState != null) {
                timelineModel.setPlayState(payload.playState);
            }
        }
    );

});