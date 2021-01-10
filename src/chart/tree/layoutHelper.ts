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
* A third-party license is embeded for some of the code in this file:
* The tree layoutHelper implementation was originally copied from
* "d3.js"(https://github.com/d3/d3-hierarchy) with
* some modifications made for this project.
* (see more details in the comment of the specific method below.)
* The use of the source code of this file is also subject to the terms
* and consitions of the licence of "d3.js" (BSD-3Clause, see
* </licenses/LICENSE-d3>).
*/

/**
 * @file The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *       the tree.
 */

import * as layout from '../../util/layout';
import { TreeNode } from '../../data/Tree';
import TreeSeriesModel from './TreeSeries';
import ExtensionAPI from '../../core/ExtensionAPI';

interface HierNode {
    defaultAncestor: TreeLayoutNode,
    ancestor: TreeLayoutNode,
    prelim: number,
    modifier: number,
    change: number,
    shift: number,
    i: number,
    thread: TreeLayoutNode
}

export interface TreeLayoutNode extends TreeNode {
    parentNode: TreeLayoutNode
    hierNode: HierNode
    children: TreeLayoutNode[]
}
/**
 * Initialize all computational message for following algorithm.
 */
export function init(inRoot: TreeNode) {
    const root = inRoot as TreeLayoutNode;
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

    const nodes = [root];
    let node;
    let children;

    while (node = nodes.pop()) { // jshint ignore:line
        children = node.children;
        if (node.isExpand && children.length) {
            const n = children.length;
            for (let i = n - 1; i >= 0; i--) {
                const child = children[i];
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
 * The implementation of this function was originally copied from "d3.js"
 * <https://github.com/d3/d3-hierarchy/blob/4c1f038f2725d6eae2e49b61d01456400694bac4/src/tree.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 *
 * Computes a preliminary x coordinate for node. Before that, this function is
 * applied recursively to the children of node, as well as the function
 * apportion(). After spacing out the children by calling executeShifts(), the
 * node is placed to the midpoint of its outermost children.
 */
export function firstWalk(node: TreeLayoutNode, separation: SeparationFunc) {
    const children = node.isExpand ? node.children : [];
    const siblings = node.parentNode.children;
    const subtreeW = node.hierNode.i ? siblings[node.hierNode.i - 1] : null;
    if (children.length) {
        executeShifts(node);
        const midPoint = (children[0].hierNode.prelim + children[children.length - 1].hierNode.prelim) / 2;
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
 * The implementation of this function was originally copied from "d3.js"
 * <https://github.com/d3/d3-hierarchy/blob/4c1f038f2725d6eae2e49b61d01456400694bac4/src/tree.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 *
 * Computes all real x-coordinates by summing up the modifiers recursively.
 */
export function secondWalk(node: TreeLayoutNode) {
    const nodeX = node.hierNode.prelim + node.parentNode.hierNode.modifier;
    node.setLayout({x: nodeX}, true);
    node.hierNode.modifier += node.parentNode.hierNode.modifier;
}


export function separation(cb?: SeparationFunc) {
    return arguments.length ? cb : defaultSeparation;
}

/**
 * Transform the common coordinate to radial coordinate.
 */
export function radialCoordinate(rad: number, r: number) {
    rad -= Math.PI / 2;
    return {
        x: r * Math.cos(rad),
        y: r * Math.sin(rad)
    };
}

/**
 * Get the layout position of the whole view.
 */
export function getViewRect(seriesModel: TreeSeriesModel, api: ExtensionAPI) {
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
 *
 * The implementation of this function was originally copied from "d3.js"
 * <https://github.com/d3/d3-hierarchy/blob/4c1f038f2725d6eae2e49b61d01456400694bac4/src/tree.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 */
function executeShifts(node: TreeLayoutNode) {
    const children = node.children;
    let n = children.length;
    let shift = 0;
    let change = 0;
    while (--n >= 0) {
        const child = children[n];
        child.hierNode.prelim += shift;
        child.hierNode.modifier += shift;
        change += child.hierNode.change;
        shift += child.hierNode.shift + change;
    }
}

/**
 * The implementation of this function was originally copied from "d3.js"
 * <https://github.com/d3/d3-hierarchy/blob/4c1f038f2725d6eae2e49b61d01456400694bac4/src/tree.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 *
 * The core of the algorithm. Here, a new subtree is combined with the
 * previous subtrees. Threads are used to traverse the inside and outside
 * contours of the left and right subtree up to the highest common level.
 * Whenever two nodes of the inside contours conflict, we compute the left
 * one of the greatest uncommon ancestors using the function nextAncestor()
 * and call moveSubtree() to shift the subtree and prepare the shifts of
 * smaller subtrees. Finally, we add a new thread (if necessary).
 */
function apportion(
    subtreeV: TreeLayoutNode,
    subtreeW: TreeLayoutNode,
    ancestor: TreeLayoutNode,
    separation: SeparationFunc
): TreeLayoutNode {

    if (subtreeW) {
        let nodeOutRight = subtreeV;
        let nodeInRight = subtreeV;
        let nodeOutLeft = nodeInRight.parentNode.children[0];
        let nodeInLeft = subtreeW;

        let sumOutRight = nodeOutRight.hierNode.modifier;
        let sumInRight = nodeInRight.hierNode.modifier;
        let sumOutLeft = nodeOutLeft.hierNode.modifier;
        let sumInLeft = nodeInLeft.hierNode.modifier;

        while (nodeInLeft = nextRight(nodeInLeft), nodeInRight = nextLeft(nodeInRight), nodeInLeft && nodeInRight) {
            nodeOutRight = nextRight(nodeOutRight);
            nodeOutLeft = nextLeft(nodeOutLeft);
            nodeOutRight.hierNode.ancestor = subtreeV;
            const shift = nodeInLeft.hierNode.prelim + sumInLeft - nodeInRight.hierNode.prelim
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
 */
function nextRight(node: TreeLayoutNode): TreeLayoutNode {
    const children = node.children;
    return children.length && node.isExpand ? children[children.length - 1] : node.hierNode.thread;
}

/**
 * This function is used to traverse the left contour of a subtree (or a subforest).
 * It returns the leftmost child of node or the thread of node. The function
 * returns null if and only if node is on the highest depth of its subtree.
 */
function nextLeft(node: TreeLayoutNode) {
    const children = node.children;
    return children.length && node.isExpand ? children[0] : node.hierNode.thread;
}

/**
 * If nodeInLeft’s ancestor is a sibling of node, returns nodeInLeft’s ancestor.
 * Otherwise, returns the specified ancestor.
 */
function nextAncestor(
    nodeInLeft: TreeLayoutNode,
    node: TreeLayoutNode,
    ancestor: TreeLayoutNode
): TreeLayoutNode {
    return nodeInLeft.hierNode.ancestor.parentNode === node.parentNode
        ? nodeInLeft.hierNode.ancestor : ancestor;
}

/**
 * The implementation of this function was originally copied from "d3.js"
 * <https://github.com/d3/d3-hierarchy/blob/4c1f038f2725d6eae2e49b61d01456400694bac4/src/tree.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 *
 * Shifts the current subtree rooted at wr.
 * This is done by increasing prelim(w+) and modifier(w+) by shift.
 */
function moveSubtree(
    wl: TreeLayoutNode,
    wr: TreeLayoutNode,
    shift: number
) {
    const change = shift / (wr.hierNode.i - wl.hierNode.i);
    wr.hierNode.change -= change;
    wr.hierNode.shift += shift;
    wr.hierNode.modifier += shift;
    wr.hierNode.prelim += shift;
    wl.hierNode.change += change;
}

/**
 * The implementation of this function was originally copied from "d3.js"
 * <https://github.com/d3/d3-hierarchy/blob/4c1f038f2725d6eae2e49b61d01456400694bac4/src/tree.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 */
function defaultSeparation(node1: TreeLayoutNode, node2: TreeLayoutNode): number {
    return node1.parentNode === node2.parentNode ? 1 : 2;
}

interface SeparationFunc {
    (node1: TreeLayoutNode, node2: TreeLayoutNode): number
}