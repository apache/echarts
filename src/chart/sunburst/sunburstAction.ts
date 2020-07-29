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

/**
 * @file Sunburst action
 */

import * as echarts from '../../echarts';
import * as helper from '../helper/treeHelper';
import SunburstSeriesModel from './SunburstSeries';
import { Payload } from '../../util/types';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { extend } from 'zrender/src/core/util';
import { deprecateReplaceLog } from '../../util/log';

export const ROOT_TO_NODE_ACTION = 'sunburstRootToNode';

interface SunburstRootToNodePayload extends Payload {}

echarts.registerAction(
    {type: ROOT_TO_NODE_ACTION, update: 'updateView'},
    function (payload: SunburstRootToNodePayload, ecModel: GlobalModel) {

        ecModel.eachComponent(
            {mainType: 'series', subType: 'sunburst', query: payload},
            handleRootToNode
        );

        function handleRootToNode(model: SunburstSeriesModel, index: number) {
            const targetInfo = helper
                .retrieveTargetInfo(payload, [ROOT_TO_NODE_ACTION], model);

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

const HIGHLIGHT_ACTION = 'sunburstHighlight';

interface SunburstHighlightPayload extends Payload {}

echarts.registerAction(
    {type: HIGHLIGHT_ACTION, update: 'none'},
    function (payload: SunburstHighlightPayload, ecModel: GlobalModel, api: ExtensionAPI) {
        // Clone
        payload = extend({}, payload);
        ecModel.eachComponent(
            {mainType: 'series', subType: 'sunburst', query: payload},
            handleHighlight
        );

        function handleHighlight(model: SunburstSeriesModel) {
            const targetInfo = helper
                .retrieveTargetInfo(payload, [HIGHLIGHT_ACTION], model);
            if (targetInfo) {
                payload.dataIndex = targetInfo.node.dataIndex;
            }
        }

        if (__DEV__) {
            deprecateReplaceLog('highlight', 'sunburstHighlight');
        }

        // Fast forward action
        api.dispatchAction(extend(payload, {
            type: 'highlight'
        }));
    }
);


const UNHIGHLIGHT_ACTION = 'sunburstUnhighlight';

interface SunburstUnhighlightPayload extends Payload {}

echarts.registerAction(
    {type: UNHIGHLIGHT_ACTION, update: 'updateView'},
    function (payload: SunburstUnhighlightPayload, ecModel: GlobalModel, api: ExtensionAPI) {
        payload = extend({}, payload);

        if (__DEV__) {
            deprecateReplaceLog('downplay', 'sunburstUnhighlight');
        }

        api.dispatchAction(extend(payload, {
            type: 'downplay'
        }));
    }
);
