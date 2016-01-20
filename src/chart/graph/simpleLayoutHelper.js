define(function (require) {
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

        graph.eachEdge(function (edge) {
            var curveness = edge.getModel().get('lineStyle.normal.curveness') || 0;
            var p1 = edge.node1.getLayout();
            var p2 = edge.node2.getLayout();
            var cp1;
            if (curveness > 0) {
                cp1 = [
                    (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness,
                    (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness
                ];
            }
            edge.setLayout([p1, p2, cp1]);
        });
    };
});