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

import {subPixelOptimize} from '../../util/graphic';
import createRenderPlanner from '../helper/createRenderPlanner';
import {parsePercent} from '../../util/number';
import {map, retrieve2} from 'zrender/src/core/util';
import { DimensionIndex, StageHandler, StageHandlerProgressParams } from '../../util/types';
import CandlestickSeriesModel, { CandlestickDataItemOption } from './CandlestickSeries';
import SeriesData from '../../data/SeriesData';
import { RectLike } from 'zrender/src/core/BoundingRect';
import DataStore from '../../data/DataStore';
import { createFloat32Array } from '../../util/vendor';

export interface CandlestickItemLayout {
    sign: number
    initBaseline: number
    ends: number[][]
    brushRect: RectLike
}

export interface CandlestickLayoutMeta {
    candleWidth: number
    isSimpleBox: boolean
}

const candlestickLayout: StageHandler = {

    seriesType: 'candlestick',

    plan: createRenderPlanner(),

    reset: function (seriesModel: CandlestickSeriesModel) {

        const coordSys = seriesModel.coordinateSystem;
        const data = seriesModel.getData();
        const candleWidth = calculateCandleWidth(seriesModel, data);
        const cDimIdx = 0;
        const vDimIdx = 1;
        const coordDims = ['x', 'y'];
        const cDimI = data.getDimensionIndex(data.mapDimension(coordDims[cDimIdx]));
        const vDimsI = map(data.mapDimensionsAll(coordDims[vDimIdx]), data.getDimensionIndex, data);
        const openDimI = vDimsI[0];
        const closeDimI = vDimsI[1];
        const lowestDimI = vDimsI[2];
        const highestDimI = vDimsI[3];

        data.setLayout({
            candleWidth: candleWidth,
            // The value is experimented visually.
            isSimpleBox: candleWidth <= 1.3
        } as CandlestickLayoutMeta);

        if (cDimI < 0 || vDimsI.length < 4) {
            return;
        }

        return {
            progress: seriesModel.pipelineContext.large
                ? largeProgress : normalProgress
        };

        function normalProgress(params: StageHandlerProgressParams, data: SeriesData) {
            let dataIndex;
            const store = data.getStore();
            while ((dataIndex = params.next()) != null) {

                const axisDimVal = store.get(cDimI, dataIndex) as number;
                const openVal = store.get(openDimI, dataIndex) as number;
                const closeVal = store.get(closeDimI, dataIndex) as number;
                const lowestVal = store.get(lowestDimI, dataIndex) as number;
                const highestVal = store.get(highestDimI, dataIndex) as number;

                const ocLow = Math.min(openVal, closeVal);
                const ocHigh = Math.max(openVal, closeVal);

                const ocLowPoint = getPoint(ocLow, axisDimVal);
                const ocHighPoint = getPoint(ocHigh, axisDimVal);
                const lowestPoint = getPoint(lowestVal, axisDimVal);
                const highestPoint = getPoint(highestVal, axisDimVal);

                const ends: number[][] = [];
                addBodyEnd(ends, ocHighPoint, 0);
                addBodyEnd(ends, ocLowPoint, 1);

                ends.push(
                    subPixelOptimizePoint(highestPoint),
                    subPixelOptimizePoint(ocHighPoint),
                    subPixelOptimizePoint(lowestPoint),
                    subPixelOptimizePoint(ocLowPoint)
                );

                const itemModel = data.getItemModel<CandlestickDataItemOption>(dataIndex);
                const hasDojiColor = !!itemModel.get(['itemStyle', 'borderColorDoji']);
                data.setItemLayout(dataIndex, {
                    sign: getSign(store, dataIndex, openVal, closeVal, closeDimI, hasDojiColor),
                    initBaseline: openVal > closeVal
                        ? ocHighPoint[vDimIdx] : ocLowPoint[vDimIdx], // open point.
                    ends: ends,
                    brushRect: makeBrushRect(lowestVal, highestVal, axisDimVal)
                } as CandlestickItemLayout);
            }

            function getPoint(val: number, axisDimVal: number) {
                const p = [];
                p[cDimIdx] = axisDimVal;
                p[vDimIdx] = val;
                return (isNaN(axisDimVal) || isNaN(val))
                    ? [NaN, NaN]
                    : coordSys.dataToPoint(p);
            }

            function addBodyEnd(ends: number[][], point: number[], start: number) {
                const point1 = point.slice();
                const point2 = point.slice();

                point1[cDimIdx] = subPixelOptimize(
                    point1[cDimIdx] + candleWidth / 2, 1, false
                );
                point2[cDimIdx] = subPixelOptimize(
                    point2[cDimIdx] - candleWidth / 2, 1, true
                );

                start
                    ? ends.push(point1, point2)
                    : ends.push(point2, point1);
            }

            function makeBrushRect(lowestVal: number, highestVal: number, axisDimVal: number) {
                const pmin = getPoint(lowestVal, axisDimVal);
                const pmax = getPoint(highestVal, axisDimVal);

                pmin[cDimIdx] -= candleWidth / 2;
                pmax[cDimIdx] -= candleWidth / 2;

                return {
                    x: pmin[0],
                    y: pmin[1],
                    width: vDimIdx ? candleWidth : pmax[0] - pmin[0],
                    height: vDimIdx ? pmax[1] - pmin[1] : candleWidth
                };
            }

            function subPixelOptimizePoint(point: number[]) {
                point[cDimIdx] = subPixelOptimize(point[cDimIdx], 1);
                return point;
            }
        }

        function largeProgress(params: StageHandlerProgressParams, data: SeriesData) {
            // Structure: [sign, x, yhigh, ylow, sign, x, yhigh, ylow, ...]
            const points = createFloat32Array(params.count * 4);
            let offset = 0;
            let point;
            const tmpIn: number[] = [];
            const tmpOut: number[] = [];
            let dataIndex;
            const store = data.getStore();
            const hasDojiColor = !!seriesModel.get(['itemStyle', 'borderColorDoji']);

            while ((dataIndex = params.next()) != null) {
                const axisDimVal = store.get(cDimI, dataIndex) as number;
                const openVal = store.get(openDimI, dataIndex) as number;
                const closeVal = store.get(closeDimI, dataIndex) as number;
                const lowestVal = store.get(lowestDimI, dataIndex) as number;
                const highestVal = store.get(highestDimI, dataIndex) as number;

                if (isNaN(axisDimVal) || isNaN(lowestVal) || isNaN(highestVal)) {
                    points[offset++] = NaN;
                    offset += 3;
                    continue;
                }

                points[offset++] = getSign(store, dataIndex, openVal, closeVal, closeDimI, hasDojiColor);

                tmpIn[cDimIdx] = axisDimVal;

                tmpIn[vDimIdx] = lowestVal;
                point = coordSys.dataToPoint(tmpIn, null, tmpOut);
                points[offset++] = point ? point[0] : NaN;
                points[offset++] = point ? point[1] : NaN;
                tmpIn[vDimIdx] = highestVal;
                point = coordSys.dataToPoint(tmpIn, null, tmpOut);
                points[offset++] = point ? point[1] : NaN;
            }

            data.setLayout('largePoints', points);
        }
    }
};

