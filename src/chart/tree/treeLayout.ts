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

import {
    eachAfter,
    eachBefore
} from './traversalHelper';
import {
    init,
    firstWalk,
    secondWalk,
    separation as sep,
    radialCoordinate,
    TreeLayoutNode
} from './layoutHelper';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import TreeSeriesModel, { TreeSeriesNodeItemOption } from './TreeSeries';
import { createBoxLayoutReference, getLayoutRect } from '../../util/layout';

type CenterTreeSide = 'left' | 'right';

export default function treeLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('tree', function (seriesModel: TreeSeriesModel) {
        commonLayout(seriesModel, api);
    });
}

function commonLayout(seriesModel: TreeSeriesModel, api: ExtensionAPI) {
    const refContainer = createBoxLayoutReference(seriesModel, api).refContainer;
    const layoutInfo = getLayoutRect(seriesModel.getBoxLayoutParams(), refContainer);
    seriesModel.layoutInfo = layoutInfo;
    const layout = seriesModel.get('layout');
    let width = 0;
    let height = 0;
    let separation = null;

    if (layout === 'radial') {
        width = 2 * Math.PI;
        height = Math.min(layoutInfo.height, layoutInfo.width) / 2;
        separation = sep(function (node1, node2) {
            return (node1.parentNode === node2.parentNode ? 1 : 2) / node1.depth;
        });
    }
    else {
        width = layoutInfo.width;
        height = layoutInfo.height;
        separation = sep();
    }

    const virtualRoot = seriesModel.getData().tree.root as TreeLayoutNode;
    const realRoot = virtualRoot.children[0];

    if (realRoot) {
        const orient = seriesModel.getOrient();
        if (layout === 'orthogonal' && orient === 'center') {
            centerLayout(virtualRoot, realRoot, width, height, separation);
        }
        else {
            normalLayout(virtualRoot, realRoot, layout, orient, width, height, separation);
        }
    }
}

function prepareTreeLayout(
    virtualRoot: TreeLayoutNode,
    realRoot: TreeLayoutNode,
    separation: ReturnType<typeof sep>
) {
    init(virtualRoot);
    eachAfter(realRoot, firstWalk, separation);
    virtualRoot.hierNode.modifier = -realRoot.hierNode.prelim;
    eachBefore(realRoot, secondWalk);
}

function normalLayout(
    virtualRoot: TreeLayoutNode,
    realRoot: TreeLayoutNode,
    layout: 'orthogonal' | 'radial',
    orient: ReturnType<TreeSeriesModel['getOrient']>,
    width: number,
    height: number,
    separation: ReturnType<typeof sep>
) {
    prepareTreeLayout(virtualRoot, realRoot, separation);

    let left = realRoot;
    let right = realRoot;
    let bottom = realRoot;
    eachBefore(realRoot, function (node: TreeLayoutNode) {
        const x = node.getLayout().x;
        if (x < left.getLayout().x) {
            left = node;
        }
        if (x > right.getLayout().x) {
            right = node;
        }
        if (node.depth > bottom.depth) {
            bottom = node;
        }
    });

    const delta = left === right ? 1 : separation(left, right) / 2;
    const tx = delta - left.getLayout().x;
    let kx = 0;
    let ky = 0;
    let coorX = 0;
    let coorY = 0;
    if (layout === 'radial') {
        kx = width / (right.getLayout().x + delta + tx);
        // here we use (node.depth - 1), because the real root's depth is 1
        ky = height / ((bottom.depth - 1) || 1);
        eachBefore(realRoot, function (node) {
            coorX = (node.getLayout().x + tx) * kx;
            coorY = (node.depth - 1) * ky;
            const finalCoor = radialCoordinate(coorX, coorY);
            node.setLayout({x: finalCoor.x, y: finalCoor.y, rawX: coorX, rawY: coorY}, true);
        });
    }
    else if (orient === 'RL' || orient === 'LR') {
        ky = height / (right.getLayout().x + delta + tx);
        kx = width / ((bottom.depth - 1) || 1);
        eachBefore(realRoot, function (node) {
            coorY = (node.getLayout().x + tx) * ky;
            coorX = orient === 'LR'
                ? (node.depth - 1) * kx
                : width - (node.depth - 1) * kx;
            node.setLayout({x: coorX, y: coorY}, true);
        });
    }
    else if (orient === 'TB' || orient === 'BT') {
        kx = width / (right.getLayout().x + delta + tx);
        ky = height / ((bottom.depth - 1) || 1);
        eachBefore(realRoot, function (node) {
            coorX = (node.getLayout().x + tx) * kx;
            coorY = orient === 'TB'
                ? (node.depth - 1) * ky
                : height - (node.depth - 1) * ky;
            node.setLayout({x: coorX, y: coorY}, true);
        });
    }
}

function centerLayout(
    virtualRoot: TreeLayoutNode,
    realRoot: TreeLayoutNode,
    width: number,
    height: number,
    separation: ReturnType<typeof sep>
) {
    const originalChildren = realRoot.children.slice();
    const leftChildren: TreeLayoutNode[] = [];
    const rightChildren: TreeLayoutNode[] = [];
    const autoLeftCount = Math.floor(originalChildren.length / 2);

    for (let i = 0; i < originalChildren.length; i++) {
        const child = originalChildren[i];
        const side = getRootChildSide(child, i, autoLeftCount);
        (side === 'left' ? leftChildren : rightChildren).push(child);
    }

    let bottom = realRoot;
    eachBefore(realRoot, function (node: TreeLayoutNode) {
        if (node.depth > bottom.depth) {
            bottom = node;
        }
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const kx = centerX / ((bottom.depth - realRoot.depth) || 1);

    try {
        layoutCenterSide(virtualRoot, realRoot, leftChildren, 'left', centerX, centerY, kx, separation);
        layoutCenterSide(virtualRoot, realRoot, rightChildren, 'right', centerX, centerY, kx, separation);
    }
    finally {
        realRoot.children = originalChildren;
    }

    realRoot.setLayout({x: centerX, y: centerY, side: 'center'}, true);
}

function layoutCenterSide(
    virtualRoot: TreeLayoutNode,
    realRoot: TreeLayoutNode,
    children: TreeLayoutNode[],
    side: CenterTreeSide,
    centerX: number,
    centerY: number,
    kx: number,
    separation: ReturnType<typeof sep>
) {
    if (!children.length) {
        return;
    }

    realRoot.children = children;
    prepareTreeLayout(virtualRoot, realRoot, separation);

    let top = realRoot;
    let bottom = realRoot;
    eachBefore(realRoot, function (node: TreeLayoutNode) {
        const x = node.getLayout().x;
        if (x < top.getLayout().x) {
            top = node;
        }
        if (x > bottom.getLayout().x) {
            bottom = node;
        }
    });

    const maxDistance = Math.max(
        Math.abs(top.getLayout().x),
        Math.abs(bottom.getLayout().x)
    );
    const ky = centerY / (maxDistance || 1);
    const direction = side === 'left' ? -1 : 1;

    eachBefore(realRoot, function (node: TreeLayoutNode) {
        if (node === realRoot) {
            return;
        }

        node.setLayout({
            x: centerX + direction * (node.depth - realRoot.depth) * kx,
            y: centerY + node.getLayout().x * ky,
            side: side
        }, true);
    });
}

function getRootChildSide(
    node: TreeLayoutNode,
    index: number,
    autoLeftCount: number
): CenterTreeSide {
    const item = node.hostTree.data.getRawDataItem(node.dataIndex) as TreeSeriesNodeItemOption;
    const side = item && item.side;
    if (side === 'left' || side === 'right') {
        return side;
    }
    return index < autoLeftCount ? 'left' : 'right';
}
