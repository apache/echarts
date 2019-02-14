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

/*
* The tree layout implementation references to d3.js
* (https://github.com/d3/d3-hierarchy). The use of the source
* code of this file is also subject to the terms and consitions
* of its license (BSD-3Clause, see <echarts/src/licenses/LICENSE-d3>).
*/

/**
 * @file The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *       the tree.
 * @see https://github.com/d3/d3-hierarchy
 */

import * as layout from '../../util/layout';

/**
 * Initialize all computational message for following algorithm
 * @param  {module:echarts/data/Tree~TreeNode} root   The virtual root of the tree
 */
export function init(root) {
    root.hierNode = {
        defaultAncestor: null,
        ancestor: root,
        prelim: 0,
        modifier: 0,
        change: 0,
        shift: 0,
        i: 0,
        thread: null
    };

    var nodes = [root];
    var node;
    var children;

    while (node = nodes.pop()) { // jshint ignore:line
        children = node.children;
        if (node.isExpand && children.length) {
            var n = children.length;
            for (var i = n - 1; i >= 0; i--) {
                var child = children[i];
                child.hierNode = {
                    defaultAncestor: null,
                    ancestor: child,
                    prelim: 0,
                    modifier: 0,
                    change: 0,
                    shift: 0,
                    i: i,
                    thread: null
                };
                nodes.push(child);
            }
        }
    }
}

/**
 * Computes a preliminary x coordinate for node. Before that, this function is
 * applied recursively to the children of node, as well as the function
 * apportion(). After spacing out the children by calling executeShifts(), the
 * node is placed to the midpoint of its outermost children.
 * @param  {module:echarts/data/Tree~TreeNode} node
 * @param {Function} separation
 */
export function firstWalk(node, separation) {
    var children = node.isExpand ? node.children : [];
    var siblings = node.parentNode.children;
    var subtreeW = node.hierNode.i ? siblings[node.hierNode.i - 1] : null;
    if (children.length) {
        executeShifts(node);
        var midPoint = (children[0].hierNode.prelim + children[children.length - 1].hierNode.prelim) / 2;
        if (subtreeW) {
            node.hierNode.prelim = subtreeW.hierNode.prelim + separation(node, subtreeW);
            node.hierNode.modifier = node.hierNode.prelim - midPoint;
        }
        else {
            node.hierNode.prelim = midPoint;
        }
    }
    else if (subtreeW) {
        node.hierNode.prelim = subtreeW.hierNode.prelim + separation(node, subtreeW);
    }
    node.parentNode.hierNode.defaultAncestor = apportion(
        node,
        subtreeW,
        node.parentNode.hierNode.defaultAncestor || siblings[0],
        separation
    );
}


/**
 * Computes all real x-coordinates by summing up the modifiers recursively.
 * @param  {module:echarts/data/Tree~TreeNode} node
 */
export function secondWalk(node) {
    var nodeX = node.hierNode.prelim + node.parentNode.hierNode.modifier;
    node.setLayout({x: nodeX}, true);
    node.hierNode.modifier += node.parentNode.hierNode.modifier;
}


export function separation(cb) {
    return arguments.length ? cb : defaultSeparation;
}

/**
 * Transform the common coordinate to radial coordinate
 * @param  {number} x
 * @param  {number} y
 * @return {Object}
 */
export function radialCoordinate(x, y) {
    var radialCoor = {};
    x -= Math.PI / 2;
    radialCoor.x = y * Math.cos(x);
    radialCoor.y = y * Math.sin(x);
    return radialCoor;
}

/**
 * Get the layout position of the whole view
 * @param {module:echarts/model/Series} seriesModel  the model object of sankey series
 * @param {module:echarts/ExtensionAPI} api  provide the API list that the developer can call
 * @return {module:zrender/core/BoundingRect}  size of rect to draw the sankey view
 */
export function getViewRect(seriesModel, api) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

/**
 * All other shifts, applied to the smaller subtrees between w- and w+, are
 * performed by this function.
 * @param  {module:echarts/data/Tree~TreeNode} node
 */
function executeShifts(node) {
    var children = node.children;
    var n = children.length;
    var shift = 0;
    var change = 0;
    while (--n >= 0) {
        var child = children[n];
        child.hierNode.prelim += shift;
        child.hierNode.modifier += shift;
        change += child.hierNode.change;
        shift += child.hierNode.shift + change;
    }
}

/**
 * The core of the algorithm. Here, a new subtree is combined with the
 * previous subtrees. Threads are used to traverse the inside and outside
 * contours of the left and right subtree up to the highest common level.
 * Whenever two nodes of the inside contours conflict, we compute the left
 * one of the greatest uncommon ancestors using the function nextAncestor()
 * and call moveSubtree() to shift the subtree and prepare the shifts of
 * smaller subtrees. Finally, we add a new thread (if necessary).
 * @param  {module:echarts/data/Tree~TreeNode} subtreeV
 * @param  {module:echarts/data/Tree~TreeNode} subtreeW
 * @param  {module:echarts/data/Tree~TreeNode} ancestor
 * @param  {Function} separation
 * @return {module:echarts/data/Tree~TreeNode}
 */
function apportion(subtreeV, subtreeW, ancestor, separation) {

    if (subtreeW) {
        var nodeOutRight = subtreeV;
        var nodeInRight = subtreeV;
        var nodeOutLeft = nodeInRight.parentNode.children[0];
        var nodeInLeft = subtreeW;

        var sumOutRight = nodeOutRight.hierNode.modifier;
        var sumInRight = nodeInRight.hierNode.modifier;
        var sumOutLeft = nodeOutLeft.hierNode.modifier;
        var sumInLeft = nodeInLeft.hierNode.modifier;

        while (nodeInLeft = nextRight(nodeInLeft), nodeInRight = nextLeft(nodeInRight), nodeInLeft && nodeInRight) {
            nodeOutRight = nextRight(nodeOutRight);
            nodeOutLeft = nextLeft(nodeOutLeft);
            nodeOutRight.hierNode.ancestor = subtreeV;
            var shift = nodeInLeft.hierNode.prelim + sumInLeft - nodeInRight.hierNode.prelim
                    - sumInRight + separation(nodeInLeft, nodeInRight);
            if (shift > 0) {
                moveSubtree(nextAncestor(nodeInLeft, subtreeV, ancestor), subtreeV, shift);
                sumInRight += shift;
                sumOutRight += shift;
            }
            sumInLeft += nodeInLeft.hierNode.modifier;
            sumInRight += nodeInRight.hierNode.modifier;
            sumOutRight += nodeOutRight.hierNode.modifier;
            sumOutLeft += nodeOutLeft.hierNode.modifier;
        }
        if (nodeInLeft && !nextRight(nodeOutRight)) {
            nodeOutRight.hierNode.thread = nodeInLeft;
            nodeOutRight.hierNode.modifier += sumInLeft - sumOutRight;

        }
        if (nodeInRight && !nextLeft(nodeOutLeft)) {
            nodeOutLeft.hierNode.thread = nodeInRight;
            nodeOutLeft.hierNode.modifier += sumInRight - sumOutLeft;
            ancestor = subtreeV;
        }
    }
    return ancestor;
}

/**
 * This function is used to traverse the right contour of a subtree.
 * It returns the rightmost child of node or the thread of node. The function
 * returns null if and only if node is on the highest depth of its subtree.
 * @param  {module:echarts/data/Tree~TreeNode} node
 * @return {module:echarts/data/Tree~TreeNode}
 */
function nextRight(node) {
    var children = node.children;
    return children.length && node.isExpand ? children[children.length - 1] : node.hierNode.thread;
}

/**
 * This function is used to traverse the left contour of a subtree (or a subforest).
 * It returns the leftmost child of node or the thread of node. The function
 * returns null if and only if node is on the highest depth of its subtree.
 * @param  {module:echarts/data/Tree~TreeNode} node
 * @return {module:echarts/data/Tree~TreeNode}
 */
function nextLeft(node) {
    var children = node.children;
    return children.length && node.isExpand ? children[0] : node.hierNode.thread;
}

/**
 * If nodeInLeft’s ancestor is a sibling of node, returns nodeInLeft’s ancestor.
 * Otherwise, returns the specified ancestor.
 * @param  {module:echarts/data/Tree~TreeNode} nodeInLeft
 * @param  {module:echarts/data/Tree~TreeNode} node
 * @param  {module:echarts/data/Tree~TreeNode} ancestor
 * @return {module:echarts/data/Tree~TreeNode}
 */
function nextAncestor(nodeInLeft, node, ancestor) {
    return nodeInLeft.hierNode.ancestor.parentNode === node.parentNode
        ? nodeInLeft.hierNode.ancestor : ancestor;
}

/**
 * Shifts the current subtree rooted at wr. This is done by increasing prelim(w+) and modifier(w+) by shift.
 * @param  {module:echarts/data/Tree~TreeNode} wl
 * @param  {module:echarts/data/Tree~TreeNode} wr
 * @param  {number} shift [description]
 */
function moveSubtree(wl, wr, shift) {
    var change = shift / (wr.hierNode.i - wl.hierNode.i);
    wr.hierNode.change -= change;
    wr.hierNode.shift += shift;
    wr.hierNode.modifier += shift;
    wr.hierNode.prelim += shift;
    wl.hierNode.change += change;
}

function defaultSeparation(node1, node2) {
    return node1.parentNode === node2.parentNode ? 1 : 2;
}
