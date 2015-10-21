define(function (require) {

    var RoamController = require('./RoamController');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    function MapDraw(api, updateGroup) {

        var group = new graphic.Group();

        this._controller = new RoamController(
            api.getZr(), updateGroup ? group : null, null
        );

        this.group = group;
    }

    function getFixedItemStyle(model, scale) {
        var itemStyle = model.getItemStyle();
        var areaColor = model.get('areaColor');
        if (areaColor) {
            itemStyle.fill = areaColor;
        }
        itemStyle.lineWidth && (itemStyle.lineWidth /= scale[0]);

        return itemStyle;
    }

    MapDraw.prototype = {

        constructor: MapDraw,

        draw: function (mapOrGeoModel, ecModel, api) {

            // geoModel has no data
            var data = mapOrGeoModel.getData && mapOrGeoModel.getData();

            var geo = mapOrGeoModel.coordinateSystem;

            var group = this.group;
            group.removeAll();

            var scale = geo.scale;
            group.position = geo.position.slice();
            group.scale = scale.slice();

            var itemStyleModel;
            var hoverItemStyleModel;
            var itemStyle;
            var hoverItemStyle;

            var itemStyleAccessPath = ['itemStyle', 'normal'];
            var hoverItemStyleAccessPath = ['itemStyle', 'emphasis'];
            if (!data) {
                itemStyleModel = mapOrGeoModel.getModel(itemStyleAccessPath);
                hoverItemStyleModel = mapOrGeoModel.getModel(hoverItemStyleAccessPath);

                itemStyle = getFixedItemStyle(itemStyleModel, scale);
                hoverItemStyle = getFixedItemStyle(hoverItemStyleModel, scale);
            }

            zrUtil.each(geo.regions, function (region) {

                var regionGroup = new graphic.Group();

                // Use the itemStyle in data if has data
                if (data) {
                    var dataIdx = data.indexOfName(region.name);
                    var itemModel = data.getItemModel(dataIdx);
                    var visualColor = data.getItemVisual(dataIdx, 'color');

                    itemStyleModel = itemModel.getModel(itemStyleAccessPath);
                    hoverItemStyleModel = itemModel.getModel(hoverItemStyleAccessPath);

                    itemStyle = getFixedItemStyle(itemStyleModel, scale);
                    hoverItemStyle = getFixedItemStyle(hoverItemStyleModel, scale);

                    if (visualColor) {
                        itemStyle.fill = visualColor;
                    }
                }

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

                group.add(regionGroup);
            });

            this._updateController(mapOrGeoModel, ecModel, api);
        },


        _updateController: function (mapOrGeoModel, ecModel, api) {
            var geo = mapOrGeoModel.coordinateSystem;
            var controller = this._controller;
            // FIXME mainType, subType 作为 component 的属性？
            var mainType = mapOrGeoModel.type.split('.')[0];
            controller.off('pan')
                .on('pan', function (dx, dy) {
                    api.dispatch({
                        type: 'geoRoam',
                        component: mainType,
                        name: mapOrGeoModel.name,
                        dx: dx,
                        dy: dy
                    });
                });
            controller.off('zoom')
                .on('zoom', function (wheelDelta, mouseX, mouseY) {
                    api.dispatch({
                        type: 'geoRoam',
                        component: mainType,
                        name: mapOrGeoModel.name,
                        zoom: wheelDelta,
                        originX: mouseX,
                        originY: mouseY
                    });

                    // TODO Update lineWidth
                });

            controller.rect = geo.getViewBox();
        },

    }

    return MapDraw;
});