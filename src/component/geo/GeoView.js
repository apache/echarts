define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    return require('../../echarts').extendComponentView({

        type: 'geo',

        render: function (geoModel, ecModel, api) {
            var geo = geoModel.coordinateSystem;

            var areaStyleModel = geoModel.getModel('itemStyle.normal');

            var hoverAreaStyleModel = geoModel.getModel('itemStyle.emphasis');

            var areaStyle = areaStyleModel.getAreaStyle();
            var hoverAreaStyle = hoverAreaStyleModel.getAreaStyle();

            var mapGroup = new graphic.Group();
            var group = this.group;

            group.add(mapGroup);

            zrUtil.each(geo.regions, function (region) {

                var regionGroup = new graphic.Group();

                zrUtil.each(region.contours, function (contour) {

                    var polygon = new graphic.Polygon({
                        shape: {
                            points: contour
                        }
                    });

                    polygon.setStyle(areaStyle);

                    graphic.setHoverStyle(polygon, hoverAreaStyle);

                    regionGroup.add(polygon);
                });

                mapGroup.add(regionGroup);
            });
        }
    });
});