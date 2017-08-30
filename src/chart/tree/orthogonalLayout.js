
define(function (require) {

    var commonLayout = require('./commonLayout');

    return function (ecModel, api) {
        ecModel.eachSeriesByType('tree', function (seriesModel) {
                commonLayout(seriesModel, api);
        });
    };
});