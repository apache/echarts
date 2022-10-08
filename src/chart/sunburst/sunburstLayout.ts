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

import { parsePercent } from '../../util/number';
import * as zrUtil from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SunburstSeriesModel, { SunburstSeriesOption } from './SunburstSeries';
import { TreeNode } from '../../data/Tree';

// let PI2 = Math.PI * 2;
const RADIAN = Math.PI / 180;

export default function sunburstLayout(
    seriesType: 'sunburst',
    ecModel: GlobalModel,
    api: ExtensionAPI
) {
    ecModel.eachSeriesByType(seriesType, function (seriesModel: SunburstSeriesModel) {
        let center = seriesModel.get('center');
        let radius = seriesModel.get('radius');

        if (!zrUtil.isArray(radius)) {
            radius = [0, radius];
        }
        if (!zrUtil.isArray(center)) {
            center = [center, center];
        }

        const width = api.getWidth();
        const height = api.getHeight();
        const size = Math.min(width, height);
        const cx = parsePercent(center[0], width);
        const cy = parsePercent(center[1], height);
        const r0 = parsePercent(radius[0], size / 2);
        const r = parsePercent(radius[1], size / 2);

        const startAngle = -seriesModel.get('startAngle') * RADIAN;
        const minAngle = seriesModel.get('minAngle') * RADIAN;

        const virtualRoot = seriesModel.getData().tree.root;
        const treeRoot = seriesModel.getViewRoot();
        const rootDepth = treeRoot.depth;

        const sort = seriesModel.get('sort');
        if (sort != null) {
            initChildren(treeRoot, sort);
        }

        let validDataCount = 0;
        zrUtil.each(treeRoot.children, function (child) {
            !isNaN(child.getValue() as number) && validDataCount++;
        });

        const sum = treeRoot.getValue() as number;
        // Sum may be 0
        const unitRadian = Math.PI / (sum || validDataCount) * 2;

        const renderRollupNode = treeRoot.depth > 0;
        const levels = treeRoot.height - (renderRollupNode ? -1 : 1);
        const rPerLevel = (r - r0) / (levels || 1);

        const clockwise = seriesModel.get('clockwise');

        const stillShowZeroSum = seriesModel.get('stillShowZeroSum');

        // In the case some sector angle is smaller than minAngle
        // let restAngle = PI2;
        // let valueSumLargerThanMinAngle = 0;

        const dir = clockwise ? 1 : -1;

        /**
         * Render a tree
         * @return increased angle
         */
        const renderNode = function (node: TreeNode, startAngle: number) {
            if (!node) {
                return;
            }

            let endAngle = startAngle;

            // Render self
            if (node !== virtualRoot) {
                // Tree node is virtual, so it doesn't need to be drawn
                const value = node.getValue() as number;

                let angle = (sum === 0 && stillShowZeroSum)
                    ? unitRadian : (value * unitRadian);
                if (angle < minAngle) {
                    angle = minAngle;
                    // restAngle -= minAngle;
                }
                // else {
                //     valueSumLargerThanMinAngle += value;
                // }

                endAngle = startAngle + dir * angle;

                const depth = node.depth - rootDepth
                    - (renderRollupNode ? -1 : 1);
                let rStart = r0 + rPerLevel * depth;
                let rEnd = r0 + rPerLevel * (depth + 1);

                const levelModel = seriesModel.getLevelModel(node);
                if (levelModel) {
                    let r0 = levelModel.get('r0', true);
                    let r = levelModel.get('r', true);
                    const radius = levelModel.get('radius', true);

                    if (radius != null) {
                        r0 = radius[0];
                        r = radius[1];
                    }

                    (r0 != null) && (rStart = parsePercent(r0, size / 2));
                    (r != null) && (rEnd = parsePercent(r, size / 2));
                }

                node.setLayout({
                    angle: angle,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    clockwise: clockwise,
                    cx: cx,
                    cy: cy,
                    r0: rStart,
                    r: rEnd
                });
            }

            // Render children
            if (node.children && node.children.length) {
                // currentAngle = startAngle;
                let siblingAngle = 0;
                zrUtil.each(node.children, function (node) {
                    siblingAngle += renderNode(node, startAngle + siblingAngle);
                });
            }

            return endAngle - startAngle;
        };

        // Virtual root node for roll up
        if (renderRollupNode) {
            const rStart = r0;
            const rEnd = r0 + rPerLevel;

            const angle = Math.PI * 2;
            virtualRoot.setLayout({
                angle: angle,
                startAngle: startAngle,
                endAngle: startAngle + angle,
                clockwise: clockwise,
                cx: cx,
                cy: cy,
                r0: rStart,
                r: rEnd
            });
        }

        renderNode(treeRoot, startAngle);
    });
}

/**
 * Init node children by order and update visual
 */
function initChildren(node: TreeNode, sortOrder?: SunburstSeriesOption['sort']) {
    const children = node.children || [];

    node.children = sort(children, sortOrder);

    // Init children recursively
    if (children.length) {
        zrUtil.each(node.children, function (child) {
            initChildren(child, sortOrder);
        });
    }
}

/**
 * Sort children nodes
 *
 * @param {TreeNode[]}               children children of node to be sorted
 * @param {string | function | null} sort sort method
 *                                   See SunburstSeries.js for details.
 */
function sort(children: TreeNode[], sortOrder: SunburstSeriesOption['sort']) {
    if (zrUtil.isFunction(sortOrder)) {
        const sortTargets = zrUtil.map(children, (child, idx) => {
            const value = child.getValue() as number;
            return {
                params: {
                    depth: child.depth,
                    height: child.height,
                    dataIndex: child.dataIndex,
                    getValue: () => value
                },
                index: idx
            };
        });
        sortTargets.sort((a, b) => {
            return sortOrder(a.params, b.params);
        });

        return zrUtil.map(sortTargets, (target) => {
            return children[target.index];
        });
    }
    else {
        const isAsc = sortOrder === 'asc';
        return children.sort(function (a, b) {
            const diff = ((a.getValue() as number) - (b.getValue() as number)) * (isAsc ? 1 : -1);
            return diff === 0
                ? (a.dataIndex - b.dataIndex) * (isAsc ? -1 : 1)
                : diff;
        });
    }
}
