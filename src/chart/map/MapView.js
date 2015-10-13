define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    require('../../echarts').extendChartView({

        type: 'map',

        render: function (mapModel, ecModel, api) {

            this._renderMap(mapModel, ecModel, api);
        },

        _renderMap: function (mapModel, ecModel, api) {
            var data = mapModel.getData();

            var geo = mapModel.coordinateSystem;

            var mapGroup = new graphic.Group();
            var group = this.group;

            group.add(mapGroup);

            mapGroup.position = geo.position.slice();
            mapGroup.scale = geo.scale.slice();

            zrUtil.each(geo.regions, function (region) {

                var regionGroup = new graphic.Group();

                var dataIdx = data.indexOfName(region.name);
                var itemModel = data.getItemModel(dataIdx);

                var itemStyleModel = itemModel.getModel('itemStyle.normal');
                var hoverItemStyleModel = itemModel.getModel('itemStyle.emphasis');

                var itemStyle = itemStyleModel.getItemStyle();
                var hoverItemStyle = hoverItemStyleModel.getItemStyle();

                // FIXME 兼容 2.0
                var areaStylePath = 'areaStyle.color';
                itemStyle.fill = itemStyleModel.get(areaStylePath);
                hoverItemStyle.fill = hoverItemStyleModel.get(areaStylePath);

                var styleObj = zrUtil.defaults(
                    {
                        fill: data.getItemVisual(dataIdx, 'color')
                    },
                    itemStyle
                );

                zrUtil.each(region.contours, function (contour) {

                    var polygon = new graphic.Polygon({
                        shape: {
                            points: contour
                        }
                    });

                    polygon.setStyle(styleObj);

                    graphic.setHoverStyle(polygon, hoverItemStyle);

                    regionGroup.add(polygon);
                });

                mapGroup.add(regionGroup);
            });
        }
    });
});