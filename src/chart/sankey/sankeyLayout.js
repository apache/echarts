/**
 * @file The layout algorithm of sankey view
 * @author  Deqing Li(annong035@gmail.com)
 */

import * as layout from '../../util/layout';
import nest from '../../util/array/nest';
import * as zrUtil from 'zrender/src/core/util';

export default function (ecModel, api, payload) {

    ecModel.eachSeriesByType('sankey', function (seriesModel) {

        var nodeWidth = seriesModel.get('nodeWidth');
        var nodeGap = seriesModel.get('nodeGap');

        var layoutInfo = getViewRect(seriesModel, api);

        seriesModel.layoutInfo = layoutInfo;

        var width = layoutInfo.width;
        var height = layoutInfo.height;

        var graph = seriesModel.getGraph();

        var nodes = graph.nodes;
        var edges = graph.edges;

        computeNodeValues(nodes);

        var filteredNodes = zrUtil.filter(nodes, function (node) {
            return node.getLayout().value === 0;
        });

        var iterations = filteredNodes.length !== 0
            ? 0 : seriesModel.get('layoutIterations');

        layoutSankey(nodes, edges, nodeWidth, nodeGap, width, height, iterations);
    });
}

/**
 * Get the layout position of the whole view
 *
 * @param {module:echarts/model/Series} seriesModel  the model object of sankey series
 * @param {module:echarts/ExtensionAPI} api  provide the API list that the developer can call
 * @return {module:zrender/core/BoundingRect}  size of rect to draw the sankey view
 */
function getViewRect(seriesModel, api) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

function layoutSankey(nodes, edges, nodeWidth, nodeGap, width, height, iterations) {
    computeNodeBreadths(nodes, nodeWidth, width);
    computeNodeDepths(nodes, edges, height, nodeGap, iterations);
    computeEdgeDepths(nodes);
}

/**
 * Compute the value of each node by summing the associated edge's value
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 */
function computeNodeValues(nodes) {
    zrUtil.each(nodes, function (node) {
        var value1 = sum(node.outEdges, getEdgeValue);
        var value2 = sum(node.inEdges, getEdgeValue);
        var value = Math.max(value1, value2);
        node.setLayout({value: value}, true);
    });
}

/**
 * Compute the x-position for each node
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 * @param  {number} nodeWidth  the dx of the node
 * @param  {number} width  the whole width of the area to draw the view
 */
function computeNodeBreadths(nodes, nodeWidth, width) {
    var remainNodes = nodes;
    var nextNode = null;
    var x = 0;
    var kx = 0;

    while (remainNodes.length) {
        nextNode = [];
        for (var i = 0, len = remainNodes.length; i < len; i++) {
            var node = remainNodes[i];
            node.setLayout({x: x}, true);
            node.setLayout({dx: nodeWidth}, true);
            for (var j = 0, lenj = node.outEdges.length; j < lenj; j++) {
                nextNode.push(node.outEdges[j].node2);
            }
        }
        remainNodes = nextNode;
        ++x;
    }

    moveSinksRight(nodes, x);
    kx = (width - nodeWidth) / (x - 1);

    scaleNodeBreadths(nodes, kx);
}

/**
 * All the node without outEgdes are assigned maximum x-position and
 *     be aligned in the last column.
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 * @param {number} x  value (x-1) use to assign to node without outEdges
 *     as x-position
 */
function moveSinksRight(nodes, x) {
    zrUtil.each(nodes, function (node) {
        if (!node.outEdges.length) {
            node.setLayout({x: x - 1}, true);
        }
    });
}

/**
 * Scale node x-position to the width
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 * @param {number} kx   multiple used to scale nodes
 */
function scaleNodeBreadths(nodes, kx) {
    zrUtil.each(nodes, function (node) {
        var nodeX = node.getLayout().x * kx;
        node.setLayout({x: nodeX}, true);
    });
}

/**
 * Using Gauss-Seidel iterations method to compute the node depth(y-position)
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 * @param {module:echarts/data/Graph~Edge} edges  edge of sankey view
 * @param {number} height  the whole height of the area to draw the view
 * @param {number} nodeGap  the vertical distance between two nodes
 *     in the same column.
 * @param {number} iterations  the number of iterations for the algorithm
 */
function computeNodeDepths(nodes, edges, height, nodeGap, iterations) {
    var nodesByBreadth = nest()
        .key(function (d) {
            return d.getLayout().x;
        })
        .sortKeys(ascending)
        .entries(nodes)
        .map(function (d) {
            return d.values;
        });

    initializeNodeDepth(nodes, nodesByBreadth, edges, height, nodeGap);
    resolveCollisions(nodesByBreadth, nodeGap, height);

    for (var alpha = 1; iterations > 0; iterations--) {
        // 0.99 is a experience parameter, ensure that each iterations of
        // changes as small as possible.
        alpha *= 0.99;
        relaxRightToLeft(nodesByBreadth, alpha);
        resolveCollisions(nodesByBreadth, nodeGap, height);
        relaxLeftToRight(nodesByBreadth, alpha);
        resolveCollisions(nodesByBreadth, nodeGap, height);
    }
}

/**
 * Compute the original y-position for each node
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
 *     group by the array of all sankey nodes based on the nodes x-position.
 * @param {module:echarts/data/Graph~Edge} edges  edge of sankey view
 * @param {number} height  the whole height of the area to draw the view
 * @param {number} nodeGap  the vertical distance between two nodes
 */
