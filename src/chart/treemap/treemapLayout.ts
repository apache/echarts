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
* A third-party license is embedded for some of the code in this file:
* The treemap layout implementation was originally copied from
* "d3.js" with some modifications made for this project.
* (See more details in the comment of the method "squarify" below.)
* The use of the source code of this file is also subject to the terms
* and consitions of the license of "d3.js" (BSD-3Clause, see
* </licenses/LICENSE-d3>).
*/

import * as zrUtil from 'zrender/src/core/util';
import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';
import {parsePercent, MAX_SAFE_INTEGER} from '../../util/number';
import * as layout from '../../util/layout';
import * as helper from '../helper/treeHelper';
import TreemapSeriesModel, { TreemapSeriesNodeItemOption } from './TreemapSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { TreeNode } from '../../data/Tree';
import Model from '../../model/Model';
import { TreemapRenderPayload, TreemapMovePayload, TreemapZoomToNodePayload } from './treemapAction';

const mathMax = Math.max;
const mathMin = Math.min;
const retrieveValue = zrUtil.retrieve;
const each = zrUtil.each;

const PATH_BORDER_WIDTH = ['itemStyle', 'borderWidth'] as const;
const PATH_GAP_WIDTH = ['itemStyle', 'gapWidth'] as const;
const PATH_UPPER_LABEL_SHOW = ['upperLabel', 'show'] as const;
const PATH_UPPER_LABEL_HEIGHT = ['upperLabel', 'height'] as const;

export interface TreemapLayoutNode extends TreeNode {
    parentNode: TreemapLayoutNode
    children: TreemapLayoutNode[]
    viewChildren: TreemapLayoutNode[]
}

export interface TreemapItemLayout extends RectLike {
    area: number
    isLeafRoot: boolean
    dataExtent: [number, number]

    borderWidth: number
    upperHeight: number
    upperLabelHeight: number

    isInView: boolean
    invisible: boolean

    isAboveViewRoot: boolean
};

type NodeModel = Model<TreemapSeriesNodeItemOption>;

type OrderBy = 'asc' | 'desc' | boolean;

type LayoutRow = TreemapLayoutNode[] & {
    area: number
};
/**
 * @public
 */
export default {
    seriesType: 'treemap',
    reset: function (
        seriesModel: TreemapSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload?: TreemapZoomToNodePayload | TreemapRenderPayload | TreemapMovePayload
    ) {
        // Layout result in each node:
        // {x, y, width, height, area, borderWidth}
        const ecWidth = api.getWidth();
        const ecHeight = api.getHeight();
        const seriesOption = seriesModel.option;

        const layoutInfo = layout.getLayoutRect(
            seriesModel.getBoxLayoutParams(),
            {
                width: api.getWidth(),
                height: api.getHeight()
            }
        );

        const size = seriesOption.size || []; // Compatible with ec2.
        const containerWidth = parsePercent(
            retrieveValue(layoutInfo.width, size[0]),
            ecWidth
        );
        const containerHeight = parsePercent(
            retrieveValue(layoutInfo.height, size[1]),
            ecHeight
        );

        // Fetch payload info.
        const payloadType = payload && payload.type;
        const types = ['treemapZoomToNode', 'treemapRootToNode'];
        const targetInfo = helper
            .retrieveTargetInfo(payload, types, seriesModel);
        const rootRect = (payloadType === 'treemapRender' || payloadType === 'treemapMove')
            ? payload.rootRect : null;
        const viewRoot = seriesModel.getViewRoot();
        const viewAbovePath = helper.getPathToRoot(viewRoot) as TreemapLayoutNode[];

        if (payloadType !== 'treemapMove') {
            const rootSize = payloadType === 'treemapZoomToNode'
                ? estimateRootSize(
                    seriesModel, targetInfo, viewRoot, containerWidth, containerHeight
                )
                : rootRect
                ? [rootRect.width, rootRect.height]
                : [containerWidth, containerHeight];

            let sort = seriesOption.sort;
            if (sort && sort !== 'asc' && sort !== 'desc') {
                // Default to be desc order.
                sort = 'desc';
            }
            const options = {
                squareRatio: seriesOption.squareRatio,
                sort: sort,
                leafDepth: seriesOption.leafDepth
            };

            // layout should be cleared because using updateView but not update.
            viewRoot.hostTree.clearLayouts();

            // TODO
            // optimize: if out of view clip, do not layout.
            // But take care that if do not render node out of view clip,
            // how to calculate start po

            let viewRootLayout = {
                x: 0,
                y: 0,
                width: rootSize[0],
                height: rootSize[1],
                area: rootSize[0] * rootSize[1]
            };
            viewRoot.setLayout(viewRootLayout);

            squarify(viewRoot, options, false, 0);
            // Supplement layout.
            viewRootLayout = viewRoot.getLayout();
            each(viewAbovePath, function (node, index) {
                const childValue = (viewAbovePath[index + 1] || viewRoot).getValue();
                node.setLayout(zrUtil.extend(
                    {
                        dataExtent: [childValue, childValue],
                        borderWidth: 0,
                        upperHeight: 0
                    },
                    viewRootLayout
                ));
            });
        }

        const treeRoot = seriesModel.getData().tree.root;

        treeRoot.setLayout(
            calculateRootPosition(layoutInfo, rootRect, targetInfo),
            true
        );

        seriesModel.setLayoutInfo(layoutInfo);

        // FIXME
        // 现在没有clip功能，暂时取ec高宽。
        prunning(
            treeRoot,
            // Transform to base element coordinate system.
            new BoundingRect(-layoutInfo.x, -layoutInfo.y, ecWidth, ecHeight),
            viewAbovePath,
            viewRoot,
            0
        );
    }
};

