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
import {createHashMap, each, filter} from 'zrender/src/core/util';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { applyMorphAnimation, getPathList } from './morphTransitionHelper';
import { getECData } from '../util/innerStore';
import Path from 'zrender/src/graphic/Path';
import { EChartsExtensionInstallRegisters } from '../extension';
// Universal transitions that can animate between any shapes(series) and any properties in any amounts.


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

    let sourceElements = oldData.mapArray(idx => {
        return oldData.getItemGraphicEl(idx);
    });

    let targetElements = newData.mapArray(idx => {
        return newData.getItemGraphicEl(idx);
    });

    // Align the two arrays.
    function alignNullElements(arr1: unknown[], arr2: unknown[]) {
        for (let i = 0; i < arr1.length; i++) {
            if (!arr2[i]) {
                arr1[i] = null;
            }
        }
    }
    alignNullElements(sourceElements, targetElements);
    alignNullElements(targetElements, sourceElements);

    sourceElements = filter(sourceElements, el => !!el);
    targetElements = filter(targetElements, el => !!el);

    function updateMorphingPathProps(
        from: Path, to: Path,
        rawFrom: Path, rawTo: Path,
        animationCfg: ElementAnimateConfig
    ) {
        to.animateFrom({
            style: rawFrom.style
        }, animationCfg);
    }

    for (let i = 0; i < sourceElements.length; i++) {
        const dataIndex = getECData(targetElements[i]).dataIndex;
        sourceElements[i].traverse(el => el.stopAnimation());
        targetElements[i].traverse(el => el.stopAnimation());
        applyMorphAnimation(
            getPathList(sourceElements[i]),
            getPathList(targetElements[i]),
            newSeriesModel,
            dataIndex,
            updateMorphingPathProps
        );
    }
}

export function installUniversalTransition(registers: EChartsExtensionInstallRegisters) {
    registers.registerPostUpdate((ecModel, api, params) => {
        if (params.oldSeries && params.newSeries) {
            const oldSeriesMap = createHashMap<SeriesModel>();
            each(params.oldSeries, series => {
                oldSeriesMap.set(series.id, series);
            });
            each(params.newSeries, series => {
                if (series.get(['universalAnimation', 'enabled'])) {
                    // Only transition between series with same id.
                    const oldSeries = oldSeriesMap.get(series.id);
                    if (oldSeries) {
                        transitionBetweenSeries(oldSeries, series, api);
                    }
                }
            });
        }
    });
}