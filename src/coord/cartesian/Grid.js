/**
 * Grid is a region which contains at most 4 cartesian systems
 *
 * TODO Axis Scale
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

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @return {module:echarts/scale/*}
     * @inner
     */
    function createScaleByModel(axisModel) {
        var axisType = axisModel.get('type');
        if (axisType) {
            return axisType === 'category'
                ? new OrdinalScale(axisModel.get('data'))
                : new IntervalScale();
        }
    };

    /**
     * Check if the axis is used in the specified grid
     * @inner
     */
    function isAxisUsedInTheGrid(axisModel, gridModel, ecModel) {
        return ecModel.getComponent('grid', axisModel.get('gridIndex')) === gridModel;
    }

    function Grid(gridModel, ecModel, api) {

        /**
         * @type {number}
         * @private
         */
        this._x = 0;

        /**
         * @type {number}
         * @private
         */
        this._y = 0;

        /**
         * @type {number}
         * @private
         */
        this._width = 0;

        /**
         * @type {number}
         * @private
         */
        this._height = 0;

        /**
         * @type {Object.<string, module:echarts/coord/cartesian/Cartesian2D>}
         * @private
         */
        this._coordsMap = {};

        /**
         * @type {Array.<module:echarts/coord/cartesian/Cartesian>}
         * @private
         */
        this._coordsList = [];

        /**
         * @type {Object.<string, module:echarts/coord/cartesian/Axis2D>}
         * @private
         */
        this._axesMap = {};

        /**
         * @type {Array.<module:echarts/coord/cartesian/Axis2D>}
         * @private
         */
        this._axesList = [];

        this._initCartesian(gridModel, ecModel, api);
    }

    Grid.prototype = {

        type: 'grid',

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
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         */
        resize: function (gridModel, api) {
            var viewportWidth = api.getWidth();
            var viewportHeight = api.getHeight();

            var parsePercent = numberUtil.parsePercent;
            var gridX = parsePercent(gridModel.get('x'), viewportWidth);
            var gridY = parsePercent(gridModel.get('y'), viewportHeight);
            var gridX2 = parsePercent(gridModel.get('x2'), viewportWidth);
            var gridY2 = parsePercent(gridModel.get('y2'), viewportHeight);
            var gridWidth = parsePercent(gridModel.get('width'), viewportWidth);
            var gridHeight = parsePercent(gridModel.get('height'), viewportHeight);

            if (isNaN(gridWidth)) {
                gridWidth = viewportWidth - gridX2 - gridX;
            }
            if (isNaN(gridHeight)) {
                gridHeight = viewportHeight - gridY2 - gridY;
            }

            this._x = gridX;
            this._y = gridY;
            this._width = gridWidth;
            this._height = gridHeight;

            zrUtil.each(this._axesList, function (axis) {
                var extent;
                switch (axis.position) {
                    case 'top':
                        extent = [gridX, gridX + gridWidth];
                        break;
                    case 'left':
                        extent = [gridY, gridY + gridHeight];
                        break;
                    case 'right':
                        extent = [gridY, gridY + gridHeight];
                        break;
                    default: // Bottom
                        extent = [gridX, gridX + gridWidth];
                        break;
                }

                var start = axis.isHorizontal() ? 0 : 1;
                axis.setExtent(extent[start], extent[1 - start]);
            });
        },

        /**
         * @param {string} axisType
         * @param {number} [axisIndex=0]
         */
        getAxis: function (axisType, axisIndex) {
            var key = axisType + (axisIndex || 0);
            return this._axesMap[key];
        },

        getCartesian: function (xAxisIndex, yAxisIndex) {
            var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
            return this._coordsMap[key];
        },

        /**
         * Initialize cartesian coordinate systems
         * @private
         */
        _initCartesian: function (gridModel, ecModel, api) {
            var leftUsed = false;
            var bottomUsed = false;

            var xAxesMap = {};
            var yAxesMap = {};
            var xAxesCount = 0;
            var yAxesCount = 0;

            ecModel.eachComponent('xAxis', function (xAxisModel, idx) {
                if (!isAxisUsedInTheGrid(xAxisModel, gridModel, ecModel)) {
                    return;
                }

                // Create x axis
                var xAxisPosition = xAxisModel.get('position') || (bottomUsed ? 'top' : 'bottom');
                bottomUsed = xAxisPosition === 'bottom';
                var axisX = new Axis2D(
                    'x', createScaleByModel(xAxisModel),
                    [0, 0],
                    xAxisModel.get('type'),
                    xAxisPosition
                );
                axisX.onBand = xAxisModel.get('boundaryGap');
                axisX.inverse = xAxisModel.get('inverse');

                // Inject axis into axisModel
                xAxisModel.axis = axisX;

                this._axesList.push(axisX);
                this._axesMap['x' + idx] = axisX;

                xAxesMap[idx] = axisX;
                xAxesCount++;
            }, this);

            ecModel.eachComponent('yAxis', function (yAxisModel, idx) {
                if (!isAxisUsedInTheGrid(yAxisModel, gridModel, ecModel)) {
                    return;
                }

                // Create y axis
                var yAxisPosition = yAxisModel.get('position') || (leftUsed ? 'right' : 'left');
                leftUsed = yAxisPosition === 'left';
                var axisY = new Axis2D(
                    'y', createScaleByModel(yAxisModel),
                    [0, 0],
                    yAxisModel.get('type'),
                    yAxisModel.get('position')
                );
                axisY.onBand = yAxisModel.get('boundaryGap');
                axisY.inverse = yAxisModel.get('inverse');

                yAxisModel.axis = axisY;

                this._axesList.push(axisY);
                this._axesMap['y' + idx] = axisY;

                xAxesMap[idx] = axisY;
                yAxesCount++;
            }, this);

            if (! xAxesCount || ! yAxesCount) {
                api.log('Grid must has at least one x axis and one y axis');
                // Roll back
                this._axesMap = {};
                this._axesList = [];
                return;
            }

            zrUtil.each(xAxesMap, function (xAxis, xAxisIndex) {
                zrUtil.each(yAxesMap, function (yAxis, yAxisIndex) {
                    var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
                    var cartesian = new Cartesian2D(key);
                    this._coordsMap[key] = cartesian;
                    this._coordsList.push(cartesian);

                    cartesian.addAxis(xAxis);
                    cartesian.addAxis(yAxis);
                });
            });

            ecModel.eachComponent('xAxis', function (xAxisModel, i) {
                ecModel.eachComponent('yAxis', function (yAxisModel, j) {
                    var key = 'x' + i + 'y' + j;
                    var cartesian = new Cartesian2D(key);
                    this._coordsMap[key] = cartesian;
                    this._coordsList.push(cartesian);

                    cartesian.addAxis(xAxisModel.axis);
                    cartesian.addAxis(yAxisModel.axis);
                }, this);
            }, this);

            this._updateCartesianFromSeries(ecModel, gridModel);
        },

        /**
         * Update cartesian properties from series
         * @param  {module:echarts/model/Option} option
         * @private
         */
        _updateCartesianFromSeries: function (ecModel, gridModel) {
            var axisDataMap = {};

            ecModel.eachSeries(function (seriesModel) {
                if (seriesModel.get('coordinateSystem') === 'cartesian2d') {
                    var xAxisIndex = seriesModel.get('xAxisIndex');
                    var yAxisIndex = seriesModel.get('yAxisIndex');

                    var xAxisModel = ecModel.getComponent('xAxis', xAxisIndex);
                    var yAxisModel = ecModel.getComponent('yAxis', yAxisIndex);

                    if (!isAxisUsedInTheGrid(xAxisModel, gridModel, ecModel)
                        || !isAxisUsedInTheGrid(yAxisModel, gridModel, ecModel)
                     ) {
                        return;
                    }

                    var cartesian = this.getCartesian(xAxisIndex, yAxisIndex);
                    var axisData = axisDataMap[cartesian.name];
                    if (! axisData) {
                        axisData = axisDataMap[cartesian.name] = {
                            x: [],
                            y: [],
                            cartesian: cartesian,
                            xModel: xAxisModel,
                            yModel: yAxisModel
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
                            data.eachValue(function (value) {
                                if (value != null) {
                                    axisData[categoryAxis.dim == 'y' ? 'x' : 'y'].push(value);
                                }
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
                    if (axisData.xModel.get('scale')) {
                        axisData.x.push(0);
                    }
                    xAxis.scale.setExtentFromData(axisData.x);
                }
                if (axisData.y.length) {
                    if (axisData.yModel.get('scale')) {
                        axisData.y.push(0);
                    }
                    yAxis.scale.setExtentFromData(axisData.y);
                }
            });

            // Set axis from option
            zrUtil.each(this._axesList, function (axis) {
                axis.scale.niceExtent();
            });
        }
    };

    Grid.create = function (ecModel, api) {
        var grids = [];
        ecModel.eachComponent('grid', function (gridModel, idx) {
            var grid = new Grid(gridModel, ecModel, api);
            grid.resize(gridModel, api);

            // Inject the coordinateSystems into seriesModel
            ecModel.eachSeries(function (seriesModel) {
                seriesModel.coordinateSystem = grid.getCartesian(
                    seriesModel.get('xAxisIndex'), seriesModel.get('yAxisIndex')
                );
            });

            gridModel.coordinateSystem = grid;

            grids.push(grid);
        });

        return grids;
    }

    require('../../CoordinateSystem').register('grid', Grid);

    return Grid;
});