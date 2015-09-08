/**
 * ECharts global model
 *
 * @module {echarts/model/Global}
 *
 */

// FIXME Filter 后 series 是否能够被 getComponent 或者 getComponenentById 获取？

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('./Model');

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
             * @type {Object.<string, module:echarts/model/Model>}
             * @private
             */
            this._componentsIdMap = {};

            /**
             * @type {Object.<string, module:echarts/model/Model>}
             * @private
             */
            this._componentsMapBeforeProcessing = {};

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
            var componentsMap = this._componentsMap;
            var componentTypes = [];

            // 如果不存在对应的 component model 则直接 merge
            zrUtil.each(newOption, function (componentOption, componentType) {
                if (!ComponentModel.has(componentType)) {
                    if (componentOption && typeof componentOption === 'object') {
                        option[componentType] = option[componentType] == null
                            ? zrUtil.clone(componentOption)
                            : zrUtil.merge(option[componentType], componentOption);
                    }
                    else {
                        option[componentType] = componentOption;
                    }
                }
                else {
                    componentTypes.push(componentType);
                }
            });

            // FIXME 这里 componentTypes 是新的 Option，在依赖处理上是否会有问题
            // FIXME OPTION 同步是否要改回原来的
            ComponentModel.topologicalTravel(componentTypes, function (componentType, dependencies) {
                var componentOption = newOption[componentType];

                // Normalize
                if (!(zrUtil.isArray(componentOption))) {
                    componentOption = [componentOption];
                }
                if (!componentsMap[componentType]) {
                    componentsMap[componentType] = [];
                }

                for (var i = 0; i < componentOption.length; i++) {
                    var componentModel = componentsMap[componentType][i];
                    var ComponentModelClass = ComponentModel.getComponentModelClass(
                        componentType, componentOption[i]
                    );

                    if (! ComponentModelClass) {
                        throw new Error('Component ' + componentType + ' not exists');
                    }

                    if (componentModel && componentModel instanceof ComponentModelClass) {
                        componentModel.mergeOption(componentOption[i], this);
                    }
                    else {
                        componentModel = new ComponentModelClass(
                            componentOption[i], null, this,
                            this._getComponentsByTypes(dependencies), i
                        );
                        componentsMap[componentType][i] = componentModel;

                        // Merge option is incremental
                        this._components.push(componentModel);
                        this._componentsIdMap[componentModel.uid] = componentModel;
                    }
                }
            }, this);

            // Backup data
            zrUtil.each(componentsMap, function (components, componentType) {
                this._componentsMapBeforeProcessing[componentType] = components.slice();
            }, this);
        },

        /**
         * @return {module:echarts/model/Model}
         */
        getTheme: function () {
            return this._theme;
        },

        /**
         * @param {string} type
         * @param {number} [idx=0]
         * @return {module:echarts/model/Component}
         */
        getComponent: function (type, idx) {
            var list = this._componentsMap[type];
            if (list) {
                return list[idx || 0];
            }
        },

        /**
         * @param {string} uid
         * @return {module:echarts/model/Component}
         */
        getComponentById: function (uid) {
            return this._componentsIdMap[uid];
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
         * @param {string} type
         * @param {Function} cb
         * @param {*} context
         * @return {module:echarts/model/Component}
         */
        findComponent: function (type, cb, context) {
            var components = this._componentsMap[type];
            if (components) {
                for (var i = 0, len = components.length; i < len; i++) {
                    if (cb.call(context, components[i], i)) {
                        // Return first found
                        return components[i];
                    }
                }
            }
        },

        /**
         * @param {string} name
         * @param {boolean} beforeProcessing
         * @return {module:echarts/model/Series}
         */
        getSeriesByName: function (name, beforeProcessing) {
            var series = beforeProcessing
                ? this._componentsMapBeforeProcessing.series
                : this._componentsMap.series;
            for (var i = 0, len = series.length; i < len; i++) {
                // name should be unique.
                if (series[i].name === name) {
                    return series[i];
                }
            }
        },

        /**
         * @param {string} type
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesByType: function (type) {
            return zrUtil.filter(this._componentsMap.series, function (series) {
                return ComponentModel.parseComponentType(series.type).sub === type;
            });
        },

        /**
         * @param {number} seriesIndex
         * @return {module:echarts/model/Series}
         */
        getSeries: function (seriesIndex) {
            return this._componentsMap.series[seriesIndex];
        },

        /**
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesAll: function () {
            return this._componentsMap.series.slice();
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        eachSeries: function (cb, context) {
            zrUtil.each(this._componentsMap.series, cb, context);
        },

        /**
         * @parma {string} type
         * @param {Function} cb
         * @param {*} context
         */
        eachSeriesByType: function (type, cb, context) {
            return zrUtil.each(this.getSeriesByType(type), cb, context);
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        filterSeries: function (cb, context) {
            this._componentsMap.series = zrUtil.filter(
                this._componentsMap.series, cb, context
            );
        },

        restoreData: function () {
            var componentsMap = this._componentsMap;
            var componentTypes = [];

            zrUtil.each(this._componentsMapBeforeProcessing, function (components, componentType) {
                componentsMap[componentType] = components.slice();
                componentTypes.push(componentType);
            });

            ComponentModel.topologicalTravel(componentTypes, function (componentType, dependencies) {
                zrUtil.each(componentsMap[componentType], function (component) {
                    component.restoreData();
                });
            });
        },

        /**
         * @private
         * @param {Array.<string>|string} types model types
         * @return {Object} key: {string} type, value: {Array.<Object>} models
         */
        _getComponentsByTypes: function (types) {
            if (!zrUtil.isArray(types)) {
                types = types ? [types] : [];
            }

            var ret = {};
            zrUtil.each(types, function (type) {
                ret[type] = (this._componentsMap[type] || []).slice();
            }, this);

            return ret;
        }
    });

    return GlobalModel;
});