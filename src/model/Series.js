define(function(require) {

    'use strict';

    var Model = require('./Model');

    var SeriesModel = Model.extend({

        type: '',

        seriesIndex: 0,

        init: function (seriesOption) {
            this.name = seriesOption.name;

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
        var ExtendedSeriesModel = Model.extend.call(this);
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
    SeriesModel.create = function (option) {
        var chartType = option.type;
        var ExtendedSeriesModel = seriesModelClassesStore[chartType];
        if (! seriesModelClassesStore[chartType]) {
            // Error
        }
        return new ExtendedSeriesModel(option);
    };

    return SeriesModel;
});