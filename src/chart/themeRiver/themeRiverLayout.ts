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
import ExtensionAPI from '../../core/ExtensionAPI';
import ThemeRiverSeriesModel, { ThemeRiverSeriesOption } from './ThemeRiverSeries';
import { RectLike } from 'zrender/src/core/BoundingRect';
import List from '../../data/List';

export interface ThemeRiverLayoutInfo {
    rect: RectLike
    boundaryGap: ThemeRiverSeriesOption['boundaryGap']
}

export default function themeRiverLayout(ecModel: GlobalModel, api: ExtensionAPI) {

    ecModel.eachSeriesByType('themeRiver', function (seriesModel: ThemeRiverSeriesModel) {

        const data = seriesModel.getData();

        const single = seriesModel.coordinateSystem;

        const layoutInfo = {} as ThemeRiverLayoutInfo;

        // use the axis boundingRect for view
        const rect = single.getRect();

        layoutInfo.rect = rect;

        const boundaryGap = seriesModel.get('boundaryGap');
        
        const axis = single.getAxis();

        layoutInfo.boundaryGap = boundaryGap;

        if (axis.orient === 'horizontal') {
            boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], rect.height);
            boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], rect.height);
            const height = rect.height - boundaryGap[0] - boundaryGap[1];
            doThemeRiverLayout(data, seriesModel, height);
        }
        else {
            boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], rect.width);
            boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], rect.width);
            const width = rect.width - boundaryGap[0] - boundaryGap[1];
            doThemeRiverLayout(data, seriesModel, width);
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
function doThemeRiverLayout(data: List<ThemeRiverSeriesModel>, seriesModel: ThemeRiverSeriesModel, height: number) {
    if (!data.count()) {
        return;
    }
    const coordSys = seriesModel.coordinateSystem;
    const drawMode = seriesModel.get("drawMode");

    // the data in each layer are organized into a series.
    const layerSeries = seriesModel.getLayerSeries();
    // the points in each layer.
    const timeDim = data.mapDimension('single');
    const valueDim = data.mapDimension('value');
    const layerPoints = zrUtil.map(layerSeries, function (singleLayer) {
        return zrUtil.map(singleLayer.indices, function (idx) {
            const pt = coordSys.dataToPoint(data.get(timeDim, idx));
            pt[1] = data.get(valueDim, idx) as number;
            return pt;
        });
    });

    const base = computeBaseline(layerPoints);
    var baseLine;
    if(drawMode == "symmetrical")
    {
        baseLine = base.y0_symmetric
    }else if(drawMode=="wiggle")
    {
        baseLine = base.y0_wiggle
    }
    
    const ky = height / base.max;

    // set layout information for each item.
    const n = layerSeries.length;//6
    const m = layerSeries[0].indices.length;//21
    let baseY0;
    for (let j = 0; j < m; ++j) {
        baseY0 = baseLine[j] * ky;
        // console.log(baseY0)
        data.setItemLayout(layerSeries[0].indices[j], {
            layerIndex: 0,
            x: layerPoints[0][j][0],
            y0: baseY0,
            y: layerPoints[0][j][1] * ky
        });
        for (let i = 1; i < n; ++i) {
            baseY0 += layerPoints[i - 1][j][1] * ky;
            // console.log(baseY0)
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
    //console.log(data);
    const layerNum = data.length;//6
    const pointNum = data[0].length;//21
    const sums = [];//sums of each vertical row at a single time point 
    const sums1 = [];
    const y0_symmetric = [];
    const y0_wiggle = [];
    let max = 0;

    for (let i = 0; i < pointNum; ++i) {
        let temp = 0;
        let temp1 = 0;
        for (let j = 0; j < layerNum; ++j) {
            temp += data[j][i][1];
            temp1 += (layerNum-(j+1))*data[j][i][1];
        }
        if (temp > max) {
            max = temp;
        }
        sums.push(temp);
        sums1.push(temp1)
    }

    
    for (let k = 0 ; k < pointNum; ++k) { 
        y0_symmetric[k] = (max-sums[k])/2      
        y0_wiggle[k] = max/2-sums1[k]/layerNum;
    }
    max = 0;

    for (let l = 0; l < pointNum; ++l) {
        const sum = sums[l] + y0_symmetric[l];
        if (sum > max) {
            max = sum;
        }
    }
    return {
        y0_symmetric,
        y0_wiggle,
        max
    };
}