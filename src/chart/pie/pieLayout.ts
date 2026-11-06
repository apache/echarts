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
import PieSeriesModel, { SERIES_TYPE_PIE } from './PieSeries';
import { normalizeArcAngles } from 'zrender/src/core/PathProxy';
import { createSimpleOverallStageHandler, makeInner } from '../../util/model';
import { getCircleLayout } from '../../util/layout';


const PI2 = Math.PI * 2;
const RADIAN = Math.PI / 180;


export const pieLayoutStageHandler = createSimpleOverallStageHandler(SERIES_TYPE_PIE, pieLayout);

function pieLayout(
    ecModel: GlobalModel,
    api: ExtensionAPI
): void {
    ecModel.eachSeriesByType(SERIES_TYPE_PIE, function (seriesModel: PieSeriesModel) {
        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');

        const { cx, cy, r, r0, viewRect } = getCircleLayout(seriesModel, api);

        let startAngle = -seriesModel.get('startAngle') * RADIAN;
        let endAngle = seriesModel.get('endAngle');
        const padAngle = seriesModel.get('padAngle') * RADIAN;

        endAngle = endAngle === 'auto' ? startAngle - PI2 : -endAngle * RADIAN;

        const minAngle = seriesModel.get('minAngle') * RADIAN;

        let validDataCount = 0;
        data.each(valueDim, function (value: number) {
            !isNaN(value) && validDataCount++;
        });

        const sum = data.getSum(valueDim);

        const clockwise = seriesModel.get('clockwise');

        const roseType = seriesModel.get('roseType');
        const stillShowZeroSum = seriesModel.get('stillShowZeroSum');

        // [0...max]
        const extent = data.getDataExtent(valueDim);
        extent[0] = 0;

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

        // The angle of each sector (not including `padAngle`), by data
        // index. `padAngle` is reserved for the gaps between the sectors
        // first, and the remaining angle is then distributed over the
        // sectors, so that the sector angles stay proportional to the
        // values and `minAngle` applies to the sector angles themselves.
        // (See #20603: previously the angles were distributed over the
        // whole range and `padAngle` was carved out of each sector
        // afterwards, which shrank sectors down to `minAngle` even when
        // their fair angle was larger than it.)
        const availableAngle = angleRange - padAngle * validDataCount;

        // The weight each sector gets in the distribution: its value, or
        // 1 for every sector when the angles are distributed evenly
        // (roseType 'area', or a zero sum still shown by
        // `stillShowZeroSum`).
        const distributeByValue = roseType !== 'area'
            && !(sum === 0 && stillShowZeroSum);
        const weights: number[] = [];
        let weightSum = 0;
        data.each(valueDim, function (value: number) {
            const weight = isNaN(value) ? NaN
                : distributeByValue ? value : 1;
            weights.push(weight);
            if (!isNaN(weight)) {
                weightSum += weight;
            }
        });

        const sectorAngles: number[] = [];
        if (validDataCount) {
            const unitAngle = availableAngle > 0 && weightSum > 0
                ? availableAngle / weightSum : 0;
            for (let i = 0; i < weights.length; i++) {
                const weight = weights[i];
                sectorAngles.push(isNaN(weight) ? NaN : weight * unitAngle);
            }

            if (availableAngle > 0) {
                // Raise the sectors smaller than `minAngle` to
                // `minAngle` and distribute the remaining angle over
                // the other sectors. This is repeated because
                // redistributing can push another sector below
                // `minAngle` again.
                const fixed: boolean[] = [];
                for (let i = 0; i < weights.length; i++) {
                    fixed.push(isNaN(weights[i]));
                }
                let fixedCount = 0;
                while (fixedCount < validDataCount) {
                    let restAngle = availableAngle;
                    let restWeight = 0;
                    let restCount = 0;
                    for (let i = 0; i < weights.length; i++) {
                        if (fixed[i]) {
                            restAngle -= minAngle;
                        }
                        else if (!isNaN(weights[i])) {
                            restWeight += weights[i];
                            restCount++;
                        }
                    }
                    if (restAngle < 0) {
                        // `minAngle` cannot be satisfied for every
                        // sector: fall back to distributing the angle
                        // evenly over the sectors.
                        for (let i = 0; i < weights.length; i++) {
                            if (!isNaN(weights[i])) {
                                sectorAngles[i] = availableAngle / validDataCount;
                            }
                        }
                        break;
                    }
                    let raised = false;
                    for (let i = 0; i < weights.length; i++) {
                        if (fixed[i] || isNaN(weights[i])) {
                            continue;
                        }
                        const angle = restWeight > 0
                            ? weights[i] * restAngle / restWeight
                            : restAngle / restCount;
                        sectorAngles[i] = angle;
                        if (angle < minAngle) {
                            sectorAngles[i] = minAngle;
                            fixed[i] = true;
                            fixedCount++;
                            raised = true;
                        }
                    }
                    if (!raised) {
                        break;
                    }
                }

                // If every sector had to be raised to `minAngle` and
                // together they exceed the available angle, `minAngle`
                // cannot be satisfied either: fall back to distributing
                // the angle evenly over the sectors.
                let totalAngle = 0;
                for (let i = 0; i < weights.length; i++) {
                    if (!isNaN(weights[i])) {
                        totalAngle += sectorAngles[i];
                    }
                }
                if (totalAngle - availableAngle > 1e-10) {
                    for (let i = 0; i < weights.length; i++) {
                        if (!isNaN(weights[i])) {
                            sectorAngles[i] = availableAngle / validDataCount;
                        }
                    }
                }
            }
        }

        let currentAngle = startAngle;

        // Requird by `pieLabelLayout`.
        data.setLayout({ viewRect, r });

        data.each(valueDim, function (value: number, idx: number) {
            if (isNaN(value)) {
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

            // The span this sector takes on the whole circle, including
            // the `padAngle` gap reserved after it.
            const angle = sectorAngles[idx] + padAngle;

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
                    ? linearMap(value, extent, [r0, r])
                    : r
            });

            currentAngle = endAngle;
        });
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
