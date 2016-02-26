/**
 * Parallel Coordinates
 * <https://en.wikipedia.org/wiki/Parallel_coordinates>
 */
define(function(require) {

    var layout = require('../../util/layout');
    var axisHelper = require('../../coord/axisHelper');
    var zrUtil = require('zrender/core/util');
    var ParallelAxis = require('./ParallelAxis');
    var matrix = require('zrender/core/matrix');
    var vector = require('zrender/core/vector');

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

            each(dimensions, function (dim, idx) {
                var pos = layoutLength * idx / (dimensions.length - 1);

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
                    labelDirection: 1
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
         * @param {module:echarts/data/List} data
         * @param {Functio} cb param: {string} activeState 'active' or 'inactive' or 'normal'
         *                            {number} dataIndex
         * @param {Object} context
         */
        eachActiveState: function (data, callback, context) {
            var dimensions = this.dimensions;
            var axesMap = this._axesMap;
            var hasActiveSet = false;

            for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
                if (axesMap[dimensions[j]].model.getActiveState() !== 'normal') {
                    hasActiveSet = true;
                }
            }

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
         * Convert coords of each axis to Point.
         *  Return point. For example: [10, 20]
         * @param {Array.<number>} coords
         * @param {string} dim
         * @return {Array.<number>}
         */
        axisCoordToPoint: function (coord, dim) {
            var axisLayout = this._axesLayout[dim];
            var point = [coord, 0];
            vector.applyTransform(point, point, axisLayout.transform);
            return point;
        },

        /**
         * Get axis layout.
         */
        getAxisLayout: function (dim) {
            return zrUtil.clone(this._axesLayout[dim]);
        }

    };

    return Parallel;
});