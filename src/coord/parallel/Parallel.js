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
         * @type {Array.<number>}
         * @readOnly
         */
        this.dimensions = parallelModel.get('dimensions');

        /**
         * @type {module:zrender/core/BoundingRect}
         */
        this._rect;

        this._init(parallelModel, ecModel, api);

        this.resize(parallelModel, api);
    }

    Parallel.prototype = {

        type: 'parallel',

        constructor: Parallel,

        /**
         * Initialize cartesian coordinate systems
         * @private
         */
        _init: function (parallelModel, ecModel, api) {

            var dimensions = parallelModel.get('dimensions');
            var axisIndices = parallelModel.get('parallelAxisIndex');

            each(axisIndices, function (axisIndex, idx) {

                var axisModel = ecModel.getComponent('parallelAxis', axisIndex);
                var parallelIndex = axisModel.get('parallelIndex');

                if (ecModel.getComponent('parallel', parallelIndex) !== parallelModel) {
                    // FIXME
                    // api.log('Axis should not be shared among coordinate systems!');
                    return;
                }

                var dim = dimensions[idx];

                var axis = this._axesMap[dim] = new ParallelAxis(
                    dim,
                    axisHelper.createScaleByModel(axisModel),
                    [0, 0],
                    axisModel.get('type')
                );

                var isCategory = axis.type === 'category';
                axis.onBand = isCategory && axisModel.get('boundaryGap');
                axis.inverse = axisModel.get('inverse');

                // Inject axis into axisModel
                axisModel.axis = axis;

                // Inject axisModel into axis
                axis.model = axisModel;

                axisHelper.niceScaleExtent(axis, axisModel);

            }, this);
        },

        /**
         * Resize the parallel coordinate system.
         * @param {module:echarts/coord/parallel/ParallelModel} parallelModel
         * @param {module:echarts/ExtensionAPI} api
         */
        resize: function (parallelModel, api) {
            this._rect = layout.parsePositionInfo(
                {
                    x: parallelModel.get('x'),
                    y: parallelModel.get('y'),
                    x2: parallelModel.get('x2'),
                    y2: parallelModel.get('y2'),
                    width: parallelModel.get('width'),
                    height: parallelModel.get('height')
                },
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            this._layoutAxes(parallelModel);
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
                var axis = axes[dim];
                var pos = layoutLength * idx / (dimensions.length - 1);
                var inverse = axis.inverse ? 'inverse' : 'forward';

                var positionTable = {
                    horizontal: {
                        x: pos,
                        y: {forward: layoutLength, inverse: 0}
                    },
                    vertical: {
                        x: {forward: 0, inverse: layoutLength},
                        y: pos
                    }
                };
                var rotationTable = {
                    horizontal: {forward: PI / 2, inverse: PI * 1.5},
                    vertical: {forward: 0, inverse: PI}
                };

                var position = [
                    positionTable[layout]['x'][inverse] + rect.x,
                    positionTable[layout]['y'][inverse] + rect.y
                ];

                var rotation = rotationTable[layout][inverse];
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
                    transform: transform
                };
            }, this);
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
         * Convert coords of each axis to Point.
         *  Return point. For example: [10, 20]
         * @param {Array.<number>} coords
         * @param {string} dim
         * @return {Array.<number>}
         */
        axisCoordToPoint: function (coord, dim) {
            var axisLayout = this._axesLayout[dim];
            var point = [0, coord];
            vector.applyTransform(point, point, axisLayout.transform);
            return point;
        },

        /**
         * Get axis layout.
         */
        getAxisLayout: function (dim) {
            return zrUtil.clone(this._axesLayout[dim], true);
        }

    };

    return Parallel;
});