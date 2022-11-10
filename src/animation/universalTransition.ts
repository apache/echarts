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

// Universal transitions that can animate between any shapes(series) and any properties in any amounts.

import SeriesModel, { SERIES_UNIVERSAL_TRANSITION_PROP } from '../model/Series';
import {createHashMap, each, map, filter, isArray, extend} from 'zrender/src/core/util';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { applyMorphAnimation, getPathList } from './morphTransitionHelper';
import Path from 'zrender/src/graphic/Path';
import { EChartsExtensionInstallRegisters } from '../extension';
import { initProps } from '../util/graphic';
import DataDiffer from '../data/DataDiffer';
import SeriesData from '../data/SeriesData';
import { Dictionary, DimensionLoose, OptionDataItemObject, UniversalTransitionOption } from '../util/types';
import {
    UpdateLifecycleParams,
    UpdateLifecycleTransitionItem,
    UpdateLifecycleTransitionSeriesFinder
} from '../core/lifecycle';
import { makeInner, normalizeToArray } from '../util/model';
import { warn } from '../util/log';
import ExtensionAPI from '../core/ExtensionAPI';
import { getAnimationConfig, getOldStyle } from './basicTransition';
import Model from '../model/Model';
import Displayable from 'zrender/src/graphic/Displayable';

const DATA_COUNT_THRESHOLD = 1e4;

interface GlobalStore { oldSeries: SeriesModel[], oldDataGroupIds: string[], oldData: SeriesData[] };
const getUniversalTransitionGlobalStore = makeInner<GlobalStore, ExtensionAPI>();

interface DiffItem {
    dataGroupId: string
    data: SeriesData
    dim: DimensionLoose
    divide: UniversalTransitionOption['divideShape']
    dataIndex: number
}
interface TransitionSeries {
    dataGroupId: string
    data: SeriesData
    divide: UniversalTransitionOption['divideShape']
    dim?: DimensionLoose
}

function getGroupIdDimension(data: SeriesData) {
    const dimensions = data.dimensions;
    for (let i = 0; i < dimensions.length; i++) {
        const dimInfo = data.getDimensionInfo(dimensions[i]);
        if (dimInfo && dimInfo.otherDims.itemGroupId === 0) {
            return dimensions[i];
        }
    }
}

function flattenDataDiffItems(list: TransitionSeries[]) {
    const items: DiffItem[] = [];

    each(list, seriesInfo => {
        const data = seriesInfo.data;
        if (data.count() > DATA_COUNT_THRESHOLD) {
            if (__DEV__) {
                warn('Universal transition is disabled on large data > 10k.');
            }
            return;
        }
        const indices = data.getIndices();
        const groupDim = getGroupIdDimension(data);
        for (let dataIndex = 0; dataIndex < indices.length; dataIndex++) {
            items.push({
                dataGroupId: seriesInfo.dataGroupId,
                data,
                dim: seriesInfo.dim || groupDim,
                divide: seriesInfo.divide,
                dataIndex
            });
        }
    });

    return items;
}


function fadeInElement(newEl: Element, newSeries: SeriesModel, newIndex: number) {
    newEl.traverse(el => {
        if (el instanceof Path) {
            // TODO use fade in animation for target element.
            initProps(el, {
                style: {
                    opacity: 0
                }
            }, newSeries, {
                dataIndex: newIndex,
                isFrom: true
            });
        }
    });
}
function removeEl(el: Element) {
    if (el.parent) {
        // Bake parent transform to element.
        // So it can still have proper transform to transition after it's removed.
        const computedTransform = el.getComputedTransform();
        el.setLocalTransform(computedTransform);
        el.parent.remove(el);
    }
}
function stopAnimation(el: Element) {
    el.stopAnimation();
    if (el.isGroup) {
        el.traverse(child => {
            child.stopAnimation();
        });
    }
}
function animateElementStyles(el: Element, dataIndex: number, seriesModel: SeriesModel) {
    const animationConfig = getAnimationConfig('update', seriesModel, dataIndex);
    animationConfig && el.traverse(child => {
        if (child instanceof Displayable) {
            const oldStyle = getOldStyle(child);
            if (oldStyle) {
                child.animateFrom({
                    style: oldStyle
                }, animationConfig);
            }
        }
    });
}


function isAllIdSame(oldDiffItems: DiffItem[], newDiffItems: DiffItem[]) {
    const len = oldDiffItems.length;
    if (len !== newDiffItems.length) {
        return false;
    }
    for (let i = 0; i < len; i++) {
        const oldItem = oldDiffItems[i];
        const newItem = newDiffItems[i];
        if (oldItem.data.getId(oldItem.dataIndex) !== newItem.data.getId(newItem.dataIndex)) {
            return false;
        }
    }
    return true;
}

