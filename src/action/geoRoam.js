define(function (require) {

    var zrUtil = require('zrender/core/util');
    var roamHelper = require('./roamHelper');

    var echarts = require('../echarts');

    /**
     * @payload
     * @property {string} [component=series]
     * @property {string} name Component name
     * @property {number} [dx]
     * @property {number} [dy]
     * @property {number} [zoom]
     * @property {number} [originX]
     * @property {number} [originY]
     */
    echarts.registerAction({
        type: 'geoRoam',
        event: 'geoRoam',
        update: 'updateLayout'
    }, function (payload, ecModel) {
        var componentType = payload.component || 'series';

        ecModel.eachComponent(componentType, function (componentModel) {
            if (componentModel.name === payload.name) {
                var geo = componentModel.coordinateSystem;
                if (geo.type !== 'geo') {
                    return;
                }

                var res = roamHelper.updateCenterAndZoom(
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
        });
    });
});