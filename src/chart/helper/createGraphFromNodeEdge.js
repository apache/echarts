define(function (require) {

    var List = require('../../data/List');
    var Graph = require('../../data/Graph');
    var linkList = require('../../data/helper/linkList');
    var zrUtil = require('zrender/core/util');

    return function (nodes, edges, hostModel, directed) {
        var graph = new Graph(directed);
        for (var i = 0; i < nodes.length; i++) {
            graph.addNode(nodes[i].id || nodes[i].name, i);
        }

        var linkNameList = [];
        for (var i = 0; i < edges.length; i++) {
            var link = edges[i];
            linkNameList[i] = link.id || link.source + ' - ' + link.target;
            graph.addEdge(link.source, link.target, i);
        }

        // FIXME
        var firstValue = nodes[0] && nodes[0].value;
        var dimSize = zrUtil.isArray(firstValue) ? firstValue.length : 1;
        var dimensionNames = ['value', 'a', 'b', 'c', 'd', 'e', 'f'].slice(0, dimSize);
        var nodeData = new List(dimensionNames, hostModel);
        var edgeData = new List(['weight'], hostModel);

        nodeData.initData(nodes);
        edgeData.initData(edges, linkNameList, 'weight');

        graph.setEdgeData(edgeData);

        linkList.linkToGraph(nodeData, graph);

        return graph;
    };
});