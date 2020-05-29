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

function dataToCoordSize(dataSize, dataItem) {
    dataItem = dataItem || [0, 0];
    return zrUtil.map([0, 1], function (dimIdx) {
        var val = dataItem[dimIdx];
        var halfSize = dataSize[dimIdx] / 2;
        var p1 = [];
        var p2 = [];
        p1[dimIdx] = val - halfSize;
        p2[dimIdx] = val + halfSize;
        p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
        return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
    }, this);
}

export default function (coordSys) {
    var rect = coordSys.getBoundingRect();
    return {
        coordSys: {
            type: 'geo',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            zoom: coordSys.getZoom()
        },
        api: {
            coord: function (data) {
                // do not provide "out" and noRoam param,
                // Compatible with this usage:
                // echarts.util.map(item.points, api.coord)
                return coordSys.dataToPoint(data);
            },
            size: zrUtil.bind(dataToCoordSize, coordSys)
        }
    };
}
