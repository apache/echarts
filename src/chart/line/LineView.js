define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var SymbolDraw = require('../helper/SymbolDraw');
    var Symbol = require('../helper/Symbol');
    var lineAnimationDiff = require('./lineAnimationDiff');
    var graphic = require('../../util/graphic');

    var polyHelper = require('./poly');

    var ChartView = require('../../view/Chart');

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
        var extent = axis.getGlobalExtent();
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

    function queryDataIndex(data, payload) {
        if (payload.dataIndex != null) {
            return payload.dataIndex;
        }
        else if (payload.name != null) {
            return data.indexOfName(payload.name);
        }
    }

    function createGridClipShape(cartesian, hasAnimation, seriesModel) {
        var xExtent = getAxisExtentWithGap(cartesian.getAxis('x'));
        var yExtent = getAxisExtentWithGap(cartesian.getAxis('y'));
        var isHorizontal = cartesian.getBaseAxis().isHorizontal();

        var x = Math.min(xExtent[0], xExtent[1]);
        var y = Math.min(yExtent[0], yExtent[1]);
        var width = Math.max(xExtent[0], xExtent[1]) - x;
        var height = Math.max(yExtent[0], yExtent[1]) - y;
        var lineWidth = seriesModel.get('lineStyle.normal.width') || 2;
        // Expand clip shape to avoid clipping when line value exceeds axis
        var expandSize = seriesModel.get('clipOverflow') ? lineWidth / 2 : Math.max(width, height);
        if (isHorizontal) {
            y -= expandSize;
            height += expandSize * 2;
        }
        else {
            x -= expandSize;
            width += expandSize * 2;
        }

        var clipPath = new graphic.Rect({
            shape: {
                x: x,
                y: y,
                width: width,
                height: height
            }
        });

        if (hasAnimation) {
            clipPath.shape[isHorizontal ? 'width' : 'height'] = 0;
            graphic.initProps(clipPath, {
                shape: {
                    width: width,
                    height: height
                }
            }, seriesModel);
        }

        return clipPath;
    }

    function createPolarClipShape(polar, hasAnimation, seriesModel) {
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

        if (hasAnimation) {
            clipPath.shape.endAngle = -angleExtent[0] * RADIAN;
            graphic.initProps(clipPath, {
                shape: {
                    endAngle: -angleExtent[1] * RADIAN
                }
            }, seriesModel);
        }

        return clipPath;
    }

    function createClipShape(coordSys, hasAnimation, seriesModel) {
        return coordSys.type === 'polar'
            ? createPolarClipShape(coordSys, hasAnimation, seriesModel)
            : createGridClipShape(coordSys, hasAnimation, seriesModel);
    }

    return ChartView.extend({

        type: 'line',

        init: function () {
            var lineGroup = new graphic.Group();

            var symbolDraw = new SymbolDraw();
            this.group.add(symbolDraw.group);

            this._symbolDraw = symbolDraw;
            this._lineGroup = lineGroup;
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

            var lineGroup = this._lineGroup;

            var hasAnimation = seriesModel.get('animation');

            var isAreaChart = !areaStyleModel.isEmpty();
            var stackedOnPoints = getStackedOnPoints(coordSys, data);

            var showSymbol = seriesModel.get('showSymbol');

            var isSymbolIgnore = showSymbol && !isCoordSysPolar && !seriesModel.get('showAllSymbol')
                && this._getSymbolIgnoreFunc(data, coordSys);

            // Remove temporary symbols
            var oldData = this._data;
            oldData && oldData.eachItemGraphicEl(function (el, idx) {
                if (el.__temp) {
                    group.remove(el);
                    oldData.setItemGraphicEl(idx, null);
                }
            });

            // Remove previous created symbols if showSymbol changed to false
            if (!showSymbol) {
                symbolDraw.remove();
            }

            group.add(lineGroup);

            // Initialization animation or coordinate system changed
            if (
                !(polyline && prevCoordSys.type === coordSys.type)
            ) {
                showSymbol && symbolDraw.updateData(data, isSymbolIgnore);

                polyline = this._newPolyline(points, coordSys, hasAnimation);
                if (isAreaChart) {
                    polygon = this._newPolygon(
                        points, stackedOnPoints,
                        coordSys, hasAnimation
                    );
                }
                lineGroup.setClipPath(createClipShape(coordSys, true, seriesModel));
            }
            else {
                if (isAreaChart && !polygon) {
                    // If areaStyle is added
                    polygon = this._newPolygon(
                        points, stackedOnPoints,
                        coordSys, hasAnimation
                    );
                }
                else if (polygon && !isAreaChart) {
                    // If areaStyle is removed
                    lineGroup.remove(polygon);
                    polygon = this._polygon = null;
                }

                // Update clipPath
                lineGroup.setClipPath(createClipShape(coordSys, false, seriesModel));

                // Always update, or it is wrong in the case turning on legend
                // because points are not changed
                showSymbol && symbolDraw.updateData(data, isSymbolIgnore);

                // Stop symbol animation and sync with line points
                // FIXME performance?
                data.eachItemGraphicEl(function (el) {
                    el.stopAnimation(true);
                });

                // In the case data zoom triggerred refreshing frequently
                // Data may not change if line has a category axis. So it should animate nothing
                if (!isPointsSame(this._stackedOnPoints, stackedOnPoints)
                    || !isPointsSame(this._points, points)
                ) {
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
            }

            polyline.useStyle(zrUtil.defaults(
                // Use color in lineStyle first
                lineStyleModel.getLineStyle(),
                {
                    fill: 'none',
                    stroke: data.getVisual('color'),
                    lineJoin: 'bevel'
                }
            ));

            var smooth = seriesModel.get('smooth');
            smooth = getSmooth(seriesModel.get('smooth'));
            polyline.setShape({
                smooth: smooth,
                smoothMonotone: seriesModel.get('smoothMonotone'),
                connectNulls: seriesModel.get('connectNulls')
            });

            if (polygon) {
                var stackedOn = data.stackedOn;
                var stackedOnSmooth = 0;

                polygon.useStyle(zrUtil.defaults(
                    areaStyleModel.getAreaStyle(),
                    {
                        fill: data.getVisual('color'),
                        opacity: 0.7,
                        lineJoin: 'bevel'
                    }
                ));

                if (stackedOn) {
                    var stackedOnSeries = stackedOn.hostModel;
                    stackedOnSmooth = getSmooth(stackedOnSeries.get('smooth'));
                }

                polygon.setShape({
                    smooth: smooth,
                    stackedOnSmooth: stackedOnSmooth,
                    smoothMonotone: seriesModel.get('smoothMonotone'),
                    connectNulls: seriesModel.get('connectNulls')
                });
            }

            this._data = data;
            // Save the coordinate system for transition animation when data changed
            this._coordSys = coordSys;
            this._stackedOnPoints = stackedOnPoints;
            this._points = points;
        },

        highlight: function (seriesModel, ecModel, api, payload) {
            var data = seriesModel.getData();
            var dataIndex = queryDataIndex(data, payload);

            if (dataIndex != null && dataIndex >= 0) {
                var symbol = data.getItemGraphicEl(dataIndex);
                if (!symbol) {
                    // Create a temporary symbol if it is not exists
                    var pt = data.getItemLayout(dataIndex);
                    symbol = new Symbol(data, dataIndex, api);
                    symbol.position = pt;
                    symbol.setZ(
                        seriesModel.get('zlevel'),
                        seriesModel.get('z')
                    );
                    symbol.ignore = isNaN(pt[0]) || isNaN(pt[1]);
                    symbol.__temp = true;
                    data.setItemGraphicEl(dataIndex, symbol);

                    // Stop scale animation
                    symbol.stopSymbolAnimation(true);

                    this.group.add(symbol);
                }
                symbol.highlight();
            }
            else {
                // Highlight whole series
                ChartView.prototype.highlight.call(
                    this, seriesModel, ecModel, api, payload
                );
            }
        },

        downplay: function (seriesModel, ecModel, api, payload) {
            var data = seriesModel.getData();
            var dataIndex = queryDataIndex(data, payload);
            if (dataIndex != null && dataIndex >= 0) {
                var symbol = data.getItemGraphicEl(dataIndex);
                if (symbol) {
                    if (symbol.__temp) {
                        data.setItemGraphicEl(dataIndex, null);
                        this.group.remove(symbol);
                    }
                    else {
                        symbol.downplay();
                    }
                }
            }
            else {
                // Downplay whole series
                ChartView.prototype.downplay.call(
                    this, seriesModel, ecModel, api, payload
                );
            }
        },

        /**
         * @param {module:zrender/container/Group} group
         * @param {Array.<Array.<number>>} points
         * @private
         */
        _newPolyline: function (points) {
            var polyline = this._polyline;
            // Remove previous created polyline
            if (polyline) {
                this._lineGroup.remove(polyline);
            }

            polyline = new polyHelper.Polyline({
                shape: {
                    points: points
                },
                silent: true,
                z2: 10
            });

            this._lineGroup.add(polyline);

            this._polyline = polyline;

            return polyline;
        },

        /**
         * @param {module:zrender/container/Group} group
         * @param {Array.<Array.<number>>} stackedOnPoints
         * @param {Array.<Array.<number>>} points
         * @private
         */
        _newPolygon: function (points, stackedOnPoints) {
            var polygon = this._polygon;
            // Remove previous created polygon
            if (polygon) {
                this._lineGroup.remove(polygon);
            }

            polygon = new polyHelper.Polygon({
                shape: {
                    points: points,
                    stackedOnPoints: stackedOnPoints
                },
                silent: true
            });

            this._lineGroup.add(polygon);

            this._polygon = polygon;
            return polygon;
        },
        /**
         * @private
         */
        _getSymbolIgnoreFunc: function (data, coordSys) {
            var categoryAxis = coordSys.getAxesByScale('ordinal')[0];
            // `getLabelInterval` is provided by echarts/component/axis
            if (categoryAxis && categoryAxis.isLabelIgnored) {
                return zrUtil.bind(categoryAxis.isLabelIgnored, categoryAxis);
            }
        },

        /**
         * @private
         */
        // FIXME Two value axis
        _updateAnimation: function (data, stackedOnPoints, coordSys, api) {
            var polyline = this._polyline;
            var polygon = this._polygon;
            var seriesModel = data.hostModel;

            var diff = lineAnimationDiff(
                this._data, data,
                this._stackedOnPoints, stackedOnPoints,
                this._coordSys, coordSys
            );
            polyline.shape.points = diff.current;

            graphic.updateProps(polyline, {
                shape: {
                    points: diff.next
                }
            }, seriesModel);

            if (polygon) {
                polygon.setShape({
                    points: diff.current,
                    stackedOnPoints: diff.stackedOnCurrent
                });
                graphic.updateProps(polygon, {
                    shape: {
                        points: diff.next,
                        stackedOnPoints: diff.stackedOnNext
                    }
                }, seriesModel);
            }

            var updatedDataInfo = [];
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
            }

            if (polyline.animators && polyline.animators.length) {
                polyline.animators[0].during(function () {
                    for (var i = 0; i < updatedDataInfo.length; i++) {
                        var el = updatedDataInfo[i].el;
                        el.attr('position', polyline.shape.points[updatedDataInfo[i].ptIdx]);
                    }
                });
            }
        },

        remove: function (ecModel) {
            var group = this.group;
            var oldData = this._data;
            this._lineGroup.removeAll();
            this._symbolDraw.remove(true);
            // Remove temporary created elements when highlighting
            oldData && oldData.eachItemGraphicEl(function (el, idx) {
                if (el.__temp) {
                    group.remove(el);
                    oldData.setItemGraphicEl(idx, null);
                }
            });

            this._polyline =
            this._polygon =
            this._coordSys =
            this._points =
            this._stackedOnPoints =
            this._data = null;
        }
    });
});