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

/* global Float32Array */

import {subPixelOptimize} from '../../util/graphic';
import createRenderPlanner from '../helper/createRenderPlanner';
import {parsePercent} from '../../util/number';
import {retrieve2} from 'zrender/src/core/util';
import { StageHandler, StageHandlerProgressParams } from '../../util/types';
import CandlestickSeriesModel from './CandlestickSeries';
import List from '../../data/List';
import { RectLike } from 'zrender/src/core/BoundingRect';

const LargeArr = typeof Float32Array !== 'undefined' ? Float32Array : Array;

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

        let coordSys = seriesModel.coordinateSystem;
        let data = seriesModel.getData();
        let candleWidth = calculateCandleWidth(seriesModel, data);
        let cDimIdx = 0;
        let vDimIdx = 1;
        let coordDims = ['x', 'y'];
        let cDim = data.mapDimension(coordDims[cDimIdx]);
        let vDims = data.mapDimension(coordDims[vDimIdx], true);
        let openDim = vDims[0];
        let closeDim = vDims[1];
        let lowestDim = vDims[2];
        let highestDim = vDims[3];

        data.setLayout({
            candleWidth: candleWidth,
            // The value is experimented visually.
            isSimpleBox: candleWidth <= 1.3
        } as CandlestickLayoutMeta);

        if (cDim == null || vDims.length < 4) {
            return;
        }

        return {
            progress: seriesModel.pipelineContext.large
                ? largeProgress : normalProgress
        };

        function normalProgress(params: StageHandlerProgressParams, data: List) {
            let dataIndex;
            while ((dataIndex = params.next()) != null) {

                let axisDimVal = data.get(cDim, dataIndex) as number;
                let openVal = data.get(openDim, dataIndex) as number;
                let closeVal = data.get(closeDim, dataIndex) as number;
                let lowestVal = data.get(lowestDim, dataIndex) as number;
                let highestVal = data.get(highestDim, dataIndex) as number;

                let ocLow = Math.min(openVal, closeVal);
                let ocHigh = Math.max(openVal, closeVal);

                let ocLowPoint = getPoint(ocLow, axisDimVal);
                let ocHighPoint = getPoint(ocHigh, axisDimVal);
                let lowestPoint = getPoint(lowestVal, axisDimVal);
                let highestPoint = getPoint(highestVal, axisDimVal);

                let ends: number[][] = [];
                addBodyEnd(ends, ocHighPoint, 0);
                addBodyEnd(ends, ocLowPoint, 1);

                ends.push(
                    subPixelOptimizePoint(highestPoint),
                    subPixelOptimizePoint(ocHighPoint),
                    subPixelOptimizePoint(lowestPoint),
                    subPixelOptimizePoint(ocLowPoint)
                );

                data.setItemLayout(dataIndex, {
                    sign: getSign(data, dataIndex, openVal, closeVal, closeDim),
                    initBaseline: openVal > closeVal
                        ? ocHighPoint[vDimIdx] : ocLowPoint[vDimIdx], // open point.
                    ends: ends,
                    brushRect: makeBrushRect(lowestVal, highestVal, axisDimVal)
                } as CandlestickItemLayout);
            }

            function getPoint(val: number, axisDimVal: number) {
                let p = [];
                p[cDimIdx] = axisDimVal;
                p[vDimIdx] = val;
                return (isNaN(axisDimVal) || isNaN(val))
                    ? [NaN, NaN]
                    : coordSys.dataToPoint(p);
            }

            function addBodyEnd(ends: number[][], point: number[], start: number) {
                let point1 = point.slice();
                let point2 = point.slice();

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
                let pmin = getPoint(lowestVal, axisDimVal);
                let pmax = getPoint(highestVal, axisDimVal);

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

        function largeProgress(params: StageHandlerProgressParams, data: List) {
            // Structure: [sign, x, yhigh, ylow, sign, x, yhigh, ylow, ...]
            let points = new LargeArr(params.count * 4);
            let offset = 0;
            let point;
            let tmpIn: number[] = [];
            let tmpOut: number[] = [];
            let dataIndex;

            while ((dataIndex = params.next()) != null) {
                let axisDimVal = data.get(cDim, dataIndex) as number;
                let openVal = data.get(openDim, dataIndex) as number;
                let closeVal = data.get(closeDim, dataIndex) as number;
                let lowestVal = data.get(lowestDim, dataIndex) as number;
                let highestVal = data.get(highestDim, dataIndex) as number;

                if (isNaN(axisDimVal) || isNaN(lowestVal) || isNaN(highestVal)) {
                    points[offset++] = NaN;
                    offset += 3;
                    continue;
                }

                points[offset++] = getSign(data, dataIndex, openVal, closeVal, closeDim);

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

function getSign(data: List, dataIndex: number, openVal: number, closeVal: number, closeDim: string) {
    let sign;
    if (openVal > closeVal) {
        sign = -1;
    }
    else if (openVal < closeVal) {
        sign = 1;
    }
    else {
        sign = dataIndex > 0
            // If close === open, compare with close of last record
            ? (data.get(closeDim, dataIndex - 1) <= closeVal ? 1 : -1)
            // No record of previous, set to be positive
            : 1;
    }

    return sign;
}

function calculateCandleWidth(seriesModel: CandlestickSeriesModel, data: List) {
    let baseAxis = seriesModel.getBaseAxis();
    let extent;

    let bandWidth = baseAxis.type === 'category'
        ? baseAxis.getBandWidth()
        : (
            extent = baseAxis.getExtent(),
            Math.abs(extent[1] - extent[0]) / data.count()
        );

    let barMaxWidth = parsePercent(
        retrieve2(seriesModel.get('barMaxWidth'), bandWidth),
        bandWidth
    );
    let barMinWidth = parsePercent(
        retrieve2(seriesModel.get('barMinWidth'), 1),
        bandWidth
    );
    let barWidth = seriesModel.get('barWidth');

    return barWidth != null
        ? parsePercent(barWidth, bandWidth)
        // Put max outer to ensure bar visible in spite of overlap.
        : Math.max(Math.min(bandWidth / 2, barMaxWidth), barMinWidth);
}

export default candlestickLayout;
