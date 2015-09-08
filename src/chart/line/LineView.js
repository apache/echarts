define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var DataSymbol = require('../helper/DataSymbol');

    return require('../../echarts').extendChartView({

        type: 'line',

        init: function () {
            this._dataSymbol = new DataSymbol();
            this.group.add(this._dataSymbol.group);
        },

        render: function (seriesModel, ecModel, api) {
            var group = this.group;
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

            if (
                isCoordinateSystemPolar
                && points.length > 2
                && coordinateSystem.getAngleAxis().type === 'category'
            ) {
                // Close polyline
                points.push(Array.prototype.slice.call(points[0]));
            }

            // Initialization animation
            if (!this._data) {
                var polyline = new api.Polyline({
                    shape: {
                        points: points
                    },
                    style: zrUtil.extend(
                        lineStyleNormalModel.getLineStyle(),
                        {
                            stroke: seriesModel.getVisual('color')
                        }
                    )
                });

                var removeClipPath = zrUtil.bind(polyline.removeClipPath, polyline);

                var clipPath = isCoordinateSystemPolar
                    ? this._createPolarClipShape(coordinateSystem, api, removeClipPath)
                    : this._createGridClipShape(coordinateSystem, api, removeClipPath);

                polyline.setClipPath(clipPath);

                group.add(polyline);

                this._polyline = polyline;
            }
            else {
                // FIXME Handle the situation of adding and removing data
                this._polyline.animateTo({
                    shape: {
                        points: points
                    }
                }, 500, 'cubicOut');
                // this._polyline.shape.points = points;
                // this._polyline.dirty(true);

                // Add back
                group.add(this._polyline);
            }

            var dataSymbol = this._dataSymbol;
            dataSymbol.z = seriesModel.get('z') + 1;
            // Draw symbols
            dataSymbol.updateData(data);

            this._data = data;
        },

        _createGridClipShape: function (cartesian, api, cb) {
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
            }, 1500, cb);

            return clipPath;
        },

        _createPolarClipShape: function (polar, api, cb) {
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
            }, 1500, cb);

            return clipPath;
        },

        remove: function () {
            this.group.remove(this._polyline);
            this._dataSymbol.remove();
        }
    });
});