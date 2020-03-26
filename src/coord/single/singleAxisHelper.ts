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
import SingleAxisModel from './AxisModel';

interface LayoutResult {
    position: [number, number],
    rotation: number
    labelRotation: number
    labelDirection: number  // 1 | -1
    tickDirection: number
    nameDirection: number
    z2: number
}

export function layout(axisModel: SingleAxisModel, opt?: {
    labelInside?: boolean
    rotate?: number
}) {
    opt = opt || {};
    const single = axisModel.coordinateSystem;
    const axis = axisModel.axis;
    const layout = {} as LayoutResult;

    const axisPosition = axis.position;
    const orient = axis.orient;

    const rect = single.getRect();
    const rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];

    const positionMap = {
        horizontal: {top: rectBound[2], bottom: rectBound[3]},
        vertical: {left: rectBound[0], right: rectBound[1]}
    } as const;

    layout.position = [
        orient === 'vertical'
            ? positionMap.vertical[axisPosition as 'left' | 'right']
            : rectBound[0],
        orient === 'horizontal'
            ? positionMap.horizontal[axisPosition as 'top' | 'bottom']
            : rectBound[3]
    ] as [number, number];

    const r = {horizontal: 0, vertical: 1};
    layout.rotation = Math.PI / 2 * r[orient];

    const directionMap = {top: -1, bottom: 1, right: 1, left: -1} as const;

    layout.labelDirection = layout.tickDirection =
        layout.nameDirection = directionMap[axisPosition];

    if (axisModel.get(['axisTick', 'inside'])) {
        layout.tickDirection = -layout.tickDirection;
    }

    if (zrUtil.retrieve(opt.labelInside, axisModel.get(['axisLabel', 'inside']))) {
        layout.labelDirection = -layout.labelDirection;
    }

    let labelRotation = opt.rotate;
    labelRotation == null && (labelRotation = axisModel.get(['axisLabel', 'rotate']));
    layout.labelRotation = axisPosition === 'top' ? -labelRotation : labelRotation;

    layout.z2 = 1;

    return layout;
}
