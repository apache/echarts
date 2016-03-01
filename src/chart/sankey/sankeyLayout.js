define(function (require) {

    var layout = require('../../util/layout');
    var nest = require('../../util/array/nest');
    var zrUtil = require('zrender/core/util');

    return function (ecModel, api) {

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

            var filteredNodes = nodes.filter(function (node) {
                return node.getLayout().value === 0;
            });

            var iterations = filteredNodes.length !== 0
                ? 0 : seriesModel.get('layoutIterations');

            layoutSankey(nodes, edges, nodeWidth, nodeGap, width, height, iterations);
        });
    };

    /**
     * get the layout position of the whole view.
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
     * compute the value of each node by summing the associated edge's value.
     * @param {module:echarts/data/Graph~Node} nodes
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
     * compute the x-position for each node.
     * @param {module:echarts/data/Graph~Node} nodes
     * @param  {number} nodeWidth
     * @param  {number} width
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
     * all the node without outEgdes are assigned maximum breadth and
     * be aligned in the last column.
     * @param {module:echarts/data/Graph~Node} nodes
     * @param {number} x
     */
    function moveSinksRight(nodes, x) {
        zrUtil.each(nodes, function (node) {
            if(!node.outEdges.length) {
                node.setLayout({x: x-1}, true);
            }
        });
    }

    /**
     * scale node x-position to the width.
     * @param {module:echarts/data/Graph~Node} nodes
     * @param {number} kx
     */
    function scaleNodeBreadths(nodes, kx) {
        zrUtil.each(nodes, function(node) {
            var nodeX = node.getLayout().x * kx;
            node.setLayout({x: nodeX}, true);
        });
    }

    /**
     * using Gauss-Seidel iterations method to compute the node depth(y-position).
     * @param {module:echarts/data/Graph~Node} nodes
     * @param {module:echarts/data/Graph~Edge} edges
     * @param {number} height
     * @param {numbber} nodeGap
     * @param {number} iterations
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
            alpha *= 0.99;
            relaxRightToLeft(nodesByBreadth, alpha);
            resolveCollisions(nodesByBreadth, nodeGap, height);
            relaxLeftToRight(nodesByBreadth, alpha);
            resolveCollisions(nodesByBreadth, nodeGap, height);
        }
    }

    /**
     * compute the original y-position for each node.
     * @param {module:echarts/data/Graph~Node} nodes
     * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
     * @param {module:echarts/data/Graph~Edge} edges
     * @param {number} height
     * @param {number} nodeGap
     */
    function initializeNodeDepth(nodes, nodesByBreadth, edges, height, nodeGap) {
        var kyArray = [];
        zrUtil.each(nodesByBreadth, function (nodes) {
            var n = nodes.length;
            var sum = 0;
            zrUtil.each(nodes, function (node) {
                sum += node.getLayout().value;
            });
            var ky = (height - (n-1) * nodeGap) / sum;
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
     * resolve the collision of initialized depth.
     * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
     * @param {number} nodeGap
     * @param {number} height
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
                if(dy > 0) {
                    var nodeY = node.getLayout().y + dy;
                    node.setLayout({y: nodeY}, true);
                }
                y0 = node.getLayout().y + node.getLayout().dy + nodeGap;
            }

            // if the bottommost node goes outside the biunds, push it back up
            dy = y0 - nodeGap - height;
            if (dy > 0) {
                var nodeY = node.getLayout().y -dy;
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
     * change the y-position of the nodes, except most the right side nodes.
     * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
     * @param {number} alpha
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
     * change the y-position of the nodes, except most the left side nodes.
     * @param {Array.<Array.<module:echarts/data/Graph~Node>>} nodesByBreadth
     * @param {number} alpha
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
     * compute the depth(y-position) of each edge.
     * @param {module:echarts/data/Graph~Node} nodes
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
        var s = 0;
        var n = array.length;
        var a;
        var i = -1;
        if (arguments.length === 1) {
            while (++i < n) {
                a = +array[i];
                if (!isNaN(a)) {
                    s += a;
                }
            }
        }
        else {
            while (++i < n) {
                a = +f.call(array, array[i], i);
                if(!isNaN(a)) {
                    s += a;
                }
            }
        }
        return s;
    }

    function center(node) {
        return node.getLayout().y + node.getLayout().dy / 2;
    }

    function ascendingDepth(a, b) {
        return a.getLayout().y - b.getLayout().y;
    }

    function ascending(a, b) {
        return a < b ? -1 : a > b ? 1 : a == b ? 0 : NaN;
    }

    function getEdgeValue(edge) {
        return edge.getValue();
    }

});