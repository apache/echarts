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
    var each = zrUtil.each;
    var filter = zrUtil.filter;

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
             * @type {Object.<string, Array.<module:echarts/model/Model>>}
             * @private
             */
            this._componentsMap = {};

            /**
             * All components before processing
             * @type {Object.<string, module:echarts/model/Model>}
             * @private
             */
            this._componentsMapAll = {};

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
                if (!ComponentModel.hasClass(name)) {
                    if (typeof theme[name] === 'object') {
                        option[name] = !option[name]
                            ? zrUtil.clone(theme[name])
                            : zrUtil.merge(option[name], theme[name], false);
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
            var newCptTypes = [];

            // 如果不存在对应的 component model 则直接 merge
            each(newOption, function (componentOption, componentType) {
                if (!ComponentModel.hasClass(componentType)) {
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
                    newCptTypes.push(componentType);
                }
            });

            // FIXME OPTION 同步是否要改回原来的
            ComponentModel.topologicalTravel(
                newCptTypes, ComponentModel.getAllClassMainTypes(), visitComponent, this
            );

            function visitComponent(componentType, dependencies) {
                var newCptOptionList = newOption[componentType];

                // Normalize
                if (!(zrUtil.isArray(newCptOptionList))) {
                    newCptOptionList = [newCptOptionList];
                }
                if (!componentsMap[componentType]) {
                    componentsMap[componentType] = [];
                }

                var existComponents = this._mappingToExists(componentType, newCptOptionList);

                this._completeOptionKeys(
                    componentType, newCptOptionList, existComponents
                );

                each(newCptOptionList, function (newCptOption, index) {
                    var componentModel = existComponents[index];

                    var subType = this._determineSubType(
                        componentType, newCptOption, componentModel
                    );
                    var ComponentModelClass = ComponentModel.getClass(
                        componentType, subType, true
                    );

                    if (componentModel && componentModel instanceof ComponentModelClass) {
                        componentModel.mergeOption(newCptOption, this);
                    }
                    else {
                        // PENDING Global as parent ?
                        componentModel = new ComponentModelClass(
                            newCptOption, this, this,
                            this._getComponentsByTypes(dependencies), index
                        );
                        componentsMap[componentType][index] = componentModel;
                    }
                }, this);
            }

            // Backup data
            each(componentsMap, function (components, componentType) {
                this._componentsMapAll[componentType] = components.slice();
            }, this);
        },

        /**
         * @private
         */
        _determineSubType: function (componentType, newCptOption, existComponent) {
            var subType = newCptOption.type
                ? newCptOption.type
                : existComponent
                ? existComponent.option.type
                // Use determinSubType only when there is no existComponent.
                : ComponentModel.determineSubType(componentType, newCptOption);

            // Dont make option.type === undefined, otherwise some problem will occur in merge.
            subType && (newCptOption.type = subType);

            return subType;
        },

        /**
         * @private
         */
        _mappingToExists: function (componentType, newComponentOptionList) {
            var result = [];
            var existComponents = (this._componentsMap[componentType] || []).slice();

            // Mapping by id if specified.
            each(newComponentOptionList, function (componentOption, index) {
                if (!componentOption.id) {
                    return;
                }
                for (var i = 0, len = existComponents.length; i < len; i++) {
                    if (existComponents[i].getId() === componentOption.id) {
                        result[index] = existComponents.splice(i, 1)[0];
                        return;
                    }
                }
            });

            // Mapping by name if specified.
            each(newComponentOptionList, function (componentOption, index) {
                if (!componentOption.name) {
                    return;
                }
                for (var i = 0, len = existComponents.length; i < len; i++) {
                    if (existComponents[i].name === componentOption.name) {
                        result[index] = existComponents.splice(i, 1)[0];
                        return;
                    }
                }
            });

            // Otherwise mapping by index.
            each(newComponentOptionList, function (componentOption, index) {
                if (!result[index] && existComponents[index]) {
                    result[index] = existComponents[index];
                }
            });

            return result;
        },

        /**
         * @private
         */
        _completeOptionKeys: function (mainType, newCptOptionList, existComponents) {
            // We use this id to hash component models and view instances
            // in echarts. id can be specified by user, or auto generated.

            // The id generation rule ensures when setOption are called in
            // no-merge mode, new model is able to replace old model, and
            // new view instance are able to mapped to old instance.
            // So we generate id by name and type.

            // name can be duplicated among components, which is convenient
            // to specify multi components (like series) by one name.

            // We use a prefix when generating name or id to prevent
            // user using the generated name or id directly.
            var prefix = '\0';

            // Ensure that each id is distinct.
            var idSet = {};

            each(newCptOptionList, function (opt, index) {

                var existCpt = existComponents[index];

                // Complete subType
                var subType = this._determineSubType(mainType, opt, existCpt);
                var type = mainType + '.' + subType;
                var id;
                var name;

                if (existCpt) {
                    id = opt.id = existCpt.id;
                    opt.name = existCpt.name;
                }
                else {
                    name = opt.name;
                    if (name == null) {
                        // Using delimiter to escapse dulipcation.
                        name = opt.name = [prefix, type, index].join('-');
                    }
                    id = opt.id;
                    if (id == null) {
                        // The delimiter should not be the same as name delimeter,
                        // ohterwise duplication might occurs.
                        id = opt.id = [prefix, name, type, index].join('|');
                    }
                }

                if (idSet[id]) {
                    // FIXME
                    // how to throw
                    throw new Error('id duplicates: ' + id);
                }
                idSet[id] = 1;

            }, this);
        },

        /**
         * @return {module:echarts/model/Model}
         */
        getTheme: function () {
            return this._theme;
        },

        /**
         * @param {string} mainType
         * @param {number} [idx=0]
         * @return {module:echarts/model/Component}
         */
        getComponent: function (mainType, idx) {
            var list = this._componentsMap[mainType];
            if (list) {
                return list[idx || 0];
            }
        },

        /**
         * @param {Object} condition
         * @param {string} condition.mainType
         * @param {string} [condition.subType] If ignore, only query by mainType
         * @param {number} [condition.index] Either input index or id or name.
         * @param {string} [condition.id] Either input index or id or name.
         * @param {string} [condition.name] Either input index or id or name.
         * @return {Array.<module:echarts/model/Component>}
         */
        queryComponents: function (condition) {
            var mainType = condition.mainType;
            if (!mainType) {
                return [];
            }

            var index = condition.index;
            var id = condition.id;
            var name = condition.name;

            var cpts = this._componentsMap[mainType];

            if (!cpts || !cpts.length) {
                return [];
            }

            var result;

            if (index != null) {
                var cpt = cpts[index];
                result = cpt ? [cpt] : [];
            }
            else if (id != null) {
                result = filter(cpts, function (cpt) {
                    return cpt.id === id;
                });
            }
            else if (name != null) {
                result = filter(cpts, function (cpt) {
                    return cpt.name === name;
                });
            }

            var subType = condition.subType;

            return subType == null
                ? result
                : filter(result, function (cpt) {
                    return cpt.subType === subType;
                });
        },

        /**
         * @usage
         * eachComponent('legend', function (legendModel, index) {
         *     ...
         * });
         * eachComponent(function (componentType, model, index) {
         *     // componentType does not include subType
         *     // (componentType is 'xxx' but not 'xxx.aa')
         * });
         * eachComponent(
         *     {mainType: 'dataZoom', payload: {dataZoomId: 'abc'}},
         *     function (model, index) {...}
         * );
         * eachComponent(
         *     {mainType: 'series', subType: 'pie', payload: {seriesName: 'uio'}},
         *     function (model, index) {...}
         * );
         *
         * @param {string=} mainType
         * @param {Function} cb
         * @param {*} context
         */
        eachComponent: function (mainType, cb, context) {
            if (typeof mainType === 'function') {
                context = cb;
                cb = mainType;
                each(this._componentsMap, function (components, componentType) {
                    each(components, function (component, index) {
                        cb.call(this, componentType, component, index);
                    }, this);
                }, context);
            }

            else if (zrUtil.isString(mainType)) {
                each(this._componentsMap[mainType], cb, context);
            }

            // Query by payload.
            else if (zrUtil.isObject(mainType)) {
                var condition = zrUtil.extend({}, mainType);
                var payload = condition.payload;
                var mainType = condition.mainType;

                // Style in payload: xxxIndex, xxxId, xxxName,
                // where xxx is mainType.
                condition.index = payload[mainType + 'Index'];
                condition.id = payload[mainType + 'Id'];
                condition.name = payload[mainType + 'Name'];

                each(this.queryComponents(condition), cb, context);
            }
        },

        /**
         * @param {string} mainType
         * @param {Function} cb
         * @param {*} context
         * @return {module:echarts/model/Component}
         */
        findComponent: function (mainType, cb, context) {
            var components = this._componentsMap[mainType];
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
            var series = this['_componentsMap' + (beforeProcessing ? 'All' : '')].series;
            for (var i = 0, len = series.length; i < len; i++) {
                // name should be unique.
                if (series[i].name === name) {
                    return series[i];
                }
            }
        },

        // FIXME Index of series is confusing
        /**
         * @param {number} seriesIndex
         * @param {boolean} beforeProcessing
         * @return {module:echarts/model/Series}
         */
        getSeriesByIndex: function (seriesIndex, beforeProcessing) {
            // return this._componentsMap.series[seriesIndex];
            var series = this['_componentsMap' + (beforeProcessing ? 'All' : '')].series;
            for (var i = 0, len = series.length; i < len; i++) {
                // name should be unique.
                if (series[i].seriesIndex === seriesIndex) {
                    return series[i];
                }
            }
        },

        /**
         * @param {string} subType
         * @param {boolean} beforeProcessing
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesByType: function (subType, beforeProcessing) {
            var series = this['_componentsMap' + (beforeProcessing ? 'All' : '')].series;
            return zrUtil.filter(series, function (oneSeries) {
                return oneSeries.subType === subType;
            });
        },

        /**
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeries: function () {
            return this._componentsMap.series.slice();
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        eachSeries: function (cb, context) {
            each(this._componentsMap.series, cb, context);
        },

        /**
         * Iterate all series before filtered
         * @param {Function} cb
         * @param {*} context
         */
        eachSeriesAll: function (cb, context) {
            each(this._componentsMapAll.series, cb, context);
        },

        /**
         * @parma {string} subType
         * @param {Function} cb
         * @param {*} context
         */
        eachSeriesByType: function (subType, cb, context) {
            return each(this.getSeriesByType(subType), cb, context);
        },

        /**
         * Iterate all series before filtered of given type
         * @parma {string} subType
         * @param {Function} cb
         * @param {*} context
         */
        eachSeriesByTypeAll: function (subType, cb, context) {
            return each(this.getSeriesByType(subType, true), cb, context);
        },

        /**
         * @param {}
         */
        isSeriesFiltered: function (seriesModel) {
            return zrUtil.indexOf(this._componentsMap.series, seriesModel) < 0;
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        filterSeries: function (cb, context) {
            var componentsMap = this._componentsMap;
            componentsMap.series = zrUtil.filter(
                componentsMap.series, cb, context
            );
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        mapSeries: function (cb, context) {
            var componentsMap = this._componentsMap;
            componentsMap.series = zrUtil.map(
                componentsMap.series, cb, context
            );
        },

        restoreData: function () {
            var componentsMap = this._componentsMap;
            var componentTypes = [];

            each(this._componentsMapAll, function (components, componentType) {
                componentsMap[componentType] = components.slice();
                componentTypes.push(componentType);
            });

            ComponentModel.topologicalTravel(
                componentTypes,
                ComponentModel.getAllClassMainTypes(),
                function (componentType, dependencies) {
                    each(componentsMap[componentType], function (component) {
                        component.restoreData();
                    });
                }
            );
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
            each(types, function (type) {
                ret[type] = (this._componentsMap[type] || []).slice();
            }, this);

            return ret;
        }
    });

    return GlobalModel;
});