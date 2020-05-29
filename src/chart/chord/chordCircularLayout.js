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
import {parsePercent} from '../../util/number';

/**
 * @param {module:echarts/data/Graph} graph
 */
function layout(graphs, opts) {
    if (!zrUtil.isArray(graphs)) {
        graphs = [graphs];
    }

    var graph0 = graphs[0];

    var groups = [];

    // Init groups
    graph0.eachNode(function (node) {
        var group = {
            size: 0,
            subGroups: [],
            node: node
        };
        groups.push(group);
    });

    zrUtil.each(graphs, function (graph) {
        graph.eachEdge(function (edge) {
            var g1 = groups[edge.node1.dataIndex];
            g1.size += edge.getValue('value') || 0;

            g1.subGroups.push({
                size: edge.getValue('value'),
                edge: edge
            });
        });
    });

    var sumSize = zrUtil.reduce(groups, function (sumSize, group) {
        return sumSize + group.size;
    }, 0);

    if (opts.sort && opts.sort !== 'none') {
        groups.sort(compareGroups);
        if (opts.sort === 'descending') {
            groups.reverse();
        }
    }

    var unitAngle = (Math.PI * 2 - opts.padding * graph0.data.count()) / sumSize;
    var angle = opts.startAngle * Math.PI / 180;
    var sign = opts.clockwise ? -1 : 1;
    zrUtil.each(groups, function (group) {
        if (opts.sortSub && opts.sortSub !== 'none') {
            group.subGroups.sort(compareGroups);
            if (opts.sortSub === 'descending') {
                group.subGroups.reverse();
            }
        }

        var endAngle = angle + sign * group.size * unitAngle;
        group.node.setLayout({
            startAngle: -angle,
            endAngle: -endAngle,
            cx: opts.cx,
            cy: opts.cy,
            r0: opts.r0,
            r: opts.r,
            clockwise: opts.clockwise
        });
        zrUtil.each(group.subGroups, function (subGroup) {
            var startAngle = angle;
            var endAngle = angle + sign * subGroup.size * unitAngle;
            var layout = subGroup.edge.getLayout() || {
                cx: opts.cx,
                cy: opts.cy,
                r: opts.r0,
                clockwise: opts.clockwise
            };
            layout.startAngle = -startAngle;
            layout.endAngle = -endAngle;
            subGroup.edge.setLayout(layout);
            angle = endAngle;
        });

        angle = endAngle + sign * opts.padding;
    });
}

var compareGroups = function (a, b) {
    return a.size - b.size;
};

export default function (ecModel, api, payload) {
    ecModel.eachSeriesByType('chord', function (chordSeries) {
        var graph = chordSeries.getGraph();

        var center = chordSeries.get('center');
        var radius = chordSeries.get('radius');

        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();
        var viewSize = Math.min(viewWidth, viewHeight) / 2;

        layout(graph, {
            sort: chordSeries.get('sort'),
            sortSub: chordSeries.get('sortSub'),
            padding: chordSeries.get('padding'),
            startAngle: chordSeries.get('startAngle'),
            clockwise: chordSeries.get('clockwise'),
            cx: parsePercent(center[0], viewWidth),
            cy: parsePercent(center[1], viewHeight),
            r0: parsePercent(radius[0], viewSize),
            r: parsePercent(radius[1], viewSize)
        });
    });
}