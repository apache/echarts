define(function(require) {

    'use strict';

    var Model = require('./Model');
    var zrUtil = require('zrender/core/util');

    var SeriesModel = Model.extend({

        type: '',

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

        init: function (seriesOption, parentModel, ecModel, seriesIndex) {

            /**
             * @type {number}
             */
            this.seriesIndex = seriesIndex;

            zrUtil.merge(seriesOption, ecModel.getTheme().get(this.type));

            zrUtil.merge(seriesOption, this.defaultOption);

            /**
             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
             * @private
             */
            this._data = this.getInitialData(seriesOption, ecModel);

            this._stack = [];
        },

        mergeOption: function (newSeriesOption, ecModel) {
            this._data = this.getInitialData(newSeriesOption, ecModel);
        },

        /**
         * Init a data structure from data related option in series
         * Must be overwritten
         */
        getInitialData: function () {},

        getData: function () {
            return this._data;
        },

        save: function () {
            this._stack.push({
                data: this._data.clone()
            });
        },

        restore: function () {
            if (this._stack.length) {
                this._data = this._stack.pop().data;
            }
        }
    });

    var seriesModelClassesStore = {};

    /**
     * Extend a SeriesModel
     */
    SeriesModel.extend = function (opts) {
        var ExtendedSeriesModel = Model.extend.call(this, opts);
        if (opts.type) {
            if (seriesModelClassesStore[opts.type]) {
                // Warning
            }
            seriesModelClassesStore[opts.type] = ExtendedSeriesModel;
        }
        return ExtendedSeriesModel;
    };

    /**
     * Create a SeriesModel by a given option
     */
    SeriesModel.create = function (option, ecModel, seriesIndex) {
        var chartType = option.type;
        var ExtendedSeriesModel = seriesModelClassesStore[chartType];
        if (! seriesModelClassesStore[chartType]) {
            // Error
        }
        return new ExtendedSeriesModel(option, null, ecModel, seriesIndex);
    };

    return SeriesModel;
});