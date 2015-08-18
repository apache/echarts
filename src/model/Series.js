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

            this.seriesIndex = seriesIndex;

            zrUtil.merge(seriesOption, ecModel.getTheme().get(this.type));

            zrUtil.merge(seriesOption, this.defaultOption);

            this._data = this.getInitialData(seriesOption);
        },

        mergeOption: function (newSeriesOption) {
            this._data = this.getInitialData(newSeriesOption);
        },

        /**
         * Init a data structure from data related option in series
         * Must be overwritten
         */
        getInitialData: function () {},

        getData: function () {
            return this._data;
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