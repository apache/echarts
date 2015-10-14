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
    var bind = zrUtil.bind;
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
    var SHOW_DATA_SHADOW_SERIES_TYPE = ['line', 'bar', 'k', 'scatter'];

    return echarts.extendComponentView({

        type: 'dataZoom',

        init: function (ecModel, api) {

            /**
             * @private
             * @type {Object}
             */
            this._displayables = {};

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

            /**
             * @private
             */
            this._dragging;

            /**
             * @private
             */
            this._dataShadowInfo;

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

            var barGroup = this._displayables.barGroup = new graphic.Group();

            this._renderBackground();
            this._renderDataShadow();
            this._renderHandle();

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
        _positionGroup: function (barGroup) {
            var thisGroup = this.group;
            var location = this._location;
            var orient = this._orient;
            var inverse = this.dataZoomModel.get('inverse');
            var barGroup = this._displayables.barGroup;
            var otherAxisInverse = (this._dataShadowInfo || {}).otherAxisInverse;

            // Transform barGroup.
            barGroup.attr(
                (orient === HORIZONTAL && !inverse)
                ? {scale: otherAxisInverse ? [1, 1] : [1, -1]}
                : (orient === HORIZONTAL && inverse)
                ? {scale: otherAxisInverse ? [-1, 1] : [-1, -1]}
                : (orient === VERTICAL && !inverse)
                ? {scale: otherAxisInverse ? [1, -1] : [1, 1], rotation: Math.PI / 2}
                // Dont use Math.PI, considering shadow direction.
                : {scale: otherAxisInverse ? [-1, -1] : [-1, 1], rotation: Math.PI / 2}
            );

            // Position barGroup
            var rect = thisGroup.getBoundingRect([barGroup]);
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

        _renderBackground : function () {
            var dataZoomModel = this.dataZoomModel;
            var size = this._size;

            this._displayables.barGroup.add(new Rect({
                silent: true,
                shape: {
                    x: 0, y: 0, width: size[0], height: size[1]
                },
                style: {
                    fill: dataZoomModel.get('backgroundColor')
                }
            }));
        },

        _renderDataShadow: function () {
            var info = this._dataShadowInfo = this._prepareDataShadowInfo();

            if (!info) {
                return;
            }

            var size = this._size;
            var data = info.series.getDataAll();

            var otherDataExtent = data.getDataExtent(info.otherDim);
            // Nice extent.
            var otherOffset = (otherDataExtent[1] - otherDataExtent[0]) * 0.3;
            otherDataExtent = [
                otherDataExtent[0] - otherOffset,
                otherDataExtent[1] + otherOffset
            ];
            var otherShadowExtent = [0, size[1]];

            var thisShadowExtent = [0, size[0]];

            var points = [[size[0], 0], [0, 0]];
            var step = thisShadowExtent[1] / data.count();
            var thisCoord = 0;

            // Optimize for large data shadow
            var stride = Math.round(data.count() / size[0]);
            data.each([info.otherDim], function (value, index) {
                if (stride > 0 && (index % stride)) {
                    thisCoord += step;
                    return;
                }
                // FIXME
                // 应该使用统计的空判断？还是在list里进行空判断？
                var otherCoord = (value == null || isNaN(value) || value === '')
                    ? null
                    : linearMap(value, otherDataExtent, otherShadowExtent, true);
                otherCoord != null && points.push([thisCoord, otherCoord]);

                thisCoord += step;
            });

            this._displayables.barGroup.add(new graphic.Polyline({
                shape: {points: points},
                style: {fill: this.dataZoomModel.get('dataBackgroundColor'), lineWidth: 0},
                silent: true,
                z2: -20
            }));
        },

        _prepareDataShadowInfo: function () {
            var dataZoomModel = this.dataZoomModel;
            var showDataShadow = dataZoomModel.get('showDataShadow');

            if (showDataShadow === false) {
                return;
            }

            // Find a representative series.
            var result;
            dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
                var seriesModels = dataZoomModel.getTargetSeriesModels(dimNames.name, axisIndex);

                zrUtil.each(seriesModels, function (seriesModel) {
                    if (result) {
                        return;
                    }

                    if (!showDataShadow && zrUtil.indexOf(
                            SHOW_DATA_SHADOW_SERIES_TYPE, seriesModel.get('type')
                        ) < 0
                    ) {
                        return;
                    }

                    var thisAxis = this.ecModel.getComponent(dimNames.axis, axisIndex).axis;

                    result = {
                        thisAxis: thisAxis,
                        series: seriesModel,
                        thisDim: dimNames.name,
                        otherDim: getOtherDim(dimNames.name),
                        otherAxisInverse: seriesModel
                            .coordinateSystem.getOtherAxis(thisAxis).inverse
                    };

                }, this);

            }, this);

            return result;
        },

        _renderHandle: function () {
            var displables = this._displayables;
            var frames = displables.frames = [];
            var handles = displables.handles = [];
            var handleLabels = displables.handleLabels = [];
            var barGroup = this._displayables.barGroup;

            barGroup.add(displables.filler = new Rect({
                draggable: true,
                cursor: 'move',
                drift: bind(this._onDragMove, this, 'all'),
                ondragend: bind(this._onDragEnd, this),
                onmouseover: bind(this._showDataInfo, this, true),
                onmouseout: bind(this._showDataInfo, this, false),
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
                    drift: bind(this._onDragMove, this, handleIndex),
                    ondragend: bind(this._onDragEnd, this),
                    onmouseover: bind(this._showDataInfo, this, true),
                    onmouseout: bind(this._showDataInfo, this, false)
                }));

                this.group.add(
                    handleLabels[handleIndex] = new graphic.Text({
                    silent: true,
                    invisible: true,
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

        /**
         * @private
         */
        _updateView: function () {
            var displables = this._displayables;
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
            var displables = this._displayables;
            var handleLabels = displables.handleLabels;
            var orient = this._orient;

            // FIXME
            // date型，支持formatter，autoformatter（ec2 date.getAutoFormatter）
            var shouldShow = dataZoomModel.get('showDetail');
            var dataInterval;
            var axis;

            if (shouldShow) {
                dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
                    // Using dataInterval of the first axis.
                    if (!dataInterval) {
                        dataInterval = dataZoomModel.getDataInfo(dimNames.name, axisIndex);
                        axis = this.ecModel.getComponent(dimNames.axis, axisIndex).axis;
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
                handleLabels[handleIndex].setStyle({
                    x: textPoint[0],
                    y: textPoint[1],
                    textBaseline: orient === HORIZONTAL ? 'middle' : direction,
                    textAlign: orient === HORIZONTAL ? direction : 'center'
                });

                var text = (shouldShow && dataInterval)
                    ? this._formatLabel(dataInterval[handleIndex], axis) : null;

                handleLabels[handleIndex].setStyle('text', text);

            }, this);
        },

        /**
         * @private
         */
        _formatLabel: function (value, axis) {
            var labelFormatter = this.dataZoomModel.get('labelFormatter');
            if (labelFormatter) {
                return labelFormatter(value);
            }

            var labelPrecise = this.dataZoomModel.get('labelPrecise') || 0;
            return (value == null && isNaN(value))
                ? ''
                : axis.type === 'category'
                ? axis.scale.getLabel(Math.round(value))
                : value.toFixed(labelPrecise);
        },

        /**
         * @private
         * @param {boolean} showOrHide true: show, false: hide
         */
        _showDataInfo: function (showOrHide) {
            // Always show when drgging.
            showOrHide = this._dragging || showOrHide;

            var handleLabels = this._displayables.handleLabels;
            handleLabels[0].invisible = !showOrHide;
            handleLabels[1].invisible = !showOrHide;

            handleLabels[0].dirty();
            handleLabels[1].dirty();
        },

        _onDragMove: function (handleIndex, dx, dy) {
            this._dragging = true;

            // Transform dx, dy to bar coordination.
            var vertex = this._applyBarTransform([dx, dy], true);

            this._updateInterval(handleIndex, vertex[0]);
            this._updateView();

            if (this.dataZoomModel.get('realtime')) {
                this._dispatchAction();
            }
        },

        _onDragEnd: function () {
            this._dragging = false;
            this._showDataInfo(false);
            this._dispatchAction();
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
        _applyBarTransform: function (vertex, inverse) {
            var barTransform = this._displayables.barGroup.getLocalTransform();
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

    function getOtherDim(thisDim) {
        // FIXME
        // 这个逻辑和getOtherAxis里一致，但是写在这里是否不好
        return thisDim === 'x' ? 'y' : 'x';
    }

    function shadowInverses(dim, axis) {
        return (dim === 'y' && !axis.inverse)
            || (dim === 'x' && axis.inverse);
    }
});