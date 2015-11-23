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

        init: function (option, parentModel, ecModel, dependentModels, seriesIndex) {
            /**
             * @type {number}
             */
            this.seriesIndex = seriesIndex;

            this.mergeDefaultAndTheme(option, ecModel);

            /**
             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
             * @private
             */
            this._data = this.getInitialData(option, ecModel);

            this._dataBeforeProcessed = this._data.cloneShallow();
        },

        /**
         * Util for merge default and theme to option
         * @param  {Object} option
         * @param  {module:echarts/model/Global} ecModel
         */
        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(
                option,
                ecModel.getTheme().get(ComponentModel.parseClassType(this.type).sub)
            );
            zrUtil.merge(option, this.getDefaultOption());

            // Default label emphasis `position` and `show`
            modelUtil.defaultEmphasis(option.label);
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
        getDataAll: function () {
            return this._dataBeforeProcessed;
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
            var value = data.getRawValue(dataIndex);
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

        /**
         * Get params for formatter
         * @param {number} dataIndex
         * @return {Object}
         */
        getDataParams: function (dataIndex) {
            var data = this._data;
            var seriesIndex = this.seriesIndex;
            var seriesName = this.name;
            var rawDataIndex = data.getRawIndex(dataIndex);
            var rawValue = data.getRawValue(dataIndex);
            var name = data.getName(dataIndex, true);

            var itemOpt = this.option.data[rawDataIndex];

            return {
                seriesIndex: seriesIndex,
                seriesName: seriesName,
                name: name,
                dataIndex: rawDataIndex,
                data: itemOpt,
                value: rawValue,

                // Param name list for mapping `a`, `b`, `c`, `d`, `e`
                $vars: ['seriesName', 'name', 'value']
            };
        },

        /**
         * Format label
         * @param {number} dataIndex
         * @param {string} [status='normal'] 'normal' or 'emphasis'
         * @param {Function|string} [formatter] Default use the `itemStyle[status].label.formatter`
         * @return {string}
         */
        getFormattedLabel: function (dataIndex, status, formatter) {
            status = status || 'normal';
            var data = this._data;
            var itemModel = data.getItemModel(dataIndex);

            var params = this.getDataParams(dataIndex);
            if (!formatter) {
                formatter = itemModel.get('label.' + status + '.formatter');
            }

            if (typeof formatter === 'function') {
                params.status = status;
                return formatter(params);
            }
            else if (typeof formatter === 'string') {
                // TODO ETPL ?
                return formatter.replace('{a}','{a0}')
                                .replace('{b}','{b0}')
                                .replace('{c}','{c0}')
                                .replace('{a0}', params.seriesName)
                                .replace('{b0}', params.name)
                                .replace('{c0}', addCommas(params.value));
            }
        },

        restoreData: function () {
            this._data = this._dataBeforeProcessed.cloneShallow();
        }
    });

    return SeriesModel;
});