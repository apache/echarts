define(function (require) {

    var createListFromArray = require('./chart/helper/createListFromArray');
    var symbolUtil = require('./util/symbol');
    // var axisHelper = require('./coord/axisHelper');

    return {
        createList: function (seriesModel) {
            var data = seriesModel.get('data');
            return createListFromArray(data, seriesModel, seriesModel.ecModel);
        },

        /**
         * Create a symbol element with given symbol configuration: shape, x, y, width, height, color
         * @see http://echarts.baidu.com/option.html#series-scatter.symbol
         * @param {string} symbolDesc
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {string} color
         */
        createSymbol: symbolUtil.createSymbol

        // createScale: function () {

        // }
    };
});