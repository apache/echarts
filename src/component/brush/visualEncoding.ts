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


import * as zrUtil from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import * as visualSolution from '../../visual/visualSolution';
import { BrushSelectableArea, makeBrushCommonSelectorForSeries } from './selector';
import * as throttleUtil from '../../util/throttle';
import BrushTargetManager from '../helper/BrushTargetManager';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Payload } from '../../util/types';
import BrushModel, { BrushAreaParamInternal } from './BrushModel';
import SeriesModel from '../../model/Series';
import ParallelSeriesModel from '../../chart/parallel/ParallelSeries';
import { ZRenderType } from 'zrender/src/zrender';
import { BrushType, BrushDimensionMinMax } from '../helper/BrushController';

type BrushVisualState = 'inBrush' | 'outOfBrush';

const STATE_LIST = ['inBrush', 'outOfBrush'] as const;
const DISPATCH_METHOD = '__ecBrushSelect' as const;
const DISPATCH_FLAG = '__ecInBrushSelectEvent' as const;

interface BrushGlobalDispatcher extends ZRenderType {
    [DISPATCH_FLAG]: boolean;
    [DISPATCH_METHOD]: typeof doDispatch;
}

interface BrushSelectedItem {
    brushId: string;
    brushIndex: number;
    brushName: string;
    areas: BrushAreaParamInternal[];
    selected: {
        seriesId: string;
        seriesIndex: number;
        seriesName: string;
        dataIndex: number[];
    }[]
};

export function layoutCovers(ecModel: GlobalModel): void {
    ecModel.eachComponent({mainType: 'brush'}, function (brushModel: BrushModel) {
        const brushTargetManager = brushModel.brushTargetManager = new BrushTargetManager(brushModel.option, ecModel);
        brushTargetManager.setInputRanges(brushModel.areas, ecModel);
    });
}

/**
 * Register the visual encoding if this modules required.
 */
