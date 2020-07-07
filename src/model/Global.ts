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
 * (3) In `replaceMerge` mode, keep the result sequence of the components is
 * consistent to the original sequence, even though there might result in "hole".
 * (4) `reset` feature (in toolbox). Find detailed info in comments about
 * `mergeOption` in module:echarts/model/OptionManager.
 */

import {__DEV__} from '../config';
import {
    each, filter, isArray, isObject, isString,
    createHashMap, assert, clone, merge, extend, mixin, HashMap, isFunction
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

export interface GlobalModelSetOptionOpts {
    replaceMerge: ComponentMainType | ComponentMainType[];
}
export interface InnerSetOptionOpts {
    replaceMergeMainTypeMap: HashMap<boolean>;
}

// -----------------------
// Internal method names:
// -----------------------
let reCreateSeriesIndices: (ecModel: GlobalModel) => void;
let assertSeriesInitialized: (ecModel: GlobalModel) => void;
let initBase: (ecModel: GlobalModel, baseOption: ECUnitOption) => void;

const OPTION_INNER_KEY = '\0_ec_inner';
class GlobalModel extends Model<ECUnitOption> {
    // @readonly
    option: ECUnitOption;

    private _theme: Model;

    private _optionManager: OptionManager;

    private _componentsMap: HashMap<ComponentModel[]>;

    /**
     * `_componentsMap` might have "hole" becuase of remove.
     * So save components count for a certain mainType here.
     */
    private _componentsCount: HashMap<number>;

    /**
     * Mapping between filtered series list and raw series list.
     * key: filtered series indices, value: raw series indices.
     * Items of `_seriesIndices` never be null/empty/-1.
     * If series has been removed by `replaceMerge`, those series
     * also won't be in `_seriesIndices`, just like be filtered.
     */
    private _seriesIndices: number[];

    /**
     * Key: seriesIndex.
     * Keep consistent with `_seriesIndices`.
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

    setOption(
        option: ECOption,
        opts: GlobalModelSetOptionOpts,
        optionPreprocessorFuncs: OptionPreprocessor[]
    ): void {
        assert(
            !(OPTION_INNER_KEY in option),
            'please use chart.getOption()'
        );

        const innerOpt = normalizeReplaceMergeInput(opts);

        this._optionManager.setOption(option, optionPreprocessorFuncs, innerOpt);

        this._resetOption(null, innerOpt);
    }

    /**
     * @param type null/undefined: reset all.
     *        'recreate': force recreate all.
     *        'timeline': only reset timeline option
     *        'media': only reset media query option
     * @return Whether option changed.
     */
    resetOption(
        type: 'recreate' | 'timeline' | 'media',
        opt?: GlobalModelSetOptionOpts
    ): boolean {
        return this._resetOption(type, normalizeReplaceMergeInput(opt));
    }

    private _resetOption(
        type: 'recreate' | 'timeline' | 'media',
        opt: InnerSetOptionOpts
    ): boolean {
        let optionChanged = false;
        const optionManager = this._optionManager;

        if (!type || type === 'recreate') {
            const baseOption = optionManager.mountOption(type === 'recreate');

            if (!this.option || type === 'recreate') {
                initBase(this, baseOption);
            }
            else {
                this.restoreData();
                this._mergeOption(baseOption, opt);
            }
            optionChanged = true;
        }

        if (type === 'timeline' || type === 'media') {
            this.restoreData();
        }

        if (!type || type === 'recreate' || type === 'timeline') {
            const timelineOption = optionManager.getTimelineOption(this);
            if (timelineOption) {
                optionChanged = true;
                this._mergeOption(timelineOption, opt);
            }
        }

        if (!type || type === 'recreate' || type === 'media') {
            const mediaOptions = optionManager.getMediaOption(this);
            if (mediaOptions.length) {
                each(mediaOptions, function (mediaOption) {
                    optionChanged = true;
                    this._mergeOption(mediaOption, opt);
                }, this);
            }
        }

        return optionChanged;
    }

    public mergeOption(option: ECUnitOption): void {
        this._mergeOption(option, null);
    }

    private _mergeOption(
        newOption: ECUnitOption,
        opt: InnerSetOptionOpts
    ): void {
        const option = this.option;
        const componentsMap = this._componentsMap;
        const componentsCount = this._componentsCount;
        const newCmptTypes: ComponentMainType[] = [];
        const replaceMergeMainTypeMap = opt && opt.replaceMergeMainTypeMap;

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
                newCmptTypes.push(mainType);
            }
        });

        (ComponentModel as ComponentModelConstructor).topologicalTravel(
            newCmptTypes,
            (ComponentModel as ComponentModelConstructor).getAllClassMainTypes(),
            visitComponent,
            this
        );

        function visitComponent(
            this: GlobalModel,
            mainType: ComponentMainType,
            dependencies: string | string[]
        ): void {

            const newCmptOptionList = modelUtil.normalizeToArray(newOption[mainType]);

            const oldCmptList = componentsMap.get(mainType);
            const mapResult = replaceMergeMainTypeMap && replaceMergeMainTypeMap.get(mainType)
                ? modelUtil.mappingToExistsInReplaceMerge(oldCmptList, newCmptOptionList)
                : modelUtil.mappingToExistsInNormalMerge(oldCmptList, newCmptOptionList);

            modelUtil.makeIdAndName(mapResult);

            // Set mainType and complete subType.
            each(mapResult, function (item) {
                const opt = item.newOption;
                if (isObject(opt)) {
                    item.keyInfo.mainType = mainType;
                    item.keyInfo.subType = determineSubType(mainType, opt, item.existing);
                }
            });

            // Set it before the travel, in case that `this._componentsMap` is
            // used in some `init` or `merge` of components.
            option[mainType] = null;
            componentsMap.set(mainType, null);
            componentsCount.set(mainType, 0);
            const optionsByMainType = [] as ComponentOption[];
            const cmptsByMainType = [] as ComponentModel[];
            let cmptsCountByMainType = 0;

            each(mapResult, function (resultItem, index) {
                let componentModel = resultItem.existing;
                const newCmptOption = resultItem.newOption;

                if (!newCmptOption) {
                    if (componentModel) {
                        // Consider where is no new option and should be merged using {},
                        // see removeEdgeAndAdd in topologicalTravel and
                        // ComponentModel.getAllClassMainTypes.
                        componentModel.mergeOption({}, this);
                        componentModel.optionUpdated({}, false);
                    }
                    // If no both `resultItem.exist` and `resultItem.option`,
                    // either it is in `replaceMerge` and not matched by any id,
                    // or it has been removed in previous `replaceMerge` and left a "hole" in this component index.
                }
                else {
                    const ComponentModelClass = (ComponentModel as ComponentModelConstructor).getClass(
                        mainType, resultItem.keyInfo.subType, true
                    );

                    if (componentModel && componentModel.constructor === ComponentModelClass) {
                        componentModel.name = resultItem.keyInfo.name;
                        // componentModel.settingTask && componentModel.settingTask.dirty();
                        componentModel.mergeOption(newCmptOption, this);
                        componentModel.optionUpdated(newCmptOption, false);
                    }
                    else {
                        // PENDING Global as parent ?
                        const extraOpt = extend(
                            {
                                componentIndex: index
                            },
                            resultItem.keyInfo
                        );
                        componentModel = new ComponentModelClass(
                            newCmptOption, this, this, extraOpt
                        );
                        extend(componentModel, extraOpt);
                        if (resultItem.brandNew) {
                            componentModel.__requireNewView = true;
                        }
                        componentModel.init(newCmptOption, this, this);

                        // Call optionUpdated after init.
                        // newCmptOption has been used as componentModel.option
                        // and may be merged with theme and default, so pass null
                        // to avoid confusion.
                        componentModel.optionUpdated(null, true);
                    }
                }

                if (componentModel) {
                    optionsByMainType.push(componentModel.option);
                    cmptsByMainType.push(componentModel);
                    cmptsCountByMainType++;
                }
                else {
                    // Always do assign to avoid elided item in array.
                    optionsByMainType.push(void 0);
                    cmptsByMainType.push(void 0);
                }
            }, this);

            option[mainType] = optionsByMainType;
            componentsMap.set(mainType, cmptsByMainType);
            componentsCount.set(mainType, cmptsCountByMainType);

            // Backup series for filtering.
            if (mainType === 'series') {
                reCreateSeriesIndices(this);
            }
        }

        // If no series declared, ensure `_seriesIndices` initialized.
        if (!this._seriesIndices) {
            reCreateSeriesIndices(this);
        }
    }

    /**
     * Get option for output (cloned option and inner info removed)
     */
    getOption(): ECUnitOption {
        const option = clone(this.option);

        each(option, function (opts, mainType) {
            if ((ComponentModel as ComponentModelConstructor).hasClass(mainType)) {
                opts = modelUtil.normalizeToArray(opts);
                // Inner cmpts need to be removed.
                // Inner cmpts might not be at last since ec5.0, but still
                // compatible for users: if inner cmpt at last, splice the returned array.
                let realLen = opts.length;
                let metNonInner = false;
                for (let i = realLen - 1; i >= 0; i--) {
                    // Remove options with inner id.
                    if (opts[i] && !modelUtil.isIdInner(opts[i])) {
                        metNonInner = true;
                    }
                    else {
                        opts[i] = null;
                        !metNonInner && realLen--;
                    }
                }
                opts.length = realLen;
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
        const list = this._componentsMap.get(mainType);
        if (list) {
            return list[idx || 0];
        }
    }

    /**
     * @return Never be null/undefined.
     */
    queryComponents(condition: QueryConditionKindB): ComponentModel[] {
        const mainType = condition.mainType;
        if (!mainType) {
            return [];
        }

        const index = condition.index;
        const id = condition.id;
        const name = condition.name;
        const cmpts = this._componentsMap.get(mainType);

        if (!cmpts || !cmpts.length) {
            return [];
        }

        let result: ComponentModel[];

        if (index != null) {
            result = [];
            each(modelUtil.normalizeToArray(index), function (idx) {
                cmpts[idx] && result.push(cmpts[idx]);
            });
        }
        else if (id != null) {
            result = queryByIdOrName('id', id, cmpts);
        }
        else if (name != null) {
            result = queryByIdOrName('name', name, cmpts);
        }
        else {
            // Return all non-empty components in that mainType
            result = filter(cmpts, cmpt => !!cmpt);
        }

        return filterBySubType(result, condition);
    }

    /**
     * The interface is different from queryComponents,
     * which is convenient for inner usage.
     *
     * @usage
     * let result = findComponents(
     *     {mainType: 'dataZoom', query: {dataZoomId: 'abc'}}
     * );
     * let result = findComponents(
     *     {mainType: 'series', subType: 'pie', query: {seriesName: 'uio'}}
     * );
     * let result = findComponents(
     *     {mainType: 'series',
     *     filter: function (model, index) {...}}
     * );
     * // result like [component0, componnet1, ...]
     */
    findComponents(condition: QueryConditionKindA): ComponentModel[] {
        const query = condition.query;
        const mainType = condition.mainType;

        const queryCond = getQueryCond(query);
        const result = queryCond
            ? this.queryComponents(queryCond)
            // Retrieve all non-empty components.
            : filter(this._componentsMap.get(mainType), cmpt => !!cmpt);

        return doFilter(filterBySubType(result, condition));

        function getQueryCond(q: QueryConditionKindA['query']): QueryConditionKindB {
            const indexAttr = mainType + 'Index';
            const idAttr = mainType + 'Id';
            const nameAttr = mainType + 'Name';
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
     * Travel components (before filtered).
     *
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
        const componentsMap = this._componentsMap;

        if (isFunction(mainType)) {
            const ctxForAll = cb as T;
            const cbForAll = mainType as EachComponentAllCallback;
            componentsMap.each(function (cmpts, componentType) {
                for (let i = 0; cmpts && i < cmpts.length; i++) {
                    const cmpt = cmpts[i];
                    cmpt && cbForAll.call(ctxForAll, componentType, cmpt, cmpt.componentIndex);
                }
            });
        }
        else {
            const cmpts = isString(mainType)
                ? componentsMap.get(mainType)
                : isObject(mainType)
                ? this.findComponents(mainType)
                : null;
            for (let i = 0; cmpts && i < cmpts.length; i++) {
                const cmpt = cmpts[i];
                cmpt && (cb as EachComponentInMainTypeCallback).call(
                    context, cmpt, cmpt.componentIndex
                );
            }
        }
    }

    /**
     * Get series list before filtered by name.
     */
    getSeriesByName(name: string): SeriesModel[] {
        return filter(
            this._componentsMap.get('series') as SeriesModel[],
            oneSeries => !!oneSeries && oneSeries.name === name
        );
    }

    /**
     * Get series list before filtered by index.
     */
    getSeriesByIndex(seriesIndex: number): SeriesModel {
        return this._componentsMap.get('series')[seriesIndex] as SeriesModel;
    }

    /**
     * Get series list before filtered by type.
     * FIXME: rename to getRawSeriesByType?
     */
    getSeriesByType(subType: ComponentSubType): SeriesModel[] {
        return filter(
            this._componentsMap.get('series') as SeriesModel[],
            oneSeries => !!oneSeries && oneSeries.subType === subType
        );
    }

    /**
     * Get all series before filtered.
     */
    getSeries(): SeriesModel[] {
        return filter(
            this._componentsMap.get('series').slice() as SeriesModel[],
            oneSeries => !!oneSeries
        );
    }

    /**
     * Count series before filtered.
     */
    getSeriesCount(): number {
        return this._componentsCount.get('series');
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
            const series = this._componentsMap.get('series')[rawSeriesIndex] as SeriesModel;
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
        each(this._componentsMap.get('series'), function (series) {
            series && cb.call(context, series, series.componentIndex);
        });
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
            const series = this._componentsMap.get('series')[rawSeriesIndex] as SeriesModel;
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
        return this._seriesIndicesMap.get(seriesModel.componentIndex) == null;
    }

    getCurrentSeriesIndices(): number[] {
        return (this._seriesIndices || []).slice();
    }

    filterSeries<T>(
        cb: (this: T, series: SeriesModel, rawSeriesIndex: number) => boolean,
        context?: T
    ): void {
        assertSeriesInitialized(this);

        const newSeriesIndices: number[] = [];
        each(this._seriesIndices, function (seriesRawIdx) {
            const series = this._componentsMap.get('series')[seriesRawIdx] as SeriesModel;
            cb.call(context, series, seriesRawIdx) && newSeriesIndices.push(seriesRawIdx);
        }, this);

        this._seriesIndices = newSeriesIndices;
        this._seriesIndicesMap = createHashMap(newSeriesIndices);
    }

    restoreData(payload?: Payload): void {

        reCreateSeriesIndices(this);

        const componentsMap = this._componentsMap;
        const componentTypes: string[] = [];
        componentsMap.each(function (components, componentType) {
            componentTypes.push(componentType);
        });

        (ComponentModel as ComponentModelConstructor).topologicalTravel(
            componentTypes,
            (ComponentModel as ComponentModelConstructor).getAllClassMainTypes(),
            function (componentType) {
                each(componentsMap.get(componentType), function (component) {
                    if (component
                        && (
                            componentType !== 'series'
                            || !isNotTargetSeries(component as SeriesModel, payload)
                        )
                    ) {
                        component.restoreData();
                    }
                });
            }
        );
    }

    private static internalField = (function () {

        reCreateSeriesIndices = function (ecModel: GlobalModel): void {
            const seriesIndices: number[] = ecModel._seriesIndices = [];
            each(ecModel._componentsMap.get('series'), function (series) {
                // series may have been removed by `replaceMerge`.
                series && seriesIndices.push(series.componentIndex);
            });
            ecModel._seriesIndicesMap = createHashMap(seriesIndices);
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
            ecModel._componentsCount = createHashMap();

            mergeTheme(baseOption, ecModel._theme.option);

            // TODO Needs clone when merging to the unexisted property
            merge(baseOption, globalDefault, false);

            ecModel._mergeOption(baseOption, null);
        };

    })();
}


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
    (mainType: string, model: ComponentModel, componentIndex: number): void;
}
interface EachComponentInMainTypeCallback {
    (model: ComponentModel, componentIndex: number): void;
}


function isNotTargetSeries(seriesModel: SeriesModel, payload: Payload): boolean {
    if (payload) {
        const index = payload.seiresIndex;
        const id = payload.seriesId;
        const name = payload.seriesName;
        return (index != null && seriesModel.componentIndex !== index)
            || (id != null && seriesModel.id !== id)
            || (name != null && seriesModel.name !== name);
    }
}

function mergeTheme(option: ECUnitOption, theme: ThemeOption): void {
    // PENDING
    // NOT use `colorLayer` in theme if option has `color`
    const notMergeColorLayer = option.color && !option.colorLayer;

    each(theme, function (themeItem, name) {
        if (name === 'colorLayer' && notMergeColorLayer) {
            return;
        }
        // If it is component model mainType, the model handles that merge later.
        // otherwise, merge them here.
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

function determineSubType(
    mainType: ComponentMainType,
    newCmptOption: ComponentOption,
    existComponent: {subType: ComponentSubType} | ComponentModel
): ComponentSubType {
    const subType = newCmptOption.type
        ? newCmptOption.type
        : existComponent
        ? existComponent.subType
        // Use determineSubType only when there is no existComponent.
        : (ComponentModel as ComponentModelConstructor).determineSubType(mainType, newCmptOption);

    // tooltip, markline, markpoint may always has no subType
    return subType;
}

function queryByIdOrName<T extends { id?: string, name?: string }>(
    attr: 'id' | 'name',
    idOrName: string | string[],
    cmpts: T[]
): T[] {
    let keyMap: HashMap<string>;
    return isArray(idOrName)
        ? (
            keyMap = createHashMap(idOrName),
            filter(cmpts, cmpt => cmpt && keyMap.get(cmpt[attr]) != null)
        )
        : filter(cmpts, cmpt => cmpt && cmpt[attr] === idOrName + '');
}

function filterBySubType(
    components: ComponentModel[],
    condition: QueryConditionKindA | QueryConditionKindB
): ComponentModel[] {
    // Using hasOwnProperty for restrict. Consider
    // subType is undefined in user payload.
    return condition.hasOwnProperty('subType')
        ? filter(components, cmpt => cmpt && cmpt.subType === condition.subType)
        : components;
}

function normalizeReplaceMergeInput(opts: GlobalModelSetOptionOpts): InnerSetOptionOpts {
    const replaceMergeMainTypeMap = createHashMap<boolean>();
    opts && each(modelUtil.normalizeToArray(opts.replaceMerge), function (mainType) {
        if (__DEV__) {
            assert(
                (ComponentModel as ComponentModelConstructor).hasClass(mainType),
                '"' + mainType + '" is not valid component main type in "replaceMerge"'
            );
        }
        replaceMergeMainTypeMap.set(mainType, true);
    });
    return {
        replaceMergeMainTypeMap: replaceMergeMainTypeMap
    };
}

interface GlobalModel extends ColorPaletteMixin<ECUnitOption> {}
mixin(GlobalModel, ColorPaletteMixin);

export default GlobalModel;
