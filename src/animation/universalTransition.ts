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

import ExtensionAPI from '../core/ExtensionAPI';
import SeriesModel from '../model/Series';
import {createHashMap, each, map, filter} from 'zrender/src/core/util';
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
    seriesModel: SeriesModel,
    api: ExtensionAPI
) {
    function stopAnimation(el: Element) {
        // TODO Group itself should also invoke the callback.
        // Force finish the leave animation.
        el.stopAnimation();
        if (el.isGroup) {
            el.traverse(child => {
                child.stopAnimation();
            });
        }
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
            stopAnimation(newEl);

            if (oldEl) {
                stopAnimation(oldEl);
                applyMorphAnimation(
                    getPathList(oldEl),
                    getPathList(newEl),
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
            each(oldElsList, oldEl => stopAnimation(oldEl));
            stopAnimation(newEl);

            if (oldElsList.length) {
                applyMorphAnimation(
                    getPathList(oldElsList),
                    getPathList(newEl),
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
            each(newElsList, newEl => stopAnimation(newEl));
            stopAnimation(oldEl);

            if (oldEl) {
                applyMorphAnimation(
                    getPathList(oldEl),
                    getPathList(newElsList),
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

export function transitionBetweenSeries(
    oldSeriesModel: SeriesModel,
    newSeriesModel: SeriesModel,
    api: ExtensionAPI
) {
    const oldData = oldSeriesModel.getData();
    const newData = newSeriesModel.getData();

    // No data or data are in the same series.
    if (!oldData || !newData || oldData === newData) {
        return;
    }

    transitionBetweenData(oldData, newData, newSeriesModel, api);
}

function getSeriesTransitionKey(series: SeriesModel) {
    return series.get(['universalTransition', 'key']) || series.id;
}

export function installUniversalTransition(registers: EChartsExtensionInstallRegisters) {
    registers.registerUpdateLifecycle('series:transition', (ecModel, api, params) => {
        // TODO multiple series to multiple series.
        if (params.oldSeries && params.updatedSeries) {
            const oldSeriesMap = createHashMap<SeriesModel>();
            each(params.oldSeries, series => {
                oldSeriesMap.set(getSeriesTransitionKey(series), series);
            });
            each(params.updatedSeries, series => {
                if (series.get(['universalTransition', 'enabled'])) {
                    // Only transition between series with same id.
                    const oldSeries = oldSeriesMap.get(getSeriesTransitionKey(series));
                    if (oldSeries) {
                        transitionBetweenSeries(oldSeries, series, api);
                    }
                }
            });
        }
    });
}