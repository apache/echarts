define(function (require) {

    var zrUtil = require('zrender/core/util');
    var helper = require('./helper');
    var retrieveValue = helper.retrieveValue;
    var linearMap = require('../../util/number').linearMap;
    var round = Math.round;

    // Constants
    var DEFAULT_LOCATION_EDGE_GAP = 2;
    var DEFAULT_FILLER_SIZE = 30;

    function DataZoomLayout(dataZoomModel, ecModel, api) {

        /**
         * @readOnly
         */
        this.dataZoomModel = dataZoomModel;
        /**
         * @readOnly
         */
        this.ecModel = ecModel;
        /**
         * @readOnly
         */
        this.api = api;
        /**
         * @private
         */
        this._orient = dataZoomModel.get('orient');

        /**
         * @readOnly
         * @type {Object}
         */
        this.layout = {

            viewRange: {
                // handle1 may less than handle2,
                // so we dont naming them as 'start', 'end'
                handle1: null,
                handle2: null
            },

            /**
             * {
             *     x: {number},
             *     y: {number},
             *     width: {number},
             *     height: {number}
             * }
             * @type {Object}
             */
            location: {},

            filler: {
                shape: {}
            },
            startHandle: {
                shape: {}
            },
            endHandle: {
                shape: {}
            },
            startFrame: {
                shape: {}
            },
            endFrame: {
                shape: {}
            }
        };
    }

    DataZoomLayout.prototype = {

        constructor: DataZoomLayout,

        /**
         * @public
         */
        reset: function () {
            this._initLocation();
            this._initViewRange();
            this.update();
        },

        /**
         * @public
         * @param  {Object} dataZoomModel
         * @param  {Object} operation If empty, just re-calculate layout.
         * @param  {string} [operation.rangeArgs] ['start'] or ['end'] or ['start', 'end']
         * @param  {number} [operation.dx]
         * @param  {number} [operation.dy]
         */
        update: function (operation) {
            operation && this._updateViewRange(operation);

            this._orient === 'horizontal'
                ? this._updateWidgetsLayoutHorizontally()
                : this._updateWidgetsLayoutVertically();
        },

        /**
         * @public
         * @return {Object} {start, end}
         */
        normalizeToRange: function () {
            var viewRange = this.layout.viewRange;
            var viewExtend = [0, this._getViewTotalLength()];
            var percentExtent = [0, 100];
            var range = {
                start: linearMap(viewRange.handle1, viewExtend, percentExtent, true),
                end: linearMap(viewRange.handle2, viewExtend, percentExtent, true)
            };
            // Auto exchange
            if (range.start > range.end) {
                range.start = [range.end, range.end = range.start][0];
            }
            return range;
        },

        /**
         * @private
         */
        _initLocation: function () {
            var dataZoomModel = this.dataZoomModel;
            var x;
            var y;
            var width;
            var height;
            // If some of x/y/width/height are not specified, auto-adapt according to target grid.
            var gridRect = this._findGridRectForLocating();

            if (this._orient === 'horizontal') { // Horizontal layout
                width = retrieveValue(dataZoomModel.get('width'), gridRect.width);
                height = retrieveValue(dataZoomModel.get('height'), DEFAULT_FILLER_SIZE);
                x = retrieveValue(dataZoomModel.get('x'), gridRect.x);
                y = retrieveValue(
                    dataZoomModel.get('y'),
                    (this.api.getHeight() - height - DEFAULT_LOCATION_EDGE_GAP)
                );
            }
            else { // Vertical layout
                width = retrieveValue(dataZoomModel.get('width'), DEFAULT_FILLER_SIZE);
                height = retrieveValue(dataZoomModel.get('height'), gridRect.height);
                x = retrieveValue(dataZoomModel.get('x'), DEFAULT_LOCATION_EDGE_GAP);
                y = retrieveValue(dataZoomModel.get('y'), gridRect.y);
            }

            this.layout.location = {
                x: x, y: y, width: width, height: height
            };
        },

        /**
         * @private
         */
        _findGridRectForLocating: function () {
            // Find the grid coresponding to the first axis referred by dataZoom.
            var axisModel;
            var dataZoomModel = this.dataZoomModel;
            var ecModel = this.ecModel;

            helper.eachAxisDim(function (dimNames) {
                var axisIndices = dataZoomModel.get(dimNames.axisIndex);
                if (!axisModel && axisIndices.length) {
                    axisModel = ecModel.getComponent(dimNames.axis, axisIndices[0]);
                }
            });
            return ecModel
                .getComponent('grid', axisModel.get('gridIndex'))
                .coordinateSystem
                .getRect();
        },

        /**
         * @private
         */
        _initViewRange: function () {
            // Based on layout.location.
            var range = this.dataZoomModel.getRange();
            var viewExtend = [0, this._getViewTotalLength()];
            var percentExtent = [0, 100];
            this.layout.viewRange = {
                handle1: round(linearMap(range.start, percentExtent, viewExtend, true)),
                handle2: round(linearMap(range.end, percentExtent, viewExtend, true))
            };
        },

        /**
         * @private
         * @param  {Object} dataZoomModel
         * @param  {Object} operation
         * @param  {string} [operation.rangeArgs] ['handle1'] or ['handle2'] or ['handle1', 'handle2']
         * @param  {number} [operation.dx]
         * @param  {number} [operation.dy]
         */
        _updateViewRange: function (operation) {
            var delta = retrieveValue(
                this._orient === 'horizontal' ? operation.dx : operation.dy,
                0
            );
            var standardValue = delta > 0 ? Number.MIN_VALUE : Number.MAX_VALUE;
            var methods = ['min', 'max'];
            var methodIndex = delta > 0 ? 1 : 0;
            var edgeValue = delta > 0 ? this._getViewTotalLength() : 0;

            zrUtil.each(operation.rangeArgs, function (rangeArg) {
                var value = this.layout.viewRange[rangeArg];
                standardValue = Math[methods[methodIndex]](standardValue, value);
            }, this);

            var standardValueResult = Math[methods[1 - methodIndex]](standardValue + delta, edgeValue);
            delta = standardValueResult - standardValue;

            zrUtil.each(operation.rangeArgs, function (rangeArg) {
                this.layout.viewRange[rangeArg] += delta;
            }, this);
        },

        /**
         * @private
         */
        _getViewTotalLength: function () {
            var location = this.layout.location;
            return this._orient === 'horizontal' ? location.width : location.height;
        },

        /**
         * @private
         */
        _updateWidgetsLayoutHorizontally: function () {
            // Based on layout.viewRange and this.layout.location.
            var dataZoomModel = this.dataZoomModel;
            var layout = this.layout;
            var location = layout.location;
            var handleSize = dataZoomModel.get('handleSize');
            var viewRange = layout.viewRange;
            var viewRangeStart = Math.min(viewRange.handle1, viewRange.handle2);
            var viewRangeEnd = Math.max(viewRange.handle1, viewRange.handle2);

            var fillerStyle = layout.filler.shape = {
                x: location.x + viewRangeStart + handleSize,
                y: location.y,
                width: viewRangeEnd - viewRangeStart - handleSize * 2,
                height: location.height
            };

            var handleBase = {
                shape: {
                    y: location.y,
                    width: handleSize,
                    height: location.height
                }
            };

            var handles = [
                zrUtil.merge(
                    {
                        shape: {x: fillerStyle.x - handleSize}
                    },
                    handleBase
                ),
                zrUtil.merge(
                    {
                        shape: {x: fillerStyle.x + fillerStyle.width}
                    },
                    handleBase
                )
            ];
            var handle1Index = viewRange.handle1 > viewRange.handle2 ? 1 : 0;
            layout.handle1 = handles[handle1Index];
            layout.handle2 = handles[1 - handle1Index];

            var startHandleShape = handles[0].shape;
            var endHandleShape = handles[1].shape;

            layout.startFrame = {
                shape: {
                    x: location.x,
                    y: location.y,
                    width: startHandleShape.x - location.x,
                    height: location.height
                }
            };

            layout.endFrame = {
                shape: {
                    x: endHandleShape.x + endHandleShape.width,
                    y: location.y,
                    width: location.x + location.width
                        - (endHandleShape.x + endHandleShape.width),
                    height: location.height
                }
            };
        },

        /**
         * @private
         */
        _updateWidgetsLayoutVertically: function () {
            // Based on layout.viewRange and this.layout.location.
            var dataZoomModel = this.dataZoomModel;
            var layout = this.layout;
            var location = layout.location;
            var handleSize = dataZoomModel.get('handleSize');
            var viewRange = layout.viewRange;
            var viewRangeStart = Math.min(viewRange.handle1, viewRange.handle2);
            var viewRangeEnd = Math.max(viewRange.handle1, viewRange.handle2);

            var fillerStyle = layout.filler.shape = {
                x: location.x,
                y: location.y + viewRangeStart + handleSize,
                width: location.width,
                height: viewRangeEnd - viewRangeStart - handleSize * 2
            };

            var handleBase = {
                shape: {
                    x: location.x,
                    width: location.width,
                    height: handleSize
                }
            };

            var handles = [
                zrUtil.merge(
                    {
                        shape: {y: fillerStyle.y - handleSize}
                    },
                    handleBase
                ),
                layout.endHandle = zrUtil.merge(
                    {
                        shape: {y: fillerStyle.y + fillerStyle.height}
                    },
                    handleBase
                )
            ];
            var handle1Index = viewRange.handle1 > viewRange.handle2 ? 1 : 0;
            layout.handle1 = handles[handle1Index];
            layout.handle2 = handles[1 - handle1Index];

            var startHandleShape = handles[0].shape;
            var endHandleShape = handles[1].shape;

            layout.startFrame = {
                shape: {
                    x: location.x,
                    y: location.y,
                    width: location.width,
                    height: startHandleShape.y - location.y
                }
            };
            layout.endFrame = {
                shape: {
                    x: location.x,
                    y: endHandleShape.y + endHandleShape.height,
                    width: location.width,
                    height: location.y + location.height
                        - (endHandleShape.y + endHandleShape.height)
                }
            };
        }

    };

    return DataZoomLayout;
});