define(function (require) {

    // FIXME Where to create the simple view coordinate system
    var View = require('../../coord/View');
    var bbox = require('zrender/core/bbox');
    var layout = require('../../util/layout');

    function getViewRect(seriesModel, api) {
        return layout.parsePositionInfo({
            x: seriesModel.get('x'),
            y: seriesModel.get('y'),
            x2: seriesModel.get('x2'),
            y2: seriesModel.get('y2'),
            width: seriesModel.get('width'),
            height: seriesModel.get('height')
        }, {
            width: api.getWidth(),
            height: api.getHeight()
        });
    }

    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var layout = seriesModel.get('layout');
            if (!layout || layout === 'none') {
                var coordSys = seriesModel.coordinateSystem
                    = seriesModel.coordinateSystem || new View();
                var viewRect = getViewRect(seriesModel, api);
                var graph = seriesModel.getData().graph;
                var positions = graph.data.mapArray(function (idx) {
                    var itemModel = graph.data.getItemModel(idx);
                    return [+itemModel.get('x'), +itemModel.get('y')];
                });
                var min = [];
                var max = [];

                bbox.fromPoints(positions, min, max);

                var bbWidth = max[0] - min[0];
                var bbHeight = max[1] - min[1];

                var aspect = bbWidth / bbHeight;

                var viewWidth = viewRect.width;
                var viewHeight = viewRect.height;

                // Uniform scale on width and height
                if (viewWidth / viewHeight > aspect) {
                    viewWidth = aspect * viewHeight;
                }
                else {
                    viewHeight = aspect * viewWidth;
                }
                // Adjust x and y
                viewRect.x += (viewRect.width - viewWidth) / 2;
                viewRect.y += (viewRect.height - viewHeight) / 2;

                coordSys.setBoundingRect(
                    min[0], min[1], bbWidth, bbHeight
                );

                coordSys.setViewRect(
                    viewRect.x, viewRect.y, viewWidth, viewHeight
                );

                graph.eachNode(function (node) {
                    node.setLayout(positions[node.dataIndex]);
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