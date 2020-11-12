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
import SeriesModel from '../../model/Series';
import {TreeNode} from '../../data/Tree';

export function retrieveTargetInfo(
    payload: {
        type?: string,
        targetNode?: string | TreeNode
        targetNodeId?: string
    },
    validPayloadTypes: string[],
    seriesModel: SeriesModel
) {
    if (payload && zrUtil.indexOf(validPayloadTypes, payload.type) >= 0) {
        const root = seriesModel.getData().tree.root;
        let targetNode = payload.targetNode;

        if (typeof targetNode === 'string') {
            targetNode = root.getNodeById(targetNode);
        }

        if (targetNode && root.contains(targetNode)) {
            return {
                node: targetNode
            };
        }

        const targetNodeId = payload.targetNodeId;
        if (targetNodeId != null && (targetNode = root.getNodeById(targetNodeId))) {
            return {
                node: targetNode
            };
        }
    }
}

// Not includes the given node at the last item.
export function getPathToRoot(node: TreeNode): TreeNode[] {
    const path = [];
    while (node) {
        node = node.parentNode;
        node && path.push(node);
    }
    return path.reverse();
}

export function aboveViewRoot(viewRoot: TreeNode, node: TreeNode) {
    const viewPath = getPathToRoot(viewRoot);
    return zrUtil.indexOf(viewPath, node) >= 0;
}


// From root to the input node (the input node will be included).
export function wrapTreePathInfo<T = unknown>(node: TreeNode, seriesModel: SeriesModel) {
    const treePathInfo = [];

    while (node) {
        const nodeDataIndex = node.dataIndex;
        treePathInfo.push({
            name: node.name,
            dataIndex: nodeDataIndex,
            value: seriesModel.getRawValue(nodeDataIndex) as T
        });
        node = node.parentNode;
    }

    treePathInfo.reverse();

    return treePathInfo;
}
