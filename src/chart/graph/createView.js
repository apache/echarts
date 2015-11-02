define(function (require) {
    // FIXME Where to create the simple view coordinate system
    var View = require('../../coord/View');
    var layout = require('../../util/layout');
    var bbox = require('zrender/core/bbox');

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
            var coordSysType = seriesModel.get('coordinateSystem');
            if (!coordSysType || coordSysType === 'view') {
                var viewCoordSys = new View();
                var viewRect = getViewRect(seriesModel, api);

                var data = seriesModel.getData();
                var positions = data.mapArray(function (idx) {
                    var itemModel = data.getItemModel(idx);
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

                viewCoordSys = seriesModel.coordinateSystem = new View();

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

                viewCoordSys.setBoundingRect(
                    min[0], min[1], bbWidth, bbHeight
                );
                viewCoordSys.setViewRect(
                    viewRect.x, viewRect.y, viewWidth, viewHeight
                );

                // Update roam info
                var roamDetailModel = seriesModel.getModel('roamDetail');
                viewCoordSys.setPan(roamDetailModel.get('x') || 0, roamDetailModel.get('y') || 0);
                viewCoordSys.setZoom(roamDetailModel.get('zoom') || 1);
            }
        });
    };
});