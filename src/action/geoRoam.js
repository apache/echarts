define(function (require) {

    var zrUtil = require('zrender/core/util');

    var echarts = require('../../echarts');
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
                var dx = payload.dx;
                var dy = payload.dy;
                var zoom = payload.zoom;
                var geo = componentModel.coordinateSystem;
                if (geo.type !== 'geo') {
                    return;
                }

                var roamDetailModel = componentModel.getModel('roamDetail');
                var panX = roamDetailModel.get('x') || 0;
                var panY = roamDetailModel.get('y') || 0;
                var previousZoom = roamDetailModel.get('zoom') || 1;

                if (dx != null && dy != null) {
                    // FIXME Must divide mapScale ?
                    panX += dx;
                    panY += dy;

                    componentModel.setRoamPan
                        && componentModel.setRoamPan(panX, panY);

                    geo && geo.setPan(panX, panY);

                }
                if (zoom != null) {
                    var fixX = (payload.originX - panX) * (zoom - 1);
                    var fixY = (payload.originY - panY) * (zoom - 1);

                    panX -= fixX;
                    panY -= fixY;

                    geo && geo.setPan(panX, panY);

                    componentModel.setRoamPan
                        && componentModel.setRoamPan(panX, panY);

                    geo && geo.setZoom(zoom * previousZoom);
                    componentModel.setRoamZoom
                        && componentModel.setRoamZoom(zoom * previousZoom);
                }

                // All map series with same `map` use the same geo coordinate system
                // So the roamDetail must be in sync. Include the series not selected by legend
                if (componentType === 'series') {
                    zrUtil.each(componentModel.seriesGroup, function (seriesModel) {
                        if (dx != null && dy != null) {
                            seriesModel.setRoamPan(panX, panY);
                        }
                        if (zoom != null) {
                            seriesModel.setRoamZoom(zoom * previousZoom);
                        }
                    })
                }
            }
        });
    });
});