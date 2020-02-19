/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/


/**
 * Caution: If the mechanism should be changed some day, these cases
 * should be considered:
 *
 * (1) In `merge option` mode, if using the same option to call `setOption`
 * many times, the result should be the same (try our best to ensure that).
 * (2) In `merge option` mode, if a component has no id/name specified, it
 * will be merged by index, and the result sequence of the components is
 * consistent to the original sequence.
 * (3) `reset` feature (in toolbox). Find detailed info in comments about
 * `mergeOption` in module:echarts/model/OptionManager.
 */

import {__DEV__} from '../config';
import {
    each, filter, map, isArray, indexOf, isObject, isString,
    createHashMap, assert, clone, merge, extend, mixin, HashMap
} from 'zrender/src/core/util';
import * as modelUtil from '../util/model';
import Model from './Model';
import ComponentModel, {ComponentModelConstructor} from './Component';
import globalDefault from './globalDefault';
import {ColorPaletteMixin} from './mixin/colorPalette';
import {resetSourceDefaulter} from '../data/helper/sourceHelper';
import SeriesModel from './Series';
import {
    Payload,
    OptionPreprocessor,
    ECOption,
    ECUnitOption,
    ThemeOption,
    ComponentOption,
    ComponentMainType,
    ComponentSubType
} from '../util/types';
import OptionManager from './OptionManager';
import Scheduler from '../stream/Scheduler';
import { Dictionary } from 'zrender/src/core/types';

var OPTION_INNER_KEY = '\0_ec_inner';


class GlobalModel extends Model {

    // @readonly
    option: ECUnitOption;

    private _theme: Model;

    private _optionManager: OptionManager;

    private _componentsMap: HashMap<ComponentModel[]>;

    /**
     * Mapping between filtered series list and raw series list.
     * key: filtered series indices, value: raw series indices.
     */
    private _seriesIndices: number[];

    /**
     * Key: seriesIndex
     */
    private _seriesIndicesMap: HashMap<any>;

    // Injectable properties:
    scheduler: Scheduler;


    init(
        option: ECOption,
        parentModel: Model,
        ecModel: GlobalModel,
        theme: object,
        optionManager: OptionManager
    ): void {
        theme = theme || {};
        this.option = null; // Mark as not initialized.
        this._theme = new Model(theme);
        this._optionManager = optionManager;
    }

    setOption(option: ECOption, optionPreprocessorFuncs: OptionPreprocessor[]): void {
        assert(
            !(OPTION_INNER_KEY in option),
            'please use chart.getOption()'
        );

        this._optionManager.setOption(option, optionPreprocessorFuncs);

        this.resetOption(null);
    }

