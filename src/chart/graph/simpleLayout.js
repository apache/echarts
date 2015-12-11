define(function (require) {

    var simpleLayoutHelper = require('./simpleLayoutHelper');
    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var layout = seriesModel.get('layout');
            if (!layout || layout === 'none') {
                simpleLayoutHelper(seriesModel);
            }
        });
    };
});