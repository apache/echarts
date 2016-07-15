/**
 * ECharts global model
 *
 * @module {echarts/model/Global}
 *
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../util/model');
    var Model = require('./Model');
    var each = zrUtil.each;
    var filter = zrUtil.filter;
    var map = zrUtil.map;
    var isArray = zrUtil.isArray;
    var indexOf = zrUtil.indexOf;
    var isObject = zrUtil.isObject;

    var ComponentModel = require('./Component');

    var globalDefault = require('./globalDefault');

    var OPTION_INNER_KEY = '\0_ec_inner';

    /**
     * @alias module:echarts/model/Global
     *
     * @param {Object} option
     * @param {module:echarts/model/Model} parentModel
     * @param {Object} theme
     */
    var GlobalModel = Model.extend({

        constructor: GlobalModel,

        init: function (option, parentModel, theme, optionManager) {
            theme = theme || {};

            this.option = null; // Mark as not initialized.

            /**
             * @type {module:echarts/model/Model}
             * @private
             */
            this._theme = new Model(theme);

            /**
             * @type {module:echarts/model/OptionManager}
             */
            this._optionManager = optionManager;
        },

        setOption: function (option, optionPreprocessorFuncs) {
            zrUtil.assert(
                !(OPTION_INNER_KEY in option),
                'please use chart.getOption()'
            );

            this._optionManager.setOption(option, optionPreprocessorFuncs);

            this.resetOption();
        },

        /**
         * @param {string} type null/undefined: reset all.
         *                      'recreate': force recreate all.
         *                      'timeline': only reset timeline option
         *                      'media': only reset media query option
         * @return {boolean} Whether option changed.
         */
        resetOption: function (type) {
            var optionChanged = false;
            var optionManager = this._optionManager;

            if (!type || type === 'recreate') {
                var baseOption = optionManager.mountOption(type === 'recreate');

                if (!this.option || type === 'recreate') {
                    initBase.call(this, baseOption);
                }
                else {
                    this.restoreData();
                    this.mergeOption(baseOption);
                }
                optionChanged = true;
            }

            if (type === 'timeline' || type === 'media') {
                this.restoreData();
            }

            if (!type || type === 'recreate' || type === 'timeline') {
                var timelineOption = optionManager.getTimelineOption(this);
                timelineOption && (this.mergeOption(timelineOption), optionChanged = true);
            }

            if (!type || type === 'recreate' || type === 'media') {
                var mediaOptions = optionManager.getMediaOption(this, this._api);
                if (mediaOptions.length) {
                    each(mediaOptions, function (mediaOption) {
                        this.mergeOption(mediaOption, optionChanged = true);
                    }, this);
                }
            }

            return optionChanged;
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
                if (componentOption == null) {
                    return;
                }

                if (!ComponentModel.hasClass(mainType)) {
                    option[mainType] = option[mainType] == null
                        ? zrUtil.clone(componentOption)
                        : zrUtil.merge(option[mainType], componentOption, true);
                }
                else {
                    newCptTypes.push(mainType);
                }
            });

            // FIXME OPTION 同步是否要改回原来的
            ComponentModel.topologicalTravel(
                newCptTypes, ComponentModel.getAllClassMainTypes(), visitComponent, this
            );

            this._seriesIndices = this._seriesIndices || [];

            function visitComponent(mainType, dependencies) {
                var newCptOptionList = modelUtil.normalizeToArray(newOption[mainType]);

                var mapResult = modelUtil.mappingToExists(
                    componentsMap[mainType], newCptOptionList
                );

                makeKeyInfo(mainType, mapResult);

                var dependentModels = getComponentsByTypes(
                    componentsMap, dependencies
                );

                option[mainType] = [];
                componentsMap[mainType] = [];

                each(mapResult, function (resultItem, index) {
                    var componentModel = resultItem.exist;
                    var newCptOption = resultItem.option;

                    zrUtil.assert(
                        isObject(newCptOption) || componentModel,
                        'Empty component definition'
                    );

                    // Consider where is no new option and should be merged using {},
                    // see removeEdgeAndAdd in topologicalTravel and
                    // ComponentModel.getAllClassMainTypes.
                    if (!newCptOption) {
                        componentModel.mergeOption({}, this);
                        componentModel.optionUpdated({}, false);
                    }
                    else {
                        var ComponentModelClass = ComponentModel.getClass(
                            mainType, resultItem.keyInfo.subType, true
                        );

                        if (componentModel && componentModel instanceof ComponentModelClass) {
                            componentModel.mergeOption(newCptOption, this);
                            componentModel.optionUpdated(newCptOption, false);
                        }
                        else {
                            // PENDING Global as parent ?
                            var extraOpt = zrUtil.extend(
                                {
                                    dependentModels: dependentModels,
                                    componentIndex: index
                                },
                                resultItem.keyInfo
                            );
                            componentModel = new ComponentModelClass(
                                newCptOption, this, this, extraOpt
                            );
                            componentModel.init(newCptOption, this, this, extraOpt);
                            // Call optionUpdated after init.
                            // newCptOption has been used as componentModel.option
                            // and may be merged with theme and default, so pass null
                            // to avoid confusion.
                            componentModel.optionUpdated(null, true);
                        }
                    }

                    componentsMap[mainType][index] = componentModel;
                    option[mainType][index] = componentModel.option;
                }, this);

                // Backup series for filtering.
                if (mainType === 'series') {
                    this._seriesIndices = createSeriesIndices(componentsMap.series);
                }
            }
        },

        /**
         * Get option for output (cloned option and inner info removed)
         * @public
         * @return {Object}
         */
        getOption: function () {
            var option = zrUtil.clone(this.option);

            each(option, function (opts, mainType) {
                if (ComponentModel.hasClass(mainType)) {
                    var opts = modelUtil.normalizeToArray(opts);
                    for (var i = opts.length - 1; i >= 0; i--) {
                        // Remove options with inner id.
                        if (modelUtil.isIdInner(opts[i])) {
                            opts.splice(i, 1);
                        }
                    }
                    option[mainType] = opts;
                }
            });

            delete option[OPTION_INNER_KEY];

            return option;
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
                if (!isArray(index)) {
                    index = [index];
                }
                result = filter(map(index, function (idx) {
                    return cpts[idx];
                }), function (val) {
                    return !!val;
                });
            }
            else if (id != null) {
                var isIdArray = isArray(id);
                result = filter(cpts, function (cpt) {
                    return (isIdArray && indexOf(id, cpt.id) >= 0)
                        || (!isIdArray && cpt.id === id);
                });
            }
            else if (name != null) {
                var isNameArray = isArray(name);
                result = filter(cpts, function (cpt) {
                    return (isNameArray && indexOf(name, cpt.name) >= 0)
                        || (!isNameArray && cpt.name === name);
                });
            }

            return filterBySubType(result, condition);
        },

        /**
         * The interface is different from queryComponents,
         * which is convenient for inner usage.
         *
         * @usage
         * var result = findComponents(
         *     {mainType: 'dataZoom', query: {dataZoomId: 'abc'}}
         * );
         * var result = findComponents(
         *     {mainType: 'series', subType: 'pie', query: {seriesName: 'uio'}}
         * );
         * var result = findComponents(
         *     {mainType: 'series'},
         *     function (model, index) {...}
         * );
         * // result like [component0, componnet1, ...]
         *
         * @param {Object} condition
         * @param {string} condition.mainType Mandatory.
         * @param {string} [condition.subType] Optional.
         * @param {Object} [condition.query] like {xxxIndex, xxxId, xxxName},
         *        where xxx is mainType.
         *        If query attribute is null/undefined or has no index/id/name,
         *        do not filtering by query conditions, which is convenient for
         *        no-payload situations or when target of action is global.
         * @param {Function} [condition.filter] parameter: component, return boolean.
         * @return {Array.<module:echarts/model/Component>}
         */
        findComponents: function (condition) {
            var query = condition.query;
            var mainType = condition.mainType;

            var queryCond = getQueryCond(query);
            var result = queryCond
                ? this.queryComponents(queryCond)
                : this._componentsMap[mainType];

            return doFilter(filterBySubType(result, condition));

            function getQueryCond(q) {
                var indexAttr = mainType + 'Index';
                var idAttr = mainType + 'Id';
                var nameAttr = mainType + 'Name';
                return q && (
                        q.hasOwnProperty(indexAttr)
                        || q.hasOwnProperty(idAttr)
                        || q.hasOwnProperty(nameAttr)
                    )
                    ? {
                        mainType: mainType,
                        // subType will be filtered finally.
                        index: q[indexAttr],
                        id: q[idAttr],
                        name: q[nameAttr]
                    }
                    : null;
            }

            function doFilter(res) {
                return condition.filter
                     ? filter(res, condition.filter)
                     : res;
            }
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
            else if (isObject(mainType)) {
                var queryResult = this.findComponents(mainType);
                each(queryResult, cb, context);
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
                    if (option[name] == null) {
                        option[name] = theme[name];
                    }
                }
            }
        }
    }

    function initBase(baseOption) {
        baseOption = baseOption;

        // Using OPTION_INNER_KEY to mark that this option can not be used outside,
        // i.e. `chart.setOption(chart.getModel().option);` is forbiden.
        this.option = {};
        this.option[OPTION_INNER_KEY] = 1;

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
        this._seriesIndices = null;

        mergeTheme(baseOption, this._theme.option);

        // TODO Needs clone when merging to the unexisted property
        zrUtil.merge(baseOption, globalDefault, false);

        this.mergeOption(baseOption);
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
    function makeKeyInfo(mainType, mapResult) {
        // We use this id to hash component models and view instances
        // in echarts. id can be specified by user, or auto generated.

        // The id generation rule ensures new view instance are able
        // to mapped to old instance when setOption are called in
        // no-merge mode. So we generate model id by name and plus
        // type in view id.

        // name can be duplicated among components, which is convenient
        // to specify multi components (like series) by one name.

        // Ensure that each id is distinct.
        var idMap = {};

        each(mapResult, function (item, index) {
            var existCpt = item.exist;
            existCpt && (idMap[existCpt.id] = item);
        });

        each(mapResult, function (item, index) {
            var opt = item.option;

            zrUtil.assert(
                !opt || opt.id == null || !idMap[opt.id] || idMap[opt.id] === item,
                'id duplicates: ' + (opt && opt.id)
            );

            opt && opt.id != null && (idMap[opt.id] = item);

            // Complete subType
            if (isObject(opt)) {
                var subType = determineSubType(mainType, opt, item.exist);
                item.keyInfo = {mainType: mainType, subType: subType};
            }
        });

        // Make name and id.
        each(mapResult, function (item, index) {
            var existCpt = item.exist;
            var opt = item.option;
            var keyInfo = item.keyInfo;

            if (!isObject(opt)) {
                return;
            }

            // name can be overwitten. Consider case: axis.name = '20km'.
            // But id generated by name will not be changed, which affect
            // only in that case: setOption with 'not merge mode' and view
            // instance will be recreated, which can be accepted.
            keyInfo.name = opt.name != null
                ? opt.name + ''
                : existCpt
                ? existCpt.name
                : '\0-';

            if (existCpt) {
                keyInfo.id = existCpt.id;
            }
            else if (opt.id != null) {
                keyInfo.id = opt.id + '';
            }
            else {
                // Consider this situatoin:
                //  optionA: [{name: 'a'}, {name: 'a'}, {..}]
                //  optionB [{..}, {name: 'a'}, {name: 'a'}]
                // Series with the same name between optionA and optionB
                // should be mapped.
                var idNum = 0;
                do {
                    keyInfo.id = '\0' + keyInfo.name + '\0' + idNum++;
                }
                while (idMap[keyInfo.id]);
            }

            idMap[keyInfo.id] = item;
        });
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
        }) || [];
    }

    /**
     * @inner
     */
    function filterBySubType(components, condition) {
        // Using hasOwnProperty for restrict. Consider
        // subType is undefined in user payload.
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
        if (__DEV__) {
            if (!ecModel._seriesIndices) {
                throw new Error('Series has not been initialized yet.');
            }
        }
    }

    zrUtil.mixin(GlobalModel, require('./mixin/colorPalette'));

    return GlobalModel;
});