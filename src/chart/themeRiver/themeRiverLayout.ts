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
import * as numberUtil from '../../util/number';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import ThemeRiverSeriesModel, { ThemeRiverSeriesOption } from './ThemeRiverSeries';
import { RectLike } from 'zrender/src/core/BoundingRect';
import List from '../../data/List';

export interface ThemeRiverLayoutInfo {
    rect: RectLike
    boundaryGap: ThemeRiverSeriesOption['boundaryGap']
}

export default function (ecModel: GlobalModel, api: ExtensionAPI) {

    ecModel.eachSeriesByType('themeRiver', function (seriesModel: ThemeRiverSeriesModel) {

        let data = seriesModel.getData();

        let single = seriesModel.coordinateSystem;

        let layoutInfo = {} as ThemeRiverLayoutInfo;

        // use the axis boundingRect for view
        let rect = single.getRect();

        layoutInfo.rect = rect;

        let boundaryGap = seriesModel.get('boundaryGap');

        let axis = single.getAxis();

        layoutInfo.boundaryGap = boundaryGap;

        if (axis.orient === 'horizontal') {
            boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], rect.height);
            boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], rect.height);
            let height = rect.height - boundaryGap[0] - boundaryGap[1];
            themeRiverLayout(data, seriesModel, height);
        }
        else {
            boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], rect.width);
            boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], rect.width);
            let width = rect.width - boundaryGap[0] - boundaryGap[1];
            themeRiverLayout(data, seriesModel, width);
        }

        data.setLayout('layoutInfo', layoutInfo);
    });
}

/**
 * The layout information about themeriver
 *
 * @param data  data in the series
 * @param seriesModel  the model object of themeRiver series
 * @param height  value used to compute every series height
 */
function themeRiverLayout(data: List<ThemeRiverSeriesModel>, seriesModel: ThemeRiverSeriesModel, height: number) {
    if (!data.count()) {
        return;
    }
    let coordSys = seriesModel.coordinateSystem;
    // the data in each layer are organized into a series.
    let layerSeries = seriesModel.getLayerSeries();

    // the points in each layer.
    let timeDim = data.mapDimension('single');
    let valueDim = data.mapDimension('value');
    let layerPoints = zrUtil.map(layerSeries, function (singleLayer) {
        return zrUtil.map(singleLayer.indices, function (idx) {
            let pt = coordSys.dataToPoint(data.get(timeDim, idx));
            pt[1] = data.get(valueDim, idx) as number;
            return pt;
        });
    });

    let base = computeBaseline(layerPoints);
    let baseLine = base.y0;
    let ky = height / base.max;

    // set layout information for each item.
    let n = layerSeries.length;
    let m = layerSeries[0].indices.length;
    let baseY0;
    for (let j = 0; j < m; ++j) {
        baseY0 = baseLine[j] * ky;
        data.setItemLayout(layerSeries[0].indices[j], {
            layerIndex: 0,
            x: layerPoints[0][j][0],
            y0: baseY0,
            y: layerPoints[0][j][1] * ky
        });
        for (let i = 1; i < n; ++i) {
            baseY0 += layerPoints[i - 1][j][1] * ky;
            data.setItemLayout(layerSeries[i].indices[j], {
                layerIndex: i,
                x: layerPoints[i][j][0],
                y0: baseY0,
                y: layerPoints[i][j][1] * ky
            });
        }
    }
}

/**
 * Compute the baseLine of the rawdata
 * Inspired by Lee Byron's paper Stacked Graphs - Geometry & Aesthetics
 *
 * @param  data  the points in each layer
 */
function computeBaseline(data: number[][][]) {
    let layerNum = data.length;
    let pointNum = data[0].length;
    let sums = [];
    let y0 = [];
    let max = 0;

    for (let i = 0; i < pointNum; ++i) {
        let temp = 0;
        for (let j = 0; j < layerNum; ++j) {
            temp += data[j][i][1];
        }
        if (temp > max) {
            max = temp;
        }
        sums.push(temp);
    }

    for (let k = 0; k < pointNum; ++k) {
        y0[k] = (max - sums[k]) / 2;
    }
    max = 0;

    for (let l = 0; l < pointNum; ++l) {
        let sum = sums[l] + y0[l];
        if (sum > max) {
            max = sum;
        }
    }

    return {
        y0,
        max
    };
}