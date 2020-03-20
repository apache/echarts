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
import {parsePercent} from '../../util/number';
import type GlobalModel from '../../model/Global';
import BoxplotSeriesModel from './BoxplotSeries';
import Axis2D from '../../coord/cartesian/Axis2D';

const each = zrUtil.each;

interface GroupItem {
    seriesModels: BoxplotSeriesModel[]
    axis: Axis2D
    boxOffsetList: number[]
    boxWidthList: number[]
}

export interface BoxplotItemLayout {
    ends: number[][]
    initBaseline: number
}

export default function (ecModel: GlobalModel) {

    let groupResult = groupSeriesByAxis(ecModel);

    each(groupResult, function (groupItem) {
        let seriesModels = groupItem.seriesModels;

        if (!seriesModels.length) {
            return;
        }

        calculateBase(groupItem);

        each(seriesModels, function (seriesModel, idx) {
            layoutSingleSeries(
                seriesModel,
                groupItem.boxOffsetList[idx],
                groupItem.boxWidthList[idx]
            );
        });
    });
}

/**
 * Group series by axis.
 */
function groupSeriesByAxis(ecModel: GlobalModel) {
    let result: GroupItem[] = [];
    let axisList: Axis2D[] = [];

    ecModel.eachSeriesByType('boxplot', function (seriesModel: BoxplotSeriesModel) {
        let baseAxis = seriesModel.getBaseAxis();
        let idx = zrUtil.indexOf(axisList, baseAxis);

        if (idx < 0) {
            idx = axisList.length;
            axisList[idx] = baseAxis;
            result[idx] = {
                axis: baseAxis,
                seriesModels: []
            } as GroupItem;
        }

        result[idx].seriesModels.push(seriesModel);
    });

    return result;
}

/**
 * Calculate offset and box width for each series.
 */
function calculateBase(groupItem: GroupItem) {
    let extent;
    let baseAxis = groupItem.axis;
    let seriesModels = groupItem.seriesModels;
    let seriesCount = seriesModels.length;

    let boxWidthList: number[] = groupItem.boxWidthList = [];
    let boxOffsetList: number[] = groupItem.boxOffsetList = [];
    let boundList: number[][] = [];

    let bandWidth: number;
    if (baseAxis.type === 'category') {
        bandWidth = baseAxis.getBandWidth();
    }
    else {
        let maxDataCount = 0;
        each(seriesModels, function (seriesModel) {
            maxDataCount = Math.max(maxDataCount, seriesModel.getData().count());
        });
        extent = baseAxis.getExtent(),
        Math.abs(extent[1] - extent[0]) / maxDataCount;
    }

    each(seriesModels, function (seriesModel) {
        let boxWidthBound = seriesModel.get('boxWidth');
        if (!zrUtil.isArray(boxWidthBound)) {
            boxWidthBound = [boxWidthBound, boxWidthBound];
        }
        boundList.push([
            parsePercent(boxWidthBound[0], bandWidth) || 0,
            parsePercent(boxWidthBound[1], bandWidth) || 0
        ]);
    });

    let availableWidth = bandWidth * 0.8 - 2;
    let boxGap = availableWidth / seriesCount * 0.3;
    let boxWidth = (availableWidth - boxGap * (seriesCount - 1)) / seriesCount;
    let base = boxWidth / 2 - availableWidth / 2;

    each(seriesModels, function (seriesModel, idx) {
        boxOffsetList.push(base);
        base += boxGap + boxWidth;

        boxWidthList.push(
            Math.min(Math.max(boxWidth, boundList[idx][0]), boundList[idx][1])
        );
    });
}

/**
 * Calculate points location for each series.
 */
function layoutSingleSeries(seriesModel: BoxplotSeriesModel, offset: number, boxWidth: number) {
    let coordSys = seriesModel.coordinateSystem;
    let data = seriesModel.getData();
    let halfWidth = boxWidth / 2;
    let cDimIdx = seriesModel.get('layout') === 'horizontal' ? 0 : 1;
    let vDimIdx = 1 - cDimIdx;
    let coordDims = ['x', 'y'];
    let cDim = data.mapDimension(coordDims[cDimIdx]);
    let vDims = data.mapDimension(coordDims[vDimIdx], true);

    if (cDim == null || vDims.length < 5) {
        return;
    }

    for (let dataIndex = 0; dataIndex < data.count(); dataIndex++) {
        let axisDimVal = data.get(cDim, dataIndex) as number;

        let median = getPoint(axisDimVal, vDims[2], dataIndex);
        let end1 = getPoint(axisDimVal, vDims[0], dataIndex);
        let end2 = getPoint(axisDimVal, vDims[1], dataIndex);
        let end4 = getPoint(axisDimVal, vDims[3], dataIndex);
        let end5 = getPoint(axisDimVal, vDims[4], dataIndex);

        let ends: number[][] = [];
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
        let val = data.get(dim, dataIndex) as number;
        let p = [];
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
        let point1 = point.slice();
        let point2 = point.slice();
        point1[cDimIdx] += halfWidth;
        point2[cDimIdx] -= halfWidth;
        start
            ? ends.push(point1, point2)
            : ends.push(point2, point1);
    }

    function layEndLine(ends: number[][], endCenter: number[]) {
        let from = endCenter.slice();
        let to = endCenter.slice();
        from[cDimIdx] -= halfWidth;
        to[cDimIdx] += halfWidth;
        ends.push(from, to);
    }
}
