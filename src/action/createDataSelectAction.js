define(function (require) {
    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    return function (seriesType, actionInfos) {
        zrUtil.each(actionInfos, function (actionInfo) {
            actionInfo.update = 'updateView';
            /**
             * @payload
             * @property {string} seriesName
             * @property {string} name
             */
            echarts.registerAction(actionInfo, function (payload, ecModel) {
                ecModel.eachComponent(
                    {mainType: 'series', subType: seriesType, query: payload},
                    function (seriesModel) {
                        if (seriesModel[actionInfo.method]) {
                            seriesModel[actionInfo.method](payload.name);
                        }
                    }
                );
            });
        });
    };
});