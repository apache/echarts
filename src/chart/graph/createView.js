define(function (require) {
    // FIXME Where to create the simple view coordinate system
    var View = require('../../coord/View');
    var layout = require('../../util/layout');
    var bbox = require('zrender/core/bbox');

    function getViewRect(seriesModel, api, aspect) {
        var option = seriesModel.getBoxLayoutParams();
        option.aspect = aspect;
        return layout.getLayoutRect(option, {
            width: api.getWidth(),
            height: api.getHeight()
        });
    }

    return function (ecModel, api) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var coordSysType = seriesModel.get('coordinateSystem');
            if (!coordSysType || coordSysType === 'view') {
                var viewCoordSys = new View();

                var data = seriesModel.getData();
                var positions = data.mapArray(function (idx) {
                    var itemModel = data.getItemModel(idx);
                    return [+itemModel.get('x'), +itemModel.get('y')];
                });

                var min = [];
                var max = [];

                bbox.fromPoints(positions, min, max);

                var viewRect = getViewRect(
                    seriesModel, api, (max[0] - min[0]) / (max[1] - min[1]) || 1
                );
                // Position may be NaN, use view rect instead
                if (isNaN(min[0]) || isNaN(min[1])) {
                    min = [viewRect.x, viewRect.y];
                    max = [viewRect.x + viewRect.width, viewRect.y + viewRect.height];
                }

                var bbWidth = max[0] - min[0];
                var bbHeight = max[1] - min[1];

                var viewWidth = viewRect.width;
                var viewHeight = viewRect.height;

                viewCoordSys = seriesModel.coordinateSystem = new View();

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