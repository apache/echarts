define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');

    return require('../../echarts').extendChartView({
        type: 'radar',

        render: function (seriesModel, ecModel, api) {
            var polar = seriesModel.coordinateSystem;
            var group = this.group;

            var data = seriesModel.getData();
            var oldData = this._data;

            function updateSymbols(oldPoints, newPoints, itemGroup) {

            }

            function getInitialPoints(points) {
                return zrUtil.map(points, function (pt) {
                    return [polar.cx, polar.cy];
                });
            }
            data.diff(oldData)
                .add(function (idx) {
                    var points = data.getItemLayout(idx);
                    var polygon = new graphic.Polygon();
                    var polyline = new graphic.Polyline();
                    var target = {
                        shape: {
                            points: points
                        }
                    };
                    polygon.shape.points = getInitialPoints(points);
                    polyline.shape.points = getInitialPoints(points);
                    graphic.initProps(polygon, target, seriesModel);
                    graphic.initProps(polyline, target, seriesModel);

                    var itemGroup = new graphic.Group();
                    itemGroup.add(polyline);
                    itemGroup.add(polygon);

                    data.setItemGraphicEl(idx, itemGroup);
                })
                .update(function (newIdx, oldIdx) {
                    var itemGroup = oldData.getItemGraphicEl(oldIdx);
                    var polyline = itemGroup.childAt(0);
                    var polygon = itemGroup.childAt(1);
                    var target = {
                        shape: {
                            points: data.getItemLayout(newIdx)
                        }
                    };
                    graphic.updateProps(polyline, target, seriesModel);
                    graphic.updateProps(polygon, target, seriesModel);

                    data.setItemGraphicEl(newIdx, itemGroup);
                })
                .remove(function (idx) {
                    group.remove(oldData.getItemGraphicEl(idx));
                })
                .execute();

            data.eachItemGraphicEl(function (itemGroup, idx) {
                var itemModel = data.getItemModel(idx);
                var polyline = itemGroup.childAt(0);
                var polygon = itemGroup.childAt(1);
                group.add(itemGroup);

                polyline.setStyle(
                    zrUtil.extend(
                        itemModel.getModel('lineStyle.normal').getLineStyle(),
                        {
                            stroke: data.getItemVisual(idx, 'color')
                        }
                    )
                );
                polyline.hoverStyle = itemModel.getModel('lineStyle.emphasis').getLineStyle();

                var areaStyleModel = itemModel.getModel('areaStyle.normal');
                polygon.ignore = areaStyleModel.isEmpty()
                    && areaStyleModel.parentModel.isEmpty();

                if (!polygon.ignore) {
                    polygon.setStyle(
                        zrUtil.defaults(
                            areaStyleModel.getAreaStyle(),
                            {
                                fill: data.getItemVisual(idx, 'color'),
                                opacity: 0.7
                            }
                        )
                    );
                    polygon.hoverStyle = itemModel.getModel('areaStyle.emphasis').getAreaStyle();
                }
                graphic.setHoverStyle(itemGroup);
            });

            this._data = data;
        }
    });
});