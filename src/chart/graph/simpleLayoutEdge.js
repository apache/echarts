define(function (require) {
    return function (graph) {
        graph.eachEdge(function (edge) {
            var curveness = edge.getModel().get('lineStyle.normal.curveness') || 0;
            var p1 = edge.node1.getLayout().slice();
            var p2 = edge.node2.getLayout().slice();
            var points = [p1, p2];
            if (curveness > 0) {
                points.push([
                    (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness,
                    (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness
                ]);
            }
            edge.setLayout(points);
        });
    };
});