/**
 * Layout treemap with squarify algorithm.
 * The original presentation of this algorithm
 * was made by Mark Bruls, Kees Huizing, and Jarke J. van Wijk
 * <https://graphics.ethz.ch/teaching/scivis_common/Literature/squarifiedTreeMaps.pdf>.
 * The implementation of this algorithm was originally copied from "d3.js"
 * <https://github.com/d3/d3/blob/9cc9a875e636a1dcf36cc1e07bdf77e1ad6e2c74/src/layout/treemap.js>
 * with some modifications made for this program.
 * See the license statement at the head of this file.
 *
 * @protected
 * @param {module:echarts/data/Tree~TreeNode} node
 * @param {Object} options
 * @param {string} options.sort 'asc' or 'desc'
 * @param {number} options.squareRatio
 * @param {boolean} hideChildren
 * @param {number} depth
 */
function squarify(
    node: TreemapLayoutNode,
    options: {
        sort?: OrderBy
        squareRatio?: number
        leafDepth?: number
    },
    hideChildren: boolean,
    depth: number
) {
    let width;
    let height;

    if (node.isRemoved()) {
        return;
    }

    const thisLayout = node.getLayout();
    width = thisLayout.width;
    height = thisLayout.height;

    // Considering border and gap
    const nodeModel = node.getModel<TreemapSeriesNodeItemOption>();
    const borderWidth = nodeModel.get(PATH_BORDER_WIDTH);
    const halfGapWidth = nodeModel.get(PATH_GAP_WIDTH) / 2;
    const upperLabelHeight = getUpperLabelHeight(nodeModel);
    const upperHeight = Math.max(borderWidth, upperLabelHeight);
    const layoutOffset = borderWidth - halfGapWidth;
    const layoutOffsetUpper = upperHeight - halfGapWidth;

    node.setLayout({
        borderWidth: borderWidth,
        upperHeight: upperHeight,
        upperLabelHeight: upperLabelHeight
    }, true);

    width = mathMax(width - 2 * layoutOffset, 0);
    height = mathMax(height - layoutOffset - layoutOffsetUpper, 0);

    const totalArea = width * height;
    const viewChildren = initChildren(
        node, nodeModel, totalArea, options, hideChildren, depth
    );

    if (!viewChildren.length) {
        return;
    }

    const rect = {x: layoutOffset, y: layoutOffsetUpper, width: width, height: height};
    let rowFixedLength = mathMin(width, height);
    let best = Infinity; // the best row score so far
    const row = [] as LayoutRow;
    row.area = 0;

    for (let i = 0, len = viewChildren.length; i < len;) {
        const child = viewChildren[i];

        row.push(child);
        row.area += child.getLayout().area;
        const score = worst(row, rowFixedLength, options.squareRatio);

        // continue with this orientation
        if (score <= best) {
            i++;
            best = score;
        }
        // abort, and try a different orientation
        else {
            row.area -= row.pop().getLayout().area;
            position(row, rowFixedLength, rect, halfGapWidth, false);
            rowFixedLength = mathMin(rect.width, rect.height);
            row.length = row.area = 0;
            best = Infinity;
        }
    }

    if (row.length) {
        position(row, rowFixedLength, rect, halfGapWidth, true);
    }

    if (!hideChildren) {
        const childrenVisibleMin = nodeModel.get('childrenVisibleMin');
        if (childrenVisibleMin != null && totalArea < childrenVisibleMin) {
            hideChildren = true;
        }
    }

    for (let i = 0, len = viewChildren.length; i < len; i++) {
        squarify(viewChildren[i], options, hideChildren, depth + 1);
    }
}

