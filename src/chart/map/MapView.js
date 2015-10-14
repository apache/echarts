define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    require('../../echarts').extendChartView({

        type: 'map',

        render: function (mapModel, ecModel, api) {
            this.group.removeAll();

            this._renderArea(mapModel, ecModel, api);

            var offset = 0;
            zrUtil.each(mapModel.seriesGroup, function (subMapModel) {
                subMapModel.get('showLegendSymbol')
                    && this._renderSymbols(mapModel, subMapModel, ecModel, api, offset++);
            }, this);
        },

        _renderArea: function (mapModel, ecModel, api) {
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
        },

        _renderSymbols: function (mapModel, subMapModel, ecModel, api, offset) {
            var coordSys = mapModel.coordinateSystem;
            var data = subMapModel.getData();
            var group = this.group;

            data.each(function (idx) {
                var itemModel = data.getItemModel(idx);
                var labelModel = itemModel.getModel('itemStyle.normal.label');
                var textStyleModel = labelModel.getModel('textStyle');

                var name = data.getName(idx);
                var region = coordSys.getRegion(name);
                if (!region) {
                    return;
                }
                var point = coordSys.dataToPoint(
                    region.getCenter()
                );
                var circle = new graphic.Circle({
                    style: {
                        fill: data.getVisual('symbolColor')
                    },
                    shape: {
                        cx: point[0] + offset * 9,
                        cy: point[1],
                        r: 3
                    },

                    z2: 10
                });

                if (labelModel.get('show')) {
                    circle.setStyle({
                        text: offset === 0 ? name : '',
                        textFill: textStyleModel.get('color'),
                        textPosition: 'bottom',
                        textFont: textStyleModel.getFont()
                    });
                }

                group.add(circle);
            });
        }
    });
});