    /**
     * @param type null/undefined: reset all.
     *        'recreate': force recreate all.
     *        'timeline': only reset timeline option
     *        'media': only reset media query option
     * @return Whether option changed.
     */
    resetOption(type: string): boolean {
        var optionChanged = false;
        var optionManager = this._optionManager;

        if (!type || type === 'recreate') {
            var baseOption = optionManager.mountOption(type === 'recreate');

            if (!this.option || type === 'recreate') {
                initBase(this, baseOption);
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
            if (timelineOption) {
                optionChanged = true;
                this.mergeOption(timelineOption);
            }
        }

        if (!type || type === 'recreate' || type === 'media') {
            var mediaOptions = optionManager.getMediaOption(this);
            if (mediaOptions.length) {
                each(mediaOptions, function (mediaOption) {
                    optionChanged = true;
                    this.mergeOption(mediaOption);
                }, this);
            }
        }

        return optionChanged;
    }

    mergeOption(newOption: ECUnitOption): void {
        var option = this.option;
        var componentsMap = this._componentsMap;
        var newCptTypes: ComponentMainType[] = [];

        resetSourceDefaulter(this);

        // If no component class, merge directly.
        // For example: color, animaiton options, etc.
        each(newOption, function (componentOption, mainType: ComponentMainType) {
            if (componentOption == null) {
                return;
            }

            if (!(ComponentModel as ComponentModelConstructor).hasClass(mainType)) {
                // globalSettingTask.dirty();
                option[mainType] = option[mainType] == null
                    ? clone(componentOption)
                    : merge(option[mainType], componentOption, true);
            }
            else if (mainType) {
                newCptTypes.push(mainType);
            }
        });

        (ComponentModel as ComponentModelConstructor).topologicalTravel(
            newCptTypes,
            (ComponentModel as ComponentModelConstructor).getAllClassMainTypes(),
            visitComponent,
            this
        );

        function visitComponent(
            this: GlobalModel,
            mainType: ComponentMainType,
            dependencies: string | string[]
        ): void {

            var newCptOptionList = modelUtil.normalizeToArray(newOption[mainType]);

            var mapResult = modelUtil.mappingToExists(
                componentsMap.get(mainType), newCptOptionList
            );

            modelUtil.makeIdAndName(mapResult);

            // Set mainType and complete subType.
            each(mapResult, function (item) {
                var opt = item.option;
                if (isObject(opt)) {
                    item.keyInfo.mainType = mainType;
                    item.keyInfo.subType = determineSubType(mainType, opt, item.exist);
                }
            });

            var dependentModels = getComponentsByTypes(
                componentsMap, dependencies
            );

            option[mainType] = [];
            componentsMap.set(mainType, []);

            each(mapResult, function (resultItem, index) {
                var componentModel = resultItem.exist;
                var newCptOption = resultItem.option;

                assert(
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
                    var ComponentModelClass = (ComponentModel as ComponentModelConstructor).getClass(
                        mainType, resultItem.keyInfo.subType, true
                    );

                    if (componentModel && componentModel.constructor === ComponentModelClass) {
                        componentModel.name = resultItem.keyInfo.name;
                        // componentModel.settingTask && componentModel.settingTask.dirty();
                        componentModel.mergeOption(newCptOption, this);
                        componentModel.optionUpdated(newCptOption, false);
                    }
                    else {
                        // PENDING Global as parent ?
                        var extraOpt = extend(
                            {
                                dependentModels: dependentModels,
                                componentIndex: index
                            },
                            resultItem.keyInfo
                        );
                        componentModel = new ComponentModelClass(
                            newCptOption, this, this, extraOpt
                        );
                        extend(componentModel, extraOpt);
                        componentModel.init(newCptOption, this, this);

                        // Call optionUpdated after init.
                        // newCptOption has been used as componentModel.option
                        // and may be merged with theme and default, so pass null
                        // to avoid confusion.
                        componentModel.optionUpdated(null, true);
                    }
                }

                componentsMap.get(mainType)[index] = componentModel;
                option[mainType][index] = componentModel.option;
            }, this);

            // Backup series for filtering.
            if (mainType === 'series') {
                createSeriesIndices(this, componentsMap.get('series'));
            }
        }

        this._seriesIndicesMap = createHashMap<number>(
            this._seriesIndices = this._seriesIndices || []
        );
    }

    /**
     * Get option for output (cloned option and inner info removed)
     */
    getOption(): ECUnitOption {
        var option = clone(this.option);

        each(option, function (opts, mainType) {
            if ((ComponentModel as ComponentModelConstructor).hasClass(mainType)) {
                opts = modelUtil.normalizeToArray(opts);
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
    }

    getTheme(): Model {
        return this._theme;
    }

    /**
     * @param idx 0 by default
     */
    getComponent(mainType: string, idx?: number): ComponentModel {
        var list = this._componentsMap.get(mainType);
        if (list) {
            return list[idx || 0];
        }
    }

    queryComponents(condition: QueryConditionKindB): ComponentModel[] {
        var mainType = condition.mainType;
        if (!mainType) {
            return [];
        }

        var index = condition.index;
        var id = condition.id;
        var name = condition.name;

        var cpts = this._componentsMap.get(mainType);

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
                return (isIdArray && indexOf(id as string[], cpt.id) >= 0)
                    || (!isIdArray && cpt.id === id);
            });
        }
        else if (name != null) {
            var isNameArray = isArray(name);
            result = filter(cpts, function (cpt) {
                return (isNameArray && indexOf(name as string[], cpt.name) >= 0)
                    || (!isNameArray && cpt.name === name);
            });
        }
        else {
            // Return all components with mainType
            result = cpts.slice();
        }

        return filterBySubType(result, condition);
    }

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
     *     {mainType: 'series',
     *     filter: function (model, index) {...}}
     * );
     * // result like [component0, componnet1, ...]
     */
    findComponents(condition: QueryConditionKindA): ComponentModel[] {
        var query = condition.query;
        var mainType = condition.mainType;

        var queryCond = getQueryCond(query);
        var result = queryCond
            ? this.queryComponents(queryCond)
            : this._componentsMap.get(mainType);

        return doFilter(filterBySubType(result, condition));

        function getQueryCond(q: QueryConditionKindA['query']): QueryConditionKindB {
            var indexAttr = mainType + 'Index';
            var idAttr = mainType + 'Id';
            var nameAttr = mainType + 'Name';
            return q && (
                    q[indexAttr] != null
                    || q[idAttr] != null
                    || q[nameAttr] != null
                )
                ? {
                    mainType: mainType,
                    // subType will be filtered finally.
                    index: q[indexAttr] as (number | number[]),
                    id: q[idAttr] as (string | string[]),
                    name: q[nameAttr] as (string | string[])
                }
                : null;
        }

        function doFilter(res: ComponentModel[]) {
            return condition.filter
                    ? filter(res, condition.filter)
                    : res;
        }
    }

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
     */
    eachComponent<T>(
        cb: EachComponentAllCallback,
        context?: T
    ): void
    eachComponent<T>(
        mainType: string,
        cb: EachComponentInMainTypeCallback,
        context?: T
    ): void
    eachComponent<T>(
        mainType: QueryConditionKindA,
        cb: EachComponentInMainTypeCallback,
        context?: T
    ): void
    eachComponent<T>(
        mainType: string | QueryConditionKindA | EachComponentAllCallback,
        cb?: EachComponentInMainTypeCallback | T,
        context?: T
    ) {
        var componentsMap = this._componentsMap;

        if (typeof mainType === 'function') {
            var contextReal = cb as T;
            var cbReal = mainType as EachComponentAllCallback;
            componentsMap.each(function (components, componentType) {
                each(components, function (component, index) {
                    cbReal.call(contextReal, componentType, component, index);
                });
            });
        }
        else if (isString(mainType)) {
            each(componentsMap.get(mainType), cb as EachComponentInMainTypeCallback, context);
        }
        else if (isObject(mainType)) {
            var queryResult = this.findComponents(mainType);
            each(queryResult, cb as EachComponentInMainTypeCallback, context);
        }
    }