function initializeNodeDepth(nodes, nodesByBreadth, edges, height, nodeGap) {
    var kyArray = [];
    zrUtil.each(nodesByBreadth, function (nodes) {
        var n = nodes.length;
        var sum = 0;
        zrUtil.each(nodes, function (node) {
            sum += node.getLayout().value;
        });
        var ky = (height - (n - 1) * nodeGap) / sum;
        kyArray.push(ky);
    });

    kyArray.sort(function (a, b) {
        return a - b;
    });
    var ky0 = kyArray[0];

    zrUtil.each(nodesByBreadth, function (nodes) {
        zrUtil.each(nodes, function (node, i) {
            node.setLayout({y: i}, true);
            var nodeDy = node.getLayout().value * ky0;
            node.setLayout({dy: nodeDy}, true);
        });
    });

    zrUtil.each(edges, function (edge) {
        var edgeDy = +edge.getValue() * ky0;
        edge.setLayout({dy: edgeDy}, true);
    });
}

/**
 * Resolve the collision of initialized depth (y-position)
 *
 * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
 *     group by the array of all sankey nodes based on the nodes x-position.
 * @param {number} nodeGap  the vertical distance between two nodes
 * @param {number} height  the whole height of the area to draw the view
 */
function resolveCollisions(nodesByBreadth, nodeGap, height) {
    zrUtil.each(nodesByBreadth, function (nodes) {
        var node;
        var dy;
        var y0 = 0;
        var n = nodes.length;
        var i;

        nodes.sort(ascendingDepth);

        for (i = 0; i < n; i++) {
            node = nodes[i];
            dy = y0 - node.getLayout().y;
            if (dy > 0) {
                var nodeY = node.getLayout().y + dy;
                node.setLayout({y: nodeY}, true);
            }
            y0 = node.getLayout().y + node.getLayout().dy + nodeGap;
        }

        // if the bottommost node goes outside the bounds, push it back up
        dy = y0 - nodeGap - height;
        if (dy > 0) {
            var nodeY = node.getLayout().y - dy;
            node.setLayout({y: nodeY}, true);
            y0 = node.getLayout().y;
            for (i = n - 2; i >= 0; --i) {
                node = nodes[i];
                dy = node.getLayout().y + node.getLayout().dy + nodeGap - y0;
                if (dy > 0) {
                    nodeY = node.getLayout().y - dy;
                    node.setLayout({y: nodeY}, true);
                }
                y0 = node.getLayout().y;
            }
        }
    });
}

/**
 * Change the y-position of the nodes, except most the right side nodes
 *
 * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
 *     group by the array of all sankey nodes based on the node x-position.
 * @param {number} alpha  parameter used to adjust the nodes y-position
 */
function relaxRightToLeft(nodesByBreadth, alpha) {
    zrUtil.each(nodesByBreadth.slice().reverse(), function (nodes) {
        zrUtil.each(nodes, function (node) {
            if (node.outEdges.length) {
                var y = sum(node.outEdges, weightedTarget) / sum(node.outEdges, getEdgeValue);
                var nodeY = node.getLayout().y + (y - center(node)) * alpha;
                node.setLayout({y: nodeY}, true);
            }
        });
    });
}

function weightedTarget(edge) {
    return center(edge.node2) * edge.getValue();
}

/**
 * Change the y-position of the nodes, except most the left side nodes
 *
 * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
 *     group by the array of all sankey nodes based on the node x-position.
 * @param {number} alpha  parameter used to adjust the nodes y-position
 */
function relaxLeftToRight(nodesByBreadth, alpha) {
    zrUtil.each(nodesByBreadth, function (nodes) {
        zrUtil.each(nodes, function (node) {
            if (node.inEdges.length) {
                var y = sum(node.inEdges, weightedSource) / sum(node.inEdges, getEdgeValue);
                var nodeY = node.getLayout().y + (y - center(node)) * alpha;
                node.setLayout({y: nodeY}, true);
            }
        });
    });
}

function weightedSource(edge) {
    return center(edge.node1) * edge.getValue();
}

/**
 * Compute the depth(y-position) of each edge
 *
 * @param {module:echarts/data/Graph~Node} nodes  node of sankey view
 */
function computeEdgeDepths(nodes) {
    zrUtil.each(nodes, function (node) {
        node.outEdges.sort(ascendingTargetDepth);
        node.inEdges.sort(ascendingSourceDepth);
    });
    zrUtil.each(nodes, function (node) {
        var sy = 0;
        var ty = 0;
        zrUtil.each(node.outEdges, function (edge) {
            edge.setLayout({sy: sy}, true);
            sy += edge.getLayout().dy;
        });
        zrUtil.each(node.inEdges, function (edge) {
            edge.setLayout({ty: ty}, true);
            ty += edge.getLayout().dy;
        });
    });
}

function ascendingTargetDepth(a, b) {
    return a.node2.getLayout().y - b.node2.getLayout().y;
}

function ascendingSourceDepth(a, b) {
    return a.node1.getLayout().y - b.node1.getLayout().y;
}

function sum(array, f) {
    var sum = 0;
    var len = array.length;
    var i = -1;
    while (++i < len) {
        var value = +f.call(array, array[i], i);
        if (!isNaN(value)) {
            sum += value;
        }
    }
    return sum;
}

function center(node) {
    return node.getLayout().y + node.getLayout().dy / 2;
}

function ascendingDepth(a, b) {
    return a.getLayout().y - b.getLayout().y;
}

function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a === b ? 0 : NaN;
}

function getEdgeValue(edge) {
    return edge.getValue();
}