import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import {updateCenterAndZoom} from './roamHelper';

/**
 * @payload
 * @property {string} [componentType=series]
 * @property {number} [dx]
 * @property {number} [dy]
 * @property {number} [zoom]
 * @property {number} [originX]
 * @property {number} [originY]
 */
echarts.registerAction({
    type: 'geoRoam',
    event: 'geoRoam',
    update: 'updateTransform'
}, function (payload, ecModel) {
    var componentType = payload.componentType || 'series';

    ecModel.eachComponent(
        { mainType: componentType, query: payload },
        function (componentModel) {
            var geo = componentModel.coordinateSystem;
            if (geo.type !== 'geo') {
                return;
            }

            var res = updateCenterAndZoom(
                geo, payload, componentModel.get('scaleLimit')
            );

            componentModel.setCenter
                && componentModel.setCenter(res.center);

            componentModel.setZoom
                && componentModel.setZoom(res.zoom);

            // All map series with same `map` use the same geo coordinate system
            // So the center and zoom must be in sync. Include the series not selected by legend
            if (componentType === 'series') {
                zrUtil.each(componentModel.seriesGroup, function (seriesModel) {
                    seriesModel.setCenter(res.center);
                    seriesModel.setZoom(res.zoom);
                });
            }
        }
    );
});