define(function (require) {
    var echarts = require('../echarts');
    return function (seriesType, actionInfo) {
        /**
         * @payload
         * @property {string} seriesName
         * @property {string} name
         */
        echarts.registerAction(actionInfo, function (payload, ecModel) {

            ecModel.eachComponent(
                {mainType: 'series', subType: seriesType, payload: payload},
                function (seriesModel) {
                    if (seriesModel.toggleSelected) {
                        seriesModel.toggleSelected(payload.name);
                    }
                }
            );

        });
    };
});