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

import * as graphic from '../../util/graphic';
import GridModel from '../../coord/cartesian/GridModel';
import type SingleAxisModel from '../../coord/single/AxisModel';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import { ExtendedElementProps } from '../../core/ExtendedElement';

export function rectCoordBuildBreakAxis(
    axisGroup: graphic.Group,
    axisModel: SingleAxisModel | CartesianAxisModel,
    gridModel: GridModel | SingleAxisModel,
    api: ExtensionAPI
): graphic.Group {
    const axis = axisModel.axis;
    const isOrdinal = axis.scale.type === 'ordinal';
    const axisMax = axis.scale.getExtent()[1];

    if (axis.scale.isBlank()) {
        return null;
    }

    const breakAreaModel = (axisModel as AxisBaseModel).getModel('breakArea');
    const breaks = axis.scale.getBreaks();
    if (!breaks.length) {
        return null;
    }
    const zigzagAmplitude = breakAreaModel.get('zigzagAmplitude');
    const zigzagMinSpan = breakAreaModel.get('zigzagMinSpan');
    const zigzagMaxSpan = breakAreaModel.get('zigzagMaxSpan');
    const expandOnClick = breakAreaModel.get('expandOnClick');

    const gridRect = gridModel.coordinateSystem.getRect();
    const itemStyleModel = breakAreaModel.getModel('itemStyle');
    const itemStyle = itemStyleModel.getItemStyle();
    const borderColor = itemStyle.stroke;
    const borderWidth = itemStyle.lineWidth;
    const borderType = itemStyle.lineDash;
    const color = itemStyle.fill;

    const group = new graphic.Group({
        ignoreModelZ: true
    } as ExtendedElementProps);

    const isHorizontal = axis.isHorizontal();
    const clipEl = new graphic.Rect({
        shape: {
            x: gridRect.x - (isHorizontal ? zigzagAmplitude : 0),
            y: gridRect.y - (isHorizontal ? 0 : zigzagAmplitude),
            width: gridRect.width + (isHorizontal ? zigzagAmplitude * 2 : 0),
            height: gridRect.height + (isHorizontal ? 0 : zigzagAmplitude * 2)
        }
    });

    for (let i = 0; i < breaks.length; i++) {
        const brk = breaks[i];
        if (brk.isExpanded) {
            continue;
        }

        // Even if brk.gap is 0, we should also draw the breakArea because
        // border is sometimes required to be visible (as a line)
        let startCoord;
        let endCoord;
        const end = brk.end - (isOrdinal ? 1 : 0);
        const isEndBreak = end >= axisMax;
        if (isEndBreak) {
            // The break area is bigger than the max value
            startCoord = axis.toGlobalCoord(
                axis.dataToCoordWithBreaks(axisMax, false, 'start')
            );
            endCoord = startCoord;
        }
        else {
            startCoord = axis.toGlobalCoord(
                axis.dataToCoordWithBreaks(brk.start, false, 'start')
            );
            endCoord = axis.toGlobalCoord(
                axis.dataToCoordWithBreaks(end, false, 'end')
            );
        }
        const breakGroup = new graphic.Group();

        addZigzagShapes(
            breakGroup,
            clipEl,
            startCoord,
            endCoord,
            isHorizontal,
            brk.gap === 0 || brk.end === brk.start
        );

        if (expandOnClick) {
            breakGroup.on('click', () => {
                axis.scale.expandBreak(brk.start, brk.end);
                api.dispatchAction({
                    type: 'axisBreakExpand',
                    breakStart: brk.start,
                    breakEnd: brk.end,
                });
            });
        }

        group.add(breakGroup);
    }
    axisGroup.add(group);

    function addZigzagShapes(
        breakGroup: graphic.Group,
        clipEl: graphic.Path,
        startCoord: number,
        endCoord: number,
        isHorizontal: boolean,
        isGapZero: boolean
    ) {
        const polylineStyle = {
            stroke: borderColor,
            lineWidth: borderWidth,
            lineDash: borderType,
            fill: 'none'
        };
        let x = isHorizontal ? startCoord : gridRect.x;
        let y = isHorizontal ? gridRect.y : startCoord;
        let width = isHorizontal ? endCoord - startCoord : gridRect.width;
        let height = isHorizontal ? gridRect.height : endCoord - startCoord;

        let pointsA = [];
        let pointsB = [];
        let current = isHorizontal ? y : x;
        const max = isHorizontal ? y + height : x + width;
        let isSwap = true;

        while (current <= max + zigzagMaxSpan) {
            if (isHorizontal) {
                pointsA.push([x + (isSwap ? -zigzagAmplitude : zigzagAmplitude), current]);
                // unshift for bottom to reverse order
                pointsB.unshift([x + width - (!isSwap ? -zigzagAmplitude : zigzagAmplitude), current]);
            }
            else {
                pointsA.push([current, y + (isSwap ? -zigzagAmplitude : zigzagAmplitude)]);
                // unshift for bottom to reverse order
                pointsB.unshift([current, y + height - (!isSwap ? -zigzagAmplitude : zigzagAmplitude)]);
            }
            current += Math.random() * (zigzagMaxSpan - zigzagMinSpan) + zigzagMinSpan;
            isSwap = !isSwap;
        }

        // Create two polylines and add them to the breakGroup
        breakGroup.add(new graphic.Polyline({
            shape: {
                points: pointsA
            },
            style: polylineStyle,
            clipPath: clipEl,
            z: 100
        }));

        /* Add the second polyline and a polygon only if the gap is not zero
         * Otherwise if the polyline is with dashed line or being opaque,
         * it may not be constant with breaks with non-zero gaps. */
        if (!isGapZero) {
            breakGroup.add(new graphic.Polyline({
                shape: {
                    points: pointsB
                },
                style: polylineStyle,
                clipPath: clipEl,
                z: 100
            }));

            // Creating the polygon that fills the area between the polylines
            let polygonPoints = pointsA.concat(pointsB);
            breakGroup.add(new graphic.Polygon({
                shape: {
                    points: polygonPoints
                },
                style: {
                    fill: color,
                    opacity: itemStyle.opacity
                },
                clipPath: clipEl,
                z: 100
            }));
        }
    }
}
