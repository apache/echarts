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

import * as echarts from '../../core/echarts';
import { createHashMap, each, HashMap, hasOwn, keys, map } from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import { isCartesian2DSeries, findAxisModels } from './cartesianAxisHelper';
import { getDataDimensionsOnAxis, unionAxisExtentFromData } from '../axisHelper';
import { AxisBaseModel } from '../AxisBaseModel';
import Axis from '../Axis';
import GlobalModel from '../../model/Global';
import { Dictionary } from '../../util/types';
import { ScaleRawExtentInfo, ScaleRawExtentResult, ensureScaleRawExtentInfo } from '../scaleRawExtentInfo';


type AxisRecord = {
    condExtent: number[];
    rawExtentInfo?: ScaleRawExtentInfo;
    rawExtentResult?: ScaleRawExtentResult
    tarExtent?: number[];
};

type SeriesRecord = {
    seriesModel: SeriesModel;
    xAxisModel: AxisBaseModel;
    yAxisModel: AxisBaseModel;
};

// A tricky: the priority is just after dataZoom processor.
// If dataZoom has fixed the min/max, this processor do not need to work.
// TODO: SELF REGISTERED.
echarts.registerProcessor(echarts.PRIORITY.PROCESSOR.FILTER + 10, {

    getTargetSeries: function (ecModel) {
        const seriesModelMap = createHashMap<SeriesModel>();
        ecModel.eachSeries(function (seriesModel: SeriesModel) {
            isCartesian2DSeries(seriesModel) && seriesModelMap.set(seriesModel.uid, seriesModel);
        });
        return seriesModelMap;
    },

    overallReset: function (ecModel, api) {
        const seriesRecords = [] as SeriesRecord[];
        const axisRecordMap = createHashMap<AxisRecord>();

        prepareDataExtentOnAxis(ecModel, axisRecordMap, seriesRecords);
        calculateFilteredExtent(axisRecordMap, seriesRecords);
        shrinkAxisExtent(axisRecordMap);
    }
});

function prepareDataExtentOnAxis(
    ecModel: GlobalModel,
    axisRecordMap: HashMap<AxisRecord>,
    seriesRecords: SeriesRecord[]
): void {
    ecModel.eachSeries(function (seriesModel: SeriesModel) {
        if (!isCartesian2DSeries(seriesModel)) {
            return;
        }

        const axesModelMap = findAxisModels(seriesModel);
        const xAxisModel = axesModelMap.xAxisModel;
        const yAxisModel = axesModelMap.yAxisModel;
        const xAxis = xAxisModel.axis;
        const yAxis = yAxisModel.axis;
        const xRawExtentInfo = xAxis.scale.rawExtentInfo;
        const yRawExtentInfo = yAxis.scale.rawExtentInfo;
        const data = seriesModel.getData();

        // If either axis controlled by other filter like "dataZoom",
        // use the rule of dataZoom rather than adopting the rules here.
        if (
            (xRawExtentInfo && xRawExtentInfo.frozen)
            || (yRawExtentInfo && yRawExtentInfo.frozen)
        ) {
            return;
        }

        seriesRecords.push({
            seriesModel: seriesModel,
            xAxisModel: xAxisModel,
            yAxisModel: yAxisModel
        });

        // FIXME: this logic needs to be consistent with
        // `coord/cartesian/Grid.ts#_updateScale`.
        // It's not good to implement one logic in multiple places.
        unionAxisExtentFromData(prepareAxisRecord(axisRecordMap, xAxisModel).condExtent, data, xAxis.dim);
        unionAxisExtentFromData(prepareAxisRecord(axisRecordMap, yAxisModel).condExtent, data, yAxis.dim);
    });
}

function calculateFilteredExtent(
    axisRecordMap: HashMap<AxisRecord>,
    seriesRecords: SeriesRecord[]
) {
    each(seriesRecords, function (seriesRecord) {
        const xAxisModel = seriesRecord.xAxisModel;
        const yAxisModel = seriesRecord.yAxisModel;
        const xAxis = xAxisModel.axis;
        const yAxis = yAxisModel.axis;
        const xAxisRecord = prepareAxisRecord(axisRecordMap, xAxisModel);
        const yAxisRecord = prepareAxisRecord(axisRecordMap, yAxisModel);
        xAxisRecord.rawExtentInfo = ensureScaleRawExtentInfo(
            xAxis.scale, xAxisModel, xAxisRecord.condExtent
        );
        yAxisRecord.rawExtentInfo = ensureScaleRawExtentInfo(
            yAxis.scale, yAxisModel, yAxisRecord.condExtent
        );
        xAxisRecord.rawExtentResult = xAxisRecord.rawExtentInfo.calculate();
        yAxisRecord.rawExtentResult = yAxisRecord.rawExtentInfo.calculate();

        // If the "xAxis" is set `min`/`max`, some data items might be out of the cartesian.
        // then the "yAxis" may needs to calculate extent only based on the data items inside
        // the cartesian (similar to what "dataZoom" did).
        // A typical case is bar-racing, where bars ara sort dynamically and may only need to
        // displayed part of the whole bars.

        const data = seriesRecord.seriesModel.getData();
        // For duplication removal.
        const condDimMap: Dictionary<boolean> = {};
        const tarDimMap: Dictionary<boolean> = {};
        let condAxis: Axis;
        let tarAxisRecord: AxisRecord;

        function addCondition(axis: Axis, axisRecord: AxisRecord) {
            // But for simplicity and safety and performance, we only adopt this
            // feature on category axis at present.
            const condExtent = axisRecord.condExtent;
            const rawExtentResult = axisRecord.rawExtentResult;
            if (axis.type === 'category'
                && (condExtent[0] < rawExtentResult.min || rawExtentResult.max < condExtent[1])
            ) {
                each(getDataDimensionsOnAxis(data, axis.dim), function (dataDim) {
                    if (!hasOwn(condDimMap, dataDim)) {
                        condDimMap[dataDim] = true;
                        condAxis = axis;
                    }
                });
            }
        }
        function addTarget(axis: Axis, axisRecord: AxisRecord) {
            const rawExtentResult = axisRecord.rawExtentResult;
            if (axis.type !== 'category'
                && (!rawExtentResult.minFixed || !rawExtentResult.maxFixed)
            ) {
                each(getDataDimensionsOnAxis(data, axis.dim), function (dataDim) {
                    if (!hasOwn(condDimMap, dataDim) && !hasOwn(tarDimMap, dataDim)) {
                        tarDimMap[dataDim] = true;
                        tarAxisRecord = axisRecord;
                    }
                });
            }
        }

        addCondition(xAxis, xAxisRecord);
        addCondition(yAxis, yAxisRecord);
        addTarget(xAxis, xAxisRecord);
        addTarget(yAxis, yAxisRecord);

        const condDims = keys(condDimMap);
        const tarDims = keys(tarDimMap);
        const tarDimExtents = map(tarDims, function () {
            return initExtent();
        });

        const condDimsLen = condDims.length;
        const tarDimsLen = tarDims.length;

        if (!condDimsLen || !tarDimsLen) {
            return;
        }

        const singleCondDim = condDimsLen === 1 ? condDims[0] : null;
        const singleTarDim = tarDimsLen === 1 ? tarDims[0] : null;
        const dataLen = data.count();

        // Time consuming, because this is a "block task".
        // Simple optimization for the vast majority of cases.
        if (singleCondDim && singleTarDim) {
            for (let dataIdx = 0; dataIdx < dataLen; dataIdx++) {
                const condVal = data.get(singleCondDim, dataIdx) as number;
                if (condAxis.scale.isInExtentRange(condVal)) {
                    unionExtent(tarDimExtents[0], data.get(singleTarDim, dataIdx) as number);
                }
            }
        }
        else {
            for (let dataIdx = 0; dataIdx < dataLen; dataIdx++) {
                for (let j = 0; j < condDimsLen; j++) {
                    const condVal = data.get(condDims[j], dataIdx) as number;
                    if (condAxis.scale.isInExtentRange(condVal)) {
                        for (let k = 0; k < tarDimsLen; k++) {
                            unionExtent(tarDimExtents[k], data.get(tarDims[k], dataIdx) as number);
                        }
                        // Any one dim is in range means satisfied.
                        break;
                    }
                }
            }
        }

        each(tarDimExtents, function (tarDimExtent, i) {
            const dim = tarDims[i];
            // FIXME: if there has been approximateExtent set?
            data.setApproximateExtent(tarDimExtent as [number, number], dim);
            const tarAxisExtent = tarAxisRecord.tarExtent = tarAxisRecord.tarExtent || initExtent();
            unionExtent(tarAxisExtent, tarDimExtent[0]);
            unionExtent(tarAxisExtent, tarDimExtent[1]);
        });
    });
}

function shrinkAxisExtent(axisRecordMap: HashMap<AxisRecord>) {
    axisRecordMap.each(function (axisRecord) {
        const tarAxisExtent = axisRecord.tarExtent;
        if (tarAxisExtent) {
            const rawExtentResult = axisRecord.rawExtentResult;
            const rawExtentInfo = axisRecord.rawExtentInfo;
            // Shink the original extent.
            if (!rawExtentResult.minFixed && tarAxisExtent[0] > rawExtentResult.min) {
                rawExtentInfo.modifyDataMinMax('min', tarAxisExtent[0]);
            }
            if (!rawExtentResult.maxFixed && tarAxisExtent[1] < rawExtentResult.max) {
                rawExtentInfo.modifyDataMinMax('max', tarAxisExtent[1]);
            }
        }
    });
}

function prepareAxisRecord(
    axisRecordMap: HashMap<AxisRecord>,
    axisModel: AxisBaseModel
): AxisRecord {
    return axisRecordMap.get(axisModel.uid)
        || axisRecordMap.set(axisModel.uid, { condExtent: initExtent() });
}

function initExtent() {
    return [Infinity, -Infinity];
}

function unionExtent(extent: number[], val: number) {
    val < extent[0] && (extent[0] = val);
    val > extent[1] && (extent[1] = val);
}
