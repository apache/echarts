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


import * as zrUtil from 'zrender/src/core/util';
import BrushController, { BrushControllerEvents, BrushCoverConfig } from '../helper/BrushController';
import {layoutCovers} from './visualEncoding';
import BrushModel from './BrushModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Payload } from '../../util/types';
import ComponentView from '../../view/Component';


class BrushView extends ComponentView {

    static type = 'brush';
    readonly type = BrushView.type;

    ecModel: GlobalModel;
    api: ExtensionAPI;
    model: BrushModel;
    private _brushController: BrushController;

    init(ecModel: GlobalModel, api: ExtensionAPI): void {
        this.ecModel = ecModel;
        this.api = api;
        this.model;

        (this._brushController = new BrushController(api.getZr()))
            .on('brush', zrUtil.bind(this._onBrush, this))
            .mount();
    }

    render(brushModel: BrushModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        this.model = brushModel;
        this._updateController(brushModel, ecModel, api, payload);
    }

    updateTransform(brushModel: BrushModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {
        // PENDING: `updateTransform` is a little tricky, whose layout need
        // to be calculate mandatorily and other stages will not be performed.
        // Take care the correctness of the logic. See #11754 .
        layoutCovers(ecModel);
        this._updateController(brushModel, ecModel, api, payload);
    }

    updateVisual(brushModel: BrushModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {
        this.updateTransform(brushModel, ecModel, api, payload);
    }

    updateView(brushModel: BrushModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {
        this._updateController(brushModel, ecModel, api, payload);
    }

    private _updateController(brushModel: BrushModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload) {
        // Do not update controller when drawing.
        (!payload || payload.$from !== brushModel.id) && this._brushController
            .setPanels(brushModel.brushTargetManager.makePanelOpts(api))
            .enableBrush(brushModel.brushOption)
            .updateCovers(brushModel.areas.slice() as BrushCoverConfig[]);
    }

    // updateLayout: updateController,

    // updateVisual: updateController,

    dispose() {
        this._brushController.dispose();
    }

    private _onBrush(eventParam: BrushControllerEvents['brush']): void {
        const modelId = this.model.id;

        const areas = this.model.brushTargetManager.setOutputRanges(eventParam.areas, this.ecModel);

        // Action is not dispatched on drag end, because the drag end
        // emits the same params with the last drag move event, and
        // may have some delay when using touch pad, which makes
        // animation not smooth (when using debounce).
        (!eventParam.isEnd || eventParam.removeOnClick) && this.api.dispatchAction({
            type: 'brush',
            brushId: modelId,
            areas: zrUtil.clone(areas),
            $from: modelId
        });
        eventParam.isEnd && this.api.dispatchAction({
            type: 'brushEnd',
            brushId: modelId,
            areas: zrUtil.clone(areas),
            $from: modelId
        });
    }

}

export default BrushView;