/**
 * Grid is a region which contains at most 4 cartesian systems
 */
define(function(require, factory) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Cartesian = require('./Cartesian');
    var Axis2D = require('./CartesianAxis2D');
    var OrdinalScale = require('../scale/Ordinal');
    var IntervalScale = require('../scale/Interval');

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

        /**
         * Resize the grid
         */
        resize: function (option, api) {
            var gridX = this._x;
            var gridY = this._y;
            var gridWidth = this._width;
            var gridHeight = this._height;

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
                    var len = axis.data.length;
                    var margin = size / len / 2;
                    extent[0] += margin;
                    extent[1] -= margin;
                }

                axis.setCoordExtent(extent);
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
         * Convert series data to coorindates
         * @param {Array} data
         * @param {number} [xAxisIndex=0]
         * @param {number} [yAxisIndex=0]
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToCoords: function (data, xAxisIndex, yAxisIndex) {
            xAxisIndex = xAxisIndex || 0;
            yAxisIndex = yAxisIndex || 0;

            var cartesian = this.getCartesian(xAxisIndex, yAxisIndex);

            var xAxis = cartesian.getAxis('x');
            var yAxis = cartesian.getAxis('y');
            var xAxisCoords = data.mapX(xAxis.dataToCoord, xAxis);
            var yAxisCoords = data.mapY(yAxis.dataToCoord, yAxis);

            var xIndex = xAxis.isHorizontal() ? 0 : 1;

            return zrUtil.map(xAxisCoords, function (coord, idx) {
                var item = [];
                item[xIndex] = coord;
                item[1 - xIndex] = yAxisCoords[idx];
            });
        },

        /**
         * Initialize cartesian coordinate systems
         * @private
         */
        _initCartesian: function (option) {
            var xAxesList = option.xAxis;
            var yAxesList = option.yAxis;

            /**
             * @inner
             */
            var getScaleByOption = function (axisType, axisOption) {
                if (axisOption.type) {
                    return axisOption.type === 'value'
                        ? new IntervalScale()
                        : new OrdinalScale(axisOption.data);
                }
                else {
                    return axisType === 'y'
                        ? new IntervalScale()
                        : new OrdinalScale(axisOption.data);
                }
            };

            for (var i = 0; i < xAxesList.length; i++) {
                var xAxisOpt = xAxesList[i];
                for (var j = 0; j < yAxesList.length; j++) {
                    var yAxisOpt = yAxesList[j];
                    var key = 'x' + i + 'y' + j;
                    var cartesian = new Cartesian(key);
                    this._coordsMap[key] = cartesian;
                    this._coordsList.push(cartesian);

                    var xAxisType = xAxisOpt.type;
                    // Create x axis
                    var axisX = new Axis2D(
                        'x', getScaleByOption(xAxisOpt, xAxisOpt),
                        [0, 0],
                        xAxisOpt.type,
                        xAxisOpt.position
                    );
                    axisX.onZero = xAxisOpt.axisLine.onZero;
                    cartesian.addAxis(axisX);

                    var yAxisType = yAxisOpt.type;
                    // Create y axis
                    var axisY = new Axis2D(
                        'y', getScaleByOption(yAxisType, yAxisOpt),
                        [0, 0],
                        yAxisOpt.type,
                        yAxisOpt.position
                    );
                    axisY.onZero = yAxisOpt.axisLine.onZero;
                    cartesian.addAxis(axisY);

                    axisX.otherAxis = axisY;
                    axisY.otherAxis = axisX;

                    var horizontalAxis;
                    var verticalAxis;
                    // Adjust axis direction
                    if (axisX.isHorizontal()) {
                        horizontalAxis = axisX;
                        verticalAxis = axisY;
                    }
                    else {
                        horizontalAxis = axisY;
                        verticalAxis = axisX;
                    }
                    if (horizontalAxis.position === 'bottom') {
                        // Reverse vertical axis to bottom-up direction
                        verticalAxis.reverse();
                    }
                    if (verticalAxis.position === 'right') {
                        // Reverse horizontal axis to right-left direction
                        horizontalAxis.reverse();
                    }

                    this._axesList.push(axisX);
                    this._axesList.push(axisY);
                }
            }

            this._updateCartesianFromSeries(option);

            // Set axis from option
            zrUtil.each(this._axesList, function (axis) {
                axis.scale.niceExtent();
            });
        },

        /**
         * Update cartesian properties from series
         * @param  {module:echarts/model/Option} option
         * @private
         */
        _updateCartesianFromSeries: function (option) {
            var axisDataMap = {};

            option.eachSeries(function (series, idx) {
                var coordinateSystem = series.get('coordinateSystem');

                if (coordinateSystem === 'cartesian') {
                    var xAxisIndex = series.get('xAxisIndex');
                    var yAxisIndex = series.get('yAxisIndex');

                    var cartesian = this.getCartesian(xAxisIndex, yAxisIndex);
                    var axisData = axisDataMap[cartesian.name];
                    if (! axisData) {
                        axisData = axisDataMap[cartesian.name] = {
                            x: [],
                            y: [],
                            cartesian: cartesian
                        };
                    }

                    var data = series.getData();
                    if (data.type === 'list') {
                        if (data.dataDimension === 2) {
                            data.eachX(function (value) {
                                axisData.x.push(value);
                            });
                        }
                        data.eachY(function (value) {
                            axisData.y.push(value);
                        });
                    }
                }
            }, this);

            zrUtil.each(axisDataMap, function (axisData) {
                var cartesian = axisData.cartesian;
                if (axisData.x.length) {
                    cartesian.getAxis('x').scale.setExtentFromData(x);
                }
                if (axisData.y.length) {
                    cartesian.getAxis('y').scale.setExtentFromData(y);
                }
            });
        }
    }

    Grid.create = function (option, api) {
        if (option.grid) {
            var grid = new Grid();
            grid.init(option);
            grid.resize(option, api);
        }
    }

    return Grid;
});