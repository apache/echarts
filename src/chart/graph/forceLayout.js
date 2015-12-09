define(function (require) {

    var forceHelper = require('./forceHelper');
    var numberUtil = require('../../util/number');
    var simpleLayoutHelper = require('./simpleLayoutHelper');
    var circularLayoutHelper = require('./circularLayoutHelper');

    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (graphSeries) {
            if (graphSeries.get('layout') === 'force') {
                var forceModel = graphSeries.getModel('force');
                var initLayout = forceModel.get('initLayout');
                if (!initLayout || initLayout === 'none') {
                    simpleLayoutHelper(graphSeries);
                }
                else if (initLayout === 'circular') {
                    circularLayoutHelper(graphSeries);
                }

                var graph = graphSeries.getGraph();
                var nodeData = graph.data;
                var edgeData = graph.edgeData;
                var nodeDataExtent = nodeData.getDataExtent('value');
                var edgeDataExtent = edgeData.getDataExtent('value');
                var nodes = nodeData.mapArray('value', function (value, idx) {
                    var point = nodeData.getItemLayout(idx);
                    var w = numberUtil.linearMap(value, nodeDataExtent, [0, 1]);
                    return {
                        w: isNaN(w) ? 0.5 : w,
                        p: (isNaN(point[0]) || isNaN(point[1])) ? null : point
                    };
                });
                var edges = edgeData.mapArray('value', function (value, idx) {
                    var edge = graph.getEdgeByIndex(idx);
                    var w = numberUtil.linearMap(value, edgeDataExtent, [0, 1]);
                    return {
                        w: isNaN(w) ? 0.5 : w,
                        n1: nodes[edge.node1.dataIndex],
                        n2: nodes[edge.node2.dataIndex],
                        curveness: edge.getModel().get('lineStyle.normal.curveness') || 0
                    };
                });

                var coordSys = graphSeries.coordinateSystem;
                var rect = coordSys.getBoundingRect();
                var forceInstance = forceHelper(nodes, edges, {
                    width: rect.width,
                    height: rect.height,
                    center: [rect.x + rect.width / 2, rect.y + rect.height / 2]
                });
                var oldStep = forceInstance.step;
                forceInstance.step = function (cb) {
                    oldStep(function (nodes, edges, stopped) {
                        for (var i = 0, l = nodes.length; i < l; i++) {
                            graph.getNodeByIndex(i).setLayout(nodes[i].p);
                        }
                        for (var i = 0, l = edges.length; i < l; i++) {
                            var e = edges[i];
                            var p1 = e.n1.p;
                            var p2 = e.n2.p;
                            var points = [p1, p2];
                            if (e.curveness > 0) {
                                points.push([
                                    (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * e.curveness,
                                    (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * e.curveness
                                ]);
                            }
                            graph.getEdgeByIndex(i).setLayout(points);
                        }
                        // Update layout


                        cb && cb(stopped);
                    });
                };
                graphSeries.forceLayout = forceInstance;
            }
            else {
                // Remove prev injected forceLayout instance
                graphSeries.forceLayout = null;
            }
        });
    };
});