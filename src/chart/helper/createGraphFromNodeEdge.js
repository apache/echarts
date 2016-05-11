define(function (require) {

    var List = require('../../data/List');
    var Graph = require('../../data/Graph');
    var linkList = require('../../data/helper/linkList');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var CoordinateSystem = require('../../CoordinateSystem');
    var zrUtil = require('zrender/core/util');
    var createListFromArray = require('./createListFromArray');

    return function (nodes, edges, hostModel, directed, beforeLink) {
        var graph = new Graph(directed);
        for (var i = 0; i < nodes.length; i++) {
            graph.addNode(zrUtil.retrieve(
                // Id, name, dataIndex
                nodes[i].id, nodes[i].name, i
            ), i);
        }

        var linkNameList = [];
        var validEdges = [];
        for (var i = 0; i < edges.length; i++) {
            var link = edges[i];
            var source = link.source;
            var target = link.target;
            // addEdge may fail when source or target not exists
            if (graph.addEdge(source, target, i)) {
                validEdges.push(link);
                linkNameList.push(zrUtil.retrieve(link.id, source + ' > ' + target));
            }
        }

        var coordSys = hostModel.get('coordinateSystem');
        var nodeData;
        if (coordSys === 'cartesian2d' || coordSys === 'polar') {
            nodeData = createListFromArray(nodes, hostModel, hostModel.ecModel);
        }
        else {
            // FIXME
            var coordSysCtor = CoordinateSystem.get(coordSys);
            // FIXME
            var dimensionNames = completeDimensions(
                ((coordSysCtor && coordSysCtor.type !== 'view') ? (coordSysCtor.dimensions || []) : []).concat(['value']),
                nodes
            );
            nodeData = new List(dimensionNames, hostModel);
            nodeData.initData(nodes);
        }

        var edgeData = new List(['value'], hostModel);
        edgeData.initData(validEdges, linkNameList);

        beforeLink && beforeLink(nodeData, edgeData);

        linkList({
            mainData: nodeData,
            struct: graph,
            structAttr: 'graph',
            datas: {node: nodeData, edge: edgeData},
            datasAttr: {node: 'data', edge: 'edgeData'}
        });

        // Update dataIndex of nodes and edges because invalid edge may be removed
        graph.update();

        return graph;
    };
});