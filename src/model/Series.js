define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../util/format');
    var modelUtil = require('../util/model');
    var ComponentModel = require('./Component');

    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    var SeriesModel = ComponentModel.extend({

        type: 'series',

        /**
         * @readOnly
         */
        seriesIndex: 0,

        // coodinateSystem will be injected in the echarts/CoordinateSystem
        coordinateSystem: null,

        /**
         * @type {Object}
         * @protected
         */
        defaultOption: null,

        /**
         * Data provided for legend
         * @type {Function}
         */
        // PENDING
        legendDataProvider: null,

        init: function (option, parentModel, ecModel, extraOpt) {

            /**
             * @type {number}
             * @readOnly
             */
            this.seriesIndex = this.componentIndex;

            this.mergeDefaultAndTheme(option, ecModel);

            /**
             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
             * @private
             */
            this._dataBeforeProcessed = this.getInitialData(option, ecModel);

            // When using module:echarts/data/Tree or module:echarts/data/Graph,
            // cloneShallow will cause this._data.graph.data pointing to new data list.
            // Wo we make this._dataBeforeProcessed first, and then make this._data.
            this._data = this._dataBeforeProcessed.cloneShallow();
        },

        /**
         * Util for merge default and theme to option
         * @param  {Object} option
         * @param  {module:echarts/model/Global} ecModel
         */
        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(
                option,
                ecModel.getTheme().get(this.subType)
            );
            zrUtil.merge(option, this.getDefaultOption());

            // Default label emphasis `position` and `show`
            modelUtil.defaultEmphasis(
                option.label, ['position', 'show', 'textStyle', 'distance', 'formatter']
            );
        },

        mergeOption: function (newSeriesOption, ecModel) {
            newSeriesOption = zrUtil.merge(this.option, newSeriesOption, true);

            var data = this.getInitialData(newSeriesOption, ecModel);
            // TODO Merge data?
            if (data) {
                this._data = data;
                this._dataBeforeProcessed = data.cloneShallow();
            }
            // FIXME
            // Default label emphasis `position` and `show`
            // Do it after option is merged. In case newSeriesOption only
            // set the value in emphasis
            // modelUtil.defaultNormalEmphasis(this.option.label);
        },

        /**
         * Init a data structure from data related option in series
         * Must be overwritten
         */
        getInitialData: function () {},

        /**
         * @return {module:echarts/data/List}
         */
        getData: function () {
            return this._data;
        },

        /**
         * @param {module:echarts/data/List} data
         */
        setData: function (data) {
            this._data = data;
        },

        /**
         * Get data before processed
         * @return {module:echarts/data/List}
         */
        getRawData: function () {
            return this._dataBeforeProcessed;
        },

        /**
         * Get raw data array given by user
         * @return {Array.<Object>}
         */
        getRawDataArray: function () {
            return this.option.data;
        },

        /**
         * Get dimensions on the given axis.
         * @param {string} axisDim
         * @return {Array.<string>} dimensions on the axis.
         */
        getDimensionsOnAxis: function (axisDim) {
            return [axisDim]; // Retunr axisDim default.
        },

        /**
         * Get coordinate dimensions info.
         * By default the result is the same as dimensions info of series data.
         * But some series dimensions are different from coord dimensions (i.e.
         * candlestick and boxplot). Override this method to handle those cases.
         * @param {string|number} [dataDim]
         * @return {Array.<Object>} If dataDim specified, return cooresponding
         *                          coord dim info, otherwise return dimension
         *                          info list. If no coordinate system, reutrn [].
         */
        getCoordDimensionInfo: function (dataDim) {
            var data = this.getData();
            return this.coordinateSystem
                ? (
                    dataDim != null
                        ? data.getDimensionInfo(dataDim)
                        : zrUtil.map(data.dimensions, data.getDimensionInfo, data)
                )
                : [];
        },

        /**
         * Get base axis if has coordinate system and has axis.
         * By default use coordSys.getBaseAxis();
         * Can be overrided for some chart.
         * @return {type} description
         */
        getBaseAxis: function () {
            var coordSys = this.coordinateSystem;
            return coordSys && coordSys.getBaseAxis && coordSys.getBaseAxis();
        },

        // FIXME
        /**
         * Default tooltip formatter
         *
         * @param {number} dataIndex
         * @param {boolean} [mutipleSeries=false]
         */
        formatTooltip: function (dataIndex, mutipleSeries) {
            var data = this._data;
            var value = this.getRawValue(dataIndex);
            var formattedValue = zrUtil.isArray(value)
                ? zrUtil.map(value, addCommas).join(', ') : addCommas(value);
            var name = data.getName(dataIndex);

            return !mutipleSeries
                ? (encodeHTML(this.name) + '<br />'
                    + (name
                        ? encodeHTML(name) + ' : ' + formattedValue
                        : formattedValue)
                  )
                : (encodeHTML(this.name) + ' : ' + formattedValue);
        },

        restoreData: function () {
            this._data = this._dataBeforeProcessed.cloneShallow();
        }
    });

    zrUtil.mixin(SeriesModel, modelUtil.dataFormatMixin);

    return SeriesModel;
});