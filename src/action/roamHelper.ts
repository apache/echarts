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

import View from '../coord/View';
import { Payload } from '../util/types';

export interface RoamPaylod extends Payload {
    dx: number
    dy: number
    zoom: number
    originX: number
    originY: number
}

export function updateCenterAndZoom(
    view: View,
    payload: RoamPaylod,
    zoomLimit?: {
        min?: number,
        max?: number
    }
) {
    const previousZoom = view.getZoom();
    const center = view.getCenter();
    let zoom = payload.zoom;

    const point = view.dataToPoint(center);

    if (payload.dx != null && payload.dy != null) {
        point[0] -= payload.dx;
        point[1] -= payload.dy;

        view.setCenter(view.pointToData(point));
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
        view.setCenter(view.pointToData(point));
        view.setZoom(zoom * previousZoom);
    }

    return {
        center: view.getCenter(),
        zoom: view.getZoom()
    };
}
