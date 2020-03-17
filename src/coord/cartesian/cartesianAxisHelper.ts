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
import GridModel from './GridModel';
import CartesianAxisModel from './AxisModel';

interface CartesianAxisLayout {
    position: [number, number];
    rotation: number;
    labelOffset: number;
    labelDirection: -1 | 1;
    tickDirection: -1 | 1;
    nameDirection: -1 | 1;
    labelRotate: number;
    z2: number;
}

/**
 * Can only be called after coordinate system creation stage.
 * (Can be called before coordinate system update stage).
 */
export function layout(
    gridModel: GridModel, axisModel: CartesianAxisModel, opt?: {labelInside?: boolean}
): CartesianAxisLayout {
    opt = opt || {};
    var grid = gridModel.coordinateSystem;
    var axis = axisModel.axis;
    var layout = {} as CartesianAxisLayout;
    var otherAxisOnZeroOf = axis.getAxesOnZeroOf()[0];

    var rawAxisPosition = axis.position;
    var axisPosition: 'onZero' | typeof axis.position = otherAxisOnZeroOf ? 'onZero' : rawAxisPosition;
    var axisDim = axis.dim;

    var rect = grid.getRect();
    var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];
    var idx = {left: 0, right: 1, top: 0, bottom: 1, onZero: 2};
    var axisOffset = axisModel.get('offset') || 0;

    var posBound = axisDim === 'x'
        ? [rectBound[2] - axisOffset, rectBound[3] + axisOffset]
        : [rectBound[0] - axisOffset, rectBound[1] + axisOffset];

    if (otherAxisOnZeroOf) {
        var onZeroCoord = otherAxisOnZeroOf.toGlobalCoord(otherAxisOnZeroOf.dataToCoord(0));
        posBound[idx.onZero] = Math.max(Math.min(onZeroCoord, posBound[1]), posBound[0]);
    }

    // Axis position
    layout.position = [
        axisDim === 'y' ? posBound[idx[axisPosition]] : rectBound[0],
        axisDim === 'x' ? posBound[idx[axisPosition]] : rectBound[3]
    ];

    // Axis rotation
    layout.rotation = Math.PI / 2 * (axisDim === 'x' ? 0 : 1);

    // Tick and label direction, x y is axisDim
    var dirMap = {top: -1, bottom: 1, left: -1, right: 1} as const;

    layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
    layout.labelOffset = otherAxisOnZeroOf ? posBound[idx[rawAxisPosition]] - posBound[idx.onZero] : 0;

    if (axisModel.get(['axisTick', 'inside'])) {
        layout.tickDirection = -layout.tickDirection as 1 | -1;
    }
    if (zrUtil.retrieve(opt.labelInside, axisModel.get(['axisLabel', 'inside']))) {
        layout.labelDirection = -layout.labelDirection as 1 | -1;
    }

    // Special label rotation
    var labelRotate = axisModel.get(['axisLabel', 'rotate']);
    layout.labelRotate = axisPosition === 'top' ? -labelRotate : labelRotate;

    // Over splitLine and splitArea
    layout.z2 = 1;

    return layout;
}
