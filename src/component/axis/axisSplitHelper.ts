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


export function rectCoordAxisBuildSplitArea(axisView, axisGroup, axisModel, gridModel) {
    var axis = axisModel.axis;

    if (axis.scale.isBlank()) {
        return;
    }

    var splitAreaModel = axisModel.getModel('splitArea');
    var areaStyleModel = splitAreaModel.getModel('areaStyle');
    var areaColors = areaStyleModel.get('color');

    var gridRect = gridModel.coordinateSystem.getRect();

    var ticksCoords = axis.getTicksCoords({
        tickModel: splitAreaModel,
        clamp: true
    });

    if (!ticksCoords.length) {
        return;
    }

    // For Making appropriate splitArea animation, the color and anid
    // should be corresponding to previous one if possible.
    var areaColorsLen = areaColors.length;
    var lastSplitAreaColors = axisView.__splitAreaColors;
    var newSplitAreaColors = zrUtil.createHashMap();
    var colorIndex = 0;
    if (lastSplitAreaColors) {
        for (var i = 0; i < ticksCoords.length; i++) {
            var cIndex = lastSplitAreaColors.get(ticksCoords[i].tickValue);
            if (cIndex != null) {
                colorIndex = (cIndex + (areaColorsLen - 1) * i) % areaColorsLen;
                break;
            }
        }
    }

    var prev = axis.toGlobalCoord(ticksCoords[0].coord);

    var areaStyle = areaStyleModel.getAreaStyle();
    areaColors = zrUtil.isArray(areaColors) ? areaColors : [areaColors];

    for (var i = 1; i < ticksCoords.length; i++) {
        var tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);

        var x;
        var y;
        var width;
        var height;
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

        var tickValue = ticksCoords[i - 1].tickValue;
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
            silent: true
        }));

        colorIndex = (colorIndex + 1) % areaColorsLen;
    }

    axisView.__splitAreaColors = newSplitAreaColors;
}

export function rectCoordAxisHandleRemove(axisView) {
    axisView.__splitAreaColors = null;
}
