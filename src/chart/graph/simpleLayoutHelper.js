define(function (require) {

    var simpleLayoutEdge = require('./simpleLayoutEdge');

    return function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            return;
        }
        var graph = seriesModel.getGraph();

        graph.eachNode(function (node) {
            var model = node.getModel();
            node.setLayout([+model.get('x'), +model.get('y')]);
        });

        simpleLayoutEdge(graph);
    };
});