define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var RoamController = require('../../component/helper/RoamController');

    require('../../echarts').extendChartView({

        type: 'map',

        init: function (ecModel, api) {
            var controller = new RoamController(api.getZr(), null, null);
            this._controller = controller;
        },

        render: function (mapModel, ecModel, api) {
            var group = this.group;
            var geo = mapModel.coordinateSystem;
            group.removeAll();

            mapModel.needsDrawMap &&
                this._renderArea(mapModel, ecModel, api);

            mapModel.get('showLegendSymbol') && ecModel.getComponent('legend')
                && this._renderSymbols(mapModel, ecModel, api);

            var controller = this._controller;
            controller.off('pan')
                .on('pan', function (dx, dy) {
                    api.dispatch({
                        type: 'geoRoam',
                        // component: 'series',
                        name: mapModel.name,
                        dx: dx,
                        dy: dy
                    });
                });

            controller.rect = geo.getViewBox();
        },

        _renderArea: function (mapModel, ecModel, api) {
            var data = mapModel.getData();

            var geo = mapModel.coordinateSystem;

            var mapGroup = new graphic.Group();
            var group = this.group;

            group.add(mapGroup);

            var scale = geo.scale;
            mapGroup.position = geo.position.slice();
            mapGroup.scale = scale.slice();

            zrUtil.each(geo.regions, function (region) {

                var regionGroup = new graphic.Group();

                var dataIdx = data.indexOfName(region.name);
                var itemModel = data.getItemModel(dataIdx);

                var itemStyleModel = itemModel.getModel('itemStyle.normal');
                var hoverItemStyleModel = itemModel.getModel('itemStyle.emphasis');

                var itemStyle = itemStyleModel.getItemStyle();
                var hoverItemStyle = hoverItemStyleModel.getItemStyle();

                // Competitable with 2.0
                var areaStylePath = 'areaStyle.color';
                itemStyle.fill = itemStyleModel.get(areaStylePath);
                hoverItemStyle.fill = hoverItemStyleModel.get('areaColor');

                var styleObj = zrUtil.defaults(
                    {
                        // Global visual color is used by symbol
                        // item visual color may be coded by dataRange
                        fill: data.getItemVisual(dataIdx, 'color', true)
                            || data.getVisual('areaColor')
                    },
                    itemStyle
                );

                styleObj.lineWidth && (styleObj.lineWidth /= scale[0]);
                hoverItemStyle.lineWidth && (hoverItemStyle.lineWidth /= scale[0]);

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

        _renderSymbols: function (mapModel, ecModel, api) {
            var data = mapModel.getData();
            var group = this.group;

            data.each('value', function (value, idx) {
                if (isNaN(value)) {
                    return;
                }
                var itemModel = data.getItemModel(idx);
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');

                var layout = data.getItemLayout(idx);
                var point = layout.point;
                var offset = layout.offset;

                var circle = new graphic.Circle({
                    style: {
                        fill: data.getVisual('color')
                    },
                    shape: {
                        cx: point[0] + offset * 9,
                        cy: point[1],
                        r: 3
                    },
                    silent: true,

                    z2: 10
                });

                if (labelModel.get('show') && !offset) {
                    circle.setStyle({
                        text: data.getName(idx),
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