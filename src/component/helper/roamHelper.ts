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

import Element from 'zrender/src/Element';

interface ControllerHost {
    target: Element,
    zoom?: number
    zoomLimit?: {min?: number, max?: number}
}

/**
 * For geo and graph.
 */
export function updateViewOnPan(controllerHost: ControllerHost, dx: number, dy: number) {
    const target = controllerHost.target;
    target.x += dx;
    target.y += dy;
    target.dirty();
}

/**
 * For geo and graph.
 */
export function updateViewOnZoom(controllerHost: ControllerHost, zoomDelta: number, zoomX: number, zoomY: number) {
    const target = controllerHost.target;
    const zoomLimit = controllerHost.zoomLimit;

    let newZoom = controllerHost.zoom = controllerHost.zoom || 1;
    newZoom *= zoomDelta;
    if (zoomLimit) {
        const zoomMin = zoomLimit.min || 0;
        const zoomMax = zoomLimit.max || Infinity;
        newZoom = Math.max(
            Math.min(zoomMax, newZoom),
            zoomMin
        );
    }
    const zoomScale = newZoom / controllerHost.zoom;
    controllerHost.zoom = newZoom;
    // Keep the mouse center when scaling
    target.x -= (zoomX - target.x) * (zoomScale - 1);
    target.y -= (zoomY - target.y) * (zoomScale - 1);
    target.scaleX *= zoomScale;
    target.scaleY *= zoomScale;

    target.dirty();
}