    getSeriesByName(name: string): SeriesModel[] {
        var series = this._componentsMap.get('series') as SeriesModel[];
        return filter(series, function (oneSeries) {
            return oneSeries.name === name;
        });
    }

    getSeriesByIndex(seriesIndex: number): SeriesModel {
        return this._componentsMap.get('series')[seriesIndex] as SeriesModel;
    }

    /**
     * Get series list before filtered by type.
     * FIXME: rename to getRawSeriesByType?
     */
    getSeriesByType(subType: ComponentSubType): SeriesModel[] {
        var series = this._componentsMap.get('series') as SeriesModel[];
        return filter(series, function (oneSeries) {
            return oneSeries.subType === subType;
        });
    }

    getSeries(): SeriesModel[] {
        return this._componentsMap.get('series').slice() as SeriesModel[];
    }

    getSeriesCount(): number {
        return this._componentsMap.get('series').length;
    }

    /**
     * After filtering, series may be different
     * frome raw series.
     */
    eachSeries<T>(
        cb: (this: T, series: SeriesModel, rawSeriesIndex: number) => void,
        context?: T
    ): void {
        assertSeriesInitialized(this);
        each(this._seriesIndices, function (rawSeriesIndex) {
            var series = this._componentsMap.get('series')[rawSeriesIndex] as SeriesModel;
            cb.call(context, series, rawSeriesIndex);
        }, this);
    }

