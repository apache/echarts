/**
 * ECharts global model
 *
 * @module {echarts/model/Global}
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('./Model');

    var SeriesModel = require('./Series');
    var ComponentModel = require('./Component');

    var globalDefault = require('./globalDefault');

    /**
     * @alias module:echarts/model/Global
     *
     * @param {Object} option
     * @param {module:echarts/model/Model} parentModel
     * @param {Object} theme
     */
    var GlobalModel = Model.extend({

        constructor: GlobalModel,

        init: function (option, parentModel, theme) {

            theme = theme || {};

            this.option = {};

            /**
             * @type {Array}
             * @private
             */
            this._stack = [];

            /**
             * @type {Array.<module:echarts/model/Model}
             * @private
             */
            this._components = [];

            /**
             * @type {Object.<string, module:echarts/model/Model>}
             * @private
             */
            this._componentsMap = {};

            /**
             * @type {Array.<module:echarts/model/Model}
             * @private
             */
            this._series = [];

            /**
             * @type {Object.<string, module:echarts/model/Model>}
             * @private
             */
            this._seriesMap = {};

            /**
             * @type {module:echarts/model/Model}
             * @private
             */
            this._theme = new Model(theme);

            this._mergeTheme(option, theme);

            // TODO Needs clone when merging to the unexisted property
            zrUtil.merge(option, globalDefault, false);

            this.mergeOption(option);
        },

        /**
         * @private
         */
        _mergeTheme: function (option, theme) {
            for (var name in theme) {
                // 如果有 component model 则把具体的 merge 逻辑交给该 model 处理
                if (! ComponentModel.has[name]) {
                    if (typeof theme[name] === 'object') {
                        option[name] = option[name]
                            ? zrUtil.clone(theme[name])
                            : zrUtil.merge(option[name], theme[name]);
                    }
                    else {
                        option[name] = theme[name];
                    }
                }
            }
        },

        /**
         * @protected
         */
        mergeOption: function (newOption) {

            var option = this.option;

            zrUtil.each(newOption.series, function (series, idx) {
                var seriesName = series.name || (series.type + idx);
                var seriesMap = this._seriesMap;
                var seriesModel = seriesMap[seriesName];
                if (seriesModel) {
                    seriesModel.mergeOption(series);
                }
                else {
                    seriesModel = SeriesModel.create(series, this, idx);
                    seriesModel.name = seriesName;
                    seriesMap[seriesName] = seriesModel;
                    this._series.push(seriesModel);
                }
            }, this);

            // 同步 Option
            option.series = this._series.map(function (seriesModel) {
                return seriesModel.option;
            });

            var componentsMap = this._componentsMap;
            var components = this._components;
            for (var name in newOption) {
                var componentOption = newOption[name];
                // 如果不存在对应的 component model 则直接 merge
                if (! ComponentModel.has(name)) {
                    if (typeof componentOption === 'object') {
                        option[name] = option[name] == null
                            ? zrUtil.clone(componentOption)
                            : zrUtil.merge(option[name], componentOption);
                    }
                    else {
                        option[name] = componentOption;
                    }
                }
                else {
                    // Normalize
                    if (! (componentOption instanceof Array)) {
                        componentOption = [componentOption];
                    }
                    if (! componentsMap[name]) {
                        componentsMap[name] = [];
                    }
                    for (var i = 0; i < componentOption.length; i++) {
                        var componentModel = componentsMap[name][i];
                        if (componentModel) {
                            componentModel.mergeOption(
                                componentOption[i], this
                            );
                        }
                        else {
                            componentModel = ComponentModel.create(
                                name, componentOption[i], this
                            );
                            componentsMap[name][i] = componentModel;
                            components.push(componentModel);
                        }
                        if (componentModel) {
                            // 同步 Option
                            if (componentOption instanceof Array) {
                                option[name] = option[name] || [];
                                option[name][i] = componentModel.option;
                            }
                            else {
                                option[name] = componentModel.option;
                            }
                        }
                    }
                }
            }
        },

        /**
         * @return {module:echarts/model/Model}
         */
        getTheme: function () {
            return this._theme;
        },

        /**
         * @return {module:echarts/model/Component}
         */
        getComponent: function (type, idx) {
            var list = this._componentsMap[type];
            if (list) {
                return list[idx || 0];
            }
        },

        /**
         * @param {string} type
         * @param {Function} cb
         * @param {*} context
         */
        eachComponent: function (type, cb, context) {
            zrUtil.each(this._componentsMap[type], cb, context);
        },

        /**
         * @param {string} name
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesByName: function (name) {
            return this._seriesMap[name];
        },

        /**
         * @param {string} type
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesByType: function (type) {
            return zrUtil.filter(this._series, function (series) {
                return series.type === type;
            });
        },

        /**
         * @param {number} seriesIndex
         * @return {module:echarts/model/Series}
         */
        getSeries: function (seriesIndex) {
            return this._series[seriesIndex];
        },

        /**
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesAll: function () {
            return this._series.slice();
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        eachSeries: function (cb, context) {
            zrUtil.each(this._series, cb, context);
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        filterSeries: function (cb, context) {
            this._series = zrUtil.filter(this._series, cb, context);
        },

        save: function () {
            this._stack.push({
                series: this._series.slice()
            });

            var components = this._components;
            var series = this._series;
            var i;
            for (i = 0; i < components.length; i++) {
                components[i].save();
            }
            for (i = 0; i < series.length; i++) {
                series[i].save();
            }
        },

        restore: function () {
            if (this._stack.length) {
                this._series = this._stack.pop().series;
            }

            var components = this._components;
            var series = this._series;
            var i;
            for (i = 0; i < components.length; i++) {
                components[i].restore();
            }
            for (i = 0; i < series.length; i++) {
                series[i].restore();
            }
        }
    });

    return GlobalModel;
});