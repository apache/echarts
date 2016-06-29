/**
 * Parallel Coordinates
 * <https://en.wikipedia.org/wiki/Parallel_coordinates>
 */
define(function(require) {

    var layout = require('../../util/layout');
    var axisHelper = require('../../coord/axisHelper');
    var zrUtil = require('zrender/core/util');
    var ParallelAxis = require('./ParallelAxis');
    var graphic = require('../../util/graphic');
    var matrix = require('zrender/core/matrix');

    var each = zrUtil.each;

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
                    axis.scale.unionExtent(data.getDataExtent(dim));
                    axisHelper.niceScaleExtent(axis, axis.model);
                }, this);
            }, this);
        },

        /**
         * Resize the parallel coordinate system.
         * @param {module:echarts/coord/parallel/ParallelModel} parallelModel
         * @param {module:echarts/ExtensionAPI} api
         */
        resize: function (parallelModel, api) {
            this._rect = layout.getLayoutRect(
                parallelModel.getBoxLayoutParams(),
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            this._layoutAxes(parallelModel);
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
        _layoutAxes: function (parallelModel) {
            var rect = this._rect;
            var layout = parallelModel.get('layout');
            var axes = this._axesMap;
            var dimensions = this.dimensions;

            var size = [rect.width, rect.height];
            var sizeIdx = layout === 'horizontal' ? 0 : 1;
            var layoutLength = size[sizeIdx];
            var axisLength = size[1 - sizeIdx];
            var axisExtent = [0, axisLength];

            each(axes, function (axis) {
                var idx = axis.inverse ? 1 : 0;
                axis.setExtent(axisExtent[idx], axisExtent[1 - idx]);
            });

            var axisExpandable = parallelModel.get('axisExpandable');
            var axisExpandWidth = parallelModel.get('axisExpandWidth');
            var axisExpandCenter = parallelModel.get('axisExpandCenter');
            var axisExpandCount = parallelModel.get('axisExpandCount') || 0;
            var axisExpandWindow;

            if (axisExpandCenter != null) {
                // Clamp
                var left = Math.max(0, Math.floor(axisExpandCenter - (axisExpandCount - 1) / 2));
                var right = left + axisExpandCount - 1;
                if (right >= dimensions.length) {
                    right = dimensions.length - 1;
                    left = Math.max(0, Math.floor(right - axisExpandCount + 1));
                }
                axisExpandWindow = [left, right];
            }

            var getAxisPosition = (axisExpandable && axisExpandWindow && axisExpandWidth)
                ? function getAxisPosition(axisIndex, layoutLength, axisCount) {
                    var peekIntervalCount = axisExpandWindow[1] - axisExpandWindow[0];
                    var otherWidth = (
                        layoutLength - axisExpandWidth * peekIntervalCount
                    ) / (axisCount - 1 - peekIntervalCount);

                    var posToWindow = compareToWindow(axisIndex);

                    if (posToWindow < 0) {
                        return (axisIndex - 1) * otherWidth;
                    }
                    else if (posToWindow === 0) {
                        return axisExpandWindow[0] * otherWidth
                            + (axisIndex - axisExpandWindow[0]) * axisExpandWidth;
                    }
                    else if (axisIndex === axisCount - 1) {
                        return layoutLength;
                    }
                    else {
                        return axisExpandWindow[0] * otherWidth
                            + peekIntervalCount * axisExpandWidth
                            + (axisIndex - axisExpandWindow[1]) * otherWidth;
                    }
                }
                : function (axisIndex, layoutLength, axisCount) {
                    return layoutLength * axisIndex / (axisCount - 1);
                };

            function compareToWindow(axisIndex) {
                return axisIndex < axisExpandWindow[0]
                    ? -1
                    : axisIndex > axisExpandWindow[1]
                    ? 1
                    : 0;
            }

            each(dimensions, function (dim, idx) {
                var pos = getAxisPosition(idx, layoutLength, dimensions.length);

                var positionTable = {
                    horizontal: {
                        x: pos,
                        y: axisLength
                    },
                    vertical: {
                        x: 0,
                        y: pos
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
            var hasActiveSet = this.hasAxisbrushed();

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
        hasAxisbrushed: function () {
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
        }

    };

    return Parallel;
});