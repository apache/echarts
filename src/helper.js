define(function (require) {

    var createListFromArray = require('./chart/helper/createListFromArray');
    // var axisHelper = require('./coord/axisHelper');

    return {
        createList: function (seriesModel) {
            var data = seriesModel.get('data');
            return createListFromArray(data, seriesModel, seriesModel.ecModel);
        }
        // createScale: function () {

        // }
    };
});