import * as vec2 from 'zrender/src/core/vector';

export function simpleLayout(seriesModel) {
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
}

export function simpleLayoutEdge(graph) {
    graph.eachEdge(function (edge) {
        var curveness = edge.getModel().get('lineStyle.curveness') || 0;
        var p1 = vec2.clone(edge.node1.getLayout());
        var p2 = vec2.clone(edge.node2.getLayout());
        var points = [p1, p2];
        if (+curveness) {
            points.push([
                (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness,
                (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness
            ]);
        }
        edge.setLayout(points);
    });
}