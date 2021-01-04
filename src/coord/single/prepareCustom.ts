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

import Single from './Single';
import { bind } from 'zrender/src/core/util';

function dataToCoordSize(this: Single, dataSize: number | number[], dataItem: number | number[]) {
    // dataItem is necessary in log axis.
    const axis = this.getAxis();
    const val = dataItem instanceof Array ? dataItem[0] : dataItem;
    const halfSize = (dataSize instanceof Array ? dataSize[0] : dataSize) / 2;
    return axis.type === 'category'
        ? axis.getBandWidth()
        : Math.abs(axis.dataToCoord(val - halfSize) - axis.dataToCoord(val + halfSize));
}

export default function singlePrepareCustom(coordSys: Single) {
    const rect = coordSys.getRect();

    return {
        coordSys: {
            type: 'singleAxis',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        api: {
            coord: function (val: number) {
                // do not provide "out" param
                return coordSys.dataToPoint(val);
            },
            size: bind(dataToCoordSize, coordSys)
        }
    };
}
