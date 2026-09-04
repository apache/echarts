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

import { VectorArray } from 'zrender/src/core/vector';
import { extend } from 'zrender/src/core/util';
import Polygon, { PolygonShape } from 'zrender/src/graphic/shape/Polygon';
import Polyline, { PolylineShape } from 'zrender/src/graphic/shape/Polyline';


type RadarPathShape = PolygonShape | PolylineShape;

export function isValidRadarPoint(point: VectorArray): boolean {
    return !!point && !isNaN(point[0]) && !isNaN(point[1]);
}

function getValidPoints(points: VectorArray[]): VectorArray[] {
    if (!points) {
        return points;
    }

    let firstMissingIndex = -1;
    for (let i = 0; i < points.length; i++) {
        if (!isValidRadarPoint(points[i])) {
            firstMissingIndex = i;
            break;
        }
    }

    if (firstMissingIndex < 0) {
        return points;
    }

    const validPoints = points.slice(0, firstMissingIndex);
    for (let i = firstMissingIndex + 1; i < points.length; i++) {
        if (isValidRadarPoint(points[i])) {
            validPoints.push(points[i]);
        }
    }
    return validPoints;
}

function getRenderableShape<T extends RadarPathShape>(shape: T): T {
    const validPoints = getValidPoints(shape.points);
    if (validPoints === shape.points) {
        return shape;
    }

    const renderableShape = extend({}, shape) as T;
    renderableShape.points = validPoints;
    return renderableShape;
}

/**
 * Keep missing points in the animated shape so dimensions stay aligned, but
 * omit them at the final path-building boundary. This makes neighboring radar
 * dimensions connect without sending NaN coordinates to the path builder.
 */
export class RadarPolyline extends Polyline {
    buildPath(ctx: CanvasRenderingContext2D, shape: PolylineShape) {
        super.buildPath(ctx, getRenderableShape(shape));
    }
}

export class RadarPolygon extends Polygon {
    buildPath(ctx: CanvasRenderingContext2D, shape: PolygonShape) {
        super.buildPath(ctx, getRenderableShape(shape));
    }
}