function transitionBetween(
    oldList: TransitionSeries[],
    newList: TransitionSeries[],
    api: ExtensionAPI
) {

    const oldDiffItems = flattenDataDiffItems(oldList);
    const newDiffItems = flattenDataDiffItems(newList);

    function updateMorphingPathProps(
        from: Path, to: Path,
        rawFrom: Path, rawTo: Path,
        animationCfg: ElementAnimateConfig
    ) {
        if (rawFrom || from) {
            to.animateFrom({
                style: (rawFrom && rawFrom !== from)
                    // dividingMethod like clone may override the style(opacity)
                    // So extend it to raw style.
                    ? extend(extend({}, rawFrom.style), from.style)
                    : from.style
            }, animationCfg);
        }
    }


    function findKeyDim(items: DiffItem[]) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].dim) {
                return items[i].dim;
            }
        }
    }
    const oldKeyDim = findKeyDim(oldDiffItems);
    const newKeyDim = findKeyDim(newDiffItems);

    let hasMorphAnimation = false;

    function createKeyGetter(isOld: boolean, onlyGetId: boolean) {
        return function (diffItem: DiffItem): string {
            const data = diffItem.data;
            const dataIndex = diffItem.dataIndex;
            // TODO if specified dim
            if (onlyGetId) {
                return data.getId(dataIndex);
            }

            // Use group id as transition key by default.
            // So we can achieve multiple to multiple animation like drilldown / up naturally.
            // If group id not exits. Use id instead. If so, only one to one transition will be applied.
            const dataGroupId = diffItem.dataGroupId;

            // If specified key dimension(itemGroupId by default). Use this same dimension from other data.
            // PENDING: If only use key dimension of newData.
            const keyDim = isOld
                ? (oldKeyDim || newKeyDim)
                : (newKeyDim || oldKeyDim);

            const dimInfo = keyDim && data.getDimensionInfo(keyDim);
            const dimOrdinalMeta = dimInfo && dimInfo.ordinalMeta;

            if (dimInfo) {
                // Get from encode.itemGroupId.
                const key = data.get(dimInfo.name, dataIndex);
                if (dimOrdinalMeta) {
                    return dimOrdinalMeta.categories[key as number] as string || (key + '');
                }
                return key + '';
            }

            // Get groupId from raw item. { groupId: '' }
            const itemVal = data.getRawDataItem(dataIndex) as OptionDataItemObject<unknown>;
            if (itemVal && itemVal.groupId) {
                return itemVal.groupId + '';
            }
            return (dataGroupId || data.getId(dataIndex));
        };
    }

    // Use id if it's very likely to be an one to one animation
    // It's more robust than groupId
    // TODO Check if key dimension is specified.
    const useId = isAllIdSame(oldDiffItems, newDiffItems);
    const isElementStillInChart: Dictionary<boolean> = {};

    if (!useId) {
        // We may have different diff strategy with basicTransition if we use other dimension as key.
        // If so, we can't simply check if oldEl is same with newEl. We need a map to check if oldEl is still being used in the new chart.
        // We can't use the elements that already being morphed. Let it keep it's original basic transition.
        for (let i = 0; i < newDiffItems.length; i++) {
            const newItem = newDiffItems[i];
            const el = newItem.data.getItemGraphicEl(newItem.dataIndex);
            if (el) {
                isElementStillInChart[el.id] = true;
            }
        }
    }

    function updateOneToOne(newIndex: number, oldIndex: number) {

        const oldItem = oldDiffItems[oldIndex];
        const newItem = newDiffItems[newIndex];

        const newSeries = newItem.data.hostModel as SeriesModel;

        // TODO Mark this elements is morphed and don't morph them anymore
        const oldEl = oldItem.data.getItemGraphicEl(oldItem.dataIndex);
        const newEl = newItem.data.getItemGraphicEl(newItem.dataIndex);

        // Can't handle same elements.
        if (oldEl === newEl) {
            newEl && animateElementStyles(newEl, newItem.dataIndex, newSeries);
            return;
        }

        if (
            // We can't use the elements that already being morphed
            (oldEl && isElementStillInChart[oldEl.id])
        ) {
            return;
        }

        if (newEl) {
            // TODO: If keep animating the group in case
            // some of the elements don't want to be morphed.
            // TODO Label?
            stopAnimation(newEl);

            if (oldEl) {
                stopAnimation(oldEl);

                // If old element is doing leaving animation. stop it and remove it immediately.
                removeEl(oldEl);

                hasMorphAnimation = true;
                applyMorphAnimation(
                    getPathList(oldEl),
                    getPathList(newEl),
                    newItem.divide,
                    newSeries,
                    newIndex,
                    updateMorphingPathProps
                );
            }
            else {
                fadeInElement(newEl, newSeries, newIndex);
            }
        }
        // else keep oldEl leaving animation.
    }

    (new DataDiffer(
        oldDiffItems,
        newDiffItems,
        createKeyGetter(true, useId),
        createKeyGetter(false, useId),
        null,
        'multiple'
    ))
    .update(updateOneToOne)
    .updateManyToOne(function (newIndex, oldIndices) {
        const newItem = newDiffItems[newIndex];
        const newData = newItem.data;
        const newSeries = newData.hostModel as SeriesModel;
        const newEl = newData.getItemGraphicEl(newItem.dataIndex);
        const oldElsList = filter(
            map(oldIndices, idx =>
                oldDiffItems[idx].data.getItemGraphicEl(oldDiffItems[idx].dataIndex)
            ),
            oldEl => oldEl && oldEl !== newEl && !isElementStillInChart[oldEl.id]
        );

        if (newEl) {
            stopAnimation(newEl);
            if (oldElsList.length) {
                // If old element is doing leaving animation. stop it and remove it immediately.
                each(oldElsList, oldEl => {
                    stopAnimation(oldEl);
                    removeEl(oldEl);
                });

                hasMorphAnimation = true;
                applyMorphAnimation(
                    getPathList(oldElsList),
                    getPathList(newEl),
                    newItem.divide,
                    newSeries,
                    newIndex,
                    updateMorphingPathProps
                );

            }
            else {
                fadeInElement(newEl, newSeries, newItem.dataIndex);
            }
        }
        // else keep oldEl leaving animation.
    })
    .updateOneToMany(function (newIndices, oldIndex) {
        const oldItem = oldDiffItems[oldIndex];
        const oldEl = oldItem.data.getItemGraphicEl(oldItem.dataIndex);

        // We can't use the elements that already being morphed
        if (oldEl && isElementStillInChart[oldEl.id]) {
            return;
        }

        const newElsList = filter(
            map(newIndices, idx =>
                newDiffItems[idx].data.getItemGraphicEl(newDiffItems[idx].dataIndex)
            ),
            el => el && el !== oldEl
        );
        const newSeris = newDiffItems[newIndices[0]].data.hostModel as SeriesModel;

        if (newElsList.length) {
            each(newElsList, newEl => stopAnimation(newEl));
            if (oldEl) {
                stopAnimation(oldEl);
                // If old element is doing leaving animation. stop it and remove it immediately.
                removeEl(oldEl);

                hasMorphAnimation = true;
                applyMorphAnimation(
                    getPathList(oldEl),
                    getPathList(newElsList),
                    oldItem.divide, // Use divide on old.
                    newSeris,
                    newIndices[0],
                    updateMorphingPathProps
                );
            }
            else {
                each(newElsList, newEl => fadeInElement(newEl, newSeris, newIndices[0]));
            }
        }

        // else keep oldEl leaving animation.
    })
    .updateManyToMany(function (newIndices, oldIndices) {
        // If two data are same and both have groupId.
        // Normally they should be diff by id.
        new DataDiffer(
            oldIndices,
            newIndices,
            (rawIdx: number) => oldDiffItems[rawIdx].data.getId(oldDiffItems[rawIdx].dataIndex),
            (rawIdx: number) => newDiffItems[rawIdx].data.getId(newDiffItems[rawIdx].dataIndex)
        ).update((newIndex, oldIndex) => {
            // Use the original index
            updateOneToOne(newIndices[newIndex], oldIndices[oldIndex]);
        }).execute();
    })
    .execute();

    if (hasMorphAnimation) {
        each(newList, ({ data }) => {
            const seriesModel = data.hostModel as SeriesModel;
            const view = seriesModel && api.getViewOfSeriesModel(seriesModel as SeriesModel);
            const animationCfg = getAnimationConfig('update', seriesModel, 0);  // use 0 index.
            if (view && seriesModel.isAnimationEnabled() && animationCfg && animationCfg.duration > 0) {
                view.group.traverse(el => {
                    if (el instanceof Path && !el.animators.length) {
                        // We can't accept there still exists element that has no animation
                        // if universalTransition is enabled
                        el.animateFrom({
                            style: {
                                opacity: 0
                            }
                        }, animationCfg);
                    }
                });
            }
        });
    }
}

