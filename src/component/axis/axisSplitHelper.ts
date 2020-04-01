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
import * as graphic from '../../util/graphic';
import { makeInner } from '../../util/model';
import GridModel from '../../coord/cartesian/GridModel';
import type SingleAxisView from './SingleAxisView';
import type CartesianAxisView from './CartesianAxisView';
import type SingleAxisModel from '../../coord/single/AxisModel';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import AxisView from './AxisView';

const inner = makeInner<{
    // Hash map of color index
    splitAreaColors: zrUtil.HashMap<number>
}, AxisView>();

export function rectCoordAxisBuildSplitArea(
    axisView: SingleAxisView | CartesianAxisView,
    axisGroup: graphic.Group,
    axisModel: SingleAxisModel | CartesianAxisModel,
    gridModel: GridModel | SingleAxisModel
) {
    const axis = axisModel.axis;

    if (axis.scale.isBlank()) {
        return;
    }

    // TODO: TYPE
    const splitAreaModel = (axisModel as CartesianAxisModel).getModel('splitArea');
    const areaStyleModel = splitAreaModel.getModel('areaStyle');
    let areaColors = areaStyleModel.get('color');

    const gridRect = gridModel.coordinateSystem.getRect();

    const ticksCoords = axis.getTicksCoords({
        tickModel: splitAreaModel,
        clamp: true
    });

    if (!ticksCoords.length) {
        return;
    }

    // For Making appropriate splitArea animation, the color and anid
    // should be corresponding to previous one if possible.
    const areaColorsLen = areaColors.length;
    const lastSplitAreaColors = inner(axisView).splitAreaColors;
    const newSplitAreaColors = zrUtil.createHashMap<number>();
    let colorIndex = 0;
    if (lastSplitAreaColors) {
        for (let i = 0; i < ticksCoords.length; i++) {
            const cIndex = lastSplitAreaColors.get(ticksCoords[i].tickValue);
            if (cIndex != null) {
                colorIndex = (cIndex + (areaColorsLen - 1) * i) % areaColorsLen;
                break;
            }
        }
    }

    let prev = axis.toGlobalCoord(ticksCoords[0].coord);

    const areaStyle = areaStyleModel.getAreaStyle();
    areaColors = zrUtil.isArray(areaColors) ? areaColors : [areaColors];

    for (let i = 1; i < ticksCoords.length; i++) {
        const tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);

        let x;
        let y;
        let width;
        let height;
        if (axis.isHorizontal()) {
            x = prev;
            y = gridRect.y;
            width = tickCoord - x;
            height = gridRect.height;
            prev = x + width;
        }
        else {
            x = gridRect.x;
            y = prev;
            width = gridRect.width;
            height = tickCoord - y;
            prev = y + height;
        }

        const tickValue = ticksCoords[i - 1].tickValue;
        tickValue != null && newSplitAreaColors.set(tickValue, colorIndex);

        axisGroup.add(new graphic.Rect({
            anid: tickValue != null ? 'area_' + tickValue : null,
            shape: {
                x: x,
                y: y,
                width: width,
                height: height
            },
            style: zrUtil.defaults({
                fill: areaColors[colorIndex]
            }, areaStyle),
            autoBatch: true,
            silent: true
        }));

        colorIndex = (colorIndex + 1) % areaColorsLen;
    }

    inner(axisView).splitAreaColors = newSplitAreaColors;
}

export function rectCoordAxisHandleRemove(axisView: SingleAxisView | CartesianAxisView) {
    inner(axisView).splitAreaColors = null;
}
