define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    require('../../echarts').extendChartView({

        type: 'map',

        render: function (mapModel, ecModel, api) {

            this._renderMap(mapModel, ecModel, api);
        },

        _renderMap: function (mapModel, ecModel, api) {
            var areaStyleModel = mapModel.getModel('itemStyle.normal.areaStyle');
            var hoverAreaStyleModel = mapModel.getModel('itemStyle.emphasis.areaStyle');

            var areaStyle = areaStyleModel.getAreaStyle();
            var hoverAreaStyle = hoverAreaStyleModel.getAreaStyle();

            var data = mapModel.getData();

            var geo = mapModel.coordinateSystem;

            var mapGroup = new graphic.Group();
            var group = this.group;

            group.add(mapGroup);

            mapGroup.position = geo.position.slice();
            mapGroup.scale = geo.scale.slice();

            zrUtil.each(geo.regions, function (region) {

                var regionGroup = new graphic.Group();

                var styleObj = zrUtil.defaults(
                    {
                        color: data.getItemVisual(
                            data.indexOfName(region.name),
                            'color'
                        )
                    },
                    areaStyle
                );

                zrUtil.each(region.contours, function (contour) {

                    var polygon = new graphic.Polygon({
                        shape: {
                            points: contour
                        }
                    });

                    polygon.setStyle(styleObj);

                    graphic.setHoverStyle(polygon, hoverAreaStyle);

                    regionGroup.add(polygon);
                });

                mapGroup.add(regionGroup);
            });
        }
    });
});