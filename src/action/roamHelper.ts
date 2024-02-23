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

import type Geo from '../coord/geo/Geo';
import type View from '../coord/View';
import type ExtensionAPI from '../core/ExtensionAPI';
import type { Payload } from '../util/types';

export interface RoamPayload extends Payload {
    dx: number
    dy: number
    zoom: number
    originX: number
    originY: number
}

function getCenterCoord(view: View, point: number[]) {
    // Use projected coord as center because it's linear.
    return (view as Geo).pointToProjected
        ? (view as Geo).pointToProjected(point)
        : view.pointToData(point);
}

export function updateCenterAndZoom(
    view: View,
    payload: RoamPayload,
    zoomLimit?: {
        min?: number,
        max?: number
    },
    api?: ExtensionAPI
) {
    const previousZoom = view.getZoom();
    const center = view.getCenter();
    let zoom = payload.zoom;

    const point = (view as Geo).projectedToPoint
        ? (view as Geo).projectedToPoint(center)
        : view.dataToPoint(center);

    if (payload.dx != null && payload.dy != null) {
        point[0] -= payload.dx;
        point[1] -= payload.dy;

        view.setCenter(getCenterCoord(view, point), api);
    }
    if (zoom != null) {
        if (zoomLimit) {
            const zoomMin = zoomLimit.min || 0;
            const zoomMax = zoomLimit.max || Infinity;
            zoom = Math.max(
                Math.min(previousZoom * zoom, zoomMax),
                zoomMin
            ) / previousZoom;
        }

        // Zoom on given point(originX, originY)
        view.scaleX *= zoom;
        view.scaleY *= zoom;
        const fixX = (payload.originX - view.x) * (zoom - 1);
        const fixY = (payload.originY - view.y) * (zoom - 1);

        view.x -= fixX;
        view.y -= fixY;

        view.updateTransform();
        // Get the new center
        view.setCenter(getCenterCoord(view, point), api);
        view.setZoom(zoom * previousZoom);
    }

    return {
        center: view.getCenter(),
        zoom: view.getZoom()
    };
}