/**
 * Set area to each child, and calculate data extent for visual coding.
 */
function initChildren(
    node: TreemapLayoutNode,
    nodeModel: NodeModel,
    totalArea: number,
    options: {
        sort?: OrderBy
        leafDepth?: number
    },
    hideChildren: boolean,
    depth: number
) {
    let viewChildren = node.children || [];
    let orderBy = options.sort;
    orderBy !== 'asc' && orderBy !== 'desc' && (orderBy = null);

    const overLeafDepth = options.leafDepth != null && options.leafDepth <= depth;

    // leafDepth has higher priority.
    if (hideChildren && !overLeafDepth) {
        return (node.viewChildren = []);
    }

    // Sort children, order by desc.
    viewChildren = zrUtil.filter(viewChildren, function (child) {
        return !child.isRemoved();
    });

    sort(viewChildren, orderBy);

    const info = statistic(nodeModel, viewChildren, orderBy);

    if (info.sum === 0) {
        return (node.viewChildren = []);
    }

    info.sum = filterByThreshold(nodeModel, totalArea, info.sum, orderBy, viewChildren);

    if (info.sum === 0) {
        return (node.viewChildren = []);
    }

    // Set area to each child.
    for (let i = 0, len = viewChildren.length; i < len; i++) {
        const area = viewChildren[i].getValue() as number / info.sum * totalArea;
        // Do not use setLayout({...}, true), because it is needed to clear last layout.
        viewChildren[i].setLayout({
            area: area
        });
    }

    if (overLeafDepth) {
        viewChildren.length && node.setLayout({
            isLeafRoot: true
        }, true);
        viewChildren.length = 0;
    }

    node.viewChildren = viewChildren;
    node.setLayout({
        dataExtent: info.dataExtent
    }, true);

    return viewChildren;
}

/**
 * Consider 'visibleMin'. Modify viewChildren and get new sum.
 */
function filterByThreshold(
    nodeModel: NodeModel,
    totalArea: number,
    sum: number,
    orderBy: OrderBy,
    orderedChildren: TreemapLayoutNode[]
) {

    // visibleMin is not supported yet when no option.sort.
    if (!orderBy) {
        return sum;
    }

    const visibleMin = nodeModel.get('visibleMin');
    const len = orderedChildren.length;
    let deletePoint = len;

    // Always travel from little value to big value.
    for (let i = len - 1; i >= 0; i--) {
        const value = orderedChildren[
            orderBy === 'asc' ? len - i - 1 : i
        ].getValue() as number;

        if (value / sum * totalArea < visibleMin) {
            deletePoint = i;
            sum -= value;
        }
    }

    orderBy === 'asc'
        ? orderedChildren.splice(0, len - deletePoint)
        : orderedChildren.splice(deletePoint, len - deletePoint);

    return sum;
}

/**
 * Sort
 */
function sort(
    viewChildren: TreemapLayoutNode[],
    orderBy: OrderBy
) {
    if (orderBy) {
        viewChildren.sort(function (a, b) {
            const diff = orderBy === 'asc'
                ? a.getValue() as number - (b.getValue() as number)
                : b.getValue() as number - (a.getValue() as number);
            return diff === 0
                ? (orderBy === 'asc'
                    ? a.dataIndex - b.dataIndex : b.dataIndex - a.dataIndex
                )
                : diff;
        });
    }
    return viewChildren;
}

/**
 * Statistic
 */
