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

import * as helper from '../helper/treeHelper';
import { Payload } from '../../util/types';
import TreemapSeriesModel from './TreemapSeries';
import { TreeNode } from '../../data/Tree';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { EChartsExtensionInstallRegisters } from '../../extension';
import { noop } from 'zrender/src/core/util';

const actionTypes = [
    'treemapZoomToNode',
    'treemapRender',
    'treemapMove'
];

export interface TreemapZoomToNodePayload extends Payload {
    type: 'treemapZoomToNode'
}
export interface TreemapRenderPayload extends Payload {
    type: 'treemapRender',
    rootRect?: RectLike
}
export interface TreemapMovePayload extends Payload {
    type: 'treemapMove',
    rootRect?: RectLike
}
export interface TreemapRootToNodePayload extends Payload {
    type: 'treemapRootToNode'
    targetNode?: TreeNode | string
    targetNodeId?: string

    direction?: 'rollUp' | 'drillDown'
}

export function installTreemapAction(registers: EChartsExtensionInstallRegisters) {
    for (let i = 0; i < actionTypes.length; i++) {
        registers.registerAction({
            type: actionTypes[i],
            update: 'updateView'
        }, noop);
    }

    registers.registerAction(
        {type: 'treemapRootToNode', update: 'updateView'},
        function (payload, ecModel) {

            ecModel.eachComponent(
                {mainType: 'series', subType: 'treemap', query: payload},
                handleRootToNode
            );

            function handleRootToNode(model: TreemapSeriesModel, index: number) {
                const types = ['treemapZoomToNode', 'treemapRootToNode'];
                const targetInfo = helper.retrieveTargetInfo(payload, types, model);

                if (targetInfo) {
                    const originViewRoot = model.getViewRoot();
                    if (originViewRoot) {
                        payload.direction = helper.aboveViewRoot(originViewRoot, targetInfo.node)
                            ? 'rollUp' : 'drillDown';
                    }
                    model.resetViewRoot(targetInfo.node);
                }
            }
        }
    );

}
