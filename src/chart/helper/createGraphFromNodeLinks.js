define(function (require) {

    var List = require('../../data/List');
    var Graph = require('../../data/Graph');
    var linkList = require('../../data/helper/linkList');
    var zrUtil = require('zrender/core/util');

    return function (nodes, links, hostModel, directed) {
        var graph = new Graph(directed);
        for (var i = 0; i < nodes.length; i++) {
            graph.addNode(nodes[i].name, i);
        }
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            graph.addEdge(link.source, link.target, i);
        }

        // FIXME
        var firstValue = nodes[0] && nodes[0].value;
        var dimSize = zrUtil.isArray(firstValue) ? firstValue.length : 1;
        var dimensionNames = ['value', 'a', 'b', 'c', 'd', 'e', 'f'].slice(0, dimSize);
        var nodeData = new List(dimensionNames, hostModel);
        nodeData.initData(nodes);

        linkList.linkToGraph(nodeData, graph);

        return graph;
    };
});