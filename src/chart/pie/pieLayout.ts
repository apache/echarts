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

import { parsePercent, linearMap } from '../../util/number';
import * as layout from '../../util/layout';
import * as zrUtil from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import PieSeriesModel from './PieSeries';
import { SectorShape } from 'zrender/src/graphic/shape/Sector';
import { normalizeArcAngles } from 'zrender/src/core/PathProxy';
import { makeInner } from '../../util/model';

const PI2 = Math.PI * 2;
const RADIAN = Math.PI / 180;

function getViewRect(seriesModel: PieSeriesModel, api: ExtensionAPI) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

export function getBasicPieLayout(seriesModel: PieSeriesModel, api: ExtensionAPI):
    Pick<SectorShape, 'cx' | 'cy' | 'r' | 'r0'> {
    const viewRect = getViewRect(seriesModel, api);

    // center can be string or number when coordinateSystem is specified
    let center = seriesModel.get('center');
    let radius = seriesModel.get('radius');

    if (!zrUtil.isArray(radius)) {
        radius = [0, radius];
    }
    const width = parsePercent(viewRect.width, api.getWidth());
    const height = parsePercent(viewRect.height, api.getHeight());
    const size = Math.min(width, height);
    const r0 = parsePercent(radius[0], size / 2);
    const r = parsePercent(radius[1], size / 2);

    let cx: number;
    let cy: number;
    const coordSys = seriesModel.coordinateSystem;
    if (coordSys) {
        // percentage is not allowed when coordinate system is specified
        const point = coordSys.dataToPoint(center);
        cx = point[0] || 0;
        cy = point[1] || 0;
    }
    else {
        if (!zrUtil.isArray(center)) {
            center = [center, center];
        }
        cx = parsePercent(center[0], width) + viewRect.x;
        cy = parsePercent(center[1], height) + viewRect.y;
    }

    return {
        cx,
        cy,
        r0,
        r
    };
}

export default function pieLayout(
    seriesType: 'pie',
    ecModel: GlobalModel,
    api: ExtensionAPI
) {
    ecModel.eachSeriesByType(seriesType, function (seriesModel: PieSeriesModel) {
        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');
        const viewRect = getViewRect(seriesModel, api);

        const { cx, cy, r, r0 } = getBasicPieLayout(seriesModel, api);

        let startAngle = -seriesModel.get('startAngle') * RADIAN;
        let endAngle = seriesModel.get('endAngle');
        const padAngle = seriesModel.get('padAngle') * RADIAN;

        endAngle = endAngle === 'auto' ? startAngle - PI2 : -endAngle * RADIAN;

        const minAngle = seriesModel.get('minAngle') * RADIAN;

        const minAndPadAngle = minAngle + padAngle;

        let validDataCount = 0;
        data.each(valueDim, function (value: number) {
            !isNaN(value) && validDataCount++;
        });

        const sum = data.getSum(valueDim);
        // Sum may be 0
        let unitRadian = Math.PI / (sum || validDataCount) * 2;

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

        const angleRange = Math.abs(endAngle - startAngle);

        // In the case some sector angle is smaller than minAngle
        let restAngle = angleRange;
        let valueSumLargerThanMinAngle = 0;

        let currentAngle = startAngle;

        data.setLayout({ viewRect, r });

        data.each(valueDim, function (value: number, idx: number) {
            let angle;
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

            // FIXME 兼容 2.0 但是 roseType 是 area 的时候才是这样？
            if (roseType !== 'area') {
                angle = (sum === 0 && stillShowZeroSum)
                    ? unitRadian : (value * unitRadian);
            }
            else {
                angle = angleRange / validDataCount;
            }


            if (angle < minAndPadAngle) {
                angle = minAndPadAngle;
                restAngle -= minAndPadAngle;
            }
            else {
                valueSumLargerThanMinAngle += value;
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
                    ? linearMap(value, extent, [r0, r])
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
                data.each(valueDim, function (value: number, idx: number) {
                    if (!isNaN(value)) {
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
                data.each(valueDim, function (value: number, idx: number) {
                    if (!isNaN(value)) {
                        const layout = data.getItemLayout(idx);
                        const angle = layout.angle === minAndPadAngle
                            ? minAndPadAngle : value * unitRadian;

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
}, PieSeriesModel>();
