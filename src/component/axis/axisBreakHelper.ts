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

    const gridRect = gridModel.coordinateSystem.getRect();
    const itemStyleModel = breakAreaModel.getModel('itemStyle');
    const itemStyle = itemStyleModel.getItemStyle();
    const borderColor = itemStyle.stroke;
    const borderWidth = itemStyle.lineWidth;
    const color = itemStyle.fill;

    const group = new graphic.Group({
        ignoreModelZ: true
    } as ExtendedElementProps);

    let clipEl;
    for (let i = 0; i < breaks.length; i++) {
        const brk = breaks[i];
        if (brk.isExpanded) {
            continue;
        }

        // Even if brk.gap is 0, we should also draw the breakArea because
        // border is sometimes required to be visible (as a line)
        const startCoord = axis.toGlobalCoord(axis.dataToCoord(brk.start));
        const endCoord = axis.toGlobalCoord(axis.dataToCoord(brk.end));

        const breakGroup = new graphic.Group();
        const polygonPoints = []; // Zigzag path
        let x;
        let y;
        let width;
        let height;
        if (axis.isHorizontal()) {
            x = startCoord;
            y = gridRect.y;
            width = endCoord - startCoord;
            height = gridRect.height;
            // TODO
        }
        else {
            clipEl = new graphic.Rect({
                shape: {
                    x: gridRect.x,
                    y: 0,
                    width: gridRect.width,
                    height: api.getHeight()
                }
            });
            x = gridRect.x;
            y = startCoord;
            width = gridRect.width;
            height = endCoord - startCoord;

            let polylinePoints = [];
            let i = x;
            const xValues = [i];
            while (xValues.length % 2 === 1 || i < x + width) {
                i += Math.random() * (zigzagMaxSpan - zigzagMinSpan) + zigzagMinSpan;
                xValues.push(i);
            }

            for (let j = 0; j < xValues.length; ++j) {
                i = xValues[j];
                polygonPoints.push([i, y + zigzagAmplitude]);
                polylinePoints.push([i, y + zigzagAmplitude]);
                i = xValues[++j];
                polygonPoints.push([i, y - zigzagAmplitude]);
                polylinePoints.push([i, y - zigzagAmplitude]);
            }
            breakGroup.add(new graphic.Polyline({
                shape: {
                    points: polylinePoints
                },
                style: {
                    stroke: borderColor,
                    lineWidth: borderWidth,
                    fill: 'none'
                },
                clipPath: clipEl,
                z: 100
            }));

            polylinePoints = [];
            for (let j = xValues.length - 1; j >= 0; --j) {
                let i = xValues[j];
                polygonPoints.push([i, y + height - zigzagAmplitude]);
                polylinePoints.push([i, y + height - zigzagAmplitude]);
                i = xValues[--j];
                polygonPoints.push([i, y + height + zigzagAmplitude]);
                polylinePoints.push([i, y + height + zigzagAmplitude]);
            }
            polygonPoints.push([x, y]);
            breakGroup.add(new graphic.Polyline({
                shape: {
                    points: polylinePoints
                },
                style: {
                    stroke: borderColor,
                    lineWidth: borderWidth,
                    fill: 'none'
                },
                clipPath: clipEl,
                z: 100
            }));
        }

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

        breakGroup.on('click', () => {
            axis.scale.expandBreak(brk.start, brk.end);
            api.dispatchAction({
                type: 'axisBreakExpand',
                breakStart: brk.start,
                breakEnd: brk.end,
            });
        });

        group.add(breakGroup);
    }
    axisGroup.add(group);
}
