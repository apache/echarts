define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var RoamController = require('../helper/RoamController');

    return require('../../echarts').extendComponentView({

        type: 'geo',

        init: function (ecModel, api) {
            var mapGroup = new graphic.Group();
            var controller = new RoamController(api.getZr(), mapGroup, null);

            this._controller = controller;

            this._mapGroup = mapGroup;
        },

        render: function (geoModel, ecModel, api) {
            var group = this.group;
            var mapGroup = this._mapGroup;

            group.removeAll();

            group.add(mapGroup);

            mapGroup.removeAll();

            var geo = geoModel.coordinateSystem;

            var itemStyleModel = geoModel.getModel('itemStyle.normal');

            var hoverItemStyleModel = geoModel.getModel('itemStyle.emphasis');

            var itemStyle = itemStyleModel.getItemStyle();
            var hoverItemStyle = hoverItemStyleModel.getItemStyle();

            var scale = geo.scale;

            mapGroup.attr({
                position: geo.position,
                scale: scale
            });

            itemStyle.lineWidth && (itemStyle.lineWidth /= scale[0]);
            hoverItemStyle.lineWidth && (hoverItemStyle.lineWidth /= scale[0]);

            zrUtil.each(geo.regions, function (region) {

                var regionGroup = new graphic.Group();

                zrUtil.each(region.contours, function (contour) {

                    var polygon = new graphic.Polygon({
                        shape: {
                            points: contour
                        }
                    });

                    polygon.setStyle(itemStyle);

                    graphic.setHoverStyle(polygon, hoverItemStyle);

                    regionGroup.add(polygon);
                });

                mapGroup.add(regionGroup);
            });

            this._updateController(geoModel, ecModel, api);
        },

        _updateController: function (geoModel, ecModel, api) {
            var geo = geoModel.coordinateSystem;
            var controller = this._controller;
            controller.off('pan')
                .off('zoom')
                .on('pan', function (dx, dy) {
                    api.dispatch({
                        type: 'geoRoam',
                        component: 'geo',
                        name: geoModel.name,
                        dx: dx,
                        dy: dy
                    });
                })
                .on('zoom', function (wheelDelta, mouseX, mouseY) {
                    api.dispatch({
                        type: 'geoRoam',
                        component: 'geo',
                        name: geoModel.name,
                        zoom: wheelDelta,
                        originX: mouseX,
                        originY: mouseY
                    });

                    // TODO Update lineWidth
                });

            controller.rect = geo.getViewBox();
        },

    });
});