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
import {
    isCartesian2DDeclaredSeries, findAxisModels, isCartesian2DInjectedAsDataCoordSys
} from './cartesianAxisHelper';
import { getDataDimensionsOnAxis, unionExtent } from '../axisHelper';
import { AxisBaseModel } from '../AxisBaseModel';
import type Axis from '../Axis';
import GlobalModel from '../../model/Global';
import { Dictionary } from '../../util/types';
import {
    AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM, ensureScaleRawExtentInfo, ScaleRawExtentInfo, ScaleRawExtentResult
} from '../scaleRawExtentInfo';
import { initExtentForUnion } from '../../util/model';

/**
 * @obsolete
 * PENDING:
 *  - This file is not used anywhere currently.
 *  - This is a similar behavior to `dataZoom`, but historically supported separately.
 *    Can it be merged into `dataZoom`?
 *  - The impl need to be fixed, @see #15050 , and,
 *      - Remove side-effect.
 *      - Need to fix the case:
 *          series_a =>
 *              x_m (category): dataExtent: [3,8]
 *              y_i:
 *          series_b =>
 *              x_m (category): dataExtent: [4,6]
 *              y_j:
 *          series_c =>
 *              x_m (category): dataExtent: [5,7]
 *              y_j:
 *          dataZoom control y_i, so series_a is excluded.
 *          So x_m.condExtent = [4,6] U [5,7] = [4,7] , and use it to call ensureScaleRawExtentInfo.
 *              (incorrect?, supposed to be [3,8]?)
 *
 * See test case `test/axis-filter-extent.html`.
 *
 * The responsibility of this processor:
 *  Enable category axis to use the specified `min`/`max` to shrink the extent of the orthogonal axis in
 *  Cartesian2D. That is, if some data item on a category axis is out of the range of `min`/`max`, the
 *  extent of the orthogonal axis will exclude the data items.
 *  A typical case is bar-racing, where bars are sorted dynamically and may only need to
 *  displayed part of the whole bars.
 *
 * IMPL_MEMO:
 *  - For each triple xAxis-yAxis-series, if either xAxis or yAxis is controlled by a dataZoom,
 *    the triple should be ignored in this processor.
 *  - Input:
 *    - Cartesian series data ("series approximate extent" has been prepared).
 *    - Axis original `ScaleRawExtentInfo`
 *      (the content comes from ec option and "series approximate extent").
 *  - Modify(result):
 *    - `ScaleRawExtentInfo#min/max` of the determined "target axis".
 *    - "series approximate extent".
 */
// The priority is just after dataZoom processor.
echarts.registerProcessor(echarts.PRIORITY.PROCESSOR.FILTER + 10, {

    getTargetSeries: function (ecModel) {
        const seriesModelMap = createHashMap<SeriesModel>();
        ecModel.eachSeries(function (seriesModel: SeriesModel) {
            isCartesian2DDeclaredSeries(seriesModel) && seriesModelMap.set(seriesModel.uid, seriesModel);
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

type AxisRecord = {
    rawExtentInfo?: ScaleRawExtentInfo;
    rawExtentResult?: ScaleRawExtentResult;
    tarExtent?: number[];
};

type SeriesRecord = {
    seriesModel: SeriesModel;
    xAxisModel: AxisBaseModel;
    yAxisModel: AxisBaseModel;
};

function prepareDataExtentOnAxis(
    ecModel: GlobalModel,
    axisRecordMap: HashMap<AxisRecord>,
    seriesRecords: SeriesRecord[]
): void {
    ecModel.eachSeries(function (seriesModel: SeriesModel) {
        // If pie (or other similar series) use cartesian2d, the logic below is
        // probably wrong, therefore skip it temporarily.
        // TODO: support union extent in this case.
        //  e.g. make a fake seriesData by series.coord/series.center, and it can be
        //  performed by data processing (such as, filter), and applied here.
        if (!isCartesian2DInjectedAsDataCoordSys(seriesModel)) {
            return;
        }

        const axesModelMap = findAxisModels(seriesModel);
        const xAxisModel = axesModelMap.xAxisModel;
        const yAxisModel = axesModelMap.yAxisModel;
        const xAxis = xAxisModel.axis;
        const yAxis = yAxisModel.axis;
        const xRawExtentInfo = ensureScaleRawExtentInfo(xAxis);
        const yRawExtentInfo = ensureScaleRawExtentInfo(yAxis);

        // If either axis controlled by other filter like "dataZoom",
        // use the rule of dataZoom rather than adopting the rules here.
        if (
            (xRawExtentInfo && xRawExtentInfo.from === AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM)
            || (yRawExtentInfo && yRawExtentInfo.from === AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM)
        ) {
            return;
        }

        seriesRecords.push({
            seriesModel: seriesModel,
            xAxisModel: xAxisModel,
            yAxisModel: yAxisModel
        });
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
        xAxisRecord.rawExtentInfo = ensureScaleRawExtentInfo(xAxis);
        yAxisRecord.rawExtentInfo = ensureScaleRawExtentInfo(yAxis);
        xAxisRecord.rawExtentResult = xAxisRecord.rawExtentInfo.calculate();
        yAxisRecord.rawExtentResult = yAxisRecord.rawExtentInfo.calculate();

        const data = seriesRecord.seriesModel.getData();
        // For duplication removal.
        // key: series data dimension corresponding to the condition axis.
        const condDimMap: Dictionary<boolean> = {};
        // key: series data dimension corresponding to the target axis.
        const tarDimMap: Dictionary<boolean> = {};
        let condAxis: Axis;
        let tarAxisRecord: AxisRecord;

        function addCondition(axis: Axis, axisRecord: AxisRecord) {
            // But for simplicity and safety and performance, we only adopt this
            // feature on category axis at present.
            const rawExtentResult = axisRecord.rawExtentResult;
            if (axis.type === 'category'
                && (rawExtentResult.dataMin < rawExtentResult.min || rawExtentResult.max < rawExtentResult.dataMax)
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
            return initExtentForUnion();
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
                if (condAxis.scale.contain(condVal)) {
                    unionExtent(tarDimExtents[0], data.get(singleTarDim, dataIdx) as number);
                }
            }
        }
        else {
            for (let dataIdx = 0; dataIdx < dataLen; dataIdx++) {
                for (let j = 0; j < condDimsLen; j++) {
                    const condVal = data.get(condDims[j], dataIdx) as number;
                    if (condAxis.scale.contain(condVal)) {
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
            // FIXME: if there has been approximateExtent set?
            data.setApproximateExtent(tarDimExtent as [number, number], tarDims[i]);
            const tarAxisExtent = tarAxisRecord.tarExtent = tarAxisRecord.tarExtent || initExtentForUnion();
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
            // const rawExtentInfo = axisRecord.rawExtentInfo;
            // Shrink the original extent.
            if (!rawExtentResult.minFixed && tarAxisExtent[0] > rawExtentResult.min) {
                // rawExtentInfo.modifyDataMinMax('min', tarAxisExtent[0]);
            }
            if (!rawExtentResult.maxFixed && tarAxisExtent[1] < rawExtentResult.max) {
                // rawExtentInfo.modifyDataMinMax('max', tarAxisExtent[1]);
            }
        }
    });
}

function prepareAxisRecord(
    axisRecordMap: HashMap<AxisRecord>,
    axisModel: AxisBaseModel
): AxisRecord {
    return axisRecordMap.get(axisModel.uid)
        || axisRecordMap.set(axisModel.uid, {});
}
