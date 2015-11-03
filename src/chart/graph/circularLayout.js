define(function (require) {
    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            if (seriesModel.get('layout') === 'circular') {
                var coordSys = seriesModel.coordinateSystem;
                if (coordSys && coordSys.type !== 'view') {
                    return;
                }

                var rect = coordSys.getBoundingRect();

                var nodeData = seriesModel.getData();
                var graph = nodeData.graph;

                var angle = 0;
                var unitAngle = Math.PI * 2 / nodeData.getSum('value');

                var cx = rect.width / 2 + rect.x;
                var cy = rect.height / 2 + rect.y;

                var r = Math.min(rect.width, rect.height) / 2;

                graph.eachNode(function (node) {
                    var value = node.getValue('value');

                    angle += unitAngle * value / 2;

                    node.setLayout([
                        r * Math.cos(angle) + cx,
                        r * Math.sin(angle) + cy
                    ]);

                    angle += unitAngle * value / 2;
                });

                graph.eachEdge(function (edge) {
                    var curveness = edge.getModel().get('lineStyle.normal.curveness');
                    var p1 = edge.node1.getLayout();
                    var p2 = edge.node2.getLayout();
                    var cp1;
                    if (curveness > 0) {
                        cp1 = [cx, cy];
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