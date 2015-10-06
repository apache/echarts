// TODO Smooth
// TODO '-' data
define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var vector = require('zrender/core/vector');
    var DataSymbol = require('../helper/DataSymbol');
    var lineAnimationDiff = require('./lineAnimationDiff');
    var graphic = require('../../util/graphic');
    var AreaPath = require('./Area');

    function isPointsSame(points1, points2) {
        if (points1.length !== points2.length) {
            return;
        }
        for (var i = 0; i < points1.length; i++) {
            var p1 = points1[i];
            var p2 = points2[i];
            if (p1[0] !== p2[0] || p1[1] !== p2[1]) {
                return;
            }
        }
        return true;
    }

    function getAxisExtentWithGap(axis) {
        var extent = axis.getExtent();
        if (axis.onBand) {
            // Remove extra 1px to avoid line miter in clipped edge
            var halfBandWidth = axis.getBandWidth() / 2 - 1;
            var dir = extent[1] > extent[0] ? 1 : -1;
            extent[0] += dir * halfBandWidth;
            extent[1] -= dir * halfBandWidth;
        }
        return extent;
    }

    function sign(val) {
        return val >= 0 ? 1 : -1;
    }
    /**
     * @param {module:echarts/coord/cartesian/Cartesian2D|module:echarts/coord/polar/Polar} coordSys
     * @param {module:echarts/data/List} data
     * @param {Array.<Array.<number>>} points
     * @private
     */
    function getStackedOnPoints(coordSys, data, points) {
        var baseAxis = coordSys.getBaseAxis();
        var valueAxis = coordSys.getOtherAxis(baseAxis);
        var valueAxisStart = baseAxis.onZero
            ? valueAxis.dataToCoord(0) : valueAxis.getExtent()[0];

        var valueDim = valueAxis.dim;
        var baseCoordOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;

        return data.map([valueDim], function (val, idx) {
            var stackedOnSameSign;
            var stackedOn = data.stackedOn;
            if (val > 0) {
                // Find first stacked value with same sign
                while (stackedOn &&
                    sign(stackedOn.get(valueDim, idx)) === sign(val)
                ) {
                    stackedOnSameSign = stackedOn;
                    break;
                }
            }
            var pt = [];
            pt[baseCoordOffset] = points[idx][baseCoordOffset];
            pt[1 - baseCoordOffset] = stackedOnSameSign
                ? stackedOnSameSign.getItemLayout(idx)[1 - baseCoordOffset]
                : valueAxisStart;
            return pt;
        }, true);
    }

    return require('../../echarts').extendChartView({

        type: 'line',

        init: function () {
            var dataSymbol = new DataSymbol();
            this.group.add(dataSymbol.group);
            this._dataSymbol = dataSymbol;
        },

        render: function (seriesModel, ecModel) {
            var coordSys = seriesModel.coordinateSystem;
            var group = this.group;
            var data = seriesModel.getData();
            var lineStyleModel = seriesModel.getModel('itemStyle.normal.lineStyle');
            var areaStyleModel = seriesModel.getModel('itemStyle.normal.areaStyle');

            var points = data.map(data.getItemLayout, true);

            var isCoordSysPolar = coordSys.type === 'polar';
            var prevCoordSys = this._coordSys;

            var dataSymbol = this._dataSymbol;
            var polyline = this._polyline;
            var polygon = this._polygon;

            var hasAnimation = ecModel.get('animation');

            var isAreaChart = !areaStyleModel.isEmpty();
            var stackedOnPoints = getStackedOnPoints(
                coordSys, data, points
            );

            // Initialization animation or coordinate system changed
            if (
                !(polyline
                && prevCoordSys.type === coordSys.type
                && hasAnimation)
            ) {
                dataSymbol.updateData(data, hasAnimation);

                polyline = this._newPolyline(group, points, coordSys, hasAnimation);
                if (isAreaChart) {
                    polygon = this._newPolygon(
                        group, points,
                        stackedOnPoints,
                        coordSys, hasAnimation
                    );
                }
            }
            else {

                dataSymbol.updateData(data, false);

                // Update clipPath
                // FIXME Clip path used by more than one elements
                polyline.setClipPath(
                    this._createClipShape(coordSys)
                );
                polygon && polygon.setClipPath(
                    this._createClipShape(coordSys)
                );

                // In the case data zoom triggerred refreshing frequently
                // Data may not change if line has a category axis. So it should animate nothing
                // if (!isDataSame(this._data, data)) {
                    this._updateAnimation(
                        data, stackedOnPoints, coordSys
                    );
                // }
                // Add back
                group.add(polyline);
                group.add(polygon);
            }

            polyline.setStyle(zrUtil.extend(
                lineStyleModel.getLineStyle(),
                {
                    stroke: data.getVisual('color'),
                    lineJoin: 'bevel'
                }
            ));
            if (polygon) {
                polygon.style.opacity = 0.7;
                polygon.setStyle(zrUtil.defaults(
                    areaStyleModel.getAreaStyle(),
                    {
                        fill: data.getVisual('color'),
                        lineJoin: 'bevel'
                    }
                ));
            }

            this._data = data;

            // Save the coordinate system for transition animation when data changed
            this._coordSys = coordSys;
            this._stackedOnPoints = stackedOnPoints;

            !isCoordSysPolar && !seriesModel.get('showAllSymbol')
                && this._updateSymbolDisplay(data, coordSys);
        },

        /**
         * @param {module:zrender/container/Group} group
         * @param {Array.<Array.<number>>} points
         * @param {module:echarts/coord/cartesian/Cartesian2D|module:echarts/coord/polar/Polar} coordSys
         * @param {boolean} hasAnimation
         * @private
         */
        _newPolyline: function (group, points, coordSys, hasAnimation) {
            var polyline = this._polyline;
            // Remove previous created polyline
            if (polyline) {
                group.remove(polyline);
            }

            polyline = new graphic.Polyline({
                shape: {
                    points: points
                },
                silent: true,
                z2: 10
            });

            var clipPath = this._createClipShape(coordSys, hasAnimation);
            polyline.setClipPath(clipPath);

            group.add(polyline);

            this._polyline = polyline;

            return polyline;
        },

        /**
         * @param {module:zrender/container/Group} group
         * @param {Array.<Array.<number>>} stackedOnPoints
         * @param {Array.<Array.<number>>} points
         * @param {module:echarts/coord/cartesian/Cartesian2D|module:echarts/coord/polar/Polar} coordSys
         * @param {boolean} hasAnimation
         * @private
         */
        _newPolygon: function (group, points, stackedOnPoints, coordSys, hasAnimation) {
            var polygon = this._polygon;
            // Remove previous created polygon
            if (polygon) {
                group.remove(polygon);
            }

            polygon = new AreaPath({
                shape: {
                    points: points,
                    stackedOnPoints: stackedOnPoints
                },
                silent: true
            });

            var clipPath = this._createClipShape(coordSys, hasAnimation);
            polygon.setClipPath(clipPath);

            group.add(polygon);

            this._polygon = polygon;
            return polygon;
        },
        /**
         * @private
         */
        _updateSymbolDisplay: function (data, coordSys) {
            var categoryAxis = coordSys.getAxesByScale('ordinal')[0]
            // `getLabelInterval` is provided by echarts/component/axis
            if (categoryAxis && categoryAxis.getLabelInterval) {
                var labelInterval = categoryAxis.getLabelInterval();
                data.eachItemGraphicEl(function (el, idx) {
                    el.ignore = (typeof labelInterval === 'function')
                        && !labelInterval(idx, categoryAxis.scale.getItem(idx))
                        || idx % (labelInterval + 1);
                });
            }
        },

        /**
         * @private
         */
        _updateAnimation: function (data, stackedOnPoints, coordSys) {
            var polyline = this._polyline;
            var polygon = this._polygon;

            var diff = lineAnimationDiff(
                this._data, data,
                this._stackedOnPoints, stackedOnPoints,
                this._coordSys, coordSys
            );
            polyline.shape.points = diff.current;
            polyline.animateTo({
                shape: {
                    points: diff.next
                }
            }, 300, 'cubicOut');

            if (polygon) {
                var polygonShape = polygon.shape;
                polygonShape.points = diff.current;
                polygonShape.stackedOnPoints = diff.stackedOnCurrent;

                polygon.animateTo({
                    shape: {
                        points: diff.next,
                        stackedOnPoints: diff.stackedOnNext
                    }
                }, 300, 'cubicOut');
            }

            var updatedDataInfo = [];
            var addedDataIndices = [];
            var diffStatus = diff.status;

            for (var i = 0; i < diffStatus.length; i++) {
                var cmd = diffStatus[i].cmd;
                if (cmd === '=') {
                    var el = data.getItemGraphicEl(diffStatus[i].idx1);
                    if (el) {
                        updatedDataInfo.push({
                            el: el,
                            ptIdx: i    // Index of points
                        });
                    }
                }
                else if (cmd === '+') {
                    addedDataIndices.push(diffStatus[i].idx);
                }
            }

            if (polyline.animators) {
                for (var i = 0; i < addedDataIndices.length; i++) {
                    var el = data.getItemGraphicEl(addedDataIndices[i]);
                    if (el) {
                        el.scale = [0, 0];
                        el.animateTo({
                            scale: [1, 1]
                        }, 300, 300, 'cubicOut');
                    }
                }
                polyline.animators[0].during(function () {
                    for (var i = 0; i < updatedDataInfo.length; i++) {
                        var el = updatedDataInfo[i].el;
                        vector.copy(
                            el.position,
                            // synchronizing with the point on line
                            polyline.shape.points[updatedDataInfo[i].ptIdx]
                        );
                        el.dirty();
                    }
                });
            }
        },

        _createClipShape: function (coordSys, hasAnimation) {
            return coordSys.type === 'polar'
                ? this._createPolarClipShape(coordSys, hasAnimation)
                : this._createGridClipShape(coordSys, hasAnimation);
        },

        _createGridClipShape: function (cartesian, animation) {
            var xExtent = getAxisExtentWithGap(cartesian.getAxis('x'));
            var yExtent = getAxisExtentWithGap(cartesian.getAxis('y'));

            var clipPath = new graphic.Rect({
                shape: {
                    x: xExtent[0],
                    y: yExtent[0],
                    width: xExtent[1] - xExtent[0],
                    height: yExtent[1] - yExtent[0]
                }
            });

            if (animation) {
                clipPath.shape[cartesian.getBaseAxis().isHorizontal() ? 'width' : 'height'] = 0;
                clipPath.animateTo({
                    shape: {
                        width: xExtent[1] - xExtent[0],
                        height: yExtent[1] - yExtent[0]
                    }
                }, 1500);
            }

            return clipPath;
        },

        _createPolarClipShape: function (polar, animation) {
            // var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

            var radiusExtent = radiusAxis.getExtent();

            var PI2 = Math.PI * 2;

            var clipPath = new graphic.Sector({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r0: radiusExtent[0],
                    r: radiusExtent[1],
                    startAngle: 0,
                    endAngle: PI2
                }
            });

            if (animation) {
                clipPath.shape.endAngle = 0;
                clipPath.animateTo({
                    shape: {
                        endAngle: PI2
                    }
                }, 1500, animation);
            }

            return clipPath;
        },

        remove: function () {
            var group = this.group;
            group.remove(this._polyline);
            group.remove(this._polygon);
            this._dataSymbol.remove(true);
        }
    });
});