function getSeriesTransitionKey(series: SeriesModel) {
    const seriesKey = (series.getModel('universalTransition') as Model<UniversalTransitionOption>)
        .get('seriesKey');
    if (!seriesKey) {
        // Use series id by default.
        return series.id;
    }
    return seriesKey;
}

function convertArraySeriesKeyToString(seriesKey: string[] | string) {
    if (isArray(seriesKey)) {
        // Order independent.
        return seriesKey.sort().join(',');
    }
    return seriesKey;
}

interface SeriesTransitionBatch {
    oldSeries: TransitionSeries[]
    newSeries: TransitionSeries[]
}

function getDivideShapeFromData(data: SeriesData) {
    if (data.hostModel) {
        return ((data.hostModel as SeriesModel)
            .getModel('universalTransition') as Model<UniversalTransitionOption>)
            .get('divideShape');
    }
}

function findTransitionSeriesBatches(
    globalStore: GlobalStore,
    params: UpdateLifecycleParams
) {
    const updateBatches = createHashMap<SeriesTransitionBatch>();

    const oldDataMap = createHashMap<{
        dataGroupId: string,
        data: SeriesData
    }>();
    // Map that only store key in array seriesKey.
    // Which is used to query the old data when transition from one to multiple series.
    const oldDataMapForSplit = createHashMap<{
        key: string,
        dataGroupId: string,
        data: SeriesData
    }>();

    each(globalStore.oldSeries, (series, idx) => {
        const oldDataGroupId = globalStore.oldDataGroupIds[idx] as string;
        const oldData = globalStore.oldData[idx];
        const transitionKey = getSeriesTransitionKey(series);
        const transitionKeyStr = convertArraySeriesKeyToString(transitionKey);
        oldDataMap.set(transitionKeyStr, {
            dataGroupId: oldDataGroupId,
            data: oldData
        });

        if (isArray(transitionKey)) {
            // Same key can't in different array seriesKey.
            each(transitionKey, key => {
                oldDataMapForSplit.set(key, {
                    key: transitionKeyStr,
                    dataGroupId: oldDataGroupId,
                    data: oldData
                });
            });
        }
    });

    function checkTransitionSeriesKeyDuplicated(transitionKeyStr: string) {
        if (updateBatches.get(transitionKeyStr)) {
            warn(`Duplicated seriesKey in universalTransition ${transitionKeyStr}`);
        }
    }
    each(params.updatedSeries, series => {
        if (series.isUniversalTransitionEnabled() && series.isAnimationEnabled()) {
            const newDataGroupId = series.get('dataGroupId') as string;
            const newData = series.getData();
            const transitionKey = getSeriesTransitionKey(series);
            const transitionKeyStr = convertArraySeriesKeyToString(transitionKey);
            // Only transition between series with same id.
            const oldData = oldDataMap.get(transitionKeyStr);
            // string transition key is the best match.
            if (oldData) {
                if (__DEV__) {
                    checkTransitionSeriesKeyDuplicated(transitionKeyStr);
                }
                // TODO check if data is same?
                updateBatches.set(transitionKeyStr, {
                    oldSeries: [{
                        dataGroupId: oldData.dataGroupId,
                        divide: getDivideShapeFromData(oldData.data),
                        data: oldData.data
                    }],
                    newSeries: [{
                        dataGroupId: newDataGroupId,
                        divide: getDivideShapeFromData(newData),
                        data: newData
                    }]
                });
            }
            else {
                // Transition from multiple series.
                if (isArray(transitionKey)) {
                    if (__DEV__) {
                        checkTransitionSeriesKeyDuplicated(transitionKeyStr);
                    }
                    const oldSeries: TransitionSeries[] = [];
                    each(transitionKey, key => {
                        const oldData = oldDataMap.get(key);
                        if (oldData.data) {
                            oldSeries.push({
                                dataGroupId: oldData.dataGroupId,
                                divide: getDivideShapeFromData(oldData.data),
                                data: oldData.data
                            });
                        }
                    });
                    if (oldSeries.length) {
                        updateBatches.set(transitionKeyStr, {
                            oldSeries,
                            newSeries: [{
                                dataGroupId: newDataGroupId,
                                data: newData,
                                divide: getDivideShapeFromData(newData)
                            }]
                        });
                    }
                }
                else {
                    // Try transition to multiple series.
                    const oldData = oldDataMapForSplit.get(transitionKey);
                    if (oldData) {
                        let batch = updateBatches.get(oldData.key);
                        if (!batch) {
                            batch = {
                                oldSeries: [{
                                    dataGroupId: oldData.dataGroupId,
                                    data: oldData.data,
                                    divide: getDivideShapeFromData(oldData.data)
                                }],
                                newSeries: []
                            };
                            updateBatches.set(oldData.key, batch);
                        }
                        batch.newSeries.push({
                            dataGroupId: newDataGroupId,
                            data: newData,
                            divide: getDivideShapeFromData(newData)
                        });
                    }
                }
            }
        }
    });

    return updateBatches;
}

function querySeries(series: SeriesModel[], finder: UpdateLifecycleTransitionSeriesFinder) {
    for (let i = 0; i < series.length; i++) {
        const found = finder.seriesIndex != null && finder.seriesIndex === series[i].seriesIndex
            || finder.seriesId != null && finder.seriesId === series[i].id;
        if (found) {
            return i;
        }
    }
}

function transitionSeriesFromOpt(
    transitionOpt: UpdateLifecycleTransitionItem,
    globalStore: GlobalStore,
    params: UpdateLifecycleParams,
    api: ExtensionAPI
) {
    const from: TransitionSeries[] = [];
    const to: TransitionSeries[] = [];
    each(normalizeToArray(transitionOpt.from), finder => {
        const idx = querySeries(globalStore.oldSeries, finder);
        if (idx >= 0) {
            from.push({
                dataGroupId: globalStore.oldDataGroupIds[idx],
                data: globalStore.oldData[idx],
                // TODO can specify divideShape in transition.
                divide: getDivideShapeFromData(globalStore.oldData[idx]),
                dim: finder.dimension
            });
        }
    });
    each(normalizeToArray(transitionOpt.to), finder => {
        const idx = querySeries(params.updatedSeries, finder);
        if (idx >= 0) {
            const data = params.updatedSeries[idx].getData();
            to.push({
                dataGroupId: globalStore.oldDataGroupIds[idx],
                data,
                divide: getDivideShapeFromData(data),
                dim: finder.dimension
            });
        }
    });
    if (from.length > 0 && to.length > 0) {
        transitionBetween(from, to, api);
    }
}

export function installUniversalTransition(registers: EChartsExtensionInstallRegisters) {

    registers.registerUpdateLifecycle('series:beforeupdate', (ecMOdel, api, params) => {
        each(normalizeToArray(params.seriesTransition), transOpt => {
            each(normalizeToArray(transOpt.to), (finder) => {
                const series = params.updatedSeries;
                for (let i = 0; i < series.length; i++) {
                    if (finder.seriesIndex != null && finder.seriesIndex === series[i].seriesIndex
                        || finder.seriesId != null && finder.seriesId === series[i].id) {
                        series[i][SERIES_UNIVERSAL_TRANSITION_PROP] = true;
                    }
                }
            });
        });
    });
    registers.registerUpdateLifecycle('series:transition', (ecModel, api, params) => {
        // TODO api provide an namespace that can save stuff per instance
        const globalStore = getUniversalTransitionGlobalStore(api);

        // TODO multiple to multiple series.
        if (globalStore.oldSeries && params.updatedSeries && params.optionChanged) {
            // Use give transition config if its' give;
            const transitionOpt = params.seriesTransition;
            if (transitionOpt) {
                each(normalizeToArray(transitionOpt), opt => {
                    transitionSeriesFromOpt(opt, globalStore, params, api);
                });
            }
            else {  // Else guess from series based on transition series key.
                const updateBatches = findTransitionSeriesBatches(globalStore, params);
                each(updateBatches.keys(), key => {
                    const batch = updateBatches.get(key);
                    transitionBetween(batch.oldSeries, batch.newSeries, api);
                });
            }

            // Reset
            each(params.updatedSeries, series => {
                // Reset;
                if (series[SERIES_UNIVERSAL_TRANSITION_PROP]) {
                    series[SERIES_UNIVERSAL_TRANSITION_PROP] = false;
                }
            });
        }

        // Save all series of current update. Not only the updated one.
        const allSeries = ecModel.getSeries();
        const savedSeries: SeriesModel[] = globalStore.oldSeries = [];
        const savedDataGroupIds: string[] = globalStore.oldDataGroupIds = [];
        const savedData: SeriesData[] = globalStore.oldData = [];
        for (let i = 0; i < allSeries.length; i++) {
            const data = allSeries[i].getData();
            // Only save the data that can have transition.
            // Avoid large data costing too much extra memory
            if (data.count() < DATA_COUNT_THRESHOLD) {
                savedSeries.push(allSeries[i]);
                savedDataGroupIds.push(allSeries[i].get('dataGroupId') as string);
                savedData.push(data);
            }
        }
    });
}