export default function brushVisual(ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {

    const brushSelected: BrushSelectedItem[] = [];
    let throttleType;
    let throttleDelay;

    ecModel.eachComponent({mainType: 'brush'}, function (brushModel: BrushModel) {
        payload && payload.type === 'takeGlobalCursor' && brushModel.setBrushOption(
            payload.key === 'brush' ? payload.brushOption : {brushType: false}
        );
    });

    layoutCovers(ecModel);


    ecModel.eachComponent({mainType: 'brush'}, function (brushModel: BrushModel, brushIndex) {

        const thisBrushSelected: BrushSelectedItem = {
            brushId: brushModel.id,
            brushIndex: brushIndex,
            brushName: brushModel.name,
            areas: zrUtil.clone(brushModel.areas),
            selected: []
        };
        // Every brush component exists in event params, convenient
        // for user to find by index.
        brushSelected.push(thisBrushSelected);

        const brushOption = brushModel.option;
        const brushLink = brushOption.brushLink;
        const linkedSeriesMap: {[seriesIndex: number]: 0 | 1} = [];
        const selectedDataIndexForLink: {[dataIndex: number]: 0 | 1} = [];
        const rangeInfoBySeries: {[seriesIndex: number]: BrushSelectableArea[]} = [];
        let hasBrushExists = false;

        if (!brushIndex) { // Only the first throttle setting works.
            throttleType = brushOption.throttleType;
            throttleDelay = brushOption.throttleDelay;
        }

        // Add boundingRect and selectors to range.
        const areas: BrushSelectableArea[] = zrUtil.map(brushModel.areas, function (area) {
            const builder = boundingRectBuilders[area.brushType];
            const selectableArea = zrUtil.defaults(
                {boundingRect: builder ? builder(area) : void 0},
                area
            ) as BrushSelectableArea;
            selectableArea.selectors = makeBrushCommonSelectorForSeries(selectableArea);
            return selectableArea;
        });

        const visualMappings = visualSolution.createVisualMappings(
            brushModel.option, STATE_LIST, function (mappingOption) {
                mappingOption.mappingMethod = 'fixed';
            }
        );

        zrUtil.isArray(brushLink) && zrUtil.each(brushLink, function (seriesIndex) {
            linkedSeriesMap[seriesIndex] = 1;
        });

        function linkOthers(seriesIndex: number): boolean {
            return brushLink === 'all' || !!linkedSeriesMap[seriesIndex];
        }

        // If no supported brush or no brush on the series,
        // all visuals should be in original state.
        function brushed(rangeInfoList: BrushSelectableArea[]): boolean {
            return !!rangeInfoList.length;
        }

        /**
         * Logic for each series: (If the logic has to be modified one day, do it carefully!)
         *
         * ( brushed ┬ && ┬hasBrushExist ┬ && linkOthers  ) => StepA: ┬record, ┬ StepB: ┬visualByRecord.
         *   !brushed┘    ├hasBrushExist ┤                            └nothing,┘        ├visualByRecord.
         *                └!hasBrushExist┘                                              └nothing.
         * ( !brushed  && ┬hasBrushExist ┬ && linkOthers  ) => StepA:  nothing,  StepB: ┬visualByRecord.
         *                └!hasBrushExist┘                                              └nothing.
         * ( brushed ┬ &&                     !linkOthers ) => StepA:  nothing,  StepB: ┬visualByCheck.
         *   !brushed┘                                                                  └nothing.
         * ( !brushed  &&                     !linkOthers ) => StepA:  nothing,  StepB:  nothing.
         */

        // Step A
        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            const rangeInfoList: BrushSelectableArea[] = rangeInfoBySeries[seriesIndex] = [];

            seriesModel.subType === 'parallel'
                ? stepAParallel(seriesModel as ParallelSeriesModel, seriesIndex)
                : stepAOthers(seriesModel, seriesIndex, rangeInfoList);
        });

        function stepAParallel(seriesModel: ParallelSeriesModel, seriesIndex: number): void {
            const coordSys = seriesModel.coordinateSystem;
            hasBrushExists = hasBrushExists || coordSys.hasAxisBrushed();

            linkOthers(seriesIndex) && coordSys.eachActiveState(
                seriesModel.getData(),
                function (activeState, dataIndex) {
                    activeState === 'active' && (selectedDataIndexForLink[dataIndex] = 1);
                }
            );
        }

        function stepAOthers(
            seriesModel: SeriesModel, seriesIndex: number, rangeInfoList: BrushSelectableArea[]
        ): void {
            if (!seriesModel.brushSelector || brushModelNotControll(brushModel, seriesIndex)) {
                return;
            }

            zrUtil.each(areas, function (area) {
                if (brushModel.brushTargetManager.controlSeries(area, seriesModel, ecModel)) {
                    rangeInfoList.push(area);
                }
                hasBrushExists = hasBrushExists || brushed(rangeInfoList);
            });

            if (linkOthers(seriesIndex) && brushed(rangeInfoList)) {
                const data = seriesModel.getData();
                data.each(function (dataIndex) {
                    if (checkInRange(seriesModel, rangeInfoList, data, dataIndex)) {
                        selectedDataIndexForLink[dataIndex] = 1;
                    }
                });
            }
        }

        // Step B
        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            const seriesBrushSelected: BrushSelectedItem['selected'][0] = {
                seriesId: seriesModel.id,
                seriesIndex: seriesIndex,
                seriesName: seriesModel.name,
                dataIndex: []
            };
            // Every series exists in event params, convenient
            // for user to find series by seriesIndex.
            thisBrushSelected.selected.push(seriesBrushSelected);

            const rangeInfoList = rangeInfoBySeries[seriesIndex];

            const data = seriesModel.getData();
            const getValueState = linkOthers(seriesIndex)
                ? function (dataIndex: number): BrushVisualState {
                    return selectedDataIndexForLink[dataIndex]
                        ? (seriesBrushSelected.dataIndex.push(data.getRawIndex(dataIndex)), 'inBrush')
                        : 'outOfBrush';
                }
                : function (dataIndex: number): BrushVisualState {
                    return checkInRange(seriesModel, rangeInfoList, data, dataIndex)
                        ? (seriesBrushSelected.dataIndex.push(data.getRawIndex(dataIndex)), 'inBrush')
                        : 'outOfBrush';
                };

            // If no supported brush or no brush, all visuals are in original state.
            (linkOthers(seriesIndex) ? hasBrushExists : brushed(rangeInfoList))
                && visualSolution.applyVisual(
                    STATE_LIST, visualMappings, data, getValueState
                );
        });

    });

    dispatchAction(api, throttleType, throttleDelay, brushSelected, payload);
};

