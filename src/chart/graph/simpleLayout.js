define(function (require) {

    // FIXME Where to create the simple view layout
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

                coordSys.setBoundingRect(
                    min[0], min[1], max[0] - min[0], max[1] - min[1]
                );

                coordSys.setViewRect(
                    viewRect.x, viewRect.y, viewRect.width, viewRect.height
                );

                graph.eachNode(function (node) {
                    node.setLayout(
                        coordSys.dataToPoint(positions[node.dataIndex])
                    );
                });
            }
        });
    };
});