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
import { SeriesModel } from '../../echarts.all';
import ExtensionAPI from '../../core/ExtensionAPI';
import Group from 'zrender/src/graphic/Group';
import RoamController from './RoamController';
import { onIrrelevantElement } from './cursorHelper';
import { SeriesOption } from '../../export/option';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import View from '../../coord/View';
import TreeSeriesModel from '../../chart/tree/TreeSeries';
import SankeySeriesModel from '../../chart/sankey/SankeySeries';
import { RoamOptionMixin } from '../../util/types';

export interface RoamControllerHost {
    target: Element;
    zoom?: number;
    zoomLimit?: {min?: number, max?: number};
}

/**
 * For geo and graph.
 */
export function updateViewOnPan(controllerHost: RoamControllerHost, dx: number, dy: number) {
    const target = controllerHost.target;
    target.x += dx;
    target.y += dy;
    target.dirty();
}

/**
 * For geo and graph.
 */
export function updateViewOnZoom(controllerHost: RoamControllerHost, zoomDelta: number, zoomX: number, zoomY: number) {
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

export function updateController(
    seriesModel: SeriesModel<SeriesOption & RoamOptionMixin>,
    api: ExtensionAPI,
    group: Group,
    controller: RoamController,
    controllerHost: RoamControllerHost,
) {
    controller.setPointerChecker(function (e, x, y) {
        const rect = group.getBoundingRect();
        rect.applyTransform(group.transform);
        return rect.contain(x, y)
            && !onIrrelevantElement(e, api, seriesModel);
    });

    controller.enable(seriesModel.get('roam'));
    controllerHost.zoomLimit = seriesModel.get('scaleLimit');
    const coordinate = seriesModel.coordinateSystem;
    controllerHost.zoom = coordinate ? (coordinate as View).getZoom() : 1;
    const type = seriesModel.type + 'Roam';

    controller
        .off('pan')
        .off('zoom')
        .on('pan', (e) => {
            updateViewOnPan(controllerHost, e.dx, e.dy);
            api.dispatchAction({
                seriesId: seriesModel.id,
                type,
                dx: e.dx,
                dy: e.dy
            });
        })
        .on('zoom', (e) => {
            updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);
            api.dispatchAction({
                seriesId: seriesModel.id,
                type,
                zoom: e.scale,
                originX: e.originX,
                originY: e.originY
            });
            // Only update label layout on zoom
            api.updateLabelLayout();
        });
}
