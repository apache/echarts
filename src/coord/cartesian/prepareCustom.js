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
    // dataItem is necessary in log axis.
    dataItem = dataItem || [0, 0];
    return zrUtil.map(['x', 'y'], function (dim, dimIdx) {
        var axis = this.getAxis(dim);
        var val = dataItem[dimIdx];
        var halfSize = dataSize[dimIdx] / 2;
        return axis.type === 'category'
            ? axis.getBandWidth()
            : Math.abs(axis.dataToCoord(val - halfSize) - axis.dataToCoord(val + halfSize));
    }, this);
}

export default function (coordSys) {
    var rect = coordSys.grid.getRect();
    return {
        coordSys: {
            // The name exposed to user is always 'cartesian2d' but not 'grid'.
            type: 'cartesian2d',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        api: {
            coord: function (data) {
                // do not provide "out" param
                return coordSys.dataToPoint(data);
            },
            size: zrUtil.bind(dataToCoordSize, coordSys)
        }
    };
}
