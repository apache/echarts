/**
 * ECharts global model
 *
 * @module {echarts/model/Global}
 *
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('./Model');
    var each = zrUtil.each;
    var filter = zrUtil.filter;
    var map = zrUtil.map;

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
             * Mapping between filtered series list and raw series list.
             * key: filtered series indices, value: raw series indices.
             * @type {Array.<nubmer>}
             * @private
             */
            this._seriesIndices;

            /**
             * @type {module:echarts/model/Model}
             * @private
             */
            this._theme = new Model(theme);

            mergeTheme(option, theme);

            // TODO Needs clone when merging to the unexisted property
            zrUtil.merge(option, globalDefault, false);

            this.mergeOption(option);
        },

        /**
         * @protected
         */
        mergeOption: function (newOption) {
            var option = this.option;
            var componentsMap = this._componentsMap;
            var newCptTypes = [];

            // 如果不存在对应的 component model 则直接 merge
            each(newOption, function (componentOption, mainType) {
                if (!ComponentModel.hasClass(mainType)) {
                    if (componentOption && typeof componentOption === 'object') {
                        option[mainType] = option[mainType] == null
                            ? zrUtil.clone(componentOption)
                            : zrUtil.merge(option[mainType], componentOption);
                    }
                    else {
                        option[mainType] = componentOption;
                    }
                }
                else {
                    newCptTypes.push(mainType);
                }
            });

            // FIXME OPTION 同步是否要改回原来的
            ComponentModel.topologicalTravel(
                newCptTypes, ComponentModel.getAllClassMainTypes(), visitComponent, this
            );

            function visitComponent(mainType, dependencies) {
                var newCptOptionList = newOption[mainType];

                // Normalize
                if (!(zrUtil.isArray(newCptOptionList))) {
                    newCptOptionList = [newCptOptionList];
                }
                if (!componentsMap[mainType]) {
                    componentsMap[mainType] = [];
                }

                var existComponents = mappingToExists(
                    componentsMap[mainType], newCptOptionList
                );

                var keyInfoList = makeKeyInfo(
                    mainType, newCptOptionList, existComponents
                );

                var dependentModels = getComponentsByTypes(
                    componentsMap, dependencies
                );

                each(newCptOptionList, function (newCptOption, index) {
                    var componentModel = existComponents[index];

                    var ComponentModelClass = ComponentModel.getClass(
                        mainType, keyInfoList[index].subType, true
                    );

                    if (componentModel && componentModel instanceof ComponentModelClass) {
                        componentModel.mergeOption(newCptOption, this);
                    }
                    else {
                        // PENDING Global as parent ?
                        componentModel = new ComponentModelClass(
                            newCptOption, this, this,
                            zrUtil.extend(
                                {
                                    dependentModels: dependentModels,
                                    componentIndex: index
                                },
                                keyInfoList[index]
                            )
                        );
                        componentsMap[mainType][index] = componentModel;
                    }
                }, this);

                // Backup series for filtering.
                if (mainType === 'series') {
                    this._seriesIndices = createSeriesIndices(componentsMap.series);
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

            return filterBySubType(result, condition);
        },

        /**
         * The interface is different from queryComponents,
         * which is convenient for inner usage.
         *
         * @usage
         * findComponents(
         *     {mainType: 'dataZoom', query: {dataZoomId: 'abc'}},
         *     function (model, index) {...}
         * );
         * findComponents(
         *     {mainType: 'series', subType: 'pie', query: {seriesName: 'uio'}},
         *     function (model, index) {...}
         * );
         * findComponents(
         *     {mainType: 'series'},
         *     function (model, index) {...}
         * );
         *
         * @param {Object} condition
         * @param {string} condition.mainType Mandatory.
         * @param {string} [condition.subType] Optional.
         * @param {Object} [condition.query] like {xxxIndex, xxxId, xxxName},
         *        where xxx is mainType.
         *        If query attribute is null/undefined, do not filtering by
         *        query conditions, which is convenient for no-payload
         *        situations like visual coding, layout.
         * @param {Function} [condition.filter] parameter: component, return boolean.
         */
        findComponents: function (condition) {
            var mainType = condition.mainType;
            var query = condition.query;
            var result;

            if (query) {
                condition.index = query[mainType + 'Index'];
                condition.id = query[mainType + 'Id'];
                condition.name = query[mainType + 'Name'];

                result = this.queryComponents(condition);
            }
            else {
                result = filterBySubType(
                    this._componentsMap[mainType], condition
                );
            }

            if (condition.filter) {
                result = filter(result, condition.filter);
            }

            return result;
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
         *     {mainType: 'dataZoom', query: {dataZoomId: 'abc'}},
         *     function (model, index) {...}
         * );
         * eachComponent(
         *     {mainType: 'series', subType: 'pie', query: {seriesName: 'uio'}},
         *     function (model, index) {...}
         * );
         *
         * @param {string|Object=} mainType When mainType is object, the definition
         *                                  is the same as the method 'findComponents'.
         * @param {Function} cb
         * @param {*} context
         */
        eachComponent: function (mainType, cb, context) {
            var componentsMap = this._componentsMap;

            if (typeof mainType === 'function') {
                context = cb;
                cb = mainType;
                each(componentsMap, function (components, componentType) {
                    each(components, function (component, index) {
                        cb.call(context, componentType, component, index);
                    });
                });
            }
            else if (zrUtil.isString(mainType)) {
                each(componentsMap[mainType], cb, context);
            }
            else if (zrUtil.isObject(mainType)) {
                each(this.findComponents(mainType), cb, context);
            }
        },

        /**
         * @param {string} name
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesByName: function (name) {
            var series = this._componentsMap.series;
            return filter(series, function (oneSeries) {
                return oneSeries.name === name;
            });
        },

        /**
         * @param {number} seriesIndex
         * @return {module:echarts/model/Series}
         */
        getSeriesByIndex: function (seriesIndex) {
            return this._componentsMap.series[seriesIndex];
        },

        /**
         * @param {string} subType
         * @return {Array.<module:echarts/model/Series>}
         */
        getSeriesByType: function (subType) {
            var series = this._componentsMap.series;
            return filter(series, function (oneSeries) {
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
         * After filtering, series may be different
         * frome raw series.
         *
         * @param {Function} cb
         * @param {*} context
         */
        eachSeries: function (cb, context) {
            assertSeriesInitialized(this);
            each(this._seriesIndices, function (rawSeriesIndex) {
                var series = this._componentsMap.series[rawSeriesIndex];
                cb.call(context, series, rawSeriesIndex);
            }, this);
        },

        /**
         * Iterate raw series before filtered.
         *
         * @param {Function} cb
         * @param {*} context
         */
        eachRawSeries: function (cb, context) {
            each(this._componentsMap.series, cb, context);
        },

        /**
         * After filtering, series may be different.
         * frome raw series.
         *
         * @parma {string} subType
         * @param {Function} cb
         * @param {*} context
         */
        eachSeriesByType: function (subType, cb, context) {
            assertSeriesInitialized(this);
            each(this._seriesIndices, function (rawSeriesIndex) {
                var series = this._componentsMap.series[rawSeriesIndex];
                if (series.subType === subType) {
                    cb.call(context, series, rawSeriesIndex);
                }
            }, this);
        },

        /**
         * Iterate raw series before filtered of given type.
         *
         * @parma {string} subType
         * @param {Function} cb
         * @param {*} context
         */
        eachRawSeriesByType: function (subType, cb, context) {
            return each(this.getSeriesByType(subType), cb, context);
        },

        /**
         * @param {module:echarts/model/Series} seriesModel
         */
        isSeriesFiltered: function (seriesModel) {
            assertSeriesInitialized(this);
            return zrUtil.indexOf(this._seriesIndices, seriesModel.componentIndex) < 0;
        },

        /**
         * @param {Function} cb
         * @param {*} context
         */
        filterSeries: function (cb, context) {
            assertSeriesInitialized(this);
            var filteredSeries = filter(
                this._componentsMap.series, cb, context
            );
            this._seriesIndices = createSeriesIndices(filteredSeries);
        },

        restoreData: function () {
            var componentsMap = this._componentsMap;

            this._seriesIndices = createSeriesIndices(componentsMap.series);

            var componentTypes = [];
            each(componentsMap, function (components, componentType) {
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
        }

    });


    /**
     * @inner
     */
    function mergeTheme(option, theme) {
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
    }

    /**
     * @inner
     * @param {Array.<string>|string} types model types
     * @return {Object} key: {string} type, value: {Array.<Object>} models
     */
    function getComponentsByTypes(componentsMap, types) {
        if (!zrUtil.isArray(types)) {
            types = types ? [types] : [];
        }

        var ret = {};
        each(types, function (type) {
            ret[type] = (componentsMap[type] || []).slice();
        });

        return ret;
    }

    /**
     * @inner
     */
    function mappingToExists(existComponents, newComponentOptionList) {
        existComponents = (existComponents || []).slice();
        var result = [];

        // Mapping by id if specified.
        each(newComponentOptionList, function (componentOption, index) {
            if (!componentOption.id) {
                return;
            }
            for (var i = 0, len = existComponents.length; i < len; i++) {
                if (existComponents[i].id === componentOption.id) {
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
    }

    /**
     * @inner
     */
    function makeKeyInfo(mainType, newCptOptionList, existComponents) {
        // We use this id to hash component models and view instances
        // in echarts. id can be specified by user, or auto generated.

        // The id generation rule ensures when setOption are called in
        // no-merge mode, new model is able to replace old model, and
        // new view instance are able to mapped to old instance.
        // So we generate id by name and type.

        // name can be duplicated among components, which is convenient
        // to specify multi components (like series) by one name.

        // raw option should not be modified. for example, xxx.name might
        // be rendered, so default name ('') should not be replaced by
        // generated name. So we use keyInfoList wrap key info.
        var keyInfoList = [];

        // We use a prefix when generating name or id to prevent
        // user using the generated name or id directly.
        var prefix = '\0';

        // Ensure that each id is distinct.
        var idSet = {};

        // key: name, value: count by single name.
        var nameCount = {};

        // Complete subType
        each(newCptOptionList, function (opt, index) {
            var existCpt = existComponents[index];
            var subType = determineSubType(mainType, opt, existCpt);
            var item = {mainType: mainType, subType: subType};
            keyInfoList.push(item);
        });

        function eachOpt(cb) {
            each(newCptOptionList, function (opt, index) {
                var existCpt = existComponents[index];
                var item = keyInfoList[index];
                var fullType = mainType + '.' + item.subType;
                cb(item, opt, existCpt, fullType);
            });
        }

        // Make name
        eachOpt(function (item, opt, existCpt, fullType) {
            item.name = existCpt
                ? existCpt.name
                : opt.name != null
                ? opt.name
                : prefix + '-';
            // init nameCount
            nameCount[item.name] = 0;
        });

        // Make id
        eachOpt(function (item, opt, existCpt, fullType) {
            var itemName = item.name;

            item.id = existCpt
                ? existCpt.id
                : opt.id != null
                ? opt.id
                // (1) Using delimiter to escapse dulipcation.
                // (2) Using type tu ensure that view with different
                //     type will not be mapped.
                // (3) Consider this situatoin:
                //      optionA: [{name: 'a'}, {name: 'a'}, {..}]
                //      optionB [{..}, {name: 'a'}, {name: 'a'}]
                //     Using nameCount to ensure that series with
                //     the same name between optionA and optionB
                //     can be mapped.
                : prefix + [fullType, itemName, nameCount[itemName]++].join('|');

            if (idSet[item.id]) {
                // FIXME
                // how to throw
                throw new Error('id duplicates: ' + item.id);
            }
            idSet[item.id] = 1;
        });

        return keyInfoList;
    }

    /**
     * @inner
     */
    function determineSubType(mainType, newCptOption, existComponent) {
        var subType = newCptOption.type
            ? newCptOption.type
            : existComponent
            ? existComponent.subType
            // Use determineSubType only when there is no existComponent.
            : ComponentModel.determineSubType(mainType, newCptOption);

        // tooltip, markline, markpoint may always has no subType
        return subType;
    }

    /**
     * @inner
     */
    function createSeriesIndices(seriesModels) {
        return map(seriesModels, function (series) {
            return series.componentIndex;
        });
    }

    /**
     * @inner
     */
    function filterBySubType(components, condition) {
        return condition.hasOwnProperty('subType')
            ? filter(components, function (cpt) {
                return cpt.subType === condition.subType;
            })
            : components;
    }

    /**
     * @inner
     */
    function assertSeriesInitialized(ecModel) {
        // Components that use _seriesIndices should depends on series component,
        // which make sure that their initialization is after series.
        if (!ecModel._seriesIndices) {
            // FIXME
            // 验证和提示怎么写
            throw new Error('Series is not initialized. Please depends sereis.');
        }
    }

    return GlobalModel;
});