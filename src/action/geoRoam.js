define(function (require) {

    var echarts = require('../../echarts');
    var actionInfo = {
        type: 'geoRoam',
        event: 'geoRoam',
        update: 'updateView'
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
                if (dx != null && dy != null) {
                    var mapScale = geo.mapScale;

                    var panX = (roamDetailModel.get('x') || 0) + dx / mapScale[0];
                    var panY = (roamDetailModel.get('y') || 0) + dy / mapScale[1];

                    componentModel.setRoamPan
                        && componentModel.setRoamPan(panX, panY);

                    geo && geo.setPan(panX, panY);

                }
                if (zoom != null && componentModel.setRoamZoom) {
                    var previousZoom = roamDetailModel.get('zoom') || 1;

                    zoom *= previousZoom;
                    componentModel.setRoamZoom(zoom);

                    geo && geo.setZoom(zoom);
                }
            }
        });
    });
});