function statistic(
    nodeModel: NodeModel,
    children: TreemapLayoutNode[],
    orderBy: OrderBy
) {
    // Calculate sum.
    let sum = 0;
    for (let i = 0, len = children.length; i < len; i++) {
        sum += children[i].getValue() as number;
    }

    // Statistic data extent for latter visual coding.
    // Notice: data extent should be calculate based on raw children
    // but not filtered view children, otherwise visual mapping will not
    // be stable when zoom (where children is filtered by visibleMin).

    const dimension = nodeModel.get('visualDimension');
    let dataExtent: number[];

    // The same as area dimension.
    if (!children || !children.length) {
        dataExtent = [NaN, NaN];
    }
    else if (dimension === 'value' && orderBy) {
        dataExtent = [
            children[children.length - 1].getValue() as number,
            children[0].getValue() as number
        ];
        orderBy === 'asc' && dataExtent.reverse();
    }
    // Other dimension.
    else {
        dataExtent = [Infinity, -Infinity];
        each(children, function (child) {
            const value = child.getValue(dimension) as number;
            value < dataExtent[0] && (dataExtent[0] = value);
            value > dataExtent[1] && (dataExtent[1] = value);
        });
    }

    return {sum: sum, dataExtent: dataExtent};
}

/**
 * Computes the score for the specified row,
 * as the worst aspect ratio.
 */
function worst(row: LayoutRow, rowFixedLength: number, ratio: number) {
    let areaMax = 0;
    let areaMin = Infinity;

    for (let i = 0, area, len = row.length; i < len; i++) {
        area = row[i].getLayout().area;
        if (area) {
            area < areaMin && (areaMin = area);
            area > areaMax && (areaMax = area);
        }
    }

    const squareArea = row.area * row.area;
    const f = rowFixedLength * rowFixedLength * ratio;

    return squareArea
        ? mathMax(
            (f * areaMax) / squareArea,
            squareArea / (f * areaMin)
        )
        : Infinity;
}

/**
 * Positions the specified row of nodes. Modifies `rect`.
 */
function position(
    row: LayoutRow,
    rowFixedLength: number,
    rect: RectLike,
    halfGapWidth: number,
    flush?: boolean
) {
    // When rowFixedLength === rect.width,
    // it is horizontal subdivision,
    // rowFixedLength is the width of the subdivision,
    // rowOtherLength is the height of the subdivision,
    // and nodes will be positioned from left to right.

    // wh[idx0WhenH] means: when horizontal,
    //      wh[idx0WhenH] => wh[0] => 'width'.
    //      xy[idx1WhenH] => xy[1] => 'y'.
    const idx0WhenH = rowFixedLength === rect.width ? 0 : 1;
    const idx1WhenH = 1 - idx0WhenH;
    const xy = ['x', 'y'] as const;
    const wh = ['width', 'height'] as const;

    let last = rect[xy[idx0WhenH]];
    let rowOtherLength = rowFixedLength
        ? row.area / rowFixedLength : 0;

    if (flush || rowOtherLength > rect[wh[idx1WhenH]]) {
        rowOtherLength = rect[wh[idx1WhenH]]; // over+underflow
    }
    for (let i = 0, rowLen = row.length; i < rowLen; i++) {
        const node = row[i];
        const nodeLayout = {} as TreemapItemLayout;
        const step = rowOtherLength
            ? node.getLayout().area / rowOtherLength : 0;

        const wh1 = nodeLayout[wh[idx1WhenH]] = mathMax(rowOtherLength - 2 * halfGapWidth, 0);

        // We use Math.max/min to avoid negative width/height when considering gap width.
        const remain = rect[xy[idx0WhenH]] + rect[wh[idx0WhenH]] - last;
        const modWH = (i === rowLen - 1 || remain < step) ? remain : step;
        const wh0 = nodeLayout[wh[idx0WhenH]] = mathMax(modWH - 2 * halfGapWidth, 0);

        nodeLayout[xy[idx1WhenH]] = rect[xy[idx1WhenH]] + mathMin(halfGapWidth, wh1 / 2);
        nodeLayout[xy[idx0WhenH]] = last + mathMin(halfGapWidth, wh0 / 2);

        last += modWH;
        node.setLayout(nodeLayout, true);
    }

    rect[xy[idx1WhenH]] += rowOtherLength;
    rect[wh[idx1WhenH]] -= rowOtherLength;
}

// Return [containerWidth, containerHeight] as default.
function estimateRootSize(
    seriesModel: TreemapSeriesModel,
    targetInfo: { node: TreemapLayoutNode },
    viewRoot: TreemapLayoutNode,
    containerWidth: number,
    containerHeight: number
) {
    // If targetInfo.node exists, we zoom to the node,
    // so estimate whole width and height by target node.
    let currNode = (targetInfo || {}).node;
    const defaultSize = [containerWidth, containerHeight];

    if (!currNode || currNode === viewRoot) {
        return defaultSize;
    }

    let parent;
    const viewArea = containerWidth * containerHeight;
    let area = viewArea * seriesModel.option.zoomToNodeRatio;

    while (parent = currNode.parentNode) { // jshint ignore:line
        let sum = 0;
        const siblings = parent.children;

        for (let i = 0, len = siblings.length; i < len; i++) {
            sum += siblings[i].getValue() as number;
        }
        const currNodeValue = currNode.getValue() as number;
        if (currNodeValue === 0) {
            return defaultSize;
        }
        area *= sum / currNodeValue;

        // Considering border, suppose aspect ratio is 1.
        const parentModel = parent.getModel<TreemapSeriesNodeItemOption>();
        const borderWidth = parentModel.get(PATH_BORDER_WIDTH);
        const upperHeight = Math.max(borderWidth, getUpperLabelHeight(parentModel));
        area += 4 * borderWidth * borderWidth
            + (3 * borderWidth + upperHeight) * Math.pow(area, 0.5);

        area > MAX_SAFE_INTEGER && (area = MAX_SAFE_INTEGER);

        currNode = parent;
    }

    area < viewArea && (area = viewArea);
    const scale = Math.pow(area / viewArea, 0.5);

    return [containerWidth * scale, containerHeight * scale];
}

// Root position based on coord of containerGroup
function calculateRootPosition(
    layoutInfo: layout.LayoutRect,
    rootRect: RectLike,
    targetInfo: { node: TreemapLayoutNode }
) {
    if (rootRect) {
        return {x: rootRect.x, y: rootRect.y};
    }

    const defaultPosition = {x: 0, y: 0};
    if (!targetInfo) {
        return defaultPosition;
    }

    // If targetInfo is fetched by 'retrieveTargetInfo',
    // old tree and new tree are the same tree,
    // so the node still exists and we can visit it.

    const targetNode = targetInfo.node;
    const layout = targetNode.getLayout();

    if (!layout) {
        return defaultPosition;
    }

    // Transform coord from local to container.
    const targetCenter = [layout.width / 2, layout.height / 2];
    let node = targetNode;
    while (node) {
        const nodeLayout = node.getLayout();
        targetCenter[0] += nodeLayout.x;
        targetCenter[1] += nodeLayout.y;
        node = node.parentNode;
    }

    return {
        x: layoutInfo.width / 2 - targetCenter[0],
        y: layoutInfo.height / 2 - targetCenter[1]
    };
}

// Mark nodes visible for prunning when visual coding and rendering.
// Prunning depends on layout and root position, so we have to do it after layout.
function prunning(
    node: TreemapLayoutNode,
    clipRect: BoundingRect,
    viewAbovePath: TreemapLayoutNode[],
    viewRoot: TreemapLayoutNode,
    depth: number
) {
    const nodeLayout = node.getLayout();
    const nodeInViewAbovePath = viewAbovePath[depth];
    const isAboveViewRoot = nodeInViewAbovePath && nodeInViewAbovePath === node;

    if (
        (nodeInViewAbovePath && !isAboveViewRoot)
        || (depth === viewAbovePath.length && node !== viewRoot)
    ) {
        return;
    }

    node.setLayout({
        // isInView means: viewRoot sub tree + viewAbovePath
        isInView: true,
        // invisible only means: outside view clip so that the node can not
        // see but still layout for animation preparation but not render.
        invisible: !isAboveViewRoot && !clipRect.intersect(nodeLayout),
        isAboveViewRoot
    }, true);

    // Transform to child coordinate.
    const childClipRect = new BoundingRect(
        clipRect.x - nodeLayout.x,
        clipRect.y - nodeLayout.y,
        clipRect.width,
        clipRect.height
    );

    each(node.viewChildren || [], function (child) {
        prunning(child, childClipRect, viewAbovePath, viewRoot, depth + 1);
    });
}

function getUpperLabelHeight(model: NodeModel): number {
    return model.get(PATH_UPPER_LABEL_SHOW) ? model.get(PATH_UPPER_LABEL_HEIGHT) : 0;
}
