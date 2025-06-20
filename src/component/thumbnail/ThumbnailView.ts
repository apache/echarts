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

import ExtensionAPI from '../../core/ExtensionAPI';
import GlobalModel from '../../model/Global';
import ComponentView from '../../view/Component';
import { ThumbnailModel } from './ThumbnailModel';
import { NullUndefined, RoamOptionMixin } from '../../util/types';
import BoundingRect from 'zrender/src/core/BoundingRect';
import * as matrix from 'zrender/src/core/matrix';
import RoamController, { RoamEventParams } from '../helper/RoamController';
import tokens from '../../visual/tokens';
import { createBoxLayoutReference, getBoxLayoutParams, getLayoutRect } from '../../util/layout';
import { expandOrShrinkRect, Rect, Group, traverseUpdateZ, retrieveZInfo } from '../../util/graphic';
import { RectShape } from 'zrender/src/graphic/shape/Rect';
import { applyTransform } from 'zrender/src/core/vector';
import View from '../../coord/View';
import { bind, defaults, extend } from 'zrender/src/core/util';
import type ComponentModel from '../../model/Component';
import { RoamPayload } from '../helper/roamHelper';
import { ThumbnailBridgeRendered } from './ThumbnailBridgeImpl';


export class ThumbnailView extends ComponentView {

    static type = 'thumbnail' as const;
    type = ThumbnailView.type;

    private _api: ExtensionAPI;
    private _model: ThumbnailModel;
    private _bgRect: Rect;
    private _windowRect: Rect;
    private _contentRect: BoundingRect;
    private _targetGroup: Group;
    private _transThisToTarget: matrix.MatrixArray;
    private _roamController: RoamController;
    private _coordSys: View;
    private _bridgeRendered: ThumbnailBridgeRendered | NullUndefined;

    // The version of rendering result.
    // `render`/`updateContent`/`updateWindow` can be called separatedly and the order
    // is not guaranteed. Use version to ensure the consistency.
    private _renderVersion: number;

    render(thumbnailModel: ThumbnailModel, ecModel: GlobalModel, api: ExtensionAPI): void {
        this._api = api;
        this._model = thumbnailModel;
        if (!this._coordSys) {
            this._coordSys = new View();
        }

        if (!this._isEnabled()) {
            this._clear();
            return;
        }

        this._renderVersion = api.getMainProcessVersion();
        const group = this.group;

        group.removeAll();

        const itemStyleModel = thumbnailModel.getModel('itemStyle');
        const itemStyle = itemStyleModel.getItemStyle();
        if (itemStyle.fill == null) {
            itemStyle.fill = ecModel.get('backgroundColor') || tokens.color.neutral00;
        }

        const refContainer = createBoxLayoutReference(thumbnailModel, api).refContainer;
        const boxRect = getLayoutRect(
            getBoxLayoutParams(thumbnailModel, true),
            refContainer
        );
        const boxBorderWidth = itemStyle.lineWidth || 0;
        const contentRect = this._contentRect = expandOrShrinkRect(
            boxRect.clone(), boxBorderWidth / 2, true, true
        );

        const contentGroup = new Group();
        group.add(contentGroup);
        contentGroup.setClipPath(new Rect({shape: contentRect.plain()}));

        const targetGroup = this._targetGroup = new Group();
        contentGroup.add(targetGroup);

        // Draw border and background and shadow of thumbnail box.
        const borderShape: RectShape = boxRect.plain();
        borderShape.r = itemStyleModel.getShallow('borderRadius', true) as (number | number[]);
        group.add(this._bgRect = new Rect({
            style: itemStyle,
            shape: borderShape,
            silent: false, // Prevent from hovering on the lower elements.
            cursor: 'grab',
        }));

        const windowStyleModel = thumbnailModel.getModel('windowStyle');
        const windowR = windowStyleModel.getShallow('borderRadius', true) as (number | number[]);
        contentGroup.add(this._windowRect = new Rect({
            shape: {x: 0, y: 0, width: 0, height: 0, r: windowR},
            style: windowStyleModel.getItemStyle(),
            silent: false, // Prevent from hovering on the lower elements.
            cursor: 'grab',
        }));

        this._dealRenderContent();
        this._dealUpdateWindow();

        updateZ(thumbnailModel, this);
    }

    /**
     * Can be called asynchronously directly.
     * This method should be idempotent.
     */
    renderContent(bridgeRendered: ThumbnailBridgeRendered): void {
        this._bridgeRendered = bridgeRendered;
        if (this._isEnabled()) {
            this._dealRenderContent();
            this._dealUpdateWindow();
            updateZ(this._model, this);
        }
    }

    private _dealRenderContent(): void {
        const bridgeRendered = this._bridgeRendered;
        if (!bridgeRendered || bridgeRendered.renderVersion !== this._renderVersion) {
            return;
        }

        const targetGroup = this._targetGroup;
        const coordSys = this._coordSys;
        const contentRect = this._contentRect;

        targetGroup.removeAll();

        if (!bridgeRendered) {
            return;
        }

        const bridgeGroup = bridgeRendered.group;
        const bridgeRect = bridgeGroup.getBoundingRect();

        targetGroup.add(bridgeGroup);

        this._bgRect.z2 = bridgeRendered.z2Range.min - 10;

        coordSys.setBoundingRect(bridgeRect.x, bridgeRect.y, bridgeRect.width, bridgeRect.height);
        // Use `getLayoutRect` is just to find an approperiate rect in thumbnail.
        const viewRect = getLayoutRect(
            {
                left: 'center',
                top: 'center',
                aspect: bridgeRect.width / bridgeRect.height
            },
            contentRect
        );
        coordSys.setViewRect(viewRect.x, viewRect.y, viewRect.width, viewRect.height);
        bridgeGroup.attr(coordSys.getTransformInfo().raw);

        this._windowRect.z2 = bridgeRendered.z2Range.max + 10;

        this._resetRoamController(bridgeRendered.roamType);
    }

    /**
     * Can be called from action handler directly.
     * This method should be idempotent.
     */
    updateWindow(param: Pick<ThumbnailBridgeRendered, 'targetTrans' | 'renderVersion'>): void {
        const bridgeRendered = this._bridgeRendered;
        if (bridgeRendered && bridgeRendered.renderVersion === param.renderVersion) {
            bridgeRendered.targetTrans = param.targetTrans;
        }
        if (this._isEnabled()) {
            this._dealUpdateWindow();
        }
    }

    private _dealUpdateWindow(): void {
        const bridgeRendered = this._bridgeRendered;
        if (!bridgeRendered || bridgeRendered.renderVersion !== this._renderVersion) {
            return;
        }

        const invTargetTrans = matrix.invert([], bridgeRendered.targetTrans);
        const transTargetToThis = matrix.mul([], this._coordSys.transform, invTargetTrans);
        this._transThisToTarget = matrix.invert([], transTargetToThis);

        let viewportRect = bridgeRendered.viewportRect;
        if (!viewportRect) {
            viewportRect = new BoundingRect(0, 0, this._api.getWidth(), this._api.getHeight());
        }
        else {
            viewportRect = viewportRect.clone();
        }
        viewportRect.applyTransform(transTargetToThis);
        const windowRect = this._windowRect;
        const r = windowRect.shape.r;
        windowRect.setShape(defaults({r}, viewportRect));
    }

    private _resetRoamController(
        roamType: RoamOptionMixin['roam'],
    ): void {
        const api = this._api;

        let roamController = this._roamController;
        if (!roamController) {
            roamController = this._roamController = new RoamController(api.getZr());
        }

        if (!roamType || !this._isEnabled()) {
            roamController.disable();
            return;
        }

        roamController.enable(roamType, {
            api: api,
            zInfo: {component: this._model},
            triggerInfo: {
                roamTrigger: null,
                isInSelf: (e, x, y) => this._contentRect.contain(x, y)
            }
        });
        roamController
            .off('pan')
            .off('zoom')
            .on('pan', bind(this._onPan, this))
            .on('zoom', bind(this._onZoom, this));
    }

    private _onPan(event: RoamEventParams['pan']): void {
        const trans = this._transThisToTarget;
        if (!this._isEnabled() || !trans) {
            return;
        }
        const oldOffset = applyTransform([], [event.oldX, event.oldY], trans);
        const newOffset = applyTransform([], [event.oldX - event.dx, event.oldY - event.dy], trans);

        this._api.dispatchAction(makeRoamPayload(this._model.getTarget().baseMapProvider, {
            dx: newOffset[0] - oldOffset[0],
            dy: newOffset[1] - oldOffset[1],
        }));
    }

    private _onZoom(event: RoamEventParams['zoom']): void {
        const trans = this._transThisToTarget;
        if (!this._isEnabled() || !trans) {
            return;
        }
        const offset = applyTransform([], [event.originX, event.originY], trans);

        this._api.dispatchAction(makeRoamPayload(this._model.getTarget().baseMapProvider, {
            zoom: 1 / event.scale,
            originX: offset[0],
            originY: offset[1],
        }));
    }

    /**
     * This method is also responsible for check enable in asynchronous situation,
     * e.g., in event listeners that is supposed to be outdated but not be removed.
     */
    private _isEnabled(): boolean {
        const thumbnailModel = this._model;
        if (!thumbnailModel || !thumbnailModel.shouldShow()) {
            return false;
        }
        const baseMapProvider = thumbnailModel.getTarget().baseMapProvider;
        if (!baseMapProvider) {
            return false;
        }
        return true;
    }

    private _clear(): void {
        this.group.removeAll();
        this._bridgeRendered = null;
        if (this._roamController) {
            this._roamController.disable();
        }
    }

    remove() {
        this._clear();
    }

    dispose() {
        this._clear();
    }

}

function makeRoamPayload(baseMapProvider: ComponentModel, params: Partial<RoamPayload>): RoamPayload {
    const type = baseMapProvider.mainType === 'series'
        ? `${baseMapProvider.subType}Roam` // e.g. 'graphRoam'
        : `${baseMapProvider.mainType}Roam`; // e.g., 'geoRoam'
    const payload = {type} as RoamPayload;
    payload[`${baseMapProvider.mainType}Id`] = baseMapProvider.id;
    extend(payload, params);
    return payload;
}

function updateZ(thumbnailModel: ThumbnailModel, thumbnailView: ThumbnailView): void {
    const zInfo = retrieveZInfo(thumbnailModel);
    traverseUpdateZ(thumbnailView.group, zInfo.z, zInfo.zlevel);
}
