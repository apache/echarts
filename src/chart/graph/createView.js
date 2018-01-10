// FIXME Where to create the simple view coordinate system
import View from '../../coord/View';
import {getLayoutRect} from '../../util/layout';
import * as bbox from 'zrender/src/core/bbox';

function getViewRect(seriesModel, api, aspect) {
    var option = seriesModel.getBoxLayoutParams();
    option.aspect = aspect;
    return getLayoutRect(option, {
        width: api.getWidth(),
        height: api.getHeight()
    });
}

export default function (ecModel, api) {
    var viewList = [];
    ecModel.eachSeriesByType('graph', function (seriesModel) {
        var coordSysType = seriesModel.get('coordinateSystem');
        if (!coordSysType || coordSysType === 'view') {

            var data = seriesModel.getData();
            var positions = data.mapArray(function (idx) {
                var itemModel = data.getItemModel(idx);
                return [+itemModel.get('x'), +itemModel.get('y')];
            });

            var min = [];
            var max = [];

            bbox.fromPoints(positions, min, max);

            // If width or height is 0
            if (max[0] - min[0] === 0) {
                max[0] += 1;
                min[0] -= 1;
            }
            if (max[1] - min[1] === 0) {
                max[1] += 1;
                min[1] -= 1;
            }
            var aspect = (max[0] - min[0]) / (max[1] - min[1]);
            // FIXME If get view rect after data processed?
            var viewRect = getViewRect(seriesModel, api, aspect);
            // Position may be NaN, use view rect instead
            if (isNaN(aspect)) {
                min = [viewRect.x, viewRect.y];
                max = [viewRect.x + viewRect.width, viewRect.y + viewRect.height];
            }

            var bbWidth = max[0] - min[0];
            var bbHeight = max[1] - min[1];

            var viewWidth = viewRect.width;
            var viewHeight = viewRect.height;

            var viewCoordSys = seriesModel.coordinateSystem = new View();
            viewCoordSys.zoomLimit = seriesModel.get('scaleLimit');

            viewCoordSys.setBoundingRect(
                min[0], min[1], bbWidth, bbHeight
            );
            viewCoordSys.setViewRect(
                viewRect.x, viewRect.y, viewWidth, viewHeight
            );

            // Update roam info
            viewCoordSys.setCenter(seriesModel.get('center'));
            viewCoordSys.setZoom(seriesModel.get('zoom'));

            viewList.push(viewCoordSys);
        }
    });

    return viewList;
}