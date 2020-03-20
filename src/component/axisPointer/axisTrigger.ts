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

import {makeInner, ModelFinderObject} from '../../util/model';
import * as modelHelper from './modelHelper';
import findPointFromSeries from './findPointFromSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { Dictionary, Payload, CommonAxisPointerOption } from '../../util/types';
import AxisPointerModel, { AxisPointerOption } from './AxisPointerModel';
import { each, curry, bind, extend, Curry1 } from 'zrender/src/core/util';
import { ZRenderType } from 'zrender/src/zrender';

var inner = makeInner<{
    axisPointerLastHighlights: Dictionary<BatchItem>
}, ZRenderType>();

type AxisValue = CommonAxisPointerOption['value'];

interface DataIndex {
    seriesIndex: number
    dataIndex: number
    dataIndexInside: number
}

type BatchItem = DataIndex;

interface DataByAxis {
    // TODO: TYPE Value type
    value: string | number
    axisIndex: number
    axisDim: string
    axisType: string
    axisId: string

    seriesDataIndices: DataIndex[]

    valueLabelOpt: {
        precision: AxisPointerOption['label']['precision']
        formatter: AxisPointerOption['label']['formatter']
    }
}
interface DataByCoordSys {
    coordSysId: string
    coordSysIndex: number
    coordSysType: string
    coordSysMainType: string
    dataByAxis: DataByAxis[]
}
interface DataByCoordSysCollection {
    list: DataByCoordSys[]
    map: Dictionary<DataByCoordSys>
}

type CollectedCoordInfo = ReturnType<typeof modelHelper['collect']>;
type CollectedAxisInfo = CollectedCoordInfo['axesInfo'][string];

interface AxisTriggerPayload extends Payload {
    currTrigger?: 'click' | 'mousemove' | 'leave'
    /**
     * x and y, which are mandatory, specify a point to trigger axisPointer and tooltip.
     */
    x?: number
    /**
     * x and y, which are mandatory, specify a point to trigger axisPointer and tooltip.
     */
    y?: number
    /**
     * finder, optional, restrict target axes.
     */
    seriesIndex?: number
    dataIndex: number

    axesInfo?: {
        // 'x'|'y'|'angle'
        axisDim?: string
        axisIndex?: number
        value?: AxisValue
    }[]

    dispatchAction: ExtensionAPI['dispatchAction']
}

type ShowValueMap = Dictionary<{
    value: AxisValue
    payloadBatch: BatchItem[]
}>;

/**
 * Basic logic: check all axis, if they do not demand show/highlight,
 * then hide/downplay them.
 *
 * @return content of event obj for echarts.connect.
 */
export default function (
    payload: AxisTriggerPayload,
    ecModel: GlobalModel,
    api: ExtensionAPI
) {
    var currTrigger = payload.currTrigger;
    var point = [payload.x, payload.y];
    var finder = payload;
    var dispatchAction = payload.dispatchAction || bind(api.dispatchAction, api);
    var coordSysAxesInfo = (ecModel.getComponent('axisPointer') as AxisPointerModel)
        .coordSysAxesInfo as CollectedCoordInfo;

    // Pending
    // See #6121. But we are not able to reproduce it yet.
    if (!coordSysAxesInfo) {
        return;
    }

    if (illegalPoint(point)) {
        // Used in the default behavior of `connection`: use the sample seriesIndex
        // and dataIndex. And also used in the tooltipView trigger.
        point = findPointFromSeries({
            seriesIndex: finder.seriesIndex,
            // Do not use dataIndexInside from other ec instance.
            // FIXME: auto detect it?
            dataIndex: finder.dataIndex
        }, ecModel).point;
    }
    var isIllegalPoint = illegalPoint(point);

    // Axis and value can be specified when calling dispatchAction({type: 'updateAxisPointer'}).
    // Notice: In this case, it is difficult to get the `point` (which is necessary to show
    // tooltip, so if point is not given, we just use the point found by sample seriesIndex
    // and dataIndex.
    var inputAxesInfo = finder.axesInfo;

    var axesInfo = coordSysAxesInfo.axesInfo;
    var shouldHide = currTrigger === 'leave' || illegalPoint(point);
    var outputPayload = {} as AxisTriggerPayload;

    var showValueMap: ShowValueMap = {};
    var dataByCoordSys: DataByCoordSysCollection = {
        list: [],
        map: {}
    };
    var updaters = {
        showPointer: curry(showPointer, showValueMap),
        showTooltip: curry(showTooltip, dataByCoordSys)
    };

    // Process for triggered axes.
    each(coordSysAxesInfo.coordSysMap, function (coordSys, coordSysKey) {
        // If a point given, it must be contained by the coordinate system.
        var coordSysContainsPoint = isIllegalPoint || coordSys.containPoint(point);

        each(coordSysAxesInfo.coordSysAxesInfo[coordSysKey], function (axisInfo, key) {
            var axis = axisInfo.axis;
            var inputAxisInfo = findInputAxisInfo(inputAxesInfo, axisInfo);
            // If no inputAxesInfo, no axis is restricted.
            if (!shouldHide && coordSysContainsPoint && (!inputAxesInfo || inputAxisInfo)) {
                var val = inputAxisInfo && inputAxisInfo.value;
                if (val == null && !isIllegalPoint) {
                    val = axis.pointToData(point);
                }
                val != null && processOnAxis(axisInfo, val, updaters, false, outputPayload);
            }
        });
    });

    // Process for linked axes.
    var linkTriggers: Dictionary<AxisValue> = {};
    each(axesInfo, function (tarAxisInfo, tarKey) {
        var linkGroup = tarAxisInfo.linkGroup;

        // If axis has been triggered in the previous stage, it should not be triggered by link.
        if (linkGroup && !showValueMap[tarKey]) {
            each(linkGroup.axesInfo, function (srcAxisInfo, srcKey) {
                var srcValItem = showValueMap[srcKey];
                // If srcValItem exist, source axis is triggered, so link to target axis.
                if (srcAxisInfo !== tarAxisInfo && srcValItem) {
                    var val = srcValItem.value;
                    linkGroup.mapper && (val = tarAxisInfo.axis.scale.parse(linkGroup.mapper(
                        val, makeMapperParam(srcAxisInfo), makeMapperParam(tarAxisInfo)
                    )));
                    linkTriggers[tarAxisInfo.key] = val;
                }
            });
        }
    });
    each(linkTriggers, function (val, tarKey) {
        processOnAxis(axesInfo[tarKey], val, updaters, true, outputPayload);
    });

    updateModelActually(showValueMap, axesInfo, outputPayload);
    dispatchTooltipActually(dataByCoordSys, point, payload, dispatchAction);
    dispatchHighDownActually(axesInfo, dispatchAction, api);

    return outputPayload;
}

function processOnAxis(
    axisInfo: CollectedCoordInfo['axesInfo'][string],
    newValue: AxisValue,
    updaters: {
        showPointer: Curry1<typeof showPointer, ShowValueMap>
        showTooltip: Curry1<typeof showTooltip, DataByCoordSysCollection>
    },
    noSnap: boolean,
    outputFinder: ModelFinderObject
) {
    var axis = axisInfo.axis;

    if (axis.scale.isBlank() || !axis.containData(newValue)) {
        return;
    }

    if (!axisInfo.involveSeries) {
        updaters.showPointer(axisInfo, newValue);
        return;
    }

    // Heavy calculation. So put it after axis.containData checking.
    var payloadInfo = buildPayloadsBySeries(newValue, axisInfo);
    var payloadBatch = payloadInfo.payloadBatch;
    var snapToValue = payloadInfo.snapToValue;

    // Fill content of event obj for echarts.connect.
    // By defualt use the first involved series data as a sample to connect.
    if (payloadBatch[0] && outputFinder.seriesIndex == null) {
        extend(outputFinder, payloadBatch[0]);
    }

    // If no linkSource input, this process is for collecting link
    // target, where snap should not be accepted.
    if (!noSnap && axisInfo.snap) {
        if (axis.containData(snapToValue) && snapToValue != null) {
            newValue = snapToValue;
        }
    }

    updaters.showPointer(axisInfo, newValue, payloadBatch);
    // Tooltip should always be snapToValue, otherwise there will be
    // incorrect "axis value ~ series value" mapping displayed in tooltip.
    updaters.showTooltip(axisInfo, payloadInfo, snapToValue);
}

function buildPayloadsBySeries(value: AxisValue, axisInfo: CollectedAxisInfo) {
    var axis = axisInfo.axis;
    var dim = axis.dim;
    var snapToValue = value;
    var payloadBatch: BatchItem[] = [];
    var minDist = Number.MAX_VALUE;
    var minDiff = -1;

    each(axisInfo.seriesModels, function (series, idx) {
        var dataDim = series.getData().mapDimension(dim, true);
        var seriesNestestValue;
        var dataIndices;

        if (series.getAxisTooltipData) {
            var result = series.getAxisTooltipData(dataDim, value, axis);
            dataIndices = result.dataIndices;
            seriesNestestValue = result.nestestValue;
        }
        else {
            dataIndices = series.getData().indicesOfNearest(
                dataDim[0],
                value as number,
                // Add a threshold to avoid find the wrong dataIndex
                // when data length is not same.
                // false,
                axis.type === 'category' ? 0.5 : null
            );
            if (!dataIndices.length) {
                return;
            }
            seriesNestestValue = series.getData().get(dataDim[0], dataIndices[0]);
        }

        if (seriesNestestValue == null || !isFinite(seriesNestestValue)) {
            return;
        }

        var diff = value as number - seriesNestestValue;
        var dist = Math.abs(diff);
        // Consider category case
        if (dist <= minDist) {
            if (dist < minDist || (diff >= 0 && minDiff < 0)) {
                minDist = dist;
                minDiff = diff;
                snapToValue = seriesNestestValue;
                payloadBatch.length = 0;
            }
            each(dataIndices, function (dataIndex) {
                payloadBatch.push({
                    seriesIndex: series.seriesIndex,
                    dataIndexInside: dataIndex,
                    dataIndex: series.getData().getRawIndex(dataIndex)
                });
            });
        }
    });

    return {
        payloadBatch: payloadBatch,
        snapToValue: snapToValue
    };
}

function showPointer(
    showValueMap: ShowValueMap,
    axisInfo: CollectedAxisInfo,
    value: AxisValue,
    payloadBatch?: BatchItem[]
) {
    showValueMap[axisInfo.key] = {
        value: value,
        payloadBatch: payloadBatch
    };
}

function showTooltip(
    dataByCoordSys: DataByCoordSysCollection,
    axisInfo: CollectedCoordInfo['axesInfo'][string],
    payloadInfo: { payloadBatch: BatchItem[] },
    value: AxisValue
) {
    var payloadBatch = payloadInfo.payloadBatch;
    var axis = axisInfo.axis;
    var axisModel = axis.model;
    var axisPointerModel = axisInfo.axisPointerModel;

    // If no data, do not create anything in dataByCoordSys,
    // whose length will be used to judge whether dispatch action.
    if (!axisInfo.triggerTooltip || !payloadBatch.length) {
        return;
    }

    var coordSysModel = axisInfo.coordSys.model;
    var coordSysKey = modelHelper.makeKey(coordSysModel);
    var coordSysItem = dataByCoordSys.map[coordSysKey];
    if (!coordSysItem) {
        coordSysItem = dataByCoordSys.map[coordSysKey] = {
            coordSysId: coordSysModel.id,
            coordSysIndex: coordSysModel.componentIndex,
            coordSysType: coordSysModel.type,
            coordSysMainType: coordSysModel.mainType,
            dataByAxis: []
        };
        dataByCoordSys.list.push(coordSysItem);
    }

    coordSysItem.dataByAxis.push({
        axisDim: axis.dim,
        axisIndex: axisModel.componentIndex,
        axisType: axisModel.type,
        axisId: axisModel.id,
        value: value as number,
        // Caustion: viewHelper.getValueLabel is actually on "view stage", which
        // depends that all models have been updated. So it should not be performed
        // here. Considering axisPointerModel used here is volatile, which is hard
        // to be retrieve in TooltipView, we prepare parameters here.
        valueLabelOpt: {
            precision: axisPointerModel.get(['label', 'precision']),
            formatter: axisPointerModel.get(['label', 'formatter'])
        },
        seriesDataIndices: payloadBatch.slice()
    });
}

function updateModelActually(
    showValueMap: ShowValueMap,
    axesInfo: Dictionary<CollectedAxisInfo>,
    outputPayload: AxisTriggerPayload
) {
    var outputAxesInfo: AxisTriggerPayload['axesInfo'] = outputPayload.axesInfo = [];
    // Basic logic: If no 'show' required, 'hide' this axisPointer.
    each(axesInfo, function (axisInfo, key) {
        var option = axisInfo.axisPointerModel.option;
        var valItem = showValueMap[key];

        if (valItem) {
            !axisInfo.useHandle && (option.status = 'show');
            option.value = valItem.value;
            // For label formatter param and highlight.
            option.seriesDataIndices = (valItem.payloadBatch || []).slice();
        }
        // When always show (e.g., handle used), remain
        // original value and status.
        else {
            // If hide, value still need to be set, consider
            // click legend to toggle axis blank.
            !axisInfo.useHandle && (option.status = 'hide');
        }

        // If status is 'hide', should be no info in payload.
        option.status === 'show' && outputAxesInfo.push({
            axisDim: axisInfo.axis.dim,
            axisIndex: axisInfo.axis.model.componentIndex,
            value: option.value
        });
    });
}

function dispatchTooltipActually(
    dataByCoordSys: DataByCoordSysCollection,
    point: number[],
    payload: AxisTriggerPayload,
    dispatchAction: ExtensionAPI['dispatchAction']
) {
    // Basic logic: If no showTip required, hideTip will be dispatched.
    if (illegalPoint(point) || !dataByCoordSys.list.length) {
        dispatchAction({type: 'hideTip'});
        return;
    }

    // In most case only one axis (or event one series is used). It is
    // convinient to fetch payload.seriesIndex and payload.dataIndex
    // dirtectly. So put the first seriesIndex and dataIndex of the first
    // axis on the payload.
    var sampleItem = ((dataByCoordSys.list[0].dataByAxis[0] || {}).seriesDataIndices || [])[0] || {} as DataIndex;

    dispatchAction({
        type: 'showTip',
        escapeConnect: true,
        x: point[0],
        y: point[1],
        tooltipOption: payload.tooltipOption,
        position: payload.position,
        dataIndexInside: sampleItem.dataIndexInside,
        dataIndex: sampleItem.dataIndex,
        seriesIndex: sampleItem.seriesIndex,
        dataByCoordSys: dataByCoordSys.list
    });
}

function dispatchHighDownActually(
    axesInfo: Dictionary<CollectedAxisInfo>,
    dispatchAction: ExtensionAPI['dispatchAction'],
    api: ExtensionAPI
) {
    // FIXME
    // highlight status modification shoule be a stage of main process?
    // (Consider confilct (e.g., legend and axisPointer) and setOption)

    var zr = api.getZr();
    var highDownKey = 'axisPointerLastHighlights' as const;
    var lastHighlights = inner(zr)[highDownKey] || {};
    var newHighlights: Dictionary<BatchItem> = inner(zr)[highDownKey] = {};

    // Update highlight/downplay status according to axisPointer model.
    // Build hash map and remove duplicate incidentally.
    each(axesInfo, function (axisInfo, key) {
        var option = axisInfo.axisPointerModel.option;
        option.status === 'show' && each(option.seriesDataIndices, function (batchItem) {
            var key = batchItem.seriesIndex + ' | ' + batchItem.dataIndex;
            newHighlights[key] = batchItem;
        });
    });

    // Diff.
    var toHighlight: BatchItem[] = [];
    var toDownplay: BatchItem[] = [];
    each(lastHighlights, function (batchItem, key) {
        !newHighlights[key] && toDownplay.push(batchItem);
    });
    each(newHighlights, function (batchItem, key) {
        !lastHighlights[key] && toHighlight.push(batchItem);
    });

    toDownplay.length && api.dispatchAction({
        type: 'downplay', escapeConnect: true, batch: toDownplay
    });
    toHighlight.length && api.dispatchAction({
        type: 'highlight', escapeConnect: true, batch: toHighlight
    });
}

function findInputAxisInfo(
    inputAxesInfo: AxisTriggerPayload['axesInfo'],
    axisInfo: CollectedAxisInfo
) {
    for (var i = 0; i < (inputAxesInfo || []).length; i++) {
        var inputAxisInfo = inputAxesInfo[i];
        if (axisInfo.axis.dim === inputAxisInfo.axisDim
            && axisInfo.axis.model.componentIndex === inputAxisInfo.axisIndex
        ) {
            return inputAxisInfo;
        }
    }
}

function makeMapperParam(axisInfo: CollectedAxisInfo) {
    var axisModel = axisInfo.axis.model;
    var item = {} as {
        axisDim: string
        axisIndex: number
        axisId: string
        axisName: string
        // TODO `dim`AxisIndex, `dim`AxisName, `dim`AxisId?
    };
    var dim = item.axisDim = axisInfo.axis.dim;
    item.axisIndex = (item as any)[dim + 'AxisIndex'] = axisModel.componentIndex;
    item.axisName = (item as any)[dim + 'AxisName'] = axisModel.name;
    item.axisId = (item as any)[dim + 'AxisId'] = axisModel.id;
    return item;
}

function illegalPoint(point?: number[]) {
    return !point || point[0] == null || isNaN(point[0]) || point[1] == null || isNaN(point[1]);
}
