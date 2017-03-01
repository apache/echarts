define(function (require) {

    var createListFromArray = require('./chart/helper/createListFromArray');
    var symbolUtil = require('./util/symbol');
    var axisHelper = require('./coord/axisHelper');
    var axisModelCommonMixin = require('./coord/axisModelCommonMixin');
    var Model = require('./model/Model');
    var util = require('zrender/core/util');

    return {
        /**
         * Create a muti dimension List structure from seriesModel.
         * @param  {module:echarts/model/Model} seriesModel
         * @return {module:echarts/data/List} list
         */
        createList: function (seriesModel) {
            var data = seriesModel.get('data');
            return createListFromArray(data, seriesModel, seriesModel.ecModel);
        },

        /**
         * Complete the dimensions array guessed from the data structure.
         * @param  {Array.<string>} dimensions Necessary dimensions, like ['x', 'y']
         * @param  {Array} data Data list. [[1, 2, 3], [2, 3, 4]]
         * @param  {Object} [opt]
         * @param  {Array.<string>} [opt.defaultNames] Default names to fill not necessary dimensions, like ['value']
         * @param  {string} [opt.extraPrefix] Prefix of name when filling the left dimensions.
         * @param  {number} [opt.dimCount] If not specified, guess by the first data item.
         * @return {Array.<string>}
         */
        completeDimensions: require('./data/helper/completeDimensions'),

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
        createSymbol: symbolUtil.createSymbol,

        /**
         * Create scale
         * @param {Array.<number>} dataExtent
         * @param {Object|module:echarts/Model} option
         */
        createScale: function (dataExtent, option) {
            var axisModel = option;
            if (!(option instanceof Model)) {
                axisModel = new Model(option);
                util.mixin(axisModel, axisModelCommonMixin);
            }

            var scale = axisHelper.createScaleByModel(axisModel);
            scale.setExtent(dataExtent[0], dataExtent[1]);

            axisHelper.niceScaleExtent(scale, axisModel);
            return scale;
        },

        /**
         * Mixin common methods to axis model,
         *
         * Inlcude methods
         * `getFormattedLabels() => Array.<string>`
         * `getCategories() => Array.<string>`
         * `getMin(origin: boolean) => number`
         * `getMax(origin: boolean) => number`
         * `getNeedCrossZero() => boolean`
         * `setRange(start: number, end: number)`
         * `resetRange()`
         */
        mixinAxisModelCommonMethods: function (Model) {
            util.mixin(Model, axisModelCommonMixin);
        }
    };
});