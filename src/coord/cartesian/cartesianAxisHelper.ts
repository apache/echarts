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
import SeriesModel from '../../model/Series';
import { SINGLE_REFERRING } from '../../util/model';

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
    const grid = gridModel.coordinateSystem;
    const axis = axisModel.axis;
    const layout = {} as CartesianAxisLayout;
    const otherAxisOnZeroOf = axis.getAxesOnZeroOf()[0];

    const rawAxisPosition = axis.position;
    const axisPosition: 'onZero' | typeof axis.position = otherAxisOnZeroOf ? 'onZero' : rawAxisPosition;
    const axisDim = axis.dim;

    const rect = grid.getRect();
    const rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];
    const idx = {left: 0, right: 1, top: 0, bottom: 1, onZero: 2};
    const axisOffset = axisModel.get('offset') || 0;

    const posBound = axisDim === 'x'
        ? [rectBound[2] - axisOffset, rectBound[3] + axisOffset]
        : [rectBound[0] - axisOffset, rectBound[1] + axisOffset];

    if (otherAxisOnZeroOf) {
        const onZeroCoord = otherAxisOnZeroOf.toGlobalCoord(otherAxisOnZeroOf.dataToCoord(0));
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
    const dirMap = {top: -1, bottom: 1, left: -1, right: 1} as const;

    layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
    layout.labelOffset = otherAxisOnZeroOf ? posBound[idx[rawAxisPosition]] - posBound[idx.onZero] : 0;

    if (axisModel.get(['axisTick', 'inside'])) {
        layout.tickDirection = -layout.tickDirection as 1 | -1;
    }
    if (zrUtil.retrieve(opt.labelInside, axisModel.get(['axisLabel', 'inside']))) {
        layout.labelDirection = -layout.labelDirection as 1 | -1;
    }

    // Special label rotation
    const labelRotate = axisModel.get(['axisLabel', 'rotate']);
    layout.labelRotate = axisPosition === 'top' ? -labelRotate : labelRotate;

    // Over splitLine and splitArea
    layout.z2 = 1;

    return layout;
}

export function isCartesian2DSeries(seriesModel: SeriesModel): boolean {
    return seriesModel.get('coordinateSystem') === 'cartesian2d';
}

export function findAxisModels(seriesModel: SeriesModel): {
    xAxisModel: CartesianAxisModel;
    yAxisModel: CartesianAxisModel;
} {
    const axisModelMap = {
        xAxisModel: null,
        yAxisModel: null
    } as ReturnType<typeof findAxisModels>;
    zrUtil.each(axisModelMap, function (v, key) {
        const axisType = key.replace(/Model$/, '');
        const axisModel = seriesModel.getReferringComponents(
            axisType, SINGLE_REFERRING
        ).models[0] as CartesianAxisModel;

        if (__DEV__) {
            if (!axisModel) {
                throw new Error(axisType + ' "' + zrUtil.retrieve3(
                    seriesModel.get(axisType + 'Index' as any),
                    seriesModel.get(axisType + 'Id' as any),
                    0
                ) + '" not found');
            }
        }

        axisModelMap[key] = axisModel;
    });

    return axisModelMap;
}

