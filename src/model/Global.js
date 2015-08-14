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

            this.$option = {};

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
            this.$option.series = this._series.map(function (seriesModel) {
                return seriesModel.getOption();
            });

            var components = this._components;
            for (var name in newOption) {
                var componentOption = newOption[name];
                // Normalize
                if (! (componentOption instanceof Array)) {
                    componentOption = [componentOption];
                }
                if (! components[name]) {
                    components[name] = [];
                }

                // 如果不存在对应的 model 则直接 merge
                if (! ComponentModel.has(name)) {
                    if (typeof componentOption[i] === 'object') {
                        componentOption = zrUtil.merge(this.$option[name] || {}, componentOption);
                    }
                    else {
                        this.$option[name] = componentOption;
                    }
                }
                else {
                    for (var i = 0; i < componentOption.length; i++) {
                        var componentModel = components[name][i];
                        if (componentModel) {
                            componentModel.mergeOption(componentOption[i]);
                        }
                        else {
                            componentModel = ComponentModel.create(name, componentOption[i]);
                            components[name][i] = componentModel;

                            if (componentModel) {
                                // 同步 Option
                                if (componentOption instanceof Array) {
                                    this.$option[name][i] = componentModel.getOption();
                                }
                                else {
                                    this.$option[name] = componentModel.getOption();
                                }
                            }
                        }
                    }
                }
            }
        },

        getComponent: function (type, idx) {
            var list = this._components[type];
            if (list) {
                return list[idx || 0];
            }
        },

        eachComponent: function (type, cb, context) {
            zrUtil.each(this._components[type], cb, context);
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