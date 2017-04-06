/**
 * Parallel Coordinates
 * <https://en.wikipedia.org/wiki/Parallel_coordinates>
 */
define(function(require) {

    var layoutUtil = require('../../util/layout');
    var axisHelper = require('../../coord/axisHelper');
    var zrUtil = require('zrender/core/util');
    var ParallelAxis = require('./ParallelAxis');
    var graphic = require('../../util/graphic');
    var matrix = require('zrender/core/matrix');

    var each = zrUtil.each;
    var mathMin = Math.min;
    var mathMax = Math.max;
    var mathFloor = Math.floor;

    var PI = Math.PI;

    function Parallel(parallelModel, ecModel, api) {

        /**
         * key: dimension
         * @type {Object.<string, module:echarts/coord/parallel/Axis>}
         * @private
         */
        this._axesMap = {};

        /**
         * key: dimension
         * value: {position: [], rotation, }
         * @type {Object.<string, Object>}
         * @private
         */
        this._axesLayout = {};

        /**
         * Always follow axis order.
         * @type {Array.<string>}
         * @readOnly
         */
        this.dimensions = parallelModel.dimensions;

        /**
         * @type {module:zrender/core/BoundingRect}
         */
        this._rect;

        /**
         * @type {module:echarts/coord/parallel/ParallelModel}
         */
        this._model = parallelModel;

        this._init(parallelModel, ecModel, api);
    }

    Parallel.prototype = {

        type: 'parallel',

        constructor: Parallel,

        /**
         * Initialize cartesian coordinate systems
         * @private
         */
        _init: function (parallelModel, ecModel, api) {

            var dimensions = parallelModel.dimensions;
            var parallelAxisIndex = parallelModel.parallelAxisIndex;

            each(dimensions, function (dim, idx) {

                var axisIndex = parallelAxisIndex[idx];
                var axisModel = ecModel.getComponent('parallelAxis', axisIndex);

                var axis = this._axesMap[dim] = new ParallelAxis(
                    dim,
                    axisHelper.createScaleByModel(axisModel),
                    [0, 0],
                    axisModel.get('type'),
                    axisIndex
                );

                var isCategory = axis.type === 'category';
                axis.onBand = isCategory && axisModel.get('boundaryGap');
                axis.inverse = axisModel.get('inverse');

                // Inject axis into axisModel
                axisModel.axis = axis;

                // Inject axisModel into axis
                axis.model = axisModel;
            }, this);
        },

        /**
         * Update axis scale after data processed
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         */
        update: function (ecModel, api) {
            this._updateAxesFromSeries(this._model, ecModel);
        },

        /**
         * Update properties from series
         * @private
         */
        _updateAxesFromSeries: function (parallelModel, ecModel) {
            ecModel.eachSeries(function (seriesModel) {

                if (!parallelModel.contains(seriesModel, ecModel)) {
                    return;
                }

                var data = seriesModel.getData();

                each(this.dimensions, function (dim) {
                    var axis = this._axesMap[dim];
                    axis.scale.unionExtentFromData(data, dim);
                    axisHelper.niceScaleExtent(axis.scale, axis.model);
                }, this);
            }, this);
        },

        /**
         * Resize the parallel coordinate system.
         * @param {module:echarts/coord/parallel/ParallelModel} parallelModel
         * @param {module:echarts/ExtensionAPI} api
         */
        resize: function (parallelModel, api) {
            this._rect = layoutUtil.getLayoutRect(
                parallelModel.getBoxLayoutParams(),
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            this._layoutAxes();
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getRect: function () {
            return this._rect;
        },

        /**
         * @private
         */
        _getLayoutSettings: function () {
            var parallelModel = this._model;
            var rect = this._rect;
            var xy = ['x', 'y'];
            var wh = ['width', 'height'];
            var layout = parallelModel.get('layout');
            var pixelDimIndex = layout === 'horizontal' ? 0 : 1;

            return {
                layout: layout,
                pixelDimIndex: pixelDimIndex,
                layoutBase: rect[xy[pixelDimIndex]],
                layoutLength: rect[wh[pixelDimIndex]],
                axisBase: rect[xy[1 - pixelDimIndex]],
                axisLength: rect[wh[1 - pixelDimIndex]],
                axisExpandable: parallelModel.get('axisExpandable'),
                axisExpandWidth: parallelModel.get('axisExpandWidth'),
                axisExpandCenter: parallelModel.get('axisExpandCenter'),
                axisExpandCount: parallelModel.get('axisExpandCount') || 0
            };
        },

        /**
         * @private
         */
        _layoutAxes: function () {
            var rect = this._rect;
            var axes = this._axesMap;
            var dimensions = this.dimensions;
            var layoutSettings = this._getLayoutSettings();
            var axisExpandCenter = layoutSettings.axisExpandCenter;
            var axisExpandCount = layoutSettings.axisExpandCount;
            var axisExpandWidth = layoutSettings.axisExpandWidth;
            var layoutLength = layoutSettings.layoutLength;
            var layout = layoutSettings.layout;

            each(axes, function (axis) {
                var axisExtent = [0, layoutSettings.axisLength];
                var idx = axis.inverse ? 1 : 0;
                axis.setExtent(axisExtent[idx], axisExtent[1 - idx]);
            });

            var axisExpandWindow;
            if (axisExpandCenter != null) {
                // Clamp
                var left = mathMax(0, mathFloor(axisExpandCenter - (axisExpandCount - 1) / 2));
                var right = left + axisExpandCount - 1;
                if (right >= dimensions.length) {
                    right = dimensions.length - 1;
                    left = mathMax(0, mathFloor(right - axisExpandCount + 1));
                }
                axisExpandWindow = [left, right];
            }

            var calcPos = (layoutSettings.axisExpandable && axisExpandWindow && axisExpandWidth)
                ? zrUtil.curry(layoutAxisWithExpand, axisExpandWindow, axisExpandWidth)
                : layoutAxisWithoutExpand;

            each(dimensions, function (dim, idx) {
                var posInfo = calcPos(idx, layoutLength, dimensions.length);

                var positionTable = {
                    horizontal: {
                        x: posInfo.position,
                        y: layoutSettings.axisLength
                    },
                    vertical: {
                        x: 0,
                        y: posInfo.position
                    }
                };
                var rotationTable = {
                    horizontal: PI / 2,
                    vertical: 0
                };

                var position = [
                    positionTable[layout].x + rect.x,
                    positionTable[layout].y + rect.y
                ];

                var rotation = rotationTable[layout];
                var transform = matrix.create();
                matrix.rotate(transform, transform, rotation);
                matrix.translate(transform, transform, position);

                // TODO
                // tick等排布信息。

                // TODO
                // 根据axis order 更新 dimensions顺序。

                this._axesLayout[dim] = {
                    position: position,
                    rotation: rotation,
                    transform: transform,
                    axisNameAvailableWidth: posInfo.axisNameAvailableWidth,
                    tickDirection: 1,
                    labelDirection: 1,
                    axisExpandWindow: axisExpandWindow
                };
            }, this);
        },

        /**
         * Get axis by dim.
         * @param {string} dim
         * @return {module:echarts/coord/parallel/ParallelAxis} [description]
         */
        getAxis: function (dim) {
            return this._axesMap[dim];
        },

        /**
         * Convert a dim value of a single item of series data to Point.
         * @param {*} value
         * @param {string} dim
         * @return {Array}
         */
        dataToPoint: function (value, dim) {
            return this.axisCoordToPoint(
                this._axesMap[dim].dataToCoord(value),
                dim
            );
        },

        /**
         * Travel data for one time, get activeState of each data item.
         * @param {module:echarts/data/List} data
         * @param {Functio} cb param: {string} activeState 'active' or 'inactive' or 'normal'
         *                            {number} dataIndex
         * @param {Object} context
         */
        eachActiveState: function (data, callback, context) {
            var dimensions = this.dimensions;
            var axesMap = this._axesMap;
            var hasActiveSet = this.hasAxisBrushed();

            for (var i = 0, len = data.count(); i < len; i++) {
                var values = data.getValues(dimensions, i);
                var activeState;

                if (!hasActiveSet) {
                    activeState = 'normal';
                }
                else {
                    activeState = 'active';
                    for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
                        var dimName = dimensions[j];
                        var state = axesMap[dimName].model.getActiveState(values[j], j);

                        if (state === 'inactive') {
                            activeState = 'inactive';
                            break;
                        }
                    }
                }

                callback.call(context, activeState, i);
            }
        },

        /**
         * Whether has any activeSet.
         * @return {boolean}
         */
        hasAxisBrushed: function () {
            var dimensions = this.dimensions;
            var axesMap = this._axesMap;
            var hasActiveSet = false;

            for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
                if (axesMap[dimensions[j]].model.getActiveState() !== 'normal') {
                    hasActiveSet = true;
                }
            }

            return hasActiveSet;
        },

        /**
         * Convert coords of each axis to Point.
         *  Return point. For example: [10, 20]
         * @param {Array.<number>} coords
         * @param {string} dim
         * @return {Array.<number>}
         */
        axisCoordToPoint: function (coord, dim) {
            var axisLayout = this._axesLayout[dim];
            return graphic.applyTransform([coord, 0], axisLayout.transform);
        },

        /**
         * Get axis layout.
         */
        getAxisLayout: function (dim) {
            return zrUtil.clone(this._axesLayout[dim]);
        },

        _getCollapseWith: function (layoutSettings) {
            var axisExpandCount = layoutSettings.axisExpandCount;
            var width = mathMax(0, (
                layoutSettings.layoutLength
                    - layoutSettings.axisExpandWidth * mathMax(0, (axisExpandCount - 1))
            ) / (this.dimensions.length - axisExpandCount));
            !isFinite(width) && (width = 0);
            return width;
        },

        findClosestAxisDim: function (point) {
            var axisDim;
            var minDist = Infinity;

            zrUtil.each(this._axesLayout, function (axisLayout, dim) {
                var localPoint = graphic.applyTransform(point, axisLayout.transform, true);
                var extent = this._axesMap[dim].getExtent();

                if (localPoint[0] < extent[0] || localPoint[0] > extent[1]) {
                    return;
                }

                var dist = Math.abs(localPoint[1]);
                if (dist < minDist) {
                    minDist = dist;
                    axisDim = dim;
                }
            }, this);

            return axisDim;
        },

        findAxisExpandCenter: function (point) {
            var layoutSettings = this._getLayoutSettings();
            var axisBase = layoutSettings.axisBase;
            var pixelDimIndex = layoutSettings.pixelDimIndex;

            if (point[1 - pixelDimIndex] < axisBase
                || point[1 - pixelDimIndex] > axisBase + layoutSettings.axisLength
            ) {
                return;
            }

            var targetPos = point[pixelDimIndex] - layoutSettings.layoutBase;
            var collapseWidth = this._getCollapseWith(layoutSettings);
            var expandWidth = layoutSettings.axisExpandWidth;

            var centerIndex = collapseWidth <= 0
                // When layoutLength is smaller than expand window.
                ? mathMax(0, mathFloor(
                     this.dimensions.length * targetPos / layoutSettings.layoutLength
                ))
                : mathMax(0, mathFloor((
                    targetPos - layoutSettings.axisExpandCount / 2 * (expandWidth - collapseWidth)
                ) / collapseWidth));

            return !isFinite(centerIndex) ? null : centerIndex;
        }

    };

    function layoutAxisWithoutExpand(axisIndex, layoutLength, axisCount) {
        var step = layoutLength / (axisCount - 1);
        return {
            position: step * axisIndex,
            axisNameAvailableWidth: step
        };
    }

    function layoutAxisWithExpand(
        axisExpandWindow, axisExpandWidth, axisIndex, layoutLength, axisCount
    ) {
        var peekIntervalCount = axisExpandWindow[1] - axisExpandWindow[0];
        var otherWidth = (
            layoutLength - axisExpandWidth * peekIntervalCount
        ) / (axisCount - 1 - peekIntervalCount);

        var position;

        if (axisIndex < axisExpandWindow[0]) {
            position = (axisIndex - 1) * otherWidth;
        }
        else if (axisIndex <= axisExpandWindow[1]) {
            position = axisExpandWindow[0] * otherWidth
                + (axisIndex - axisExpandWindow[0]) * axisExpandWidth;
        }
        else if (axisIndex === axisCount - 1) {
            position = layoutLength;
        }
        else {
            position = axisExpandWindow[0] * otherWidth
                + peekIntervalCount * axisExpandWidth
                + (axisIndex - axisExpandWindow[1]) * otherWidth;
        }

        return {
            position: position,
            axisNameAvailableWidth: (
                axisExpandWindow[0] < axisIndex && axisIndex < axisExpandWindow[1]
            ) ? axisExpandWidth : otherWidth
        };
    }

    return Parallel;
});