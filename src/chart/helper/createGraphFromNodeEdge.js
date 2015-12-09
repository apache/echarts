define(function (require) {

    var List = require('../../data/List');
    var Graph = require('../../data/Graph');
    var linkList = require('../../data/helper/linkList');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var zrUtil = require('zrender/core/util');

    return function (nodes, edges, hostModel, directed) {
        var graph = new Graph(directed);
        for (var i = 0; i < nodes.length; i++) {
            graph.addNode(zrUtil.retrieve(nodes[i].id, nodes[i].name), i);
        }

        var linkNameList = [];
        for (var i = 0; i < edges.length; i++) {
            var link = edges[i];
            linkNameList[i] = zrUtil.retrieve(link.id, link.source + ' - ' + link.target);
            graph.addEdge(link.source, link.target, i);
        }

        // FIXME
        var dimensionNames = completeDimensions(['value'], nodes);

        var nodeData = new List(dimensionNames, hostModel);
        var edgeData = new List(['value'], hostModel);

        nodeData.initData(nodes);
        edgeData.initData(edges, linkNameList);

        graph.setEdgeData(edgeData);

        linkList.linkToGraph(nodeData, graph);

        return graph;
    };
});