function dispatchAction(
    api: ExtensionAPI,
    throttleType: throttleUtil.ThrottleType,
    throttleDelay: number,
    brushSelected: BrushSelectedItem[],
    payload: Payload
): void {
    // This event will not be triggered when `setOpion`, otherwise dead lock may
    // triggered when do `setOption` in event listener, which we do not find
    // satisfactory way to solve yet. Some considered resolutions:
    // (a) Diff with prevoius selected data ant only trigger event when changed.
    // But store previous data and diff precisely (i.e., not only by dataIndex, but
    // also detect value changes in selected data) might bring complexity or fragility.
    // (b) Use spectial param like `silent` to suppress event triggering.
    // But such kind of volatile param may be weird in `setOption`.
    if (!payload) {
        return;
    }

    const zr = api.getZr() as BrushGlobalDispatcher;
    if (zr[DISPATCH_FLAG]) {
        return;
    }

    if (!zr[DISPATCH_METHOD]) {
        zr[DISPATCH_METHOD] = doDispatch;
    }

    const fn = throttleUtil.createOrUpdate(zr, DISPATCH_METHOD, throttleDelay, throttleType);

    fn(api, brushSelected);
}

function doDispatch(api: ExtensionAPI, brushSelected: BrushSelectedItem[]): void {
    if (!api.isDisposed()) {
        const zr = api.getZr() as BrushGlobalDispatcher;
        zr[DISPATCH_FLAG] = true;
        api.dispatchAction({
            type: 'brushSelect',
            batch: brushSelected
        });
        zr[DISPATCH_FLAG] = false;
    }
}

function checkInRange(
    seriesModel: SeriesModel,
    rangeInfoList: BrushSelectableArea[],
    data: ReturnType<SeriesModel['getData']>,
    dataIndex: number
) {
    for (let i = 0, len = rangeInfoList.length; i < len; i++) {
        const area = rangeInfoList[i];
        if (seriesModel.brushSelector(
            dataIndex, data, area.selectors, area
        )) {
            return true;
        }
    }
}

function brushModelNotControll(brushModel: BrushModel, seriesIndex: number): boolean {
    const seriesIndices = brushModel.option.seriesIndex;
    return seriesIndices != null
        && seriesIndices !== 'all'
        && (
            zrUtil.isArray(seriesIndices)
            ? zrUtil.indexOf(seriesIndices, seriesIndex) < 0
            : seriesIndex !== seriesIndices
        );
}

type AreaBoundingRectBuilder = (area: BrushAreaParamInternal) => BoundingRect;
const boundingRectBuilders: Partial<Record<BrushType, AreaBoundingRectBuilder>> = {

    rect: function (area) {
        return getBoundingRectFromMinMax(area.range as BrushDimensionMinMax[]);
    },

    polygon: function (area) {
        let minMax;
        const range = area.range as BrushDimensionMinMax[];

        for (let i = 0, len = range.length; i < len; i++) {
            minMax = minMax || [[Infinity, -Infinity], [Infinity, -Infinity]];
            const rg = range[i];
            rg[0] < minMax[0][0] && (minMax[0][0] = rg[0]);
            rg[0] > minMax[0][1] && (minMax[0][1] = rg[0]);
            rg[1] < minMax[1][0] && (minMax[1][0] = rg[1]);
            rg[1] > minMax[1][1] && (minMax[1][1] = rg[1]);
        }

        return minMax && getBoundingRectFromMinMax(minMax);
    }
};


function getBoundingRectFromMinMax(minMax: BrushDimensionMinMax[]): BoundingRect {
    return new BoundingRect(
        minMax[0][0],
        minMax[1][0],
        minMax[0][1] - minMax[0][0],
        minMax[1][1] - minMax[1][0]
    );
}