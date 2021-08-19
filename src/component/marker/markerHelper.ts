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

import * as numberUtil from '../../util/number';
import {isDimensionStacked} from '../../data/helper/dataStackHelper';
import SeriesModel from '../../model/Series';
import SeriesData from '../../data/SeriesData';
import { MarkerStatisticType, MarkerPositionOption } from './MarkerModel';
import { indexOf, curry, clone, isArray } from 'zrender/src/core/util';
import Axis from '../../coord/Axis';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import { ScaleDataValue, ParsedValue, DimensionLoose, DimensionName } from '../../util/types';

interface MarkerAxisInfo {
    valueDataDim: DimensionName
    valueAxis: Axis
    baseAxis: Axis
    baseDataDim: DimensionName
}

function hasXOrY(item: MarkerPositionOption) {
    return !(isNaN(parseFloat(item.x as string)) && isNaN(parseFloat(item.y as string)));
}

function hasXAndY(item: MarkerPositionOption) {
    return !isNaN(parseFloat(item.x as string)) && !isNaN(parseFloat(item.y as string));
}

function markerTypeCalculatorWithExtent(
    markerType: MarkerStatisticType,
    data: SeriesData,
    otherDataDim: string,
    targetDataDim: string,
    otherCoordIndex: number,
    targetCoordIndex: number
): [ParsedValue[], ParsedValue] {
    const coordArr: ParsedValue[] = [];

    const stacked = isDimensionStacked(data, targetDataDim /*, otherDataDim*/);
    const calcDataDim = stacked
        ? data.getCalculationInfo('stackResultDimension')
        : targetDataDim;

    const value = numCalculate(data, calcDataDim, markerType);

    const dataIndex = data.indicesOfNearest(calcDataDim, value)[0];
    coordArr[otherCoordIndex] = data.get(otherDataDim, dataIndex);
    coordArr[targetCoordIndex] = data.get(calcDataDim, dataIndex);
    const coordArrValue = data.get(targetDataDim, dataIndex);
    // Make it simple, do not visit all stacked value to count precision.
    let precision = numberUtil.getPrecision(data.get(targetDataDim, dataIndex));
    precision = Math.min(precision, 20);
    if (precision >= 0) {
        coordArr[targetCoordIndex] = +(coordArr[targetCoordIndex] as number).toFixed(precision);
    }

    return [coordArr, coordArrValue];
}

// TODO Specified percent
const markerTypeCalculator = {
    min: curry(markerTypeCalculatorWithExtent, 'min'),
    max: curry(markerTypeCalculatorWithExtent, 'max'),
    average: curry(markerTypeCalculatorWithExtent, 'average'),
    median: curry(markerTypeCalculatorWithExtent, 'median')
};

/**
 * Transform markPoint data item to format used in List by do the following
 * 1. Calculate statistic like `max`, `min`, `average`
 * 2. Convert `item.xAxis`, `item.yAxis` to `item.coord` array
 */
export function dataTransform(
    seriesModel: SeriesModel,
    item: MarkerPositionOption
) {
    const data = seriesModel.getData();
    const coordSys = seriesModel.coordinateSystem;

    // 1. If not specify the position with pixel directly
    // 2. If `coord` is not a data array. Which uses `xAxis`,
    // `yAxis` to specify the coord on each dimension

    // parseFloat first because item.x and item.y can be percent string like '20%'
    if (item && !hasXAndY(item) && !isArray(item.coord) && coordSys) {
        const dims = coordSys.dimensions;
        const axisInfo = getAxisInfo(item, data, coordSys, seriesModel);

        // Clone the option
        // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
        item = clone(item);

        if (item.type
            && markerTypeCalculator[item.type]
            && axisInfo.baseAxis && axisInfo.valueAxis
        ) {
            const otherCoordIndex = indexOf(dims, axisInfo.baseAxis.dim);
            const targetCoordIndex = indexOf(dims, axisInfo.valueAxis.dim);

            const coordInfo = markerTypeCalculator[item.type](
                data, axisInfo.baseDataDim, axisInfo.valueDataDim,
                otherCoordIndex, targetCoordIndex
            );
            item.coord = coordInfo[0];
            // Force to use the value of calculated value.
            // let item use the value without stack.
            item.value = coordInfo[1];

        }
        else {
            // FIXME Only has one of xAxis and yAxis.
            const coord = [
                item.xAxis != null ? item.xAxis : item.radiusAxis,
                item.yAxis != null ? item.yAxis : item.angleAxis
            ];
            // Each coord support max, min, average
            for (let i = 0; i < 2; i++) {
                if (markerTypeCalculator[coord[i] as MarkerStatisticType]) {
                    coord[i] = numCalculate(data, data.mapDimension(dims[i]), coord[i] as MarkerStatisticType);
                }
            }
            item.coord = coord;
        }
    }
    return item;
}

export function getAxisInfo(
    item: MarkerPositionOption,
    data: SeriesData,
    coordSys: CoordinateSystem,
    seriesModel: SeriesModel
) {
    const ret = {} as MarkerAxisInfo;

    if (item.valueIndex != null || item.valueDim != null) {
        ret.valueDataDim = item.valueIndex != null
            ? data.getDimension(item.valueIndex) : item.valueDim;
        ret.valueAxis = coordSys.getAxis(dataDimToCoordDim(seriesModel, ret.valueDataDim));
        ret.baseAxis = coordSys.getOtherAxis(ret.valueAxis);
        ret.baseDataDim = data.mapDimension(ret.baseAxis.dim);
    }
    else {
        ret.baseAxis = seriesModel.getBaseAxis();
        ret.valueAxis = coordSys.getOtherAxis(ret.baseAxis);
        ret.baseDataDim = data.mapDimension(ret.baseAxis.dim);
        ret.valueDataDim = data.mapDimension(ret.valueAxis.dim);
    }

    return ret;
}

function dataDimToCoordDim(seriesModel: SeriesModel, dataDim: DimensionLoose): DimensionName {
    const dimItem = seriesModel.getData().getDimensionInfo(dataDim);
    return dimItem && dimItem.coordDim;
}

/**
 * Filter data which is out of coordinateSystem range
 * [dataFilter description]
 */
export function dataFilter(
    // Currently only polar and cartesian has containData.
    coordSys: CoordinateSystem & {
        containData?(data: ScaleDataValue[]): boolean
    },
    item: MarkerPositionOption
) {
    // Alwalys return true if there is no coordSys
    return (coordSys && coordSys.containData && item.coord && !hasXOrY(item))
        ? coordSys.containData(item.coord) : true;
}

export function dimValueGetter(
    item: MarkerPositionOption,
    dimName: string,
    dataIndex: number,
    dimIndex: number
) {
    // x, y, radius, angle
    if (dimIndex < 2) {
        return item.coord && item.coord[dimIndex] as ParsedValue;
    }
    return item.value;
}

export function numCalculate(
    data: SeriesData,
    valueDataDim: string,
    type: MarkerStatisticType
) {
    if (type === 'average') {
        let sum = 0;
        let count = 0;
        data.each(valueDataDim, function (val: number, idx) {
            if (!isNaN(val)) {
                sum += val;
                count++;
            }
        });
        return sum / count;
    }
    else if (type === 'median') {
        return data.getMedian(valueDataDim);
    }
    else {
        // max & min
        return data.getDataExtent(valueDataDim)[type === 'max' ? 1 : 0];
    }
}
