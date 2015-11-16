define(function (require) {
    var echarts = require('../echarts');
    return function (seriesType, actionInfo) {
        /**
         * @payload
         * @property {string} seriesName
         * @property {string} name
         */
        echarts.registerAction(actionInfo, function (payload, ecModel) {
            ecModel.eachSeriesByType(seriesType, function (seriesModel) {
                if (seriesModel.name === payload.seriesName && seriesModel.toggleSelected) {
                    seriesModel.toggleSelected(payload.name);
                }
            });
        });
    };
});