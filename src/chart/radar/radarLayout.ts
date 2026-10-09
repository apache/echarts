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
import GlobalModel from '../../model/Global';
import RadarSeriesModel, { SERIES_TYPE_RADAR } from './RadarSeries';
import { createSimpleOverallStageHandler } from '../../util/model';
import { isValidRadarPoint } from './RadarPath';

type Point = number[];

export const radarLayoutStageHandler = createSimpleOverallStageHandler(SERIES_TYPE_RADAR, radarLayout);

function radarLayout(ecModel: GlobalModel) {
    ecModel.eachSeriesByType(SERIES_TYPE_RADAR, function (seriesModel: RadarSeriesModel) {
        const data = seriesModel.getData();
        const points: Point[][] = [];
        const coordSys = seriesModel.coordinateSystem;
        if (!coordSys) {
            return;
        }

        const axes = coordSys.getIndicatorAxes();

        zrUtil.each(axes, function (axis, axisIndex) {
            data.each(data.mapDimension(axes[axisIndex].dim), function (val, dataIndex) {
                points[dataIndex] = points[dataIndex] || [];
                const point = coordSys.dataToPoint(val, axisIndex);
                points[dataIndex][axisIndex] = point;
            });
        });

        // Close polygon
        data.each(function (idx) {
            const firstPoint = zrUtil.find(points[idx], function (point) {
                return isValidRadarPoint(point);
            }) || [NaN, NaN];

            // Copy the first actual point to the end of the array
            points[idx].push(firstPoint.slice());
            data.setItemLayout(idx, points[idx]);
        });
    });
}
