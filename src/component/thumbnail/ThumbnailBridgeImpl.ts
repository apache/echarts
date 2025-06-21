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

import { calcZ2Range, Group } from '../../util/graphic';
import { RoamOptionMixin } from '../../util/types';
import { ThumbnailBridge, ThumbnailTargetTransformRawToViewport } from '../helper/thumbnailBridge';
import ExtensionAPI from '../../core/ExtensionAPI';
import type { ThumbnailModel } from './ThumbnailModel';
import type { ThumbnailView } from './ThumbnailView';
import BoundingRect from 'zrender/src/core/BoundingRect';

export interface ThumbnailBridgeRendered {
    roamType: RoamOptionMixin['roam'];
    group: Group;
    targetTrans: ThumbnailTargetTransformRawToViewport;
    z2Range: {min: number, max: number};
    viewportRect: BoundingRect;
    // Use version becuase:
    //  - `renderContent` may be called asynchronously by graph force layout.
    //  - The order of `updateContent` and `ComponentView['render']` is not guaranteed.
    renderVersion: number;
}

/**
 * [CAVEAT]: the call order of `ThumbnailView['render']` and other
 *  `ChartView['render']/ComponentView['render']` is not guaranteed.
 */
export class ThumbnailBridgeImpl implements ThumbnailBridge {

    private _thumbnailModel: ThumbnailModel;
    private _renderVersion: number;

    constructor(thumbnailModel: ThumbnailModel) {
        this._thumbnailModel = thumbnailModel;
    }

    reset(api: ExtensionAPI) {
        this._renderVersion = api.getMainProcessVersion();
    }

    renderContent(opt: {
        roamType: RoamOptionMixin['roam'];
        viewportRect: BoundingRect;
        group: Group;
        targetTrans: ThumbnailTargetTransformRawToViewport;
        api: ExtensionAPI;
    }): void {
        const thumbnailView = opt.api.getViewOfComponentModel(this._thumbnailModel) as ThumbnailView;
        if (!thumbnailView) {
            return;
        }
        opt.group.silent = true;
        thumbnailView.renderContent({
            group: opt.group,
            targetTrans: opt.targetTrans,
            z2Range: calcZ2Range(opt.group),
            roamType: opt.roamType,
            viewportRect: opt.viewportRect,
            renderVersion: this._renderVersion,
        });
    }

    updateWindow(
        targetTrans: ThumbnailTargetTransformRawToViewport,
        api: ExtensionAPI
    ): void {
        const thumbnailView = api.getViewOfComponentModel(this._thumbnailModel) as ThumbnailView;
        if (!thumbnailView) {
            return;
        }
        thumbnailView.updateWindow({
            targetTrans,
            renderVersion: this._renderVersion,
        });
    }

}
