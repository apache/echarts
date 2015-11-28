define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendChartView({
        type: 'radar',

        init: function () {
            this._symbolDraw = new SymbolDraw();
        },

        render: function (seriesModel, ecModel, api) {
            var polar = seriesModel.coordinateSystem;
            var group = this.group;

            var data = seriesModel.getData();

            var points = data.mapArray(data.getItemLayout, true);
            if (points.length < 1) {
                return;
            }
            points.push(points[0].slice());

            var polygon = this._polygon || (this._polygon = new graphic.Polygon({
                shape: {
                    points: []
                }
            }));
            var polyline = this._polyline || (this._polyline = new graphic.Polyline({
                shape: {
                    points: []
                },
                z2: 10
            }));

            var polylineShape = polyline.shape;
            var polygonShape = polygon.shape;
            function getInitialPoints() {
                return zrUtil.map(points, function (pt) {
                    return [polar.cx, polar.cy];
                });
            }
            var target = {
                shape: {
                    points: points
                }
            };
            // Initialize or data changed
            if (polylineShape.points.length !== points.length) {
                polygonShape.points = getInitialPoints();
                polylineShape.points = getInitialPoints();
                graphic.initProps(polyline, target, seriesModel);
                graphic.initProps(polygon, target, seriesModel);
            }
            else {
                graphic.updateProps(polyline, target, seriesModel);
                graphic.updateProps(polygon, target, seriesModel);
            }

            this._symbolDraw.updateData(data);

            polyline.setStyle(
                zrUtil.extend(
                    seriesModel.getModel('lineStyle.normal').getLineStyle(),
                    {
                        stroke: data.getVisual('color')
                    }
                )
            );

            var areaStyleModel = seriesModel.getModel('areaStyle.normal');
            polygon.ignore = areaStyleModel.isEmpty();
            graphic.setHoverStyle(
                polyline,
                seriesModel.getModel('lineStyle.emphasis').getLineStyle()
            );

            if (!polygon.ignore) {
                polygon.setStyle(
                    zrUtil.defaults(
                        areaStyleModel.getAreaStyle(),
                        {
                            fill: data.getVisual('color'),
                            opacity: 0.7
                        }
                    )
                );
                graphic.setHoverStyle(
                    polygon,
                    seriesModel.getModel('areaStyle.emphasis').getLineStyle()
                );
            }

            group.add(polyline);
            group.add(polygon);
            group.add(this._symbolDraw.group);

            this._data = data;
        }
    });
});