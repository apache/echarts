define(function (require) {

    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var layout = seriesModel.get('layout');
            if (!layout || layout === 'none') {
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
                    var curveness = edge.getModel().get('lineStyle.normal.curveness');
                    var p1 = edge.node1.getLayout();
                    var p2 = edge.node2.getLayout();
                    var cp1;
                    var inv = 1;
                    if (curveness > 0) {
                        cp1 = [
                            (p1[0] + p2[0]) / 2 - inv * (p1[1] - p2[1]) * curveness,
                            (p1[1] + p2[1]) / 2 - inv * (p2[0] - p1[0]) * curveness
                        ];
                    }
                    var shape = {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    };
                    if (cp1) {
                        shape.cpx1 = cp1[0];
                        shape.cpy1 = cp1[1];
                    }
                    edge.setLayout(shape);
                });

            }
        });
    };
});