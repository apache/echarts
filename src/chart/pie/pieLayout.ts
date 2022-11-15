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

        const startAngle = -seriesModel.get('startAngle') * RADIAN;

        const minAngle = seriesModel.get('minAngle') * RADIAN;

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

        // In the case some sector angle is smaller than minAngle
        let restAngle = PI2;
        let valueSumLargerThanMinAngle = 0;

        let currentAngle = startAngle;
        const dir = clockwise ? 1 : -1;

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
                angle = PI2 / validDataCount;
            }

            if (angle < minAngle) {
                angle = minAngle;
                restAngle -= minAngle;
            }
            else {
                valueSumLargerThanMinAngle += value;
            }

            const endAngle = currentAngle + dir * angle;
            data.setItemLayout(idx, {
                angle: angle,
                startAngle: currentAngle,
                endAngle: endAngle,
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

        // Some sector is constrained by minAngle
        // Rest sectors needs recalculate angle
        if (restAngle < PI2 && validDataCount) {
            // Average the angle if rest angle is not enough after all angles is
            // Constrained by minAngle
            if (restAngle <= 1e-3) {
                const angle = PI2 / validDataCount;
                data.each(valueDim, function (value: number, idx: number) {
                    if (!isNaN(value)) {
                        const layout = data.getItemLayout(idx);
                        layout.angle = angle;
                        layout.startAngle = startAngle + dir * idx * angle;
                        layout.endAngle = startAngle + dir * (idx + 1) * angle;
                    }
                });
            }
            else {
                unitRadian = restAngle / valueSumLargerThanMinAngle;
                currentAngle = startAngle;
                data.each(valueDim, function (value: number, idx: number) {
                    if (!isNaN(value)) {
                        const layout = data.getItemLayout(idx);
                        const angle = layout.angle === minAngle
                            ? minAngle : value * unitRadian;
                        layout.startAngle = currentAngle;
                        layout.endAngle = currentAngle + dir * angle;
                        currentAngle += dir * angle;
                    }
                });
            }
        }
    });
}
