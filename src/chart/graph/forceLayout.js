define(function (require) {

    var forceHelper = require('./forceHelper');
    var numberUtil = require('../../util/number');
    var simpleLayoutHelper = require('./simpleLayoutHelper');
    var circularLayoutHelper = require('./circularLayoutHelper');
    var vec2 = require('zrender/core/vector');

    return function (ecModel) {
        ecModel.eachSeriesByType('graph', function (graphSeries) {
            var coordSys = graphSeries.coordinateSystem;
            if (coordSys && coordSys.type !== 'view') {
                return;
            }
            if (graphSeries.get('layout') === 'force') {
                var preservedPoints = graphSeries.preservedPoints || {};
                var graph = graphSeries.getGraph();
                var nodeData = graph.data;
                var edgeData = graph.edgeData;
                var forceModel = graphSeries.getModel('force');
                var initLayout = forceModel.get('initLayout');
                if (graphSeries.preservedPoints) {
                    nodeData.each(function (idx) {
                        var id = nodeData.getId(idx);
                        nodeData.setItemLayout(idx, preservedPoints[id] || [NaN, NaN]);
                    });
                }
                else if (!initLayout || initLayout === 'none') {
                    simpleLayoutHelper(graphSeries);
                }
                else if (initLayout === 'circular') {
                    circularLayoutHelper(graphSeries);
                }

                var nodeDataExtent = nodeData.getDataExtent('value');
                // var edgeDataExtent = edgeData.getDataExtent('value');
                var repulsion = forceModel.get('repulsion');
                var edgeLength = forceModel.get('edgeLength');
                var nodes = nodeData.mapArray('value', function (value, idx) {
                    var point = nodeData.getItemLayout(idx);
                    // var w = numberUtil.linearMap(value, nodeDataExtent, [0, 50]);
                    var rep = numberUtil.linearMap(value, nodeDataExtent, [0, repulsion]) || (repulsion / 2);
                    return {
                        w: rep,
                        rep: rep,
                        p: (!point || isNaN(point[0]) || isNaN(point[1])) ? null : point
                    };
                });
                var edges = edgeData.mapArray('value', function (value, idx) {
                    var edge = graph.getEdgeByIndex(idx);
                    // var w = numberUtil.linearMap(value, edgeDataExtent, [0, 100]);
                    return {
                        n1: nodes[edge.node1.dataIndex],
                        n2: nodes[edge.node2.dataIndex],
                        d: edgeLength,
                        curveness: edge.getModel().get('lineStyle.normal.curveness') || 0
                    };
                });

                var coordSys = graphSeries.coordinateSystem;
                var rect = coordSys.getBoundingRect();
                var forceInstance = forceHelper(nodes, edges, {
                    rect: rect,
                    gravity: forceModel.get('gravity')
                });
                var oldStep = forceInstance.step;
                forceInstance.step = function (cb) {
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        if (nodes[i].fixed) {
                            // Write back to layout instance
                            vec2.copy(nodes[i].p, graph.getNodeByIndex(i).getLayout());
                        }
                    }
                    oldStep(function (nodes, edges, stopped) {
                        for (var i = 0, l = nodes.length; i < l; i++) {
                            if (!nodes[i].fixed) {
                                graph.getNodeByIndex(i).setLayout(nodes[i].p);
                            }
                            preservedPoints[nodeData.getId(i)] = nodes[i].p;
                        }
                        for (var i = 0, l = edges.length; i < l; i++) {
                            var e = edges[i];
                            var edge = graph.getEdgeByIndex(i);
                            var p1 = e.n1.p;
                            var p2 = e.n2.p;
                            var points = edge.getLayout();
                            points = points ? points.slice() : [];
                            points[0] = points[0] || [];
                            points[1] = points[1] || [];
                            vec2.copy(points[0], p1);
                            vec2.copy(points[1], p2);
                            if (+e.curveness) {
                                points[2] = [
                                    (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * e.curveness,
                                    (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * e.curveness
                                ];
                            }
                            edge.setLayout(points);
                        }
                        // Update layout

                        cb && cb(stopped);
                    });
                };
                graphSeries.forceLayout = forceInstance;
                graphSeries.preservedPoints = preservedPoints;

                // Step to get the layout
                forceInstance.step();
            }
            else {
                // Remove prev injected forceLayout instance
                graphSeries.forceLayout = null;
            }
        });
    };
});