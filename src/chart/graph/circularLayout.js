define(function (require) {
    var circularLayoutHelper = require('./circularLayoutHelper');
    return function (ecModel) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            if (seriesModel.get('layout') === 'circular') {
                circularLayoutHelper(seriesModel);
            }
        });
    };
});