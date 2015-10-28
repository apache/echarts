/**
 * Grid is a region which contains at most 4 cartesian systems
 *
 * TODO Default cartesian
 */
define(function(require, factory) {

    var layout = require('../../util/layout');

    var OrdinalScale = require('../../scale/Ordinal');
    var IntervalScale = require('../../scale/Interval');

    var zrUtil = require('zrender/core/util');
    var Cartesian2D = require('./Cartesian2D');
    var Axis2D = require('./Axis2D');

    var scaleClasses = require('../../scale/scale');

    var each = zrUtil.each;

    var CATEGORY_AXIS_TYPE = 'category';
    var VALUE_AXIS_TYPE = 'value';

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
            switch (axisType) {
                // Buildin scale
                case CATEGORY_AXIS_TYPE:
                    return new OrdinalScale(axisModel.get('data'), [Infinity, -Infinity]);
                case VALUE_AXIS_TYPE:
                    return new IntervalScale();
                // Extended scale, like time and log
                default:
                    return (scaleClasses.getClass(axisType) || IntervalScale).create(axisModel);
            }
        }
    }

    /**
     * Check if the axis is used in the specified grid
     * @inner
     */
    function isAxisUsedInTheGrid(axisModel, gridModel, ecModel) {
        return ecModel.getComponent('grid', axisModel.get('gridIndex')) === gridModel;
    }

    /**
     * Check if the axis corss 0
     * @inner
     */
    function ifAxisCrossZero (axis) {
        var dataExtent = axis.scale.getExtent();
        return !((dataExtent[0] > 0 && dataExtent[1] > 0)
                || (dataExtent[0] < 0 && dataExtent[1] < 0))
            || ifAxisNeedsCrossZero(axis);
    }
    /**
     * Check if the axis scale needs include data 0
     * @inner
     */
    function ifAxisNeedsCrossZero(axis) {
        return !axis.model.get('scale')
            && axis.type !== CATEGORY_AXIS_TYPE
    }

    /**
     * @inner
     */
    function niceScaleExent(axis, model) {
        var scale = axis.scale;
        if (scale.type === 'ordinal') {
            return;
        }
        var min = model.get('min');
        var max = model.get('max');
        var originalExtent = scale.getExtent();
        // TODO Only one data
        if (min === 'dataMin') {
            min = originalExtent[0];
        }
        else if (max === 'dataMax') {
            max = originalExtent[1];
        }
        scale.setExtent(min, max);
        scale.niceExtent(model.get('splitNumber'), !!min, !!max);
    }

    function Grid(gridModel, ecModel, api) {
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
            return this._rect;
        },

        /**
         * Resize the grid
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         */
        resize: function (gridModel, api) {

            var gridRect = layout.parsePositionInfo({
                x: gridModel.get('x'),
                y: gridModel.get('y'),
                x2: gridModel.get('x2'),
                y2: gridModel.get('y2'),
                width: gridModel.get('width'),
                height: gridModel.get('height')
            }, {
                width: api.getWidth(),
                height: api.getHeight()
            });

            this._rect = gridRect;

            each(this._axesList, function (axis) {
                var isHorizontal = axis.isHorizontal();
                var extent = isHorizontal
                    ? [gridRect.x, gridRect.x + gridRect.width]
                    : [gridRect.y + gridRect.height, gridRect.y];

                axis.setExtent(extent[0], extent[1]);
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

            var axesMap = {
                x: {},
                y: {}
            };
            var axesCount = {
                x: 0,
                y: 0
            };

            ecModel.eachComponent('xAxis', createAxisCreator('x'), this);

            ecModel.eachComponent('yAxis', createAxisCreator('y'), this);

            if (!axesCount.x || !axesCount.y) {
                // api.log('Grid must has at least one x axis and one y axis');
                // Roll back
                this._axesMap = {};
                this._axesList = [];
                return;
            }

            each(axesMap.x, function (xAxis, xAxisIndex) {
                each(axesMap.y, function (yAxis, yAxisIndex) {
                    var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
                    var cartesian = new Cartesian2D(key);
                    this._coordsMap[key] = cartesian;
                    this._coordsList.push(cartesian);

                    cartesian.addAxis(xAxis);
                    cartesian.addAxis(yAxis);
                }, this);
            }, this);

            this._updateCartesianFromSeries(ecModel, gridModel);

            // Fix configuration
            each(axesMap.x, function (xAxis) {
                each(axesMap.y, function (yAxis) {
                    // onZero can not be used in these two situations
                    // 1. When other axis is a category axis
                    // 2. When other axis not across 0 point
                    if (xAxis.type === CATEGORY_AXIS_TYPE
                        || !ifAxisCrossZero(xAxis)
                    ) {
                        yAxis.onZero = false;
                    }
                    if (yAxis.type === CATEGORY_AXIS_TYPE
                      || !ifAxisCrossZero(yAxis)
                    ) {
                        xAxis.onZero = false;
                    }

                    if (ifAxisNeedsCrossZero(yAxis, xAxis)) {
                        yAxis.scale.unionExtent([0, 0]);

                        niceScaleExent(yAxis, yAxis.model);
                    }
                    if (ifAxisNeedsCrossZero(xAxis, yAxis)) {
                        xAxis.scale.unionExtent([0, 0]);

                        niceScaleExent(xAxis, xAxis.model);
                    }

                }, this);
            }, this);

            function createAxisCreator(axisType) {
                return function (axisModel, idx) {
                    if (!isAxisUsedInTheGrid(axisModel, gridModel, ecModel)) {
                        return;
                    }

                    var axisPosition = axisType === 'x'
                        ? axisModel.get('position') || (bottomUsed ? 'top' : 'bottom')
                        : axisModel.get('position') || (leftUsed ? 'right' : 'left');

                    var axis = new Axis2D(
                        axisType, createScaleByModel(axisModel),
                        [0, 0],
                        axisModel.get('type'),
                        axisPosition
                    );

                    var isCategory = axis.type === CATEGORY_AXIS_TYPE;
                    axis.onBand = isCategory && axisModel.get('boundaryGap');
                    axis.inverse = axisModel.get('inverse');

                    axis.onZero = axisModel.get('axisLine.onZero');

                    // Inject axis into axisModel
                    axisModel.axis = axis;

                    // Inject axisModel into axis
                    axis.model = axisModel;

                    this._axesList.push(axis);
                    this._axesMap[axisType + idx] = axis;

                    axesMap[axisType][idx] = axis;
                    axesCount[axisType]++;
                }
            }
        },

        /**
         * Update cartesian properties from series
         * @param  {module:echarts/model/Option} option
         * @private
         */
        _updateCartesianFromSeries: function (ecModel, gridModel) {
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

                    var data = seriesModel.getData();
                    if (data.type === 'list') {
                        var xAxis = cartesian.getAxis('x');
                        var yAxis = cartesian.getAxis('y');
                        xAxis.scale.unionExtent(
                            data.getDataExtent('x', xAxis.scale.type !== 'ordinal')
                        );
                        yAxis.scale.unionExtent(
                            data.getDataExtent('y', yAxis.scale.type !== 'ordinal')
                        );

                        niceScaleExent(xAxis, xAxisModel);
                        niceScaleExent(yAxis, yAxisModel);
                    }
                }
            }, this);
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
    };

    require('../../CoordinateSystem').register('grid', Grid);

    return Grid;
});