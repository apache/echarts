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
import ExtensionAPI from '../../ExtensionAPI';
import SunburstSeriesModel, { SunburstSeriesNodeOption, SunburstSeriesOption } from './SunburstSeries';
import { TreeNode } from '../../data/Tree';

// let PI2 = Math.PI * 2;
const RADIAN = Math.PI / 180;

export default function (
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

        let width = api.getWidth();
        let height = api.getHeight();
        let size = Math.min(width, height);
        let cx = parsePercent(center[0], width);
        let cy = parsePercent(center[1], height);
        let r0 = parsePercent(radius[0], size / 2);
        let r = parsePercent(radius[1], size / 2);

        let startAngle = -seriesModel.get('startAngle') * RADIAN;
        let minAngle = seriesModel.get('minAngle') * RADIAN;

        let virtualRoot = seriesModel.getData().tree.root;
        let treeRoot = seriesModel.getViewRoot();
        let rootDepth = treeRoot.depth;

        let sort = seriesModel.get('sort');
        if (sort != null) {
            initChildren(treeRoot, sort);
        }

        let validDataCount = 0;
        zrUtil.each(treeRoot.children, function (child) {
            !isNaN(child.getValue() as number) && validDataCount++;
        });

        let sum = treeRoot.getValue() as number;
        // Sum may be 0
        let unitRadian = Math.PI / (sum || validDataCount) * 2;

        let renderRollupNode = treeRoot.depth > 0;
        let levels = treeRoot.height - (renderRollupNode ? -1 : 1);
        let rPerLevel = (r - r0) / (levels || 1);

        let clockwise = seriesModel.get('clockwise');

        let stillShowZeroSum = seriesModel.get('stillShowZeroSum');

        // In the case some sector angle is smaller than minAngle
        // let restAngle = PI2;
        // let valueSumLargerThanMinAngle = 0;

        let dir = clockwise ? 1 : -1;

        /**
         * Render a tree
         * @return increased angle
         */
        let renderNode = function (node: TreeNode, startAngle: number) {
            if (!node) {
                return;
            }

            let endAngle = startAngle;

            // Render self
            if (node !== virtualRoot) {
                // Tree node is virtual, so it doesn't need to be drawn
                let value = node.getValue() as number;

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

                let depth = node.depth - rootDepth
                    - (renderRollupNode ? -1 : 1);
                let rStart = r0 + rPerLevel * depth;
                let rEnd = r0 + rPerLevel * (depth + 1);

                let itemModel = node.getModel<SunburstSeriesNodeOption>();
                // @ts-ignore. TODO this is not provided to developer yet. Rename it.
                if (itemModel.get('r0') != null) {
                    // @ts-ignore
                    rStart = parsePercent(itemModel.get('r0'), size / 2);
                }
                // @ts-ignore
                if (itemModel.get('r') != null) {
                    // @ts-ignore
                    rEnd = parsePercent(itemModel.get('r'), size / 2);
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
            let rStart = r0;
            let rEnd = r0 + rPerLevel;

            let angle = Math.PI * 2;
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
    let children = node.children || [];

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
    if (typeof sortOrder === 'function') {
        return children.sort(sortOrder);
    }
    else {
        let isAsc = sortOrder === 'asc';
        return children.sort(function (a, b) {
            let diff = ((a.getValue() as number) - (b.getValue() as number)) * (isAsc ? 1 : -1);
            return diff === 0
                ? (a.dataIndex - b.dataIndex) * (isAsc ? -1 : 1)
                : diff;
        });
    }
}