/**
 * Get the sign of a single data.
 *
 * @returns 0 for doji with hasDojiColor: true,
 *          1 for positive,
 *          -1 for negative.
 */
function getSign(
    store: DataStore, dataIndex: number, openVal: number, closeVal: number, closeDimI: DimensionIndex,
    hasDojiColor: boolean
): -1 | 1 | 0 {
    let sign: -1 | 1 | 0;
    if (openVal > closeVal) {
        sign = -1;
    }
    else if (openVal < closeVal) {
        sign = 1;
    }
    else {
        sign = hasDojiColor
            // When doji color is set, use it instead of color/color0.
            ? 0
            : (dataIndex > 0
                // If close === open, compare with close of last record
                ? (store.get(closeDimI, dataIndex - 1) <= closeVal ? 1 : -1)
                // No record of previous, set to be positive
                : 1
            );
    }

    return sign;
}

function calculateCandleWidth(seriesModel: CandlestickSeriesModel, data: SeriesData) {
    const baseAxis = seriesModel.getBaseAxis();
    let extent;

    const bandWidth = baseAxis.type === 'category'
        ? baseAxis.getBandWidth()
        : (
            extent = baseAxis.getExtent(),
            Math.abs(extent[1] - extent[0]) / data.count()
        );

    const barMaxWidth = parsePercent(
        retrieve2(seriesModel.get('barMaxWidth'), bandWidth),
        bandWidth
    );
    const barMinWidth = parsePercent(
        retrieve2(seriesModel.get('barMinWidth'), 1),
        bandWidth
    );
    const barWidth = seriesModel.get('barWidth');

    return barWidth != null
        ? parsePercent(barWidth, bandWidth)
        // Put max outer to ensure bar visible in spite of overlap.
        : Math.max(Math.min(bandWidth / 2, barMaxWidth), barMinWidth);
}

export default candlestickLayout;
