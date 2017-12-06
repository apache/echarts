import * as vec2 from 'zrender/src/core/vector';

export function circularLayout(seriesModel) {
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

        angle += unitAngle * (sum ? value : 1) / 2;

        node.setLayout([
            r * Math.cos(angle) + cx,
            r * Math.sin(angle) + cy
        ]);

        angle += unitAngle * (sum ? value : 1) / 2;
    });

    nodeData.setLayout({
        cx: cx,
        cy: cy
    });

    graph.eachEdge(function (edge) {
        var curveness = edge.getModel().get('lineStyle.normal.curveness') || 0;
        var p1 = vec2.clone(edge.node1.getLayout());
        var p2 = vec2.clone(edge.node2.getLayout());
        var cp1;
        var x12 = (p1[0] + p2[0]) / 2;
        var y12 = (p1[1] + p2[1]) / 2;
        if (+curveness) {
            curveness *= 3;
            cp1 = [
                cx * curveness + x12 * (1 - curveness),
                cy * curveness + y12 * (1 - curveness)
            ];
        }
        edge.setLayout([p1, p2, cp1]);
    });
}