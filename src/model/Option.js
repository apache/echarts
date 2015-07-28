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

        getSeries: function (seriesIndex) {
            return this._series[seriesIndex];
        },

        eachSeries: function (cb, context) {

        }
    });

    return OptionModel;
});