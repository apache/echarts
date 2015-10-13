define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    return require('../../echarts').extendComponentView({

        type: 'geo',

        render: function (geoModel, ecModel, api) {
            var geo = geoModel.coordinateSystem;

            var itemStyleModel = geoModel.getModel('itemStyle.normal');

            var hoverItemStyleModel = geoModel.getModel('itemStyle.emphasis');

            var itemStyle = itemStyleModel.getItemStyle();
            var hoverItemStyle = hoverItemStyleModel.getItemStyle();

            var mapGroup = new graphic.Group();
            var group = this.group;

            group.add(mapGroup);

            mapGroup.position = geo.position.slice();
            mapGroup.scale = geo.scale.slice();

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
        }
    });
});