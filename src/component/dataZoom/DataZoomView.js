define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var Rect = graphic.Rect;
    var numberUtil = require('../../util/number');
    var linearMap = numberUtil.linearMap;
    var modelUtil = require('../../util/model');
    var retrieveValue = modelUtil.retrieveValue;
    var parsePercent = numberUtil.parsePercent;
    var asc = numberUtil.asc;
    var mathRound = Math.round;
    var mathMax = Math.max;
    var each = zrUtil.each;

    // Constants
    var DEFAULT_LOCATION_EDGE_GAP = 2;
    var DEFAULT_FRAME_BORDER_WIDTH = 1;
    var DEFAULT_HANDLE_INNER_COLOR = '#fff';
    var DEFAULT_FILLER_SIZE = 30;
    var HORIZONTAL = 'horizontal';
    var VERTICAL = 'vertical';
    var LABEL_GAP = 5;
    var DEFAULT_SHOW_DATA_SHADOW = ['line', 'bar', 'k'];

    return echarts.extendComponentView({

        type: 'dataZoom',

        init: function (ecModel, api) {

            /**
             * @private
             * @type {Object}
             */
            this._displables = {};

            /**
             * @private
             * @type {string}
             */
            this._orient;

            /**
             * [0, 100]
             * @private
             */
            this._range;

            /**
             * [coord of the first handle, coord of the second handle]
             * @private
             */
            this._handleEnds;

            /**
             * [length, thick]
             * @private
             * @type {Array.<number>}
             */
            this._size;

            /**
             * @private
             * @type {number}
             */
            this._halfHandleSize;

            /**
             * @private
             */
            this._location;

            this.api = api;
        },

        render: function (dataZoomModel, ecModel, api, event) {
            this.dataZoomModel = dataZoomModel;
            this.ecModel = ecModel;
            this._orient = dataZoomModel.get('orient');
            this._halfHandleSize = mathRound(dataZoomModel.get('handleSize') / 2);

            if (this.dataZoomModel.get('show') === false) {
                this.group.removeAll();
                return;
            }

            if (!event || event.type !== 'dataZoom' || event.from !== this.uid) {
                this._buildView();
            }

            this._updateView();
        },

        _buildView: function () {
            var thisGroup = this.group;

            thisGroup.removeAll();

            this._resetLocation();
            this._resetInterval();

            var barGroup = this._displables.barGroup = this._createBarGroup();

            this._renderBackground(barGroup);
            this._renderDataShadow(barGroup);
            this._renderHandle(barGroup);

            thisGroup.add(barGroup);

            this._positionGroup();
        },

        /**
         * @private
         */
        _resetLocation: function () {
            var dataZoomModel = this.dataZoomModel;

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

            var location = this._location = {};
            var size = this._size = [];

            // FIXME
            // 是否用layout.positionGroup中支持x2 y2？
            // 检查top bottom 等 margin。
            if (this._orient === HORIZONTAL) {
                size[0] = parsePercent(retrieveValue(width, gridRect.width), ecWidth);
                size[1] = parsePercent(retrieveValue(height, DEFAULT_FILLER_SIZE), ecHeight);
                location.x = parsePercent(retrieveValue(x, gridRect.x), ecWidth);
                location.y = parsePercent(retrieveValue(
                    y, (ecHeight - size[1] - DEFAULT_LOCATION_EDGE_GAP)
                ), ecHeight);
            }
            else { // vertical
                size[0] = parsePercent(retrieveValue(height, gridRect.height), ecHeight);
                size[1] = parsePercent(retrieveValue(width, DEFAULT_FILLER_SIZE), ecWidth);
                location.x = parsePercent(retrieveValue(x, DEFAULT_LOCATION_EDGE_GAP), ecWidth);
                location.y = parsePercent(retrieveValue(y, gridRect.y), ecHeight);
            }
        },

        /**
         * @private
         */
        _positionGroup: function (group, location) {
            var thisGroup = this.group;
            var location = this._location;
            var rect = thisGroup.getBoundingRect([this._displables.barGroup]);

            thisGroup.position[0] = location.x - rect.x;
            thisGroup.position[1] = location.y - rect.y;
        },

        /**
         * @private
         */
        _getViewExtent: function () {
            // View total length.
            var halfHandleSize = this._halfHandleSize;
            var totalLength = mathMax(this._size[0], halfHandleSize * 4);
            var extent = [halfHandleSize, totalLength - halfHandleSize];

            return extent;
        },

        _renderBackground : function (barGroup) {
            var dataZoomModel = this.dataZoomModel;
            var size = this._size;

            barGroup.add(new Rect({
                silent: true,
                shape: {
                    x: 0, y: 0, width: size[0], height: size[1]
                },
                style: {
                    fill: dataZoomModel.get('backgroundColor')
                }
            }));
        },

        _renderDataShadow: function (barGroup) {
            var info = this._findDataShadowInfo();

            if (!info.series) {
                return;
            }

            var size = this._size;
            var data = info.series.getDataAll();

            var vDataExtent = data.getDataExtent(info.dim, false);
            var vDataOffset = (vDataExtent[1] - vDataExtent[0]) * 0.3; // For nice extent.
            vDataExtent = [vDataExtent[0] - vDataOffset, vDataExtent[1] + vDataOffset];
            var vDataShadowExtent = info.vInverse ? [size[1], 0] : [0, size[1]];

            var hDataExtent = [0, data.count()];
            var hDataShadowExtent = [0, size[0]];

            var points = [[size[0], size[1]], [0, size[1]]];
            data.each([info.dim], function (value, index) {
                var xValue = linearMap(index, hDataExtent, hDataShadowExtent, true);
                // FIXME
                // 应该使用统计的空判断？还是在list里进行空判断？
                var yValue = (value == null || isNaN(value) || value === '')
                    ? null
                    : linearMap(value, vDataExtent, vDataShadowExtent, true);
                yValue != null && points.push([xValue, yValue]);
            }, false, this);

            this._displables.barGroup.add(new graphic.Polyline({
                shape: {points: points},
                style: {fill: this.dataZoomModel.get('dataBackgroundColor'), lineWidth: 0},
                silent: true,
                z2: -2
            }));
        },

        _findDataShadowInfo: function () {
            var dataZoomModel = this.dataZoomModel;
            var showDataShadow = dataZoomModel.get('showDataShadow');

            if (showDataShadow === false) {
                return;
            }

            // Find a representative series.
            var result = {};
            dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
                if (result.series) {
                    return;
                }
                var seriesModels = dataZoomModel.getTargetSeriesModels(dimNames.name, axisIndex);

                zrUtil.each(seriesModels, function (seriesModel) {
                    if (showDataShadow
                        || zrUtil.indexOf(DEFAULT_SHOW_DATA_SHADOW, seriesModel.get('type')) >= 0
                    ) {
                        result.series = seriesModel;
                        // FIXME
                        // 这个逻辑和getOtherAxis里一致，但是写在这里是否不好
                        var dim = result.dim = dimNames.name === 'x' ? 'y' : 'x';
                        var axis = result.axis = seriesModel.coordinateSystem.getOtherAxis(
                            this.ecModel.getComponent(dimNames.axis, axisIndex).axis
                        );
                        result.vInverse = (dim === 'y' && !axis.inverse)
                            || (dim === 'x' && axis.inverse);
                    }
                }, this);

            }, this);

            return result;
        },

        _renderHandle: function (barGroup) {
            var displables = this._displables;
            var frames = displables.frames = [];
            var handles = displables.handles = [];
            var handleLabels = displables.handleLabels = [];

            barGroup.add(displables.filler = new Rect({
                draggable: true,
                cursor: 'move',
                drift: zrUtil.bind(this._onDragMove, this, 'all'),
                ondragend: zrUtil.bind(this._dispatchAction, this),
                style: {
                    fill: this.dataZoomModel.get('fillerColor'),
                    text: ':::',
                    textPosition : 'inside'
                }
            }));

            each([0, 1], function (handleIndex) {

                barGroup.add(frames[handleIndex] = new Rect({
                    silent: true,
                    style: {
                        stroke: this.dataZoomModel.get('handleColor'),
                        lineWidth: DEFAULT_FRAME_BORDER_WIDTH,
                        fill: 'rgba(0,0,0,0)'
                    }
                }));

                barGroup.add(handles[handleIndex] = new Rect({
                    style: {
                        fill: this.dataZoomModel.get('handleColor'),
                        textColor: DEFAULT_HANDLE_INNER_COLOR,
                        text: '=',
                        textPosition: 'inside'
                    },
                    cursor: 'move',
                    draggable: true,
                    drift: zrUtil.bind(this._onDragMove, this, handleIndex),
                    ondragend: zrUtil.bind(this._dispatchAction, this)
                }));

                this.group.add(
                    handleLabels[handleIndex] = new graphic.Text({
                    silent: true,
                    style: {
                        x: 0, y: 0, text: '',
                        textBaseline: 'middle',
                        textAlign: 'center',
                        font: this.dataZoomModel.textStyleModel.getFont()
                    }
                }));

            }, this);
        },

        /**
         * @private
         */
        _resetInterval: function () {
            var range = this._range = this.dataZoomModel.getRange();

            this._handleEnds = linearMap(range, [0, 100], this._getViewExtent(), true);
        },

        /**
         * @private
         * @param {(number|string)} handleIndex 0 or 1 or 'all'
         * @param {number} dx
         * @param {number} dy
         */
        _updateInterval: function (handleIndex, delta) {
            delta = delta || 0;
            var handleEnds = this._handleEnds;
            var viewExtend = this._getViewExtent();

            if (delta) {
                var handleIndices = (
                        handleIndex === 'all' || this.dataZoomModel.get('zoomLock')
                    )
                    ? [0, 1] : [handleIndex];

                // Find min or max between rangeArg as stardardValue.
                var standardValue = delta > 0 ? -Infinity : Infinity;
                each(handleIndices, function (handleIndex) {
                    standardValue = compare(standardValue, handleEnds[handleIndex], 1);
                }, this);

                // And then re-calculate delta.
                var edgeValue = viewExtend[delta < 0 ? 0 : 1];
                delta = compare(standardValue + delta, edgeValue, -1) - standardValue;
                // Update handles.
                each(handleIndices, function (handleIndex) {
                    handleEnds[handleIndex] += delta;
                }, this);
            }

            this._range = asc(linearMap(handleEnds, viewExtend, [0, 100], true));

            function compare(a, b, signal) {
                return Math[delta * signal > 0 ? 'max' : 'min'](a, b);
            }
        },

        _updateView: function () {
            var displables = this._displables;
            var handleEnds = this._handleEnds;
            var handleInterval = asc(handleEnds.slice());
            var size = this._size;
            var halfHandleSize = this._halfHandleSize;

            var frameIntervals = [
                [0, handleInterval[0] - halfHandleSize],
                [handleInterval[1] + halfHandleSize, size[0]]
            ];

            each([0, 1], function (handleIndex) {

                // Frames
                var frameInterval = frameIntervals[handleIndex];
                displables.frames[handleIndex].setShape(graphic.subPixelOptimizeRect({
                    shape: {
                        x: frameInterval[0],
                        y: 0,
                        width: frameInterval[1] - frameInterval[0],
                        height: size[1]
                    },
                    style: {lineWidth: DEFAULT_FRAME_BORDER_WIDTH}
                }).shape);

                // Handles
                var handle = displables.handles[handleIndex];
                handle.setShape({
                    x: handleEnds[handleIndex] - halfHandleSize,
                    y: 0,
                    width: halfHandleSize * 2,
                    height: size[1]
                });

            }, this);

            // Filler
            displables.filler.setShape({
                x: handleInterval[0],
                y: 0,
                width: handleInterval[1] - handleInterval[0],
                height: this._size[1]
            });

            this._updateDataInfo();
        },

        /**
         * @private
         */
        _updateDataInfo: function () {
            var dataZoomModel = this.dataZoomModel;
            var displables = this._displables;
            var orient = this._orient;
            // FIXME
            // date型，支持formatter，autoformatter（ec2 date.getAutoFormatter）
            var shouldShow = dataZoomModel.get('showDetail');
            var dataInterval;

            if (shouldShow) {
                dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
                    // Using dataInterval of the first axis.
                    if (!dataInterval) {
                        dataInterval = this.ecModel.getComponent(dimNames.axis, axisIndex)
                            .axis.scale.getExtent();
                    }
                }, this);
            }

            var orderedHandleEnds = asc(this._handleEnds.slice());

            zrUtil.each([0, 1], function (handleIndex) {

                // Label
                // Text should not transform by barGroup.
                var barTransform = modelUtil.getTransform(
                    displables.handles[handleIndex], this.group
                );
                var direction = modelUtil.transformDirection(
                    handleIndex === 0 ? 'right' : 'left', barTransform
                );
                var offset = this._halfHandleSize + LABEL_GAP;
                var textPoint = modelUtil.applyTransform(
                    [
                        orderedHandleEnds[handleIndex] + (handleIndex === 0 ? -offset : offset),
                        this._size[1] / 2
                    ],
                    barTransform
                );
                displables.handleLabels[handleIndex].setStyle({
                    x: textPoint[0],
                    y: textPoint[1],
                    textBaseline: orient === HORIZONTAL ? 'middle' : direction,
                    textAlign: orient === HORIZONTAL ? direction : 'center'
                });

                var text = (shouldShow && dataInterval) ? dataInterval[handleIndex] : null;
                text = (text != null && isFinite(text)) ? text + '' : null;

                this._displables.handleLabels[handleIndex].setStyle('text', text);

            }, this);
        },

        _onDragMove: function (handleIndex, dx, dy) {
            // Transform dx, dy to bar coordination.
            var vertex = this._applyBarTransform([dx, dy], true);

            this._updateInterval(handleIndex, vertex[0]);
            this._updateView();

            if (this.dataZoomModel.get('realtime')) {
                this._dispatchAction();
            }
        },

        _dispatchAction: function () {
            this.api.dispatch({
                type: 'dataZoom',
                from: this.uid,
                dataZoomModelId: this.dataZoomModel.uid,
                dataZoomRange: this._range.slice()
            });
        },

        /**
         * @private
         */
        _createBarGroup: function () {
            var orient = this._orient;
            var inverse = this.dataZoomModel.get('inverse');

            return new graphic.Group(
                (orient === HORIZONTAL && !inverse)
                ? {} // Do nothing.
                : (orient === HORIZONTAL && inverse)
                ? {scale: [-1, 1]}
                : (orient === VERTICAL && !inverse)
                ? {rotation: Math.PI / 2}
                : {rotation: -Math.PI / 2}
            );
        },

        /**
         * @private
         */
        _applyBarTransform: function (vertex, inverse) {
            var barTransform = this._displables.barGroup.getLocalTransform();
            return modelUtil.applyTransform(vertex, barTransform, inverse);
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
        }

    });
});