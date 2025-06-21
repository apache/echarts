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

import type Group from 'zrender/src/graphic/Group';
import type ComponentModel from '../../model/Component';
import { makeInner } from '../../util/model';
import { NullUndefined, RoamOptionMixin } from '../../util/types';
import ExtensionAPI from '../../core/ExtensionAPI';
import BoundingRect from 'zrender/src/core/BoundingRect';
import type View from '../../coord/View';
/**
 * @caveat Do not import other `src/component/thumbnail/*` files.
 *  This file should be decoupled from them for sake of the size consideration.
 */

/**
 * FIXME: This is a temporary implmentation. May need refactor to decouple
 *  the direct call from series.graph to thumbnail.
 */

const inner = makeInner<{
    bridge: ThumbnailBridge
}, ComponentModel>();

export function getThumbnailBridge(
    model: ComponentModel
): ThumbnailBridge | NullUndefined {
    if (model) {
        return inner(model).bridge;
    }
}

export function injectThumbnailBridge(
    model: ComponentModel,
    thumbnailBridge: ThumbnailBridge | NullUndefined
): void {
    if (model) {
        inner(model).bridge = thumbnailBridge;
    }
}

/**
 * This is the transform from the rendered target elements (e.g., the graph elements, the geo map elements)
 * in their local unit (e.g., geo in longitude-latitude) to screen coord.
 * Typically it is `View['transform']` if `coord/View` is used.
 */
export type ThumbnailTargetTransformRawToViewport = View['transform'];

export interface ThumbnailBridge {
    /**
     * Must be called in `ChartView['render']`/`ComponentView['render']`
     */
    reset(api: ExtensionAPI): void;

    /**
     * Trigger content rendering.
     * Some series, such graph force layout, will update elements asynchronously,
     * therefore rendering and register are separated.
     */
    renderContent(opt: {
        roamType: RoamOptionMixin['roam'];
        // `viewportRect`:
        //  - If clip is suppored, this should be the clip rect.
        //  - Otherwise (can pass NullUndefined), this should be the canvas rect.
        viewportRect: BoundingRect;
        group: Group;
        targetTrans: ThumbnailTargetTransformRawToViewport;
        api: ExtensionAPI;
    }): void;

    updateWindow(
        targetTrans: ThumbnailTargetTransformRawToViewport,
        api: ExtensionAPI
    ): void;
};
