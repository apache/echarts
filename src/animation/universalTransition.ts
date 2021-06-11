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
import {createHashMap, each} from 'zrender/src/core/util';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { applyMorphAnimation, getPathList } from './morphTransitionHelper';
import Path from 'zrender/src/graphic/Path';
import { EChartsExtensionInstallRegisters } from '../extension';
import { initProps } from '../util/graphic';
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
                }, newSeriesModel, {
                    dataIndex: newIndex,
                    isFrom: true
                });
            }
        });
    }

    newData.diff(oldData)
        .update(function (newIndex, oldIndex) {
            const oldEl = oldData.getItemGraphicEl(oldIndex);
            const newEl = newData.getItemGraphicEl(newIndex);
            if (oldEl) {
                stopAnimation(oldEl);
            }
            if (newEl) {
                stopAnimation(newEl);
                if (!oldEl) {
                    fadeInElement(newEl, newIndex);
                }
                else {
                    if (oldEl && newEl) {
                        applyMorphAnimation(
                            getPathList(oldEl),
                            getPathList(newEl),
                            newSeriesModel,
                            newIndex,
                            updateMorphingPathProps
                        );
                    }
                }
            }
        })
        .execute();
}

export function installUniversalTransition(registers: EChartsExtensionInstallRegisters) {
    registers.registerPostUpdate((ecModel, api, params) => {
        if (params.oldSeries && params.newSeries) {
            const oldSeriesMap = createHashMap<SeriesModel>();
            each(params.oldSeries, series => {
                oldSeriesMap.set(series.id, series);
            });
            each(params.newSeries, series => {
                if (series.get(['universalTransition', 'enabled'])) {
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