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

function createGridClipPath(cartesian, hasAnimation, seriesModel) {
    var rect = cartesian.getArea();
    var isHorizontal = cartesian.getBaseAxis().isHorizontal();

    var x = rect.x;
    var y = rect.y;
    var width = rect.width;
    var height = rect.height;

    var lineWidth = seriesModel.get('lineStyle.width') || 2;
    // Expand the clip path a bit to avoid the border is clipped and looks thinner
    x -= lineWidth / 2;
    y -= lineWidth / 2;
    width += lineWidth;
    height += lineWidth;

    // fix: https://github.com/apache/incubator-echarts/issues/11369
    x = Math.floor(x);
    width = Math.round(width);

    var clipPath = new graphic.Rect({
        shape: {
            x: x,
            y: y,
            width: width,
            height: height
        }
    });

    if (hasAnimation) {
        clipPath.shape[isHorizontal ? 'width' : 'height'] = 0;
        graphic.initProps(clipPath, {
            shape: {
                width: width,
                height: height
            }
        }, seriesModel);
    }

    return clipPath;
}

function createPolarClipPath(polar, hasAnimation, seriesModel) {
    var sectorArea = polar.getArea();
    // Avoid float number rounding error for symbol on the edge of axis extent.

    var clipPath = new graphic.Sector({
        shape: {
            cx: round(polar.cx, 1),
            cy: round(polar.cy, 1),
            r0: round(sectorArea.r0, 1),
            r: round(sectorArea.r, 1),
            startAngle: sectorArea.startAngle,
            endAngle: sectorArea.endAngle,
            clockwise: sectorArea.clockwise
        }
    });

    if (hasAnimation) {
        clipPath.shape.endAngle = sectorArea.startAngle;
        graphic.initProps(clipPath, {
            shape: {
                endAngle: sectorArea.endAngle
            }
        }, seriesModel);
    }
    return clipPath;
}

function createClipPath(coordSys, hasAnimation, seriesModel) {
    if (!coordSys) {
        return null;
    }
    else if (coordSys.type === 'polar') {
        return createPolarClipPath(coordSys, hasAnimation, seriesModel);
    }
    else if (coordSys.type === 'cartesian2d') {
        return createGridClipPath(coordSys, hasAnimation, seriesModel);
    }
    return null;
}

export {
    createGridClipPath,
    createPolarClipPath,
    createClipPath
};