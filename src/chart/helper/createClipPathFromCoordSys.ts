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
import {round} from '../../util/number';
import SeriesModel from '../../model/Series';
import { SeriesOption } from '../../util/types';
import type Cartesian2D from '../../coord/cartesian/Cartesian2D';
import type Polar from '../../coord/polar/Polar';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import { isFunction } from 'zrender/src/core/util';

type SeriesModelWithLineWidth = SeriesModel<SeriesOption & {
    lineStyle?: { width?: number }
}>;
function createGridClipPath(
    cartesian: Cartesian2D,
    hasAnimation: boolean,
    seriesModel: SeriesModelWithLineWidth,
    done?: () => void,
    during?: (percent: number, clipRect: graphic.Rect) => void
) {
    const rect = cartesian.getArea();

    let x = rect.x;
    let y = rect.y;
    let width = rect.width;
    let height = rect.height;

    const lineWidth = seriesModel.get(['lineStyle', 'width']) || 2;
    // Expand the clip path a bit to avoid the border is clipped and looks thinner
    x -= lineWidth / 2;
    y -= lineWidth / 2;
    width += lineWidth;
    height += lineWidth;

    // fix: https://github.com/apache/incubator-echarts/issues/11369
    x = Math.floor(x);
    width = Math.round(width);

    const clipPath = new graphic.Rect({
        shape: {
            x: x,
            y: y,
            width: width,
            height: height
        }
    });

    if (hasAnimation) {
        const baseAxis = cartesian.getBaseAxis();
        const isHorizontal = baseAxis.isHorizontal();
        const isAxisInversed = baseAxis.inverse;

        if (isHorizontal) {
            if (isAxisInversed) {
                clipPath.shape.x += width;
            }
            clipPath.shape.width = 0;
        }
        else {
            if (!isAxisInversed) {
                clipPath.shape.y += height;
            }
            clipPath.shape.height = 0;
        }

        const duringCb = isFunction(during)
            ? (percent: number) => {
                during(percent, clipPath);
            }
            : null;

        graphic.initProps(clipPath, {
            shape: {
                width: width,
                height: height,
                x: x,
                y: y
            }
        }, seriesModel, null, done, duringCb);
    }

    return clipPath;
}

function createPolarClipPath(
    polar: Polar,
    hasAnimation: boolean,
    seriesModel: SeriesModelWithLineWidth
) {
    const sectorArea = polar.getArea();
    // Avoid float number rounding error for symbol on the edge of axis extent.

    const r0 = round(sectorArea.r0, 1);
    const r = round(sectorArea.r, 1);
    const clipPath = new graphic.Sector({
        shape: {
            cx: round(polar.cx, 1),
            cy: round(polar.cy, 1),
            r0: r0,
            r: r,
            startAngle: sectorArea.startAngle,
            endAngle: sectorArea.endAngle,
            clockwise: sectorArea.clockwise
        }
    });

    if (hasAnimation) {
        const isRadial = polar.getBaseAxis().dim === 'angle';

        if (isRadial) {
            clipPath.shape.endAngle = sectorArea.startAngle;
        }
        else {
            clipPath.shape.r = r0;
        }

        graphic.initProps(clipPath, {
            shape: {
                endAngle: sectorArea.endAngle,
                r: r
            }
        }, seriesModel);
    }
    return clipPath;
}

function createClipPath(
    coordSys: CoordinateSystem,
    hasAnimation: boolean,
    seriesModel: SeriesModelWithLineWidth,
    done?: () => void,
    during?: (percent: number) => void
) {
    if (!coordSys) {
        return null;
    }
    else if (coordSys.type === 'polar') {
        return createPolarClipPath(coordSys as Polar, hasAnimation, seriesModel);
    }
    else if (coordSys.type === 'cartesian2d') {
        return createGridClipPath(coordSys as Cartesian2D, hasAnimation, seriesModel, done, during);
    }
    return null;
}

export {
    createGridClipPath,
    createPolarClipPath,
    createClipPath
};