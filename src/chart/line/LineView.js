define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendChartView({

        type: 'line',

        render: function (seriesModel, ecModel, api) {

            var data = seriesModel.getData();
            var lineStyleNormalModel = seriesModel.getModel('itemStyle.normal.lineStyle');

            var points = data.map(function (dataItem) {
                var layout = dataItem.layout;
                if (layout) {
                    return [layout.x, layout.y];
                }
            });
            var coordinateSystem = seriesModel.coordinateSystem;
            var isCoordinateSystemPolar = coordinateSystem.type === 'polar';

            // if (isCoordinateSystemPolar && points.length > 2) {
            //     // Close polyline
            //     points.push(Array.prototype.slice.call(points[0]));
            // }

            // Initialization animation
            if (!this._data) {
                var clipPath = isCoordinateSystemPolar
                    ? this._createPolarClipShape(coordinateSystem, api)
                    : this._createGridClipShape(coordinateSystem, api);

                this.group.setClipPath(clipPath);

                var polyline = new api.Polyline({
                    shape: {
                        points: points
                    },
                    style: zrUtil.merge(
                        lineStyleNormalModel.getLineStyle(),
                        {
                            stroke: seriesModel.getVisual('color')
                        },
                        true, false
                    )
                });

                this.group.add(polyline);

                this._polyline = polyline;
            }
            else {
                this._polyline.animateShape()
                    .when(500, {
                        points: points
                    })
                    .start('cubicOut');

                // Add back
                this.group.add(this._polyline);
            }

            this._data = data;
        },

        _createGridClipShape: function (cartesian, api) {
            var xAxis = cartesian.getAxis('x');
            var yAxis = cartesian.getAxis('y');
            var xExtent = xAxis.getExtent();
            var yExtent = yAxis.getExtent();

            var clipPath = new api.Rect({
                shape: {
                    x: xExtent[0],
                    y: yExtent[0],
                    width: 0,
                    height: yExtent[1] - yExtent[0]
                }
            });

            clipPath.animateTo({
                shape: {
                    x: xExtent[0],
                    y: yExtent[0],
                    width: xExtent[1] - xExtent[0],
                    height: yExtent[1] - yExtent[0]
                }
            }, 1500);

            return clipPath;
        },

        _createPolarClipShape: function (polar, api) {
            // var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

            var radiusExtent = radiusAxis.getExtent();

            var clipPath = new api.Sector({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r0: radiusExtent[0],
                    r: radiusExtent[1],
                    startAngle: 0,
                    endAngle: 0
                }
            });

            clipPath.animateTo({
                shape: {
                    endAngle: Math.PI * 2
                }
            }, 1500);

            return clipPath;
        }
    });
});