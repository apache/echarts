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

import { TreeNode } from '../../data/Tree';

/**
 * Traverse the tree from bottom to top and do something
 */
function eachAfter<T>(
    root: TreeNode,
    callback: (node: TreeNode, separation: T) => void,
    separation: T
) {
    const nodes = [root];
    const next = [];
    let node;

    while (node = nodes.pop()) { // jshint ignore:line
        next.push(node);
        if (node.isExpand) {
            const children = node.children;
            if (children.length) {
                for (let i = 0; i < children.length; i++) {
                    nodes.push(children[i]);
                }
            }
        }
    }

    while (node = next.pop()) { // jshint ignore:line
        callback(node, separation);
    }
}

/**
 * Traverse the tree from top to bottom and do something
 */
function eachBefore(root: TreeNode, callback: (node: TreeNode) => void) {
    const nodes = [root];
    let node;
    while (node = nodes.pop()) { // jshint ignore:line
        callback(node);
        if (node.isExpand) {
            const children = node.children;
            if (children.length) {
                for (let i = children.length - 1; i >= 0; i--) {
                    nodes.push(children[i]);
                }
            }
        }
    }
}

export { eachAfter, eachBefore };