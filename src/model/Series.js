define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../util/format');
    var modelUtil = require('../util/model');
    var ComponentModel = require('./Component');

    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    var SeriesModel = ComponentModel.extend({

        type: 'series.__base__',

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

            // Default data label emphasis `position` and `show`
            // FIXME Tree structure data ?
            var data = option.data || [];
            for (var i = 0; i < data.length; i++) {
                if (data[i] && data[i].label) {
                    modelUtil.defaultEmphasis(
                        data[i].label, ['position', 'show', 'textStyle', 'distance', 'formatter']
                    );
                }
            }
        },

        mergeOption: function (newSeriesOption, ecModel) {
            newSeriesOption = zrUtil.merge(this.option, newSeriesOption, true);

            var data = this.getInitialData(newSeriesOption, ecModel);
            // TODO Merge data?
            if (data) {
                this._data = data;
                this._dataBeforeProcessed = data.cloneShallow();
            }
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
         * Coord dimension to data dimension.
         *
         * By default the result is the same as dimensions of series data.
         * But some series dimensions are different from coord dimensions (i.e.
         * candlestick and boxplot). Override this method to handle those cases.
         *
         * Coord dimension to data dimension can be one-to-many
         *
         * @param {string} coordDim
         * @return {Array.<string>} dimensions on the axis.
         */
        coordDimToDataDim: function (coordDim) {
            return [coordDim];
        },

        /**
         * Convert data dimension to coord dimension.
         *
         * @param {string|number} dataDim
         * @return {string}
         */
        dataDimToCoordDim: function (dataDim) {
            return dataDim;
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
         * @param {boolean} [multipleSeries=false]
         */
        formatTooltip: function (dataIndex, multipleSeries) {
            var data = this._data;
            var value = this.getRawValue(dataIndex);
            var formattedValue = zrUtil.isArray(value)
                ? zrUtil.map(value, addCommas).join(', ') : addCommas(value);
            var name = data.getName(dataIndex);
            var color = data.getItemVisual(dataIndex, 'color');
            var colorEl = '<span style="display:inline-block;margin-right:5px;'
                + 'border-radius:10px;width:9px;height:9px;background-color:' + color + '"></span>';

            return !multipleSeries
                ? (encodeHTML(this.name) + '<br />' + colorEl
                    + (name
                        ? encodeHTML(name) + ' : ' + formattedValue
                        : formattedValue)
                  )
                : (colorEl + encodeHTML(this.name) + ' : ' + formattedValue);
        },

        restoreData: function () {
            this._data = this._dataBeforeProcessed.cloneShallow();
        }
    });

    zrUtil.mixin(SeriesModel, modelUtil.dataFormatMixin);

    return SeriesModel;
});