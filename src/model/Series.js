define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../util/format');
    var ComponentModel = require('./Component');

    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    var SeriesModel = ComponentModel.extend({

        type: '',

        /**
         * @readOnly
         */
        seriesIndex: 0,

        /**
         * @readOnly
         */
        name: '',

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

            var seriesName = this.get('name');
            if (seriesName == null) {
                seriesName = this.get('type') + '' + seriesIndex;
            }
            this.name = seriesName + '';

            /**
             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
             * @private
             */
            this._data = this.getInitialData(option, ecModel);

            this._dataBeforeProcessed = this._data.cloneShallow();
        },

        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(
                option,
                ecModel.getTheme().get(ComponentModel.parseComponentType(this.type).sub)
            );
            zrUtil.merge(option, this.getDefaultOption());
        },

        mergeOption: function (newSeriesOption, ecModel) {
            var data = this.getInitialData(newSeriesOption, ecModel);
            // TODO Merge data?
            if (data) {
                this._data = data;
                this._dataBeforeProcessed = data.cloneShallow();
            }

            zrUtil.merge(this.option, newSeriesOption, true);
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
            var name = data.getName(dataIndex, true);

            return !mutipleSeries
                ? (encodeHTML(this.name) + '<br />'
                    + (name
                        ? encodeHTML(name) + ' : ' + formattedValue
                        : formattedValue)
                  )
                : (encodeHTML(this.name) + ' : ' + formattedValue);
        },

        /**
         * Format label
         * @param {number} dataIndex
         * @param {string} [status='normal'] 'normal' or 'emphasis'
         * @param {Function|string} [formatter] Default use the `itemStyle[status].label.formatter`
         * @return {string}
         */
        getFormattedLabel: function (dataIndex, status, formatter) {
            var data = this._data;
            var itemModel = data.getItemModel(dataIndex);
            var value = data.getRawValue(dataIndex);
            var rawIndex = data.getRawIndex(dataIndex)

            var seriesOpt = this.option;
            var dataItemOpt = seriesOpt.data[rawIndex];

            var seriesIndex = this.seriesIndex;
            var seriesName = this.name;

            var name = data.getName(dataIndex);

            if (!formatter) {
                formatter = itemModel.get('itemStyle.' + status + '.label.formatter')
            }

            if (typeof formatter === 'function') {
                return formatter({
                    seriesIndex: seriesIndex,
                    seriesName: seriesName,
                    series: seriesOpt,
                    name: name,
                    value: value,
                    data: dataItemOpt,
                    status: status || 'normal'
                });
            }
            else if (typeof formatter === 'string') {
                // TODO ETPL ?
                return formatter.replace('{a}','{a0}')
                                .replace('{b}','{b0}')
                                .replace('{c}','{c0}')
                                .replace('{a0}', seriesName)
                                .replace('{b0}', name)
                                .replace('{c0}', addCommas(value));
            }
        },

        restoreData: function () {
            this._data = this._dataBeforeProcessed.cloneShallow();
        }
    });

    return SeriesModel;
});