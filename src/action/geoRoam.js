define(function (require) {

    var zrUtil = require('zrender/core/util');
    var roamHelper = require('./roamHelper');

    var echarts = require('../echarts');
    var actionInfo = {
        type: 'geoRoam',
        event: 'geoRoam',
        update: 'updateLayout'
    };

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
    echarts.registerAction(actionInfo, function (payload, ecModel) {
        var componentType = payload.component || 'series';

        ecModel.eachComponent(componentType, function (componentModel) {
            if (componentModel.name === payload.name) {
                var geo = componentModel.coordinateSystem;
                if (geo.type !== 'geo') {
                    return;
                }

                var roamDetailModel = componentModel.getModel('roamDetail');
                var res = roamHelper.calcPanAndZoom(
                    roamDetailModel, payload, componentModel.get('scaleLimit')
                );

                componentModel.setRoamPan
                    && componentModel.setRoamPan(res.x, res.y);

                componentModel.setRoamZoom
                    && componentModel.setRoamZoom(res.zoom);

                geo && geo.setPan(res.x, res.y);
                geo && geo.setZoom(res.zoom);

                // All map series with same `map` use the same geo coordinate system
                // So the roamDetail must be in sync. Include the series not selected by legend
                if (componentType === 'series') {
                    zrUtil.each(componentModel.seriesGroup, function (seriesModel) {
                        seriesModel.setRoamPan(res.x, res.y);
                        seriesModel.setRoamZoom(res.zoom);
                    });
                }
            }
        });
    });
});