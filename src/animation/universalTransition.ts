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

import SeriesModel from '../model/Series';
import {createHashMap, each, map, filter, isArray} from 'zrender/src/core/util';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { applyMorphAnimation, getPathList } from './morphTransitionHelper';
import Path from 'zrender/src/graphic/Path';
import { EChartsExtensionInstallRegisters } from '../extension';
import { initProps } from '../util/graphic';
import DataDiffer from '../data/DataDiffer';
import List from '../data/List';
import { OptionDataItemObject } from '../util/types';

interface DiffItem {
    data: List
    dataIndex: number
}
function flattenDataDiffItems(dataList: List[]) {
    const items: DiffItem[] = [];

    each(dataList, data => {
        const indices = data.getIndices();
        for (let dataIndex = 0; dataIndex < indices.length; dataIndex++) {
            items.push({
                data,
                dataIndex
            });
        }
    });

    return items;
}

function transitionBetweenData(
    oldDataList: List[],
    newDataList: List[]
) {

    const oldDiffItems = flattenDataDiffItems(oldDataList);
    const newDiffItems = flattenDataDiffItems(newDataList);
    // // No data or data are in the same series.
    // if (!oldData || !newData || oldData === newData) {
    //     return;
    // }

    // const oldSeriesModel = oldData.hostModel;
    // const isTransitionSameSeries = oldSeriesModel === seriesModel;

    function stopAnimation(el: Element) {
        el.stopAnimation();
        if (el.isGroup) {
            el.traverse(child => {
                child.stopAnimation();
            });
        }
    }

    // function stopAnimation(pathList: Path[] | Path[][]) {
    //     if (isArray(pathList[0])) {
    //         for (let i = 0; i < pathList.length; i++) {
    //             stopAnimation(pathList[i] as Path[]);
    //         }
    //     }
    //     else {
    //         // TODO Group itself should also invoke the callback.
    //         // Force finish the leave animation.
    //         for (let i = 0; i < pathList.length; i++) {
    //             (pathList as Path[])[i].stopAnimation();
    //         }
    //     }
    //     return pathList;
    // }

    function updateMorphingPathProps(
        from: Path, to: Path,
        rawFrom: Path, rawTo: Path,
        animationCfg: ElementAnimateConfig
    ) {
        to.animateFrom({
            style: rawFrom.style
        }, animationCfg);
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

    function getGroupIdDimension(data: List) {
        const dimensions = data.dimensions;
        for (let i = 0; i < dimensions.length; i++) {
            const dimInfo = data.getDimensionInfo(dimensions[i]);
            if (dimInfo && dimInfo.otherDims.itemGroupId === 0) {
                return dimensions[i];
            }
        }
    }


    // TODO Query from all data.
    const oldDataGroupIdDim = getGroupIdDimension(oldDataList[0]);
    const newDataGroupIdDim = getGroupIdDimension(newDataList[0]);

    // TODO share it to other modules. or put it in the List
    function createGroupIdGetter(isOld: boolean) {
        return function (diffItem: DiffItem): string {
            const data = diffItem.data;
            const dataIndex = diffItem.dataIndex;

            // Use group id as transition key by default.
            // So we can achieve multiple to multiple animation like drilldown / up naturally.
            // If group id not exits. Use id instead. If so, only one to one transition will be applied.
            const dataGroupId = data.hostModel && (data.hostModel as SeriesModel).get('dataGroupId') as string;

            // If one data has groupId encode dimension. Use this same dimension from other data.
            // PENDING: If only use groupId dimension of newData.
            const groupIdDimension: string = isOld
                ? (oldDataGroupIdDim || newDataGroupIdDim)
                : (newDataGroupIdDim || oldDataGroupIdDim);

            const dimInfo = groupIdDimension && data.getDimensionInfo(groupIdDimension);
            const dimOrdinalMeta = dimInfo && dimInfo.ordinalMeta;

            if (groupIdDimension) {
                // Get from encode.itemGroupId.
                const groupId = data.get(groupIdDimension, dataIndex);
                if (dimOrdinalMeta) {
                    return dimOrdinalMeta.categories[groupId as number] as string || (groupId + '');
                }
                return groupId + '';
            }

            // Get from raw item. { groupId: '' }
            const itemVal = data.getRawDataItem(dataIndex) as OptionDataItemObject<unknown>;
            if (itemVal && itemVal.groupId) {
                return itemVal.groupId + '';
            }
            return (dataGroupId || data.getId(dataIndex));
        };
    }

    function updateOneToOne(newIndex: number, oldIndex: number) {

        const oldItem = oldDiffItems[oldIndex];
        const newItem = newDiffItems[newIndex];

        const newSeries = newItem.data.hostModel as SeriesModel;

        const oldEl = oldItem.data.getItemGraphicEl(oldItem.dataIndex);
        const newEl = newItem.data.getItemGraphicEl(newItem.dataIndex);

        // Can't handle same elements.
        if (oldEl === newEl) {
            return;
        }

        if (newEl) {
            // TODO: If keep animating the group in case
            // some of the elements don't want to be morphed.
            stopAnimation(newEl);

            if (oldEl) {
                stopAnimation(oldEl);

                // If old element is doing leaving animation. stop it and remove it immediately.
                removeEl(oldEl);

                applyMorphAnimation(
                    getPathList(oldEl),
                    getPathList(newEl),
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
        createGroupIdGetter(true),
        createGroupIdGetter(false),
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
            el => el && el !== newEl    // Can't handle same elements
        );

        if (newEl) {
            stopAnimation(newEl);
            if (oldElsList.length) {
                // If old element is doing leaving animation. stop it and remove it immediately.
                each(oldElsList, oldEl => {
                    stopAnimation(oldEl);
                    removeEl(oldEl);
                });

                applyMorphAnimation(
                    getPathList(oldElsList),
                    getPathList(newEl),
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
        const newElsList = filter(
            map(newIndices, idx =>
                newDiffItems[idx].data.getItemGraphicEl(newDiffItems[idx].dataIndex)
            ),
            el => el && el !== oldEl    // Can't handle same elements
        );
        const newSeris = newDiffItems[newIndices[0]].data.hostModel as SeriesModel;

        if (newElsList.length) {
            each(newElsList, newEl => stopAnimation(newEl));
            if (oldEl) {
                stopAnimation(oldEl);
                // If old element is doing leaving animation. stop it and remove it immediately.
                removeEl(oldEl);

                applyMorphAnimation(
                    getPathList(oldEl),
                    getPathList(newElsList),
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
}

function getSeriesTransitionKey(series: SeriesModel) {
    const seriesKey = series.get(['universalTransition', 'seriesKey']);
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

export function installUniversalTransition(registers: EChartsExtensionInstallRegisters) {
    registers.registerUpdateLifecycle('series:transition', (ecModel, api, params) => {
        // TODO multiple to multiple series.
        if (params.oldSeries && params.updatedSeries) {
            const updateBatches = createHashMap<{
                oldDataList: List[]
                newDataList: List[]
             }>();

            const oldDataMap = createHashMap<List>();
            // Map that only store key in array seriesKey.
            // Which is used to query the old data when transition from one to multiple series.
            const oldDataMapForSplit = createHashMap<{
                key: string,
                data: List
            }>();

            each(params.oldSeries, (series, idx) => {
                const oldData = params.oldData[idx];
                const transitionKey = getSeriesTransitionKey(series);
                const transitionKeyStr = convertArraySeriesKeyToString(transitionKey);
                oldDataMap.set(transitionKeyStr, oldData);

                if (isArray(transitionKey)) {
                    // Same key can't in different array seriesKey.
                    each(transitionKey, key => {
                        oldDataMapForSplit.set(key, {
                            data: oldData,
                            key: transitionKeyStr
                        });
                    });
                }
            });
            each(params.updatedSeries, series => {
                if (series.get(['universalTransition', 'enabled'])) {
                    const newData = series.getData();
                    const transitionKey = getSeriesTransitionKey(series);
                    const transitionKeyStr = convertArraySeriesKeyToString(transitionKey);
                    // Only transition between series with same id.
                    const oldData = oldDataMap.get(transitionKeyStr);
                    // string transition key is the best match.
                    if (oldData) {
                        // TODO check if data is same?
                        updateBatches.set(transitionKeyStr, {
                            oldDataList: [oldData],
                            newDataList: [newData]
                        });
                    }
                    if (!oldData) {
                        // Transition from multiple series.
                        if (isArray(transitionKey)) {
                            const oldDataList: List[] = [];
                            each(transitionKey, key => {
                                const oldData = oldDataMap.get(key);
                                if (oldData) {
                                    oldDataList.push(oldData);
                                }
                            });
                            if (oldDataList.length) {
                                updateBatches.set(transitionKeyStr, {
                                    oldDataList,
                                    newDataList: [newData]
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
                                        oldDataList: [oldData.data],
                                        newDataList: []
                                    };
                                    updateBatches.set(oldData.key, batch);
                                }
                                batch.newDataList.push(newData);
                            }
                        }
                    }
                }
            });

            each(updateBatches.keys(), key => {
                const batch = updateBatches.get(key);
                transitionBetweenData(batch.oldDataList, batch.newDataList);
            });
        }
    });
}