/**
 * Grid is a region which contains at most 4 cartesian systems
 */
define(function(require, factory) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Cartesian2D = require('./Cartesian2D');
    var Axis2D = require('./Axis2D');
    var OrdinalScale = require('../../scale/Ordinal');
    var IntervalScale = require('../../scale/Interval');
    var numberUtil = require('../../util/number');

    // 依赖 GridModel, AxisModel 做预处理
    require('./GridModel');
    require('./AxisModel');

    function Grid() {

        this._x = 0;
        this._y = 0;

        this._width = 0;
        this._height = 0;
    }

    Grid.prototype = {

        type: 'grid',

        init: function (option) {
            this._coordsMap = {};

            this._coordsList = [];

            this._axesList = [];

            this._initCartesian(option);
        },

        getRect: function () {
            return {
                x: this._x,
                y: this._y,
                width: this._width,
                height: this._height
            };
        },

        /**
         * Resize the grid
         */
        resize: function (ecModel, api) {
            var viewportWidth = api.getWidth();
            var viewportHeight = api.getHeight();

            var grid = ecModel.getComponent('grid');

            var parsePercent = numberUtil.parsePercent;
            var gridX = parsePercent(grid.get('x'), viewportWidth);
            var gridY = parsePercent(grid.get('y'), viewportHeight);
            var gridX2 = parsePercent(grid.get('x2'), viewportWidth);
            var gridY2 = parsePercent(grid.get('y2'), viewportHeight);
            var gridWidth = parsePercent(grid.get('width'), viewportWidth);
            var gridHeight = parsePercent(grid.get('height'), viewportHeight);
            if (isNaN(gridWidth)) {
                gridWidth = gridX2 - gridX;
            }
            if (isNaN(gridHeight)) {
                gridHeight = gridY2 - gridY;
            }

            this._x = gridX;
            this._y = gridY;
            this._width = gridWidth;
            this._height = gridHeight;

            zrUtil.each(this._axesList, function (axis) {
                var extent;
                var otherCoord;
                switch (axis.position) {
                    case 'top':
                        extent = [gridX, gridX + gridWidth];
                        otherCoord = gridY;
                        break;
                    case 'left':
                        extent = [gridY, gridY + gridHeight];
                        otherCoord = gridX;
                        break;
                    case 'right':
                        extent = [gridY, gridY + gridHeight];
                        otherCoord = gridX + gridWidth;
                        break;
                    default: // Bottom
                        extent = [gridX, gridX + gridWidth];
                        otherCoord = gridY + gridHeight;
                        break;
                }

                axis.otherCoord = otherCoord;
                // Category axis with boundary gap. Which label and points are on the center of bands
                // Insead of on the tick
                if (axis.boundaryGap && axis.type === 'category') {
                    var size = extent[1] - extent[0];
                    var len = axis.scale.getTicks().length;
                    var margin = size / len / 2;
                    extent[0] += margin;
                    extent[1] -= margin;
                }

                axis.setCoordExtent(extent[0], extent[1]);

                var otherAxis = axis.otherAxis;
                var otherAxisPosition = otherAxis.position;
                if (otherAxisPosition === 'bottom') {
                    axis.reverse();
                }
                else if (otherAxisPosition === 'right') {
                    axis.reverse();
                }
            });

            // Adjust axis coord on the zero position of the other axis
            zrUtil.each(this._axesList, function (axis) {
                var otherAxis = axis.otherAxis;
                if (axis.onZero && otherAxis.type !== 'category') {
                    axis.otherCoord = otherAxis.dataToCoord(0);
                }
            });
        },

        getCartesian: function (xAxisIndex, yAxisIndex) {
            var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
            return this._coordsMap[key];
        },

        /**
         * Initialize cartesian coordinate systems
         * @private
         */
        _initCartesian: function (ecModel) {
            /**
             * @inner
             */
            var getScaleByOption = function (axisType, axisModel) {
                if (axisType) {
                    return axisType === 'value'
                        ? new IntervalScale()
                        : new OrdinalScale(axisModel.get('data'));
                }
            };

            var leftUsed = false;
            var bottomUsed = false;

            var axesList = this._axesList;

            ecModel.eachComponent('xAxis', function (xAxisModel, i) {
                ecModel.eachComponent('yAxis', function (yAxisModel, j) {

                    var key = 'x' + i + 'y' + j;
                    var cartesian = new Cartesian2D(key);
                    this._coordsMap[key] = cartesian;
                    this._coordsList.push(cartesian);

                    // Create x axis
                    var xAxisType = xAxisModel.get('type');
                    var xAxisPosition = xAxisModel.get('position') || (bottomUsed ? 'top' : 'bottom');
                    bottomUsed = xAxisPosition === 'bottom';
                    var axisX = new Axis2D(
                        'x', getScaleByOption(xAxisType, xAxisModel),
                        [0, 0],
                        xAxisModel.get('type'),
                        xAxisPosition
                    );
                    axisX.onZero = xAxisModel.get('axisLine.onZero');
                    axisX.boundaryGap = xAxisModel.get('boundaryGap');
                    cartesian.addAxis(axisX);

                    // Create y axis
                    var yAxisType = yAxisModel.get('type');
                    var yAxisPosition = yAxisModel.get('position') || (leftUsed ? 'right' : 'left');
                    leftUsed = yAxisPosition === 'left';
                    var axisY = new Axis2D(
                        'y', getScaleByOption(yAxisType, yAxisModel),
                        [0, 0],
                        yAxisModel.get('type'),
                        yAxisModel.get('position')
                    );
                    axisY.onZero = yAxisModel.get('axisLine.onZero');
                    axisY.boundaryGap = yAxisModel.get('boundaryGap');
                    cartesian.addAxis(axisY);

                    axisX.otherAxis = axisY;
                    axisY.otherAxis = axisX;

                    axesList.push(axisX);
                    axesList.push(axisY);
                }, this);
            }, this);

            this._updateCartesianFromSeries(ecModel);

            // Set axis from option
            zrUtil.each(axesList, function (axis) {
                axis.scale.niceExtent();
            });
        },

        /**
         * Update cartesian properties from series
         * @param  {module:echarts/model/Option} option
         * @private
         */
        _updateCartesianFromSeries: function (ecModel) {
            var axisDataMap = {};

            ecModel.eachSeries(function (seriesModel, idx) {
                var coordinateSystem = seriesModel.get('coordinateSystem');

                if (coordinateSystem === 'cartesian2d') {
                    var xAxisIndex = seriesModel.get('xAxisIndex');
                    var yAxisIndex = seriesModel.get('yAxisIndex');

                    var cartesian = this.getCartesian(xAxisIndex, yAxisIndex);
                    var axisData = axisDataMap[cartesian.name];
                    if (! axisData) {
                        axisData = axisDataMap[cartesian.name] = {
                            x: [],
                            y: [],
                            cartesian: cartesian
                        };
                    }

                    var data = seriesModel.getData();
                    if (data.type === 'list') {
                        var categoryAxis = cartesian.getAxesByScale('ordinal')[0];
                        if (! categoryAxis) {
                            data.eachY(function (value) {
                                axisData.y.push(value);
                            });
                            data.eachX(function (value) {
                                axisData.x.push(value);
                            });
                        }
                        else {
                            data.eachY(function (value) {
                                axisData[categoryAxis.dim == 'y' ? 'x' : 'y'].push(value);
                            });
                        }
                    }
                }
            }, this);

            zrUtil.each(axisDataMap, function (axisData) {
                var cartesian = axisData.cartesian;
                var xAxis = cartesian.getAxis('x');
                var yAxis = cartesian.getAxis('y');
                if (axisData.x.length) {
                    xAxis.scale.setExtentFromData(axisData.x);
                }
                if (axisData.y.length) {
                    yAxis.scale.setExtentFromData(axisData.y);
                }
            });
        }
    };

    Grid.create = function (ecModel, api) {
        if (ecModel.getComponent('grid')) {
            var grid = new Grid();
            grid.init(ecModel);
            grid.resize(ecModel, api);

            // Inject the coordinateSystems into seriesModel
            ecModel.eachSeries(function (seriesModel) {
                seriesModel.coordinateSystem = grid.getCartesian(
                    seriesModel.get('xAxisIndex'), seriesModel.get('yAxisIndex')
                );
            });
        }
    }

    require('../../CoordinateSystem').register('grid', Grid);

    return Grid;
});