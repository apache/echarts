define(function (require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var retrieveValue = modelUtil.retrieveValue;
    var numberUtil = require('../../util/number');
    var linearMap = numberUtil.linearMap;
    var parsePercent = numberUtil.parsePercent;
    var asc = numberUtil.asc;
    var mathRound = Math.round;
    var mathMin = Math.min;
    var mathMax = Math.max;
    var each = zrUtil.each;

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
         * @private
         */
        this._handleNames = ['handle1', 'handle2'];
        /**
         * {
         *     x: {number},
         *     y: {number},
         *     width: {number},
         *     height: {number},
         *     viewRange: {
         *         handle1,
         *         handle2,
         *         interval: [handle1, handle2] or [handle2, handle1]
         *     },
         *     filler: {},
         *     startFrame: {},
         *     endFrame: {}
         * }
         *
         * @readOnly
         * @type {Object}
         */
        this.layout = {};
    }

    DataZoomLayout.prototype = {

        constructor: DataZoomLayout,

        /**
         * @public
         */
        reset: function () {
            this.layout.halfHandleSize = mathRound(this.dataZoomModel.get('handleSize') / 2);

            this._initLocation();
            this._initViewRange();
            this.update();
        },

        /**
         * @public
         * @param  {Object} dataZoomModel
         * @param  {Object=} operation If empty, just re-calculate layout.
         * @param  {string} [operation.rangeArg] 'handle1' or 'handle2' or null/undefined
         * @param  {number} [operation.dx]
         * @param  {number} [operation.dy]
         */
        update: function (operation) {
            this._updateViewRange(operation);
            this._layouters[this._orient].call(this);
        },

        /**
         * @public
         * @return {Array} [start, end]
         */
        normalizeToRange: function () {
            var viewRange = this.layout.viewRange;
            var viewExtend = this._getViewExtent(true);
            var percentExtent = [0, 100];

            return asc([
                linearMap(viewRange.handle1, viewExtend, percentExtent, true),
                linearMap(viewRange.handle2, viewExtend, percentExtent, true)
            ]);
        },

        /**
         * @private
         */
        _initLocation: function () {
            var dataZoomModel = this.dataZoomModel;
            var layout = this.layout;
            // If some of x/y/width/height are not specified,
            // auto-adapt according to target grid.
            var gridRect = this._findCoordRectForLocating();

            var api = this.api;
            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();
            var x = dataZoomModel.get('x');
            var y = dataZoomModel.get('y');
            var width = dataZoomModel.get('width');
            var height = dataZoomModel.get('height');

            if (this._orient === 'horizontal') { // Horizontal layout
                layout.width = parsePercent(retrieveValue(width, gridRect.width), ecWidth);
                layout.height = parsePercent(retrieveValue(height, DEFAULT_FILLER_SIZE), ecHeight);
                layout.x = parsePercent(retrieveValue(x, gridRect.x), ecWidth);
                layout.y = parsePercent(retrieveValue(
                    y,
                    (this.api.getHeight() - layout.height - DEFAULT_LOCATION_EDGE_GAP)
                ), ecHeight);
            }
            else { // Vertical layout
                layout.width = parsePercent(retrieveValue(width, DEFAULT_FILLER_SIZE), ecWidth);
                layout.height = parsePercent(retrieveValue(height, gridRect.height), ecHeight);
                layout.x = parsePercent(retrieveValue(x, DEFAULT_LOCATION_EDGE_GAP), ecWidth);
                layout.y = parsePercent(retrieveValue(y, gridRect.y), ecHeight);
            }
        },

        /**
         * @private
         */
        _findCoordRectForLocating: function () {
            // Find the grid coresponding to the first axis referred by dataZoom.
            var axisModel;
            var dataZoomModel = this.dataZoomModel;
            var ecModel = this.ecModel;

            modelUtil.eachAxisDim(function (dimNames) {
                var axisIndices = dataZoomModel.get(dimNames.axisIndex);
                if (!axisModel && axisIndices.length) {
                    axisModel = ecModel.getComponent(dimNames.axis, axisIndices[0]);
                }
            });

            // FIXME
            // 判断是catesian还是polar
            var rect;
            var gridIndex = axisModel.get('gridIndex');
            if (gridIndex != null) {
                rect = ecModel
                .getComponent('grid', axisModel.get('gridIndex'))
                .coordinateSystem
                .getRect();
            }
            else { // Polar
                // FIXME
                // 暂时随便写的
                var width = this.api.getWidth();
                var height = this.api.getHeight();
                rect = {
                    x: width * 0.2,
                    y: height * 0.2,
                    width: width * 0.6,
                    height: height * 0.6
                };
            }

            return rect;
        },

        /**
         * @private
         */
        _initViewRange: function () {
            var range = this.dataZoomModel.getRange();
            var viewExtend = this._getViewExtent(true);
            var percentExtent = [0, 100];

            this.layout.viewRange = {
                handle1: mathRound(linearMap(range[0], percentExtent, viewExtend, true)),
                handle2: mathRound(linearMap(range[1], percentExtent, viewExtend, true))
            };
        },

        /**
         * @private
         * @param  {Object} dataZoomModel
         * @param  {Object=} operation
         * @param  {string} [operation.rangeArg] 'handle1' or 'handle2' or null/undefined
         * @param  {number} [operation.dx]
         * @param  {number} [operation.dy]
         */
        _updateViewRange: function (operation) {
            operation = operation || {};
            var viewRange = this.layout.viewRange;
            var handleNames = this._handleNames;
            var delta = this._orient === 'horizontal' ? operation.dx : operation.dy;

            if (delta) {
                var rangeArgs = operation.rangeArg;
                rangeArgs = !rangeArgs ? handleNames : [rangeArgs];

                // Find min or max between rangeArg as stardardValue.
                var standardValue = delta > 0 ? -Infinity : Infinity;
                each(rangeArgs, function (rangeArg) {
                    standardValue = compare(standardValue, viewRange[rangeArg], 1);
                }, this);

                // And then re-calculate delta.
                var edgeValue = this._getViewExtent()[delta < 0 ? 0 : 1];
                delta = compare(standardValue + delta, edgeValue, -1) - standardValue;
                // Update handles.
                each(rangeArgs, function (rangeArg) {
                    viewRange[rangeArg] += delta;
                }, this);
            }

            // Update min and max, considering all handles.
            var interval = viewRange.interval = numberUtil.asc(
                [viewRange.handle1, viewRange.handle2]
            );

            function compare(a, b, signal) {
                return Math[delta * signal > 0 ? 'max' : 'min'](a, b);
            }
        },

        /**
         * @private
         */
        _getViewExtent: function (forMapping) {
            // View total length.
            var layout = this.layout;
            var dataZoomModel = this.dataZoomModel;
            var halfHandleSize = layout.halfHandleSize;
            var orient = this._orient;
            var totalLength = mathMax(
                orient === 'horizontal' ? layout.width : layout.height,
                halfHandleSize * 4
            );
            var extent = [halfHandleSize, totalLength - halfHandleSize];

            var inverse = dataZoomModel.get('inverse');
            // horizontal and inverse, or vertical and not inverse, extend will be reversed.
            if (forMapping && (orient === 'horizontal' ? inverse : !inverse)) {
                extent.reverse();
            }
            return extent;
        },

        /**
         * @private
         */
        _layouters: {

            horizontal: function () {
                var layout = this.layout;
                var mainWidth = layout.width;
                var mainHeight = layout.height;
                var halfHandleSize = layout.halfHandleSize;
                var viewRange = layout.viewRange;
                var interval = viewRange.interval;

                layout.filler = {
                    shape: {
                        x: interval[0],
                        y: 0,
                        width: interval[1] - interval[0],
                        height: mainHeight
                    }
                };

                zrUtil.each(['handle1', 'handle2'], function (handleName) {
                    layout[handleName] = {
                        shape: {
                            x: viewRange[handleName] - halfHandleSize,
                            y: 0,
                            width: halfHandleSize * 2,
                            height: mainHeight
                        }
                    };
                });

                var frameCfg = [
                    {name: 'startFrame', range: [0, interval[0] - halfHandleSize]},
                    {name: 'endFrame', range: [interval[1] + halfHandleSize, mainWidth]}
                ];
                zrUtil.each(frameCfg, function (cfg) {
                    var cfgRange = cfg.range;
                    layout[cfg.name] = {
                        shape: {
                            x: cfgRange[0],
                            y: 0,
                            width: cfgRange[1] - cfgRange[0],
                            height: mainHeight
                        }
                    };
                });
            },

            /**
             * @private
             */
            vertical: function () {
                var layout = this.layout;
                var mainWidth = layout.width;
                var mainHeight = layout.height;
                var halfHandleSize = layout.halfHandleSize;
                var viewRange = layout.viewRange;
                var interval = viewRange.interval;

                layout.filler = {
                    shape: {
                        x: 0,
                        y: interval[0],
                        width: mainWidth,
                        height: interval[1] - interval[0]
                    }
                };

                zrUtil.each(['handle1', 'handle2'], function (handleName) {
                    layout[handleName] = {
                        shape: {
                            x: 0,
                            y: viewRange[handleName] - halfHandleSize,
                            width: mainWidth,
                            height: halfHandleSize * 2
                        }
                    };
                });

                var frameCfg = [
                    {name: 'startFrame', range: [0, interval[0] - halfHandleSize]},
                    {name: 'endFrame', range: [interval[1] + halfHandleSize, mainHeight]}
                ];
                zrUtil.each(frameCfg, function (cfg) {
                    var cfgRange = cfg.range;
                    layout[cfg.name] = {
                        shape: {
                            x: 0,
                            y: cfgRange[0],
                            width: mainWidth,
                            height: cfgRange[1] - cfgRange[0]
                        }
                    };
                });
            }
        }

    };

    return DataZoomLayout;
});