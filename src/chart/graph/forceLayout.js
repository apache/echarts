import {forceLayout} from './forceHelper';
import {simpleLayout} from './simpleLayoutHelper';
import {circularLayout} from './circularLayoutHelper';
import {linearMap} from '../../util/number';
import * as vec2 from 'zrender/src/core/vector';
import * as zrUtil from 'zrender/src/core/util';

export default function (ecModel) {
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
                simpleLayout(graphSeries);
            }
            else if (initLayout === 'circular') {
                circularLayout(graphSeries);
            }

            var nodeDataExtent = nodeData.getDataExtent('value');
            var edgeDataExtent = edgeData.getDataExtent('value');
            // var edgeDataExtent = edgeData.getDataExtent('value');
            var repulsion = forceModel.get('repulsion');
            var edgeLength = forceModel.get('edgeLength');
            if (!zrUtil.isArray(repulsion)) {
                repulsion = [repulsion, repulsion];
            }
            if (!zrUtil.isArray(edgeLength)) {
                edgeLength = [edgeLength, edgeLength];
            }
            // Larger value has smaller length
            edgeLength = [edgeLength[1], edgeLength[0]];

            var nodes = nodeData.mapArray('value', function (value, idx) {
                var point = nodeData.getItemLayout(idx);
                var rep = linearMap(value, nodeDataExtent, repulsion);
                if (isNaN(rep)) {
                    rep = (repulsion[0] + repulsion[1]) / 2;
                }
                return {
                    w: rep,
                    rep: rep,
                    fixed: nodeData.getItemModel(idx).get('fixed'),
                    p: (!point || isNaN(point[0]) || isNaN(point[1])) ? null : point
                };
            });
            var edges = edgeData.mapArray('value', function (value, idx) {
                var edge = graph.getEdgeByIndex(idx);
                var d = linearMap(value, edgeDataExtent, edgeLength);
                if (isNaN(d)) {
                    d = (edgeLength[0] + edgeLength[1]) / 2;
                }
                return {
                    n1: nodes[edge.node1.dataIndex],
                    n2: nodes[edge.node2.dataIndex],
                    d: d,
                    curveness: edge.getModel().get('lineStyle.normal.curveness') || 0
                };
            });

            var coordSys = graphSeries.coordinateSystem;
            var rect = coordSys.getBoundingRect();
            var forceInstance = forceLayout(nodes, edges, {
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
}