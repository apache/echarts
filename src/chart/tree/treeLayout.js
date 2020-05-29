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
    getViewRect
} from './layoutHelper';

export default function (ecModel, api) {
    ecModel.eachSeriesByType('tree', function (seriesModel) {
        commonLayout(seriesModel, api);
    });
}

function commonLayout(seriesModel, api) {
    var layoutInfo = getViewRect(seriesModel, api);
    seriesModel.layoutInfo = layoutInfo;
    var layout = seriesModel.get('layout');
    var width = 0;
    var height = 0;
    var separation = null;

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

    var virtualRoot = seriesModel.getData().tree.root;
    var realRoot = virtualRoot.children[0];

    if (realRoot) {
        init(virtualRoot);
        eachAfter(realRoot, firstWalk, separation);
        virtualRoot.hierNode.modifier = -realRoot.hierNode.prelim;
        eachBefore(realRoot, secondWalk);

        var left = realRoot;
        var right = realRoot;
        var bottom = realRoot;
        eachBefore(realRoot, function (node) {
            var x = node.getLayout().x;
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

        var delta = left === right ? 1 : separation(left, right) / 2;
        var tx = delta - left.getLayout().x;
        var kx = 0;
        var ky = 0;
        var coorX = 0;
        var coorY = 0;
        if (layout === 'radial') {
            kx = width / (right.getLayout().x + delta + tx);
            // here we use (node.depth - 1), bucause the real root's depth is 1
            ky = height / ((bottom.depth - 1) || 1);
            eachBefore(realRoot, function (node) {
                coorX = (node.getLayout().x + tx) * kx;
                coorY = (node.depth - 1) * ky;
                var finalCoor = radialCoordinate(coorX, coorY);
                node.setLayout({x: finalCoor.x, y: finalCoor.y, rawX: coorX, rawY: coorY}, true);
            });
        }
        else {
            var orient = seriesModel.getOrient();
            if (orient === 'RL' || orient === 'LR') {
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
    }
}