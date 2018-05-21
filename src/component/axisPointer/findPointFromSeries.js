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
import * as modelUtil from '../../util/model';

/**
 * @param {Object} finder contains {seriesIndex, dataIndex, dataIndexInside}
 * @param {module:echarts/model/Global} ecModel
 * @return {Object} {point: [x, y], el: ...} point Will not be null.
 */
export default function (finder, ecModel) {
    var point = [];
    var seriesIndex = finder.seriesIndex;
    var seriesModel;
    if (seriesIndex == null || !(
        seriesModel = ecModel.getSeriesByIndex(seriesIndex)
    )) {
        return {point: []};
    }

    var data = seriesModel.getData();
    var dataIndex = modelUtil.queryDataIndex(data, finder);
    if (dataIndex == null || dataIndex < 0 || zrUtil.isArray(dataIndex)) {
        return {point: []};
    }

    var el = data.getItemGraphicEl(dataIndex);
    var coordSys = seriesModel.coordinateSystem;

    if (seriesModel.getTooltipPosition) {
        point = seriesModel.getTooltipPosition(dataIndex) || [];
    }
    else if (coordSys && coordSys.dataToPoint) {
        point = coordSys.dataToPoint(
            data.getValues(
                zrUtil.map(coordSys.dimensions, function (dim) {
                    return data.mapDimension(dim);
                }), dataIndex, true
            )
        ) || [];
    }
    else if (el) {
        // Use graphic bounding rect
        var rect = el.getBoundingRect().clone();
        rect.applyTransform(el.transform);
        point = [
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        ];
    }

    return {point: point, el: el};
}
