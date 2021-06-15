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
// Universal transitions that can animate between any shapes(series) and any properties in any amounts.

function transitionBetweenData(
    oldData: List,
    newData: List,
    seriesModel: SeriesModel
) {

    // No data or data are in the same series.
    if (!oldData || !newData || oldData === newData) {
        return;
    }

    function stopAnimation(pathList: Path[] | Path[][]) {
        if (isArray(pathList[0])) {
            for (let i = 0; i < pathList.length; i++) {
                stopAnimation(pathList[i] as Path[]);
            }
        }
        else {
            // TODO Group itself should also invoke the callback.
            // Force finish the leave animation.
            for (let i = 0; i < pathList.length; i++) {
                (pathList as Path[])[i].stopAnimation('');
            }
        }
        return pathList;
    }

    function updateMorphingPathProps(
        from: Path, to: Path,
        rawFrom: Path, rawTo: Path,
        animationCfg: ElementAnimateConfig
    ) {
        to.animateFrom({
            style: rawFrom.style
        }, animationCfg);
    }

    function fadeInElement(newEl: Element, newIndex: number) {
        newEl.traverse(el => {
            if (el instanceof Path) {
                // TODO use fade in animation for target element.
                initProps(el, {
                    style: {
                        opacity: 0
                    }
                }, seriesModel, {
                    dataIndex: newIndex,
                    isFrom: true
                });
            }
        });
    }

    // TODO share it to other modules. or put it in the List
    function createGroupIdGetter(data: List) {
        const dataGroupId = data.hostModel && (data.hostModel as SeriesModel).get('dataGroupId') as string;
        // TODO Use data.userOutput?
        let groupIdDimension: string = '';
        const dimensions = data.dimensions;
        for (let i = 0; i < dimensions.length; i++) {
            const dimInfo = data.getDimensionInfo(dimensions[i]);
            if (dimInfo && dimInfo.otherDims.itemGroupId === 0) {
                groupIdDimension = dimensions[i];
            }
        }
        // Use group id as transition key by default.
        // So we can achieve multiple to multiple animation like drilldown / up naturally.
        // If group id not exits. Use id instead. If so, only one to one transition will be applied.
        return function (rawIdx: number, dataIndex: number): string {
            // Get from raw item. { groupId: '' }
            const itemVal = data.getRawDataItem(dataIndex) as OptionDataItemObject<unknown>;
            if (itemVal && itemVal.groupId) {
                return itemVal.groupId + '';
            }

            return groupIdDimension
                // Get from encode.itemGroupId.
                ? (data.get(groupIdDimension, dataIndex) + '')
                // Use series.dataGroupId, if not use id.
                : (dataGroupId || data.getId(dataIndex));
        };
    }

    function updateOneToOne(newIndex: number, oldIndex: number) {
        const oldEl = oldData.getItemGraphicEl(oldIndex);
        const newEl = newData.getItemGraphicEl(newIndex);

        if (newEl) {
            if (oldEl) {
                applyMorphAnimation(
                    stopAnimation(getPathList(oldEl)),
                    stopAnimation(getPathList(newEl)),
                    seriesModel,
                    newIndex,
                    updateMorphingPathProps
                );
            }
            else {
                fadeInElement(newEl, newIndex);
            }
        }
        // else keep oldEl leaving animation.
    }

    (new DataDiffer(
        oldData.getIndices(),
        newData.getIndices(),
        createGroupIdGetter(oldData),
        createGroupIdGetter(newData),
        null,
        'multiple'
    ))
    .update(updateOneToOne)
    .updateManyToOne(function (newIndex, oldIndices) {
        const newEl = newData.getItemGraphicEl(newIndex);
        const oldElsList = filter(
            map(oldIndices, idx => oldData.getItemGraphicEl(idx)),
            el => !!el
        );

        if (newEl) {
            if (oldElsList.length) {
                applyMorphAnimation(
                    stopAnimation(getPathList(oldElsList)),
                    stopAnimation(getPathList(newEl)),
                    seriesModel,
                    newIndex,
                    updateMorphingPathProps
                );
            }
            else {
                fadeInElement(newEl, newIndex);
            }
        }
        // else keep oldEl leaving animation.
    })
    .updateOneToMany(function (newIndices, oldIndex) {
        const oldEl = oldData.getItemGraphicEl(oldIndex);
        const newElsList = filter(
            map(newIndices, idx => newData.getItemGraphicEl(idx)),
            el => !!el
        );

        if (newElsList.length) {
            if (oldEl) {
                applyMorphAnimation(
                    stopAnimation(getPathList(oldEl)),
                    stopAnimation(getPathList(newElsList)),
                    seriesModel,
                    newIndices[0],
                    updateMorphingPathProps
                );
            }
            else {
                each(newElsList, newEl => fadeInElement(newEl, newIndices[0]));
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
            (rawIdx, dataIdx) => oldData.getId(dataIdx),
            (rawIdx, dataIdx) => newData.getId(dataIdx)
        ).update(updateOneToOne).execute();
    })
    .execute();
}

function getSeriesTransitionKey(series: SeriesModel) {
    return series.id;
}

export function installUniversalTransition(registers: EChartsExtensionInstallRegisters) {
    registers.registerUpdateLifecycle('series:transition', (ecModel, api, params) => {
        // TODO multiple to multiple series.
        if (params.oldSeries && params.updatedSeries) {
            const oldSeriesMap = createHashMap<{ series: SeriesModel, data: List }>();
            each(params.oldSeries, (series, idx) => {
                oldSeriesMap.set(getSeriesTransitionKey(series), {
                    series, data: params.oldData[idx]
                });
            });
            each(params.updatedSeries, series => {
                if (series.get(['universalTransition', 'enabled'])) {
                    // Only transition between series with same id.
                    const oldSeries = oldSeriesMap.get(getSeriesTransitionKey(series));
                    if (oldSeries) {
                        transitionBetweenData(
                            oldSeries.data,
                            series.getData(),
                            series
                        );
                    }
                }
            });
        }
    });
}