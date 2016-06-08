/**
 * Chord layout
 * @module echarts/chart/chord/chordCircularLayout
 * @author pissang(http://github.com/pissang)
 */
define(function (require) {
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
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

        if (opts.sort && opts.sort != 'none') {
            groups.sort(compareGroups);
            if (opts.sort === 'descending') {
                groups.revert();
            }
        }

        var unitAngle = (Math.PI * 2 - opts.padding * graph0.data.count()) / sumSize;
        var angle = opts.startAngle * Math.PI / 180;
        var sign = opts.clockwise ? -1 : 1;
        zrUtil.each(groups, function (group) {
            if (opts.sortSub && opts.sortSub != 'none') {
                group.subGroups.sort(compareGroups);
                if (opts.sortSub === 'descending') {
                    group.subGroups.revert();
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

    return function (ecModel, api, payload) {
        ecModel.eachSeriesByType('chord', function (chordSeries) {
            var graph = chordSeries.getGraph();

            var center = chordSeries.get('center');
            var radius = chordSeries.get('radius');

            var parsePercent = numberUtil.parsePercent;
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
    };
});