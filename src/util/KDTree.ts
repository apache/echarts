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

import quickSelect from './quickSelect';
import { VectorArray } from 'zrender/src/core/vector';

type KDTreePoint = {
    array: VectorArray
};

class KDTreeNode<T> {

    left: KDTreeNode<T>;
    right: KDTreeNode<T>;

    axis: number;
    data: T;

    constructor(axis: number, data: T) {
        this.axis = axis;
        this.data = data;
    }
}

/**
 * @constructor
 * @alias module:echarts/data/KDTree
 * @param {Array} points List of points.
 * each point needs an array property to represent the actual data
 * @param {Number} [dimension]
 *        Point dimension.
 *        Default will use the first point's length as dimension.
 */

class KDTree<T extends KDTreePoint> {

    dimension: number;
    root: KDTreeNode<T>;

    // Use one stack to avoid allocation
    // each time searching the nearest point
    private _stack: KDTreeNode<T>[] = [];
    // Again avoid allocating a new array
    // each time searching nearest N points
    private _nearstNList: {
        dist: number,
        node: KDTreeNode<T>
    }[] = [];

    constructor(points: T[], dimension?: number) {
        if (!points.length) {
            return;
        }

        if (!dimension) {
            dimension = points[0].array.length;
        }
        this.dimension = dimension;
        this.root = this._buildTree(points, 0, points.length - 1, 0);
    }

    /**
     * Recursively build the tree.
     */
    private _buildTree(points: T[], left: number, right: number, axis: number): KDTreeNode<T> {
        if (right < left) {
            return null;
        }

        let medianIndex = Math.floor((left + right) / 2);
        medianIndex = quickSelect(
            points, left, right, medianIndex,
            function (a: T, b: T) {
                return a.array[axis] - b.array[axis];
            }
        );
        const median = points[medianIndex];

        const node = new KDTreeNode(axis, median);

        axis = (axis + 1) % this.dimension;
        if (right > left) {
            node.left = this._buildTree(points, left, medianIndex - 1, axis);
            node.right = this._buildTree(points, medianIndex + 1, right, axis);
        }

        return node;
    };

    /**
     * Find nearest point
     * @param  target Target point
     * @param  squaredDistance Squared distance function
     * @return Nearest point
     */
    nearest(target: T, squaredDistance: (a: T, b: T) => number) {
        let curr = this.root;
        const stack = this._stack;
        let idx = 0;
        let minDist = Infinity;
        let nearestNode = null;
        if (curr.data !== target) {
            minDist = squaredDistance(curr.data, target);
            nearestNode = curr;
        }

        if (target.array[curr.axis] < curr.data.array[curr.axis]) {
            // Left first
            curr.right && (stack[idx++] = curr.right);
            curr.left && (stack[idx++] = curr.left);
        }
        else {
            // Right first
            curr.left && (stack[idx++] = curr.left);
            curr.right && (stack[idx++] = curr.right);
        }

        while (idx--) {
            curr = stack[idx];
            let currDist = target.array[curr.axis] - curr.data.array[curr.axis];
            const isLeft = currDist < 0;
            let needsCheckOtherSide = false;
            currDist = currDist * currDist;
            // Intersecting right hyperplane with minDist hypersphere
            if (currDist < minDist) {
                currDist = squaredDistance(curr.data, target);
                if (currDist < minDist && curr.data !== target) {
                    minDist = currDist;
                    nearestNode = curr;
                }
                needsCheckOtherSide = true;
            }
            if (isLeft) {
                if (needsCheckOtherSide) {
                    curr.right && (stack[idx++] = curr.right);
                }
                // Search in the left area
                curr.left && (stack[idx++] = curr.left);
            }
            else {
                if (needsCheckOtherSide) {
                    curr.left && (stack[idx++] = curr.left);
                }
                // Search the right area
                curr.right && (stack[idx++] = curr.right);
            }
        }

        return nearestNode.data;
    };

    _addNearest(found: number, dist: number, node: KDTreeNode<T>) {
        const nearestNList = this._nearstNList;
        let i = found - 1;
        // Insert to the right position
        // Sort from small to large
        for (; i > 0; i--) {
            if (dist >= nearestNList[i - 1].dist) {
                break;
            }
            else {
                nearestNList[i].dist = nearestNList[i - 1].dist;
                nearestNList[i].node = nearestNList[i - 1].node;
            }
        }

        nearestNList[i].dist = dist;
        nearestNList[i].node = node;
    };

    /**
     * Find nearest N points
     * @param  target Target point
     * @param  N
     * @param  squaredDistance Squared distance function
     * @param  output Output nearest N points
     */
    nearestN(
        target: T,
        N: number,
        squaredDistance: (a: T, b: T) => number,
        output: T[]
    ) {
        if (N <= 0) {
            output.length = 0;
            return output;
        }

        let curr = this.root;
        const stack = this._stack;
        let idx = 0;

        const nearestNList = this._nearstNList;
        for (let i = 0; i < N; i++) {
            // Allocate
            if (!nearestNList[i]) {
                nearestNList[i] = {
                    dist: 0, node: null
                };
            }
            nearestNList[i].dist = 0;
            nearestNList[i].node = null;
        }
        const currDist = squaredDistance(curr.data, target);

        let found = 0;
        if (curr.data !== target) {
            found++;
            this._addNearest(found, currDist, curr);
        }

        if (target.array[curr.axis] < curr.data.array[curr.axis]) {
            // Left first
            curr.right && (stack[idx++] = curr.right);
            curr.left && (stack[idx++] = curr.left);
        }
        else {
            // Right first
            curr.left && (stack[idx++] = curr.left);
            curr.right && (stack[idx++] = curr.right);
        }

        while (idx--) {
            curr = stack[idx];
            let currDist = target.array[curr.axis] - curr.data.array[curr.axis];
            const isLeft = currDist < 0;
            let needsCheckOtherSide = false;
            currDist = currDist * currDist;
            // Intersecting right hyperplane with minDist hypersphere
            if (found < N || currDist < nearestNList[found - 1].dist) {
                currDist = squaredDistance(curr.data, target);
                if (
                    (found < N || currDist < nearestNList[found - 1].dist)
                    && curr.data !== target
                ) {
                    if (found < N) {
                        found++;
                    }
                    this._addNearest(found, currDist, curr);
                }
                needsCheckOtherSide = true;
            }
            if (isLeft) {
                if (needsCheckOtherSide) {
                    curr.right && (stack[idx++] = curr.right);
                }
                // Search in the left area
                curr.left && (stack[idx++] = curr.left);
            }
            else {
                if (needsCheckOtherSide) {
                    curr.left && (stack[idx++] = curr.left);
                }
                // Search the right area
                curr.right && (stack[idx++] = curr.right);
            }
        }

        // Copy to output
        for (let i = 0; i < found; i++) {
            output[i] = nearestNList[i].node.data;
        }
        output.length = found;

        return output;
    }

}


export default KDTree;
