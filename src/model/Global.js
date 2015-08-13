define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('./Model');

    var SeriesModel = require('./SeriesModel');
    var ComponentModel = require('./Component/Model');

    var GlobalModel = Model.extend({

        constructor: GlobalModel,

        init: function (option) {

            this._components = {};

            this._series = [];

            this._seriesMap = {};

            this._option = {};

            this.mergeOption(option);
        },

        mergeOption: function (newOption) {
            zrUtil.each(newOption.series, function (series) {
                var seriesName = series.name;
                var seriesModel = this._seriesMap[seriesName];
                if (seriesModel) {
                    seriesModel.mergeOption(series);
                }
                else {
                    seriesModel = SeriesModel.create(series);
                    this._seriesMap[seriesName] = seriesModel;
                    this._series.push(seriesModel);
                }
            }, this);

            // 同步 Option
            this._option.series = this._series.map(function (seriesModel) {
                return seriesModel.getOption();
            });

            for (var name in newOption) {
                if (this._components[name]) {
                    this._components[name].mergeOption(newOption[name]);
                }
                else {
                    var componentOption = newOption[name];
                    var componentModel = ComponentModel.create(name, componentOption);
                    if (! componentModel) {
                        // 如果不存在对应的 model 则直接 merge
                        if (typeof componentOption === 'object') {
                            componentOption = zrUtil.merge(this._option[name] || {}, componentOption);
                        }
                        this._option[name] = componentOption;
                    }
                    else {
                        this._components[name] = componentModel;
                    }

                    if (componentModel) {
                        // 同步 Option
                        this._option[name] = componentModel.getOption();
                    }
                }
            }
        },

        getComponent: function (name) {
            return this._components[name];
        },

        getSeriesByName: function (name) {
            return this._seriesMap[name];
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

    return GlobalModel;
});