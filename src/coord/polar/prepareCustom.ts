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
import Polar from './Polar';
import RadiusAxis from './RadiusAxis';
// import AngleAxis from './AngleAxis';

function dataToCoordSize(this: Polar, dataSize: number[], dataItem: number[]) {
    // dataItem is necessary in log axis.
    dataItem = dataItem || [0, 0];
    return zrUtil.map(['Radius', 'Angle'], function (dim, dimIdx) {
        const getterName = 'get' + dim + 'Axis' as 'getAngleAxis'| 'getRadiusAxis';
        // TODO: TYPE Check Angle Axis
        const axis = this[getterName]() as RadiusAxis;
        const val = dataItem[dimIdx];
        const halfSize = dataSize[dimIdx] / 2;

        let result = axis.type === 'category'
            ? axis.getBandWidth()
            : Math.abs(axis.dataToCoord(val - halfSize) - axis.dataToCoord(val + halfSize));

        if (dim === 'Angle') {
            result = result * Math.PI / 180;
        }

        return result;

    }, this);
}

export default function polarPrepareCustom(coordSys: Polar) {
    const radiusAxis = coordSys.getRadiusAxis();
    const angleAxis = coordSys.getAngleAxis();
    const radius = radiusAxis.getExtent();
    radius[0] > radius[1] && radius.reverse();

    return {
        coordSys: {
            type: 'polar',
            cx: coordSys.cx,
            cy: coordSys.cy,
            r: radius[1],
            r0: radius[0]
        },
        api: {
            coord: function (data: number[]) {
                const radius = radiusAxis.dataToRadius(data[0]);
                const angle = angleAxis.dataToAngle(data[1]);
                const coord = coordSys.coordToPoint([radius, angle]);
                coord.push(radius, angle * Math.PI / 180);
                return coord;
            },
            size: zrUtil.bind(dataToCoordSize, coordSys)
        }
    };
}
