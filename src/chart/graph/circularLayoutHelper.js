define(function (require) {
    return function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            return;
        }

        var rect = coordSys.getBoundingRect();

        var nodeData = seriesModel.getData();
        var graph = nodeData.graph;

        var angle = 0;
        var sum = nodeData.getSum('value');
        var unitAngle = Math.PI * 2 / (sum || nodeData.count());

        var cx = rect.width / 2 + rect.x;
        var cy = rect.height / 2 + rect.y;

        var r = Math.min(rect.width, rect.height) / 2;

        graph.eachNode(function (node) {
            var value = node.getValue('value');

            angle += unitAngle * (sum ? value : 2) / 2;

            node.setLayout([
                r * Math.cos(angle) + cx,
                r * Math.sin(angle) + cy
            ]);

            angle += unitAngle * (sum ? value : 2) / 2;
        });

        graph.eachEdge(function (edge) {
            var curveness = edge.getModel().get('lineStyle.normal.curveness') || 0;
            var p1 = edge.node1.getLayout();
            var p2 = edge.node2.getLayout();
            var cp1;
            if (curveness > 0) {
                cp1 = [cx, cy];
            }
            edge.setLayout([p1, p2, cp1]);
        });
    };
});