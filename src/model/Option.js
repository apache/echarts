define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('./Model');

    var SeriesModel = require('./SeriesModel');

    var OptionModel = Model.extend({

        constructor: OptionModel,

        init: function (option) {
            this._series = zrUtil.map(option.series, function (seriesOption) {
                return SeriesModel.create(seriesOption);
            });
        },

        getSeriesByName: function (name) {
            var series = this._series[i];
            for (var i = 0; i < series.length; i++) {
                if (series[i].name === name) {
                    return series;
                }
            }
        },

        getSeriesByType: function (type) {
            return zrUtil.filter(this._series, function (series) {
                return series.type === type;
            });
        },

        getSeriesAll: function (seriesIndex) {
            return this._series[seriesIndex];
        },

        eachSeries: function (cb, context) {
            zrUtil.each(this._series, cb, context);
        },

        filterSeries: function (cb, context) {
            this._series = zrUtil.filter(this._series, cb, context);
        }
    });

    return OptionModel;
});