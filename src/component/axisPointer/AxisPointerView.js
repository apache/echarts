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
import * as globalListener from './globalListener';

var AxisPointerView = echarts.extendComponentView({

    type: 'axisPointer',

    render: function (globalAxisPointerModel, ecModel, api) {
        var globalTooltipModel = ecModel.getComponent('tooltip');
        var triggerOn = globalAxisPointerModel.get('triggerOn')
            || (globalTooltipModel && globalTooltipModel.get('triggerOn') || 'mousemove|click');

        // Register global listener in AxisPointerView to enable
        // AxisPointerView to be independent to Tooltip.
        globalListener.register(
            'axisPointer',
            api,
            function (currTrigger, e, dispatchAction) {
                // If 'none', it is not controlled by mouse totally.
                if (triggerOn !== 'none'
                    && (currTrigger === 'leave' || triggerOn.indexOf(currTrigger) >= 0)
                ) {
                    dispatchAction({
                        type: 'updateAxisPointer',
                        currTrigger: currTrigger,
                        x: e && e.offsetX,
                        y: e && e.offsetY
                    });
                }
            }
        );
    },

    /**
     * @override
     */
    remove: function (ecModel, api) {
        globalListener.unregister(api.getZr(), 'axisPointer');
        AxisPointerView.superApply(this._model, 'remove', arguments);
    },

    /**
     * @override
     */
    dispose: function (ecModel, api) {
        globalListener.unregister('axisPointer', api);
        AxisPointerView.superApply(this._model, 'dispose', arguments);
    }

});

export default AxisPointerView;