    /**
     * Iterate raw series before filtered.
     *
     * @param {Function} cb
     * @param {*} context
     */
    eachRawSeries<T>(
        cb: (this: T, series: SeriesModel, rawSeriesIndex: number) => void,
        context?: T
    ): void {
        each(this._componentsMap.get('series'), cb, context);
    }

    /**
     * After filtering, series may be different.
     * frome raw series.
     */
    eachSeriesByType<T>(
        subType: ComponentSubType,
        cb: (this: T, series: SeriesModel, rawSeriesIndex: number) => void,
        context?: T
    ): void {
        assertSeriesInitialized(this);
        each(this._seriesIndices, function (rawSeriesIndex) {
            var series = this._componentsMap.get('series')[rawSeriesIndex] as SeriesModel;
            if (series.subType === subType) {
                cb.call(context, series, rawSeriesIndex);
            }
        }, this);
    }

    /**
     * Iterate raw series before filtered of given type.
     */
    eachRawSeriesByType<T>(
        subType: ComponentSubType,
        cb: (this: T, series: SeriesModel, rawSeriesIndex: number) => void,
        context?: T
    ): void {
        return each(this.getSeriesByType(subType), cb, context);
    }

    isSeriesFiltered(seriesModel: SeriesModel): boolean {
        assertSeriesInitialized(this);
        return this._seriesIndicesMap.get(seriesModel.componentIndex + '') == null;
    }

    getCurrentSeriesIndices(): number[] {
        return (this._seriesIndices || []).slice();
    }

    filterSeries<T>(
        cb: (this: T, series: SeriesModel, rawSeriesIndex: number) => boolean,
        context?: T
    ): void {
        assertSeriesInitialized(this);
        var filteredSeries = filter(
            this._componentsMap.get('series') as SeriesModel[], cb, context
        );
        createSeriesIndices(this, filteredSeries);
    }

    restoreData(payload?: Payload): void {
        var componentsMap = this._componentsMap;

        createSeriesIndices(this, componentsMap.get('series'));

        var componentTypes: string[] = [];
        componentsMap.each(function (components, componentType) {
            componentTypes.push(componentType);
        });

        (ComponentModel as ComponentModelConstructor).topologicalTravel(
            componentTypes,
            (ComponentModel as ComponentModelConstructor).getAllClassMainTypes(),
            function (componentType, dependencies) {
                each(componentsMap.get(componentType), function (component) {
                    (componentType !== 'series' || !isNotTargetSeries(component as SeriesModel, payload))
                        && component.restoreData();
                });
            }
        );
    }

    static internalField = (function () {

        createSeriesIndices = function (ecModel: GlobalModel, seriesModels: ComponentModel[]): void {
            ecModel._seriesIndicesMap = createHashMap(
                ecModel._seriesIndices = map(seriesModels, function (series) {
                    return series.componentIndex;
                }) || []
            );
        };

        assertSeriesInitialized = function (ecModel: GlobalModel): void {
            // Components that use _seriesIndices should depends on series component,
            // which make sure that their initialization is after series.
            if (__DEV__) {
                if (!ecModel._seriesIndices) {
                    throw new Error('Option should contains series.');
                }
            }
        };

        initBase = function (ecModel: GlobalModel, baseOption: ECUnitOption): void {
            baseOption = baseOption;

            // Using OPTION_INNER_KEY to mark that this option can not be used outside,
            // i.e. `chart.setOption(chart.getModel().option);` is forbiden.
            ecModel.option = {} as ECUnitOption;
            ecModel.option[OPTION_INNER_KEY] = 1;

            // Init with series: [], in case of calling findSeries method
            // before series initialized.
            ecModel._componentsMap = createHashMap({series: []});

            mergeTheme(baseOption, ecModel._theme.option);

            // TODO Needs clone when merging to the unexisted property
            merge(baseOption, globalDefault, false);

            ecModel.mergeOption(baseOption);
        };

    })()
}

// -----------------------
// Internal method names:
// -----------------------
var createSeriesIndices: (ecModel: GlobalModel, seriesModels: ComponentModel[]) => void;
var assertSeriesInitialized: (ecModel: GlobalModel) => void;
var initBase: (ecModel: GlobalModel, baseOption: ECUnitOption) => void;


/**
 * @param condition.mainType Mandatory.
 * @param condition.subType Optional.
 * @param condition.query like {xxxIndex, xxxId, xxxName},
 *        where xxx is mainType.
 *        If query attribute is null/undefined or has no index/id/name,
 *        do not filtering by query conditions, which is convenient for
 *        no-payload situations or when target of action is global.
 * @param condition.filter parameter: component, return boolean.
 */
export interface QueryConditionKindA {
    mainType: ComponentMainType;
    subType?: ComponentSubType;
    query?: {
        [k: string]: number | number[] | string | string[]
    };
    filter?: (cmpt: ComponentModel) => boolean;
}

/**
 * If none of index and id and name used, return all components with mainType.
 * @param condition.mainType
 * @param condition.subType If ignore, only query by mainType
 * @param condition.index Either input index or id or name.
 * @param condition.id Either input index or id or name.
 * @param condition.name Either input index or id or name.
 */
export interface QueryConditionKindB {
    mainType: ComponentMainType;
    subType?: ComponentSubType;
    index?: number | number[];
    id?: string | string[];
    name?: string | string[];
}
export interface EachComponentAllCallback {
    (mainType: string, model: ComponentModel, index: number): void;
}
interface EachComponentInMainTypeCallback {
    (model: ComponentModel, index: number): void;
}


function isNotTargetSeries(seriesModel: SeriesModel, payload: Payload): boolean {
    if (payload) {
        var index = payload.seiresIndex;
        var id = payload.seriesId;
        var name = payload.seriesName;
        return (index != null && seriesModel.componentIndex !== index)
            || (id != null && seriesModel.id !== id)
            || (name != null && seriesModel.name !== name);
    }
}

function mergeTheme(option: ECUnitOption, theme: ThemeOption): void {
    // PENDING
    // NOT use `colorLayer` in theme if option has `color`
    var notMergeColorLayer = option.color && !option.colorLayer;

    each(theme, function (themeItem, name) {
        if (name === 'colorLayer' && notMergeColorLayer) {
            return;
        }
        // 如果有 component model 则把具体的 merge 逻辑交给该 model 处理
        if (!(ComponentModel as ComponentModelConstructor).hasClass(name)) {
            if (typeof themeItem === 'object') {
                option[name] = !option[name]
                    ? clone(themeItem)
                    : merge(option[name], themeItem, false);
            }
            else {
                if (option[name] == null) {
                    option[name] = themeItem;
                }
            }
        }
    });
}

/**
 * @param types model types
 */
function getComponentsByTypes(
    componentsMap: HashMap<ComponentModel[]>,
    types: string | string[]
): {
    [mainType: string]: ComponentModel[]
} {
    if (!isArray(types)) {
        types = types ? [types] : [];
    }

    var ret: Dictionary<ComponentModel[]> = {};
    each(types, function (type) {
        ret[type] = (componentsMap.get(type) || []).slice();
    });

    return ret;
}

function determineSubType(
    mainType: ComponentMainType,
    newCptOption: ComponentOption,
    existComponent: {subType: ComponentSubType} | ComponentModel
): ComponentSubType {
    var subType = newCptOption.type
        ? newCptOption.type
        : existComponent
        ? existComponent.subType
        // Use determineSubType only when there is no existComponent.
        : (ComponentModel as ComponentModelConstructor).determineSubType(mainType, newCptOption);

    // tooltip, markline, markpoint may always has no subType
    return subType;
}

function filterBySubType(
    components: ComponentModel[],
    condition: QueryConditionKindA | QueryConditionKindB
): ComponentModel[] {
    // Using hasOwnProperty for restrict. Consider
    // subType is undefined in user payload.
    return condition.hasOwnProperty('subType')
        ? filter(components, function (cpt) {
            return cpt.subType === condition.subType;
        })
        : components;
}

// @ts-ignore FIXME:GlobalOption
interface GlobalModel extends ColorPaletteMixin {}
mixin(GlobalModel, ColorPaletteMixin);

export default GlobalModel;
