define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var vector = require('zrender/core/vector');
    var SymbolDraw = require('../helper/SymbolDraw');
    var lineAnimationDiff = require('./lineAnimationDiff');
    var graphic = require('../../util/graphic');

    var polyHelper = require('./poly');

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

    function getSmooth(smooth) {
        return typeof (smooth) === 'number' ? smooth : (smooth ? 0.3 : 0);
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
    function getStackedOnPoints(coordSys, data) {
        var baseAxis = coordSys.getBaseAxis();
        var valueAxis = coordSys.getOtherAxis(baseAxis);
        var valueStart = baseAxis.onZero
            ? 0 : valueAxis.scale.getExtent()[0];

        var valueDim = valueAxis.dim;

        var baseDataOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;

        return data.mapArray([valueDim], function (val, idx) {
            var stackedOnSameSign;
            var stackedOn = data.stackedOn;
            // Find first stacked value with same sign
            while (stackedOn &&
                sign(stackedOn.get(valueDim, idx)) === sign(val)
            ) {
                stackedOnSameSign = stackedOn;
                break;
            }
            var stackedData = [];
            stackedData[baseDataOffset] = data.get(baseAxis.dim, idx);
            stackedData[1 - baseDataOffset] = stackedOnSameSign
                ? stackedOnSameSign.get(valueDim, idx, true) : valueStart;

            return coordSys.dataToPoint(stackedData);
        }, true);
    }

    return require('../../echarts').extendChartView({

        type: 'line',

        init: function () {
            var symbolDraw = new SymbolDraw();
            this.group.add(symbolDraw.group);
            this._symbolDraw = symbolDraw;
        },

        render: function (seriesModel, ecModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            var group = this.group;
            var data = seriesModel.getData();
            var lineStyleModel = seriesModel.getModel('lineStyle.normal');
            var areaStyleModel = seriesModel.getModel('areaStyle.normal');

            var points = data.mapArray(data.getItemLayout, true);

            var isCoordSysPolar = coordSys.type === 'polar';
            var prevCoordSys = this._coordSys;

            var symbolDraw = this._symbolDraw;
            var polyline = this._polyline;
            var polygon = this._polygon;

            var hasAnimation = ecModel.get('animation');

            var isAreaChart = !areaStyleModel.isEmpty();
            var stackedOnPoints = getStackedOnPoints(coordSys, data);


            var isSymbolIgnore = !isCoordSysPolar && !seriesModel.get('showAllSymbol')
                && this._getSymbolIgnoreFunc(data, coordSys);

            // Initialization animation or coordinate system changed
            if (
                !(polyline
                && prevCoordSys.type === coordSys.type)
            ) {
                symbolDraw.updateData(data, api, isSymbolIgnore);
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
                // Update clipPath
                // FIXME Clip path used by more than one elements
                if (hasAnimation) {
                    polyline.setClipPath(
                        this._createClipShape(coordSys)
                    );
                    polygon && polygon.setClipPath(
                        this._createClipShape(coordSys)
                    );
                }

                // In the case data zoom triggerred refreshing frequently
                // Data may not change if line has a category axis. So it should animate nothing
                if (!isPointsSame(this._stackedOnPoints, stackedOnPoints)
                    || !isPointsSame(this._points, points)
                ) {
                    symbolDraw.updateData(data, api, isSymbolIgnore);

                    if (hasAnimation) {
                        this._updateAnimation(
                            data, stackedOnPoints, coordSys, api
                        );
                    }
                    else {
                        polyline.setShape({
                            points: points
                        });
                        polygon && polygon.setShape({
                            points: points,
                            stackedOnPoints: stackedOnPoints
                        });
                    }
                }
                // Add back
                group.add(polyline);
                group.add(polygon);
            }

            polyline.setStyle(zrUtil.defaults(
                // Use color in lineStyle first
                lineStyleModel.getLineStyle(),
                {
                    stroke: data.getVisual('color'),
                    lineJoin: 'bevel'
                }
            ));

            var smooth = seriesModel.get('smooth');
            smooth = getSmooth(seriesModel.get('smooth'));
            polyline.shape.smooth = smooth;

            if (polygon) {
                var polygonShape = polygon.shape;
                var stackedOn = data.stackedOn;
                var stackedOnSmooth = 0;

                polygon.style.opacity = 0.7;
                polygon.setStyle(zrUtil.defaults(
                    areaStyleModel.getAreaStyle(),
                    {
                        fill: data.getVisual('color'),
                        lineJoin: 'bevel'
                    }
                ));
                polygonShape.smooth = smooth;

                if (stackedOn) {
                    var stackedOnSeries = stackedOn.hostModel;
                    stackedOnSmooth = getSmooth(stackedOnSeries.get('smooth'));
                }

                polygonShape.stackedOnSmooth = stackedOnSmooth;
            }

            this._data = data;
            // Save the coordinate system for transition animation when data changed
            this._coordSys = coordSys;
            this._stackedOnPoints = stackedOnPoints;
            this._points = points;
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

            polyline = new polyHelper.Polyline({
                shape: {
                    points: points
                },
                silent: true,
                z2: 10
            });

            if (hasAnimation) {
                var clipPath = this._createClipShape(coordSys, true);
                polyline.setClipPath(clipPath);
            }

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

            polygon = new polyHelper.Polygon({
                shape: {
                    points: points,
                    stackedOnPoints: stackedOnPoints
                },
                silent: true
            });

            if (hasAnimation) {
                var clipPath = this._createClipShape(coordSys, true);
                polygon.setClipPath(clipPath);
            }

            group.add(polygon);

            this._polygon = polygon;
            return polygon;
        },
        /**
         * @private
         */
        _getSymbolIgnoreFunc: function (data, coordSys) {
            var categoryAxis = coordSys.getAxesByScale('ordinal')[0];
            // `getLabelInterval` is provided by echarts/component/axis
            if (categoryAxis && categoryAxis.getLabelInterval) {
                var labelInterval = categoryAxis.getLabelInterval();
                return function (idx) {
                    return (typeof labelInterval === 'function')
                            && !labelInterval(idx, categoryAxis.scale.getItem(idx))
                            || idx % (labelInterval + 1);
                };
            }
        },

        /**
         * @private
         */
        _updateAnimation: function (data, stackedOnPoints, coordSys, api) {
            var polyline = this._polyline;
            var polygon = this._polygon;

            var diff = lineAnimationDiff(
                this._data, data,
                this._stackedOnPoints, stackedOnPoints,
                this._coordSys, coordSys
            );
            polyline.shape.points = diff.current;

            api.updateGraphicEl(polyline, {
                shape: {
                    points: diff.next
                }
            });

            if (polygon) {
                polygon.setShape({
                    points: diff.current,
                    stackedOnPoints: diff.stackedOnCurrent
                });
                api.updateGraphicEl(polygon, {
                    shape: {
                        points: diff.next,
                        stackedOnPoints: diff.stackedOnNext
                    }
                });
            }

            var updatedDataInfo = [];
            var diffStatus = diff.status;

            for (var i = 0; i < diffStatus.length; i++) {
                var cmd = diffStatus[i].cmd;
                if (cmd === '=') {
                    var el = data.getItemGraphicEl(diffStatus[i].idx1);
                    if (el) {
                        el.stopAnimation();
                        updatedDataInfo.push({
                            el: el,
                            ptIdx: i    // Index of points
                        });
                    }
                }
            }

            if (polyline.animators) {
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
                }, 1000);
            }

            return clipPath;
        },

        _createPolarClipShape: function (polar, animation) {
            var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

            var radiusExtent = radiusAxis.getExtent();
            var angleExtent = angleAxis.getExtent();

            var RADIAN = Math.PI / 180;

            var clipPath = new graphic.Sector({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r0: radiusExtent[0],
                    r: radiusExtent[1],
                    startAngle: -angleExtent[0] * RADIAN,
                    endAngle: -angleExtent[1] * RADIAN,
                    clockwise: angleAxis.inverse
                }
            });

            if (animation) {
                clipPath.shape.endAngle = -angleExtent[0] * RADIAN;
                clipPath.animateTo({
                    shape: {
                        endAngle: -angleExtent[1] * RADIAN
                    }
                }, 1500, animation);
            }

            return clipPath;
        },

        remove: function (ecModel, api) {
            var group = this.group;
            group.remove(this._polyline);
            group.remove(this._polygon);
            this._symbolDraw.remove(api, true);
        }
    });
});