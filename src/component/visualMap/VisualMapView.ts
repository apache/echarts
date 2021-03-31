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
import {Group, Rect} from '../../util/graphic';
import * as formatUtil from '../../util/format';
import * as layout from '../../util/layout';
import VisualMapping from '../../visual/VisualMapping';
import ComponentView from '../../view/Component';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import VisualMapModel from './VisualMapModel';
import { VisualOptionUnit, ColorString } from '../../util/types';

type VisualState = VisualMapModel['stateList'][number];

class VisualMapView extends ComponentView {
    static type = 'visualMap';
    type = VisualMapView.type;

    autoPositionValues = {left: 1, right: 1, top: 1, bottom: 1} as const;

    ecModel: GlobalModel;

    api: ExtensionAPI;

    visualMapModel: VisualMapModel;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        this.ecModel = ecModel;
        this.api = api;
    }

    /**
     * @protected
     */
    render(
        visualMapModel: VisualMapModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: unknown    // TODO: TYPE
    ) {
        this.visualMapModel = visualMapModel;

        if (visualMapModel.get('show') === false) {
            this.group.removeAll();
            return;
        }

        this.doRender(visualMapModel, ecModel, api, payload);
    }

    /**
     * @protected
     */
    renderBackground(group: Group) {
        const visualMapModel = this.visualMapModel;
        const padding = formatUtil.normalizeCssArray(visualMapModel.get('padding') || 0);
        const rect = group.getBoundingRect();

        group.add(new Rect({
            z2: -1, // Lay background rect on the lowest layer.
            silent: true,
            shape: {
                x: rect.x - padding[3],
                y: rect.y - padding[0],
                width: rect.width + padding[3] + padding[1],
                height: rect.height + padding[0] + padding[2]
            },
            style: {
                fill: visualMapModel.get('backgroundColor'),
                stroke: visualMapModel.get('borderColor'),
                lineWidth: visualMapModel.get('borderWidth')
            }
        }));
    }

    /**
     * @protected
     * @param targetValue can be Infinity or -Infinity
     * @param visualCluster Only can be 'color' 'opacity' 'symbol' 'symbolSize'
     * @param opts
     * @param opts.forceState Specify state, instead of using getValueState method.
     * @param opts.convertOpacityToAlpha For color gradient in controller widget.
     * @return {*} Visual value.
     */
    protected getControllerVisual(
        targetValue: number,
        visualCluster: 'color' | 'opacity' | 'symbol' | 'symbolSize',
        opts?: {
            forceState?: VisualState
            convertOpacityToAlpha?: boolean
        }
    ) {

        opts = opts || {};

        const forceState = opts.forceState;
        const visualMapModel = this.visualMapModel;
        const visualObj: {[key in typeof visualCluster]?: VisualOptionUnit[key]} = {};

        // Default values.
        if (visualCluster === 'color') {
            const defaultColor = visualMapModel.get('contentColor');
            visualObj.color = defaultColor as ColorString;
        }

        function getter(key: typeof visualCluster) {
            return visualObj[key];
        }

        function setter(key: typeof visualCluster, value: any) {
            (visualObj as any)[key] = value;
        }

        const mappings = visualMapModel.controllerVisuals[
            forceState || visualMapModel.getValueState(targetValue)
        ];
        const visualTypes = VisualMapping.prepareVisualTypes(mappings);

        zrUtil.each(visualTypes, function (type) {
            let visualMapping = mappings[type];
            if (opts.convertOpacityToAlpha && type === 'opacity') {
                type = 'colorAlpha';
                visualMapping = mappings.__alphaForOpacity;
            }
            if (VisualMapping.dependsOn(type, visualCluster)) {
                visualMapping && visualMapping.applyVisual(
                    targetValue, getter, setter
                );
            }
        });

        return visualObj[visualCluster];
    }

    protected positionGroup(group: Group) {
        const model = this.visualMapModel;
        const api = this.api;

        layout.positionElement(
            group,
            model.getBoxLayoutParams(),
            {width: api.getWidth(), height: api.getHeight()}
        );
    }

    protected doRender(
        visualMapModel: VisualMapModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: unknown
    ) {}
}

export default VisualMapView;