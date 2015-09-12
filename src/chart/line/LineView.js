// TODO Area
// TODO Null data
define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var vector = require('zrender/core/vector');
    var DataSymbol = require('../helper/DataSymbol');
    var lineAnimationDiff = require('./lineAnimationDiff');

    function isPointsSame(points1, points2) {
        if (points1.length !== points2.length) {
            return;
        }
        for (var i = 0; i < points1.length; i++) {
            var p1 = points1[i].point;
            var p2 = points2[i].point;
            if (p1[0] !== p2[0] || p1[1] !== p2[1]) {
                return;
            }
        }
        return true;
    }

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
            var pointsWithName = data.map(function (dataItem, idx) {
                return {
                    name: dataItem.name,
                    point: points[idx]
                };
            });

            var coordinateSystem = seriesModel.coordinateSystem;
            var isCoordinateSystemPolar = coordinateSystem.type === 'polar';

            // FIXME Update after animation
            if (
                isCoordinateSystemPolar
                && points.length > 2
                && coordinateSystem.getAngleAxis().type === 'category'
            ) {
                // Close polyline
                points.push(Array.prototype.slice.call(points[0]));
            }

            // Draw symbols, enable animation on the first draw
            var dataSymbol = this._dataSymbol;
            dataSymbol.z = seriesModel.get('z') + 1;

            // Initialization animation
            if (!this._data) {
                dataSymbol.updateData(data, false);

                var polyline = new api.Polyline({
                    shape: {
                        points: points
                    },
                    style: zrUtil.extend(
                        lineStyleNormalModel.getLineStyle(),
                        {
                            stroke: seriesModel.getVisual('color'),
                            lineJoin: 'bevel'
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
                dataSymbol.updateData(data, false);
                // In the case data zoom triggerred refreshing frequently
                // Data may not change if line has a category axis. So it should animate nothing
                if (! isPointsSame(this._pointsWithName, pointsWithName)) {
                    this._updateAnimation(data, pointsWithName);
                }
                // Add back
                group.add(this._polyline);
            }

            this._data = data;

            this._pointsWithName = pointsWithName;
        },

        _updateAnimation: function (data, pointsWithName) {
            var polyline = this._polyline;
            var diff = lineAnimationDiff(this._pointsWithName, pointsWithName);
            polyline.shape.points = diff.current;
            // FIXME Handle the situation of adding and removing data
            polyline.animateTo({
                shape: {
                    points: diff.next
                }
            }, 300, 'cubicOut');

            var updatedDataIndices = [];
            var diffStatus = diff.status;
            var symbolElements = this._dataSymbol.getSymbolElements();

            for (var i = 0; i < diffStatus.length; i++) {
                if (diffStatus[i] === '=') {
                    updatedDataIndices.push(i);
                }
            }

            if (polyline.animators) {
                polyline.animators[0].during(function () {
                    // Symbol elements may be more than updatedDataIndices if there is new added data
                    for (var i = 0; i < updatedDataIndices.length; i++) {
                        vector.copy(
                            symbolElements[i].position,
                            // synchronizing whith the point on line
                            polyline.shape.points[updatedDataIndices[i]]
                        );
                        symbolElements[i].dirty();
                    }
                });
            }
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
            this._dataSymbol.remove(true);
        }
    });
});