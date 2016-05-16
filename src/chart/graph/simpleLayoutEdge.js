define(function (require) {
    var vec2 = require('zrender/core/vector');
    return function (graph) {
        graph.eachEdge(function (edge) {
            var curveness = edge.getModel().get('lineStyle.normal.curveness') || 0;
            var p1 = vec2.clone(edge.node1.getLayout());
            var p2 = vec2.clone(edge.node2.getLayout());
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