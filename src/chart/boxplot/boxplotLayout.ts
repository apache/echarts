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

import { isArray } from 'zrender/src/core/util';
import {parsePercent} from '../../util/number';
import type GlobalModel from '../../model/Global';
import BoxplotSeriesModel, { SERIES_TYPE_BOXPLOT } from './BoxplotSeries';
import {
    eachCollectedAxis, eachCollectedSeries, getCollectedSeriesLength,
    requireAxisStatistics
} from '../../coord/axisStatistics';
import { makeCallOnlyOnce } from '../../util/model';
import { EChartsExtensionInstallRegisters } from '../../extension';
import Axis from '../../coord/Axis';
import { registerAxisContainShapeHandler } from '../../coord/scaleRawExtentInfo';
import { calcBandWidth } from '../../coord/axisBand';
import {
    makeAxisStatKey,
    createSimpleAxisStatClient, createBandWidthBasedAxisContainShapeHandler
} from '../helper/axisSnippets';


const callOnlyOnce = makeCallOnlyOnce();

export interface BoxplotItemLayout {
    ends: number[][]
    initBaseline: number
}

export function boxplotLayout(ecModel: GlobalModel) {
    const axisStatKey = makeAxisStatKey(SERIES_TYPE_BOXPLOT);
    eachCollectedAxis(ecModel, axisStatKey, function (axis) {
        const seriesCount = getCollectedSeriesLength(axis, axisStatKey);
        if (!seriesCount) {
            return;
        }
        const baseResult = calculateBase(axis, seriesCount);
        eachCollectedSeries(axis, axisStatKey, function (seriesModel: BoxplotSeriesModel, idx) {
            layoutSingleSeries(
                seriesModel,
                baseResult.boxOffsetList[idx],
                baseResult.boxWidthList[idx]
            );
        });
    });
}

/**
 * Calculate offset and box width for each series.
 */
function calculateBase(baseAxis: Axis, seriesCount: number): {
    boxOffsetList: number[];
    boxWidthList: number[];
} {
    const boxWidthList: number[] = [];
    const boxOffsetList: number[] = [];
    const boundList: number[][] = [];

    const bandWidth = calcBandWidth(
        baseAxis,
        {fromStat: {key: makeAxisStatKey(SERIES_TYPE_BOXPLOT)}, min: 1},
    ).w;

    eachCollectedSeries(baseAxis, makeAxisStatKey(SERIES_TYPE_BOXPLOT), function (seriesModel: BoxplotSeriesModel) {
        let boxWidthBound = seriesModel.get('boxWidth');
        if (!isArray(boxWidthBound)) {
            boxWidthBound = [boxWidthBound, boxWidthBound];
        }
        boundList.push([
            parsePercent(boxWidthBound[0], bandWidth) || 0,
            parsePercent(boxWidthBound[1], bandWidth) || 0
        ]);
    });

    const availableWidth = bandWidth * 0.8 - 2;
    const boxGap = availableWidth / seriesCount * 0.3;
    const boxWidth = (availableWidth - boxGap * (seriesCount - 1)) / seriesCount;
    let base = boxWidth / 2 - availableWidth / 2;

    eachCollectedSeries(baseAxis, makeAxisStatKey(SERIES_TYPE_BOXPLOT), function (seriesModel, idx) {
        boxOffsetList.push(base);
        base += boxGap + boxWidth;

        boxWidthList.push(
            Math.min(Math.max(boxWidth, boundList[idx][0]), boundList[idx][1])
        );
    });

    return {
        boxOffsetList,
        boxWidthList,
    };
}

/**
 * Calculate points location for each series.
 */
function layoutSingleSeries(seriesModel: BoxplotSeriesModel, offset: number, boxWidth: number) {
    const coordSys = seriesModel.coordinateSystem;
    const data = seriesModel.getData();
    const halfWidth = boxWidth / 2;
    const cDimIdx = seriesModel.getWhiskerBoxesLayout() === 'horizontal' ? 0 : 1;
    const vDimIdx = 1 - cDimIdx;
    const coordDims = ['x', 'y'];
    const cDim = data.mapDimension(coordDims[cDimIdx]);
    const vDims = data.mapDimensionsAll(coordDims[vDimIdx]);

    if (cDim == null || vDims.length < 5) {
        return;
    }

    for (let dataIndex = 0; dataIndex < data.count(); dataIndex++) {
        const axisDimVal = data.get(cDim, dataIndex) as number;

        const median = getPoint(axisDimVal, vDims[2], dataIndex);
        const end1 = getPoint(axisDimVal, vDims[0], dataIndex);
        const end2 = getPoint(axisDimVal, vDims[1], dataIndex);
        const end4 = getPoint(axisDimVal, vDims[3], dataIndex);
        const end5 = getPoint(axisDimVal, vDims[4], dataIndex);

        const ends: number[][] = [];
        addBodyEnd(ends, end2, false);
        addBodyEnd(ends, end4, true);

        ends.push(end1, end2, end5, end4);
        layEndLine(ends, end1);
        layEndLine(ends, end5);
        layEndLine(ends, median);

        data.setItemLayout(dataIndex, {
            initBaseline: median[vDimIdx],
            ends: ends
        } as BoxplotItemLayout);
    }

    function getPoint(axisDimVal: number, dim: string, dataIndex: number) {
        const val = data.get(dim, dataIndex) as number;
        const p = [];
        p[cDimIdx] = axisDimVal;
        p[vDimIdx] = val;
        let point;
        if (isNaN(axisDimVal) || isNaN(val)) {
            point = [NaN, NaN];
        }
        else {
            point = coordSys.dataToPoint(p);
            point[cDimIdx] += offset;
        }
        return point;
    }

    function addBodyEnd(ends: number[][], point: number[], start?: boolean) {
        const point1 = point.slice();
        const point2 = point.slice();
        point1[cDimIdx] += halfWidth;
        point2[cDimIdx] -= halfWidth;
        start
            ? ends.push(point1, point2)
            : ends.push(point2, point1);
    }

    function layEndLine(ends: number[][], endCenter: number[]) {
        const from = endCenter.slice();
        const to = endCenter.slice();
        from[cDimIdx] -= halfWidth;
        to[cDimIdx] += halfWidth;
        ends.push(from, to);
    }
}

export function registerBoxplotAxisHandlers(registers: EChartsExtensionInstallRegisters) {
    callOnlyOnce(registers, function () {
        const axisStatKey = makeAxisStatKey(SERIES_TYPE_BOXPLOT);
        requireAxisStatistics(
            registers,
            axisStatKey,
            createSimpleAxisStatClient(SERIES_TYPE_BOXPLOT)
        );
        registerAxisContainShapeHandler(
            axisStatKey,
            createBandWidthBasedAxisContainShapeHandler(axisStatKey)
        );
    });
}
