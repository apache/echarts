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

import { linearMap } from '../../util/number';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import PieSeriesModel from './PieSeries';
import { normalizeArcAngles } from 'zrender/src/core/PathProxy';
import { makeInner } from '../../util/model';
import { getCircleLayout } from '../../util/layout';


const PI2 = Math.PI * 2;
const RADIAN = Math.PI / 180;


export default function pieLayout(
    seriesType: 'pie',
    ecModel: GlobalModel,
    api: ExtensionAPI
) {
    ecModel.eachSeriesByType(seriesType, function (seriesModel: PieSeriesModel) {
        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');
        const roseType = seriesModel.get('roseType');

        const { cx, cy, r, r0, viewRect } = getCircleLayout(seriesModel, api);

        let startAngle = -seriesModel.get('startAngle') * RADIAN;
        let endAngle = seriesModel.get('endAngle');
        const padAngle = seriesModel.get('padAngle') * RADIAN;

        endAngle = endAngle === 'auto' ? startAngle - PI2 : -endAngle * RADIAN;

        const minAngle = seriesModel.get('minAngle') * RADIAN;

        const minAndPadAngle = minAngle + padAngle;

        let validDataCount = 0;
        data.each(valueDim, function (value: number | number[]) {
            let val = value;
            if (roseType === 'mixed' && Array.isArray(value) && value.length >= 2) {
                val = value[1]; // Use the second value for angle calculation in mixed mode
            }
            !isNaN(val as number) && validDataCount++;
        });

        // Calculate sum manually for mixed roseType to handle array values
        let sum = 0;
        if (roseType === 'mixed') {
            data.each(valueDim, function (value: number | number[]) {
                if (Array.isArray(value) && value.length >= 2) {
                    sum += isNaN(value[1]) ? 0 : value[1]; // Use the second value for angle calculation
                } else {
                    sum += isNaN(value as number) ? 0 : (value as number);
                }
            });
        } else {
            sum = data.getSum(valueDim);
        }

        // Sum may be 0
        let unitRadian = Math.PI / (sum || validDataCount) * 2;

        const clockwise = seriesModel.get('clockwise');

        const stillShowZeroSum = seriesModel.get('stillShowZeroSum');

        // [0...max]
        let extent = [0, 0];
        if (roseType === 'mixed') {
            // Calculate extent manually for mixed roseType to handle array values
            let max = -Infinity;
            data.each(valueDim, function (value: number | number[]) {
                let val;
                if (Array.isArray(value) && value.length >= 2) {
                    val = value[0]; // Use the first value for radius calculation
                } else {
                    val = value as number;
                }
                if (!isNaN(val)) {
                    max = Math.max(max, val);
                }
            });
            extent = [0, max];
        } else {
            extent = data.getDataExtent(valueDim);
            extent[0] = 0;
        }

        const dir = clockwise ? 1 : -1;
        const angles = [startAngle, endAngle];
        const halfPadAngle = dir * padAngle / 2;
        normalizeArcAngles(angles, !clockwise);

        [startAngle, endAngle] = angles;

        const layoutData = getSeriesLayoutData(seriesModel);
        layoutData.startAngle = startAngle;
        layoutData.endAngle = endAngle;
        layoutData.clockwise = clockwise;
        layoutData.cx = cx;
        layoutData.cy = cy;
        layoutData.r = r;
        layoutData.r0 = r0;

        const angleRange = Math.abs(endAngle - startAngle);

        // In the case some sector angle is smaller than minAngle
        let restAngle = angleRange;
        let valueSumLargerThanMinAngle = 0;

        let currentAngle = startAngle;

        // Requird by `pieLabelLayout`.
        data.setLayout({ viewRect, r });

        data.each(valueDim, function (value: number | number[], idx: number) {
            let angle;
            let radiusValue = value;
            let angleValue = value;

            // Handle array values for mixed roseType
            if (roseType === 'mixed' && Array.isArray(value) && value.length >= 2) {
                radiusValue = value[0]; // First value controls radius
                angleValue = value[1]; // Second value controls angle
            }

            if (isNaN(radiusValue as number)) {
                data.setItemLayout(idx, {
                    angle: NaN,
                    startAngle: NaN,
                    endAngle: NaN,
                    clockwise: clockwise,
                    cx: cx,
                    cy: cy,
                    r0: r0,
                    r: roseType
                        ? NaN
                        : r
                });
                return;
            }

            // FIXME 兼容 2.0 但是 roseType 是 area 的时候才是这样？
            if (roseType === 'area') {
                angle = angleRange / validDataCount;
            }
            else {
                // For 'radius' and 'mixed' types, angle is proportional to value
                angle = (sum === 0 && stillShowZeroSum)
                    ? unitRadian : ((angleValue as number) * unitRadian);
            }


            if (angle < minAndPadAngle) {
                angle = minAndPadAngle;
                restAngle -= minAndPadAngle;
            }
            else {
                // For mixed roseType, use the second value for angle calculation
                if (roseType === 'mixed' && Array.isArray(value) && value.length >= 2) {
                    valueSumLargerThanMinAngle += value[1];
                } else {
                    valueSumLargerThanMinAngle += value as number;
                }
            }

            const endAngle = currentAngle + dir * angle;

            // calculate display angle
            let actualStartAngle = 0;
            let actualEndAngle = 0;

            if (padAngle > angle) {
                actualStartAngle = currentAngle + dir * angle / 2;
                actualEndAngle = actualStartAngle;
            }
            else {
                actualStartAngle = currentAngle + halfPadAngle;
                actualEndAngle = endAngle - halfPadAngle;
            }

            data.setItemLayout(idx, {
                angle: angle,
                startAngle: actualStartAngle,
                endAngle: actualEndAngle,
                clockwise: clockwise,
                cx: cx,
                cy: cy,
                r0: r0,
                r: roseType
                    ? linearMap(radiusValue as number, extent, [r0, r])
                    : r
            });

            currentAngle = endAngle;
        });

        // Some sector is constrained by minAngle and padAngle
        // Rest sectors needs recalculate angle
        if (restAngle < PI2 && validDataCount) {
            // Average the angle if rest angle is not enough after all angles is
            // Constrained by minAngle and padAngle
            if (restAngle <= 1e-3) {
                const angle = angleRange / validDataCount;
                data.each(valueDim, function (value: number | number[], idx: number) {
                    let val = value;
                    if (roseType === 'mixed' && Array.isArray(value) && value.length >= 2) {
                        val = value[1]; // Use the second value for angle calculation in mixed mode
                    }
                    if (!isNaN(val as number)) {
                        const layout = data.getItemLayout(idx);
                        layout.angle = angle;

                        let actualStartAngle = 0;
                        let actualEndAngle = 0;

                        if (angle < padAngle) {
                            actualStartAngle = startAngle + dir * (idx + 1 / 2) * angle;
                            actualEndAngle = actualStartAngle;
                        }
                        else {
                            actualStartAngle = startAngle + dir * idx * angle + halfPadAngle;
                            actualEndAngle = startAngle + dir * (idx + 1) * angle - halfPadAngle;
                        }

                        layout.startAngle = actualStartAngle;
                        layout.endAngle = actualEndAngle;
                    }
                });
            }
            else {
                unitRadian = restAngle / valueSumLargerThanMinAngle;
                currentAngle = startAngle;
                data.each(valueDim, function (value: number | number[], idx: number) {
                    let angleValue = value;
                    if (roseType === 'mixed' && Array.isArray(value) && value.length >= 2) {
                        angleValue = value[1]; // Use the second value for angle calculation in mixed mode
                    }
                    if (!isNaN(angleValue as number)) {
                        const layout = data.getItemLayout(idx);
                        const angle = layout.angle === minAndPadAngle
                            ? minAndPadAngle : (angleValue as number) * unitRadian;

                        let actualStartAngle = 0;
                        let actualEndAngle = 0;

                        if (angle < padAngle) {
                            actualStartAngle = currentAngle + dir * angle / 2;
                            actualEndAngle = actualStartAngle;
                        }
                        else {
                            actualStartAngle = currentAngle + halfPadAngle;
                            actualEndAngle = currentAngle + dir * angle - halfPadAngle;
                        }

                        layout.startAngle = actualStartAngle;
                        layout.endAngle = actualEndAngle;
                        currentAngle += dir * angle;
                    }
                });
            }
        }
    });
}

export const getSeriesLayoutData = makeInner<{
    startAngle: number
    endAngle: number
    clockwise: boolean
    cx: number
    cy: number
    r: number
    r0: number
}, PieSeriesModel>();
