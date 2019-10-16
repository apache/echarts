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

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import BrushController from '../helper/BrushController';

export default echarts.extendComponentView({

    type: 'brush',

    init: function (ecModel, api) {

        /**
         * @readOnly
         * @type {module:echarts/model/Global}
         */
        this.ecModel = ecModel;

        /**
         * @readOnly
         * @type {module:echarts/ExtensionAPI}
         */
        this.api = api;

        /**
         * @readOnly
         * @type {module:echarts/component/brush/BrushModel}
         */
        this.model;

        /**
         * @private
         * @type {module:echarts/component/helper/BrushController}
         */
        (this._brushController = new BrushController(api.getZr()))
            .on('brush', zrUtil.bind(this._onBrush, this))
            .mount();
    },

    /**
     * @override
     */
    render: function (brushModel) {
        this.model = brushModel;
        return updateController.apply(this, arguments);
    },

    /**
     * @override
     */
    updateTransform: updateController,

    /**
     * @override
     */
    updateView: updateController,

    // /**
    //  * @override
    //  */
    // updateLayout: updateController,

    // /**
    //  * @override
    //  */
    // updateVisual: updateController,

    /**
     * @override
     */
    dispose: function () {
        this._brushController.dispose();
    },

    /**
     * @private
     */
    _onBrush: function (areas, opt) {
        var modelId = this.model.id;

        this.model.brushTargetManager.setOutputRanges(areas, this.ecModel);

        // Action is not dispatched on drag end, because the drag end
        // emits the same params with the last drag move event, and
        // may have some delay when using touch pad, which makes
        // animation not smooth (when using debounce).
        (!opt.isEnd || opt.removeOnClick) && this.api.dispatchAction({
            type: 'brush',
            brushId: modelId,
            areas: zrUtil.clone(areas),
            $from: modelId
        });
        opt.isEnd && this.api.dispatchAction({
            type: 'brushEnd',
            brushId: modelId,
            areas: zrUtil.clone(areas),
            $from: modelId
        });
    }

});

function updateController(brushModel, ecModel, api, payload) {
    // Do not update controller when drawing.
    (!payload || payload.$from !== brushModel.id) && this._brushController
        .setPanels(brushModel.brushTargetManager.makePanelOpts(api))
        .enableBrush(brushModel.brushOption)
        .updateCovers(brushModel.areas.slice());
}
