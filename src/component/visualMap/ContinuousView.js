define(function(require) {

    var VisualMapView = require('./VisualMapView');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var sliderMove = require('../helper/sliderMove');
    var LinearGradient = require('zrender/graphic/LinearGradient');
    var helper = require('./helper');

    var linearMap = numberUtil.linearMap;
    var convertDataIndicesToBatch = helper.convertDataIndicesToBatch;
    var each = zrUtil.each;
    var mathMin = Math.min;
    var mathMax = Math.max;

    // Arbitrary value
    var HOVER_LINK_RANGE = 6;
    var HOVER_LINK_OUT = 6;

    // Notice:
    // Any "interval" should be by the order of [low, high].
    // "handle0" (handleIndex === 0) maps to
    // low data value: this._dataInterval[0] and has low coord.
    // "handle1" (handleIndex === 1) maps to
    // high data value: this._dataInterval[1] and has high coord.
    // The logic of transform is implemented in this._createBarGroup.

    var ContinuousVisualMapView = VisualMapView.extend({

        type: 'visualMap.continuous',

        /**
         * @override
         */
        init: function () {

            VisualMapView.prototype.init.apply(this, arguments);

            /**
             * @private
             */
            this._shapes = {};

            /**
             * @private
             */
            this._dataInterval = [];

            /**
             * @private
             */
            this._handleEnds = [];

            /**
             * @private
             */
            this._orient;

            /**
             * @private
             */
            this._useHandle;

            /**
             * @private
             */
            this._hoverLinkDataIndices = [];
        },

        /**
         * @protected
         * @override
         */
        doRender: function (visualMapModel, ecModel, api, payload) {
            if (!payload || payload.type !== 'selectDataRange' || payload.from !== this.uid) {
                this._buildView();
            }
            else {
                this._updateView();
            }
        },

        /**
         * @private
         */
        _buildView: function () {
            this.group.removeAll();

            var visualMapModel = this.visualMapModel;
            var thisGroup = this.group;

            this._orient = visualMapModel.get('orient');
            this._useHandle = visualMapModel.get('calculable');

            this._resetInterval();

            this._renderBar(thisGroup);

            var dataRangeText = visualMapModel.get('text');
            this._renderEndsText(thisGroup, dataRangeText, 0);
            this._renderEndsText(thisGroup, dataRangeText, 1);

            // Do this for background size calculation.
            this._updateView(true);

            // After updating view, inner shapes is built completely,
            // and then background can be rendered.
            this.renderBackground(thisGroup);

            // Real update view
            this._updateView();

            this._enableHoverLinkToSeries();
            this._enableHoverLinkFromSeries();

            this.positionGroup(thisGroup);
        },

        /**
         * @private
         */
        _renderEndsText: function (group, dataRangeText, endsIndex) {
            if (!dataRangeText) {
                return;
            }

            // Compatible with ec2, text[0] map to high value, text[1] map low value.
            var text = dataRangeText[1 - endsIndex];
            text = text != null ? text + '' : '';

            var visualMapModel = this.visualMapModel;
            var textGap = visualMapModel.get('textGap');
            var itemSize = visualMapModel.itemSize;

            var barGroup = this._shapes.barGroup;
            var position = this._applyTransform(
                [
                    itemSize[0] / 2,
                    endsIndex === 0 ? -textGap : itemSize[1] + textGap
                ],
                barGroup
            );
            var align = this._applyTransform(
                endsIndex === 0 ? 'bottom' : 'top',
                barGroup
            );
            var orient = this._orient;
            var textStyleModel = this.visualMapModel.textStyleModel;

            this.group.add(new graphic.Text({
                style: {
                    x: position[0],
                    y: position[1],
                    textVerticalAlign: orient === 'horizontal' ? 'middle' : align,
                    textAlign: orient === 'horizontal' ? align : 'center',
                    text: text,
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor()
                }
            }));
        },

        /**
         * @private
         */
        _renderBar: function (targetGroup) {
            var visualMapModel = this.visualMapModel;
            var shapes = this._shapes;
            var itemSize = visualMapModel.itemSize;
            var orient = this._orient;
            var useHandle = this._useHandle;
            var itemAlign = helper.getItemAlign(visualMapModel, this.api, itemSize);
            var barGroup = shapes.barGroup = this._createBarGroup(itemAlign);

            // Bar
            barGroup.add(shapes.outOfRange = createPolygon());
            barGroup.add(shapes.inRange = createPolygon(
                null,
                zrUtil.bind(this._modifyHandle, this, 'all'),
                useHandle ? 'move' : null
            ));

            var textRect = visualMapModel.textStyleModel.getTextRect('国');
            var textSize = Math.max(textRect.width, textRect.height);

            // Handle
            if (useHandle) {
                shapes.handleThumbs = [];
                shapes.handleLabels = [];
                shapes.handleLabelPoints = [];

                this._createHandle(barGroup, 0, itemSize, textSize, orient, itemAlign);
                this._createHandle(barGroup, 1, itemSize, textSize, orient, itemAlign);
            }

            this._createIndicator(barGroup, itemSize, textSize, orient);

            targetGroup.add(barGroup);
        },

        /**
         * @private
         */
        _createHandle: function (barGroup, handleIndex, itemSize, textSize, orient) {
            var handleThumb = createPolygon(
                createHandlePoints(handleIndex, textSize),
                zrUtil.bind(this._modifyHandle, this, handleIndex),
                'move'
            );
            handleThumb.position[0] = itemSize[0];
            barGroup.add(handleThumb);

            // Text is always horizontal layout but should not be effected by
            // transform (orient/inverse). So label is built separately but not
            // use zrender/graphic/helper/RectText, and is located based on view
            // group (according to handleLabelPoint) but not barGroup.
            var textStyleModel = this.visualMapModel.textStyleModel;
            var handleLabel = new graphic.Text({
                silent: true,
                style: {
                    x: 0, y: 0, text: '',
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor()
                }
            });
            this.group.add(handleLabel);

            var handleLabelPoint = [
                orient === 'horizontal'
                    ? textSize / 2
                    : textSize * 1.5,
                orient === 'horizontal'
                    ? (handleIndex === 0 ? -(textSize * 1.5) : (textSize * 1.5))
                    : (handleIndex === 0 ? -textSize / 2 : textSize / 2)
            ];

            var shapes = this._shapes;
            shapes.handleThumbs[handleIndex] = handleThumb;
            shapes.handleLabelPoints[handleIndex] = handleLabelPoint;
            shapes.handleLabels[handleIndex] = handleLabel;
        },

        /**
         * @private
         */
        _createIndicator: function (barGroup, itemSize, textSize, orient) {
            var indicator = createPolygon([[0, 0]], null, 'move');
            indicator.position[0] = itemSize[0];
            indicator.attr({invisible: true, silent: true});
            barGroup.add(indicator);

            var textStyleModel = this.visualMapModel.textStyleModel;
            var indicatorLabel = new graphic.Text({
                silent: true,
                invisible: true,
                style: {
                    x: 0, y: 0, text: '',
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor()
                }
            });
            this.group.add(indicatorLabel);

            var indicatorLabelPoint = [
                orient === 'horizontal' ? textSize / 2 : HOVER_LINK_OUT + 3,
                0
            ];

            var shapes = this._shapes;
            shapes.indicator = indicator;
            shapes.indicatorLabel = indicatorLabel;
            shapes.indicatorLabelPoint = indicatorLabelPoint;
        },

        /**
         * @private
         */
        _modifyHandle: function (handleIndex, dx, dy) {
            if (!this._useHandle) {
                return;
            }

            // Transform dx, dy to bar coordination.
            var vertex = this._applyTransform([dx, dy], this._shapes.barGroup, true);
            this._updateInterval(handleIndex, vertex[1]);

            this.api.dispatchAction({
                type: 'selectDataRange',
                from: this.uid,
                visualMapId: this.visualMapModel.id,
                selected: this._dataInterval.slice()
            });
        },

        /**
         * @private
         */
        _resetInterval: function () {
            var visualMapModel = this.visualMapModel;

            var dataInterval = this._dataInterval = visualMapModel.getSelected();
            var dataExtent = visualMapModel.getExtent();
            var sizeExtent = [0, visualMapModel.itemSize[1]];

            this._handleEnds = [
                linearMap(dataInterval[0], dataExtent, sizeExtent, true),
                linearMap(dataInterval[1], dataExtent, sizeExtent, true)
            ];
        },

        /**
         * @private
         * @param {(number|string)} handleIndex 0 or 1 or 'all'
         * @param {number} dx
         * @param {number} dy
         */
        _updateInterval: function (handleIndex, delta) {
            delta = delta || 0;
            var visualMapModel = this.visualMapModel;
            var handleEnds = this._handleEnds;

            sliderMove(
                delta,
                handleEnds,
                [0, visualMapModel.itemSize[1]],
                handleIndex === 'all' ? 'rigid' : 'push',
                handleIndex
            );
            var dataExtent = visualMapModel.getExtent();
            var sizeExtent = [0, visualMapModel.itemSize[1]];
            // Update data interval.
            this._dataInterval = [
                linearMap(handleEnds[0], sizeExtent, dataExtent, true),
                linearMap(handleEnds[1], sizeExtent, dataExtent, true)
            ];
        },

        /**
         * @private
         */
        _updateView: function (forSketch) {
            var visualMapModel = this.visualMapModel;
            var dataExtent = visualMapModel.getExtent();
            var shapes = this._shapes;

            var outOfRangeHandleEnds = [0, visualMapModel.itemSize[1]];
            var inRangeHandleEnds = forSketch ? outOfRangeHandleEnds : this._handleEnds;

            var visualInRange = this._createBarVisual(
                this._dataInterval, dataExtent, inRangeHandleEnds, 'inRange'
            );
            var visualOutOfRange = this._createBarVisual(
                dataExtent, dataExtent, outOfRangeHandleEnds, 'outOfRange'
            );

            shapes.inRange
                .setStyle({
                    fill: visualInRange.barColor,
                    opacity: visualInRange.opacity
                })
                .setShape('points', visualInRange.barPoints);
            shapes.outOfRange
                .setStyle({
                    fill: visualOutOfRange.barColor,
                    opacity: visualOutOfRange.opacity
                })
                .setShape('points', visualOutOfRange.barPoints);

            this._updateHandle(inRangeHandleEnds, visualInRange);
        },

        /**
         * @private
         */
        _createBarVisual: function (dataInterval, dataExtent, handleEnds, forceState) {
            var opts = {
                forceState: forceState,
                convertOpacityToAlpha: true
            };
            var colorStops = this._makeColorGradient(dataInterval, opts);

            var symbolSizes = [
                this.getControllerVisual(dataInterval[0], 'symbolSize', opts),
                this.getControllerVisual(dataInterval[1], 'symbolSize', opts)
            ];
            var barPoints = this._createBarPoints(handleEnds, symbolSizes);

            return {
                barColor: new LinearGradient(0, 0, 1, 1, colorStops),
                barPoints: barPoints,
                handlesColor: [
                    colorStops[0].color,
                    colorStops[colorStops.length - 1].color
                ]
            };
        },

        /**
         * @private
         */
        _makeColorGradient: function (dataInterval, opts) {
            // Considering colorHue, which is not linear, so we have to sample
            // to calculate gradient color stops, but not only caculate head
            // and tail.
            var sampleNumber = 100; // Arbitrary value.
            var colorStops = [];
            var step = (dataInterval[1] - dataInterval[0]) / sampleNumber;

            colorStops.push({
                color: this.getControllerVisual(dataInterval[0], 'color', opts),
                offset: 0
            });

            for (var i = 1; i < sampleNumber; i++) {
                var currValue = dataInterval[0] + step * i;
                if (currValue > dataInterval[1]) {
                    break;
                }
                colorStops.push({
                    color: this.getControllerVisual(currValue, 'color', opts),
                    offset: i / sampleNumber
                });
            }

            colorStops.push({
                color: this.getControllerVisual(dataInterval[1], 'color', opts),
                offset: 1
            });

            return colorStops;
        },

        /**
         * @private
         */
        _createBarPoints: function (handleEnds, symbolSizes) {
            var itemSize = this.visualMapModel.itemSize;

            return [
                [itemSize[0] - symbolSizes[0], handleEnds[0]],
                [itemSize[0], handleEnds[0]],
                [itemSize[0], handleEnds[1]],
                [itemSize[0] - symbolSizes[1], handleEnds[1]]
            ];
        },

        /**
         * @private
         */
        _createBarGroup: function (itemAlign) {
            var orient = this._orient;
            var inverse = this.visualMapModel.get('inverse');

            return new graphic.Group(
                (orient === 'horizontal' && !inverse)
                ? {scale: itemAlign === 'bottom' ? [1, 1] : [-1, 1], rotation: Math.PI / 2}
                : (orient === 'horizontal' && inverse)
                ? {scale: itemAlign === 'bottom' ? [-1, 1] : [1, 1], rotation: -Math.PI / 2}
                : (orient === 'vertical' && !inverse)
                ? {scale: itemAlign === 'left' ? [1, -1] : [-1, -1]}
                : {scale: itemAlign === 'left' ? [1, 1] : [-1, 1]}
            );
        },

        /**
         * @private
         */
        _updateHandle: function (handleEnds, visualInRange) {
            if (!this._useHandle) {
                return;
            }

            var shapes = this._shapes;
            var visualMapModel = this.visualMapModel;
            var handleThumbs = shapes.handleThumbs;
            var handleLabels = shapes.handleLabels;

            each([0, 1], function (handleIndex) {
                var handleThumb = handleThumbs[handleIndex];
                handleThumb.setStyle('fill', visualInRange.handlesColor[handleIndex]);
                handleThumb.position[1] = handleEnds[handleIndex];

                // Update handle label position.
                var textPoint = graphic.applyTransform(
                    shapes.handleLabelPoints[handleIndex],
                    graphic.getTransform(handleThumb, this.group)
                );
                handleLabels[handleIndex].setStyle({
                    x: textPoint[0],
                    y: textPoint[1],
                    text: visualMapModel.formatValueText(this._dataInterval[handleIndex]),
                    textVerticalAlign: 'middle',
                    textAlign: this._applyTransform(
                        this._orient === 'horizontal'
                            ? (handleIndex === 0 ? 'bottom' : 'top')
                            : 'left',
                        shapes.barGroup
                    )
                });
            }, this);
        },

        /**
         * @private
         */
        _showIndicator: function (value, isRange) {
            var visualMapModel = this.visualMapModel;
            var dataExtent = visualMapModel.getExtent();
            var itemSize = visualMapModel.itemSize;
            var sizeExtent = [0, itemSize[1]];
            var pos = linearMap(value, dataExtent, sizeExtent, true);

            var shapes = this._shapes;
            var indicator = shapes.indicator;
            if (!indicator) {
                return;
            }

            indicator.position[1] = pos;
            indicator.attr('invisible', false);
            indicator.setShape('points', createIndicatorPoints(isRange, pos, itemSize[1]));

            var opts = {convertOpacityToAlpha: true};
            var color = this.getControllerVisual(value, 'color', opts);
            indicator.setStyle('fill', color);

            // Update handle label position.
            var textPoint = graphic.applyTransform(
                shapes.indicatorLabelPoint,
                graphic.getTransform(indicator, this.group)
            );

            var indicatorLabel = shapes.indicatorLabel;
            indicatorLabel.attr('invisible', false);
            var align = this._applyTransform('left', shapes.barGroup);
            var orient = this._orient;
            indicatorLabel.setStyle({
                text: (isRange ? '≈' : '') + visualMapModel.formatValueText(value),
                textVerticalAlign: orient === 'horizontal' ? align : 'middle',
                textAlign: orient === 'horizontal' ? 'center' : align,
                x: textPoint[0],
                y: textPoint[1]
            });
        },

        /**
         * @private
         */
        _enableHoverLinkToSeries: function () {
            this._shapes.barGroup
                .on('mousemove', zrUtil.bind(onMouseOver, this))
                .on('mouseout', zrUtil.bind(this._clearHoverLinkToSeries, this));

            function onMouseOver(e) {
                var visualMapModel = this.visualMapModel;
                var itemSize = visualMapModel.itemSize;

                if (!visualMapModel.option.hoverLink) {
                    return;
                }

                var pos = this._applyTransform(
                    [e.offsetX, e.offsetY], this._shapes.barGroup, true, true
                );
                var hoverRange = [pos[1] - HOVER_LINK_RANGE / 2, pos[1] + HOVER_LINK_RANGE / 2];
                var sizeExtent = [0, itemSize[1]];
                var dataExtent = visualMapModel.getExtent();
                var valueRange = [
                    linearMap(hoverRange[0], sizeExtent, dataExtent, true),
                    linearMap(hoverRange[1], sizeExtent, dataExtent, true)
                ];

                // Do not show indicator when mouse is over handle,
                // otherwise labels overlap, especially when dragging.
                if (0 <= pos[0] && pos[0] <= itemSize[0]) {
                    this._showIndicator((valueRange[0] + valueRange[1]) / 2, true);
                }

                var oldBatch = convertDataIndicesToBatch(this._hoverLinkDataIndices);
                this._hoverLinkDataIndices = visualMapModel.findTargetDataIndices(valueRange);
                var newBatch = convertDataIndicesToBatch(this._hoverLinkDataIndices);
                var resultBatches = helper.removeDuplicateBatch(oldBatch, newBatch);

                this.api.dispatchAction({type: 'downplay', batch: resultBatches[0]});
                this.api.dispatchAction({type: 'highlight', batch: resultBatches[1]});
            }
        },

        /**
         * @private
         */
        _enableHoverLinkFromSeries: function () {
            var zr = this.api.getZr();

            if (this.visualMapModel.option.hoverLink) {
                zr.on('mouseover', this._hoverLinkFromSeriesMouseOver, this);
                zr.on('mouseout', this._hideIndicator, this);
            }
            else {
                this._clearHoverLinkFromSeries();
            }
        },

        /**
         * @private
         */
        _hoverLinkFromSeriesMouseOver: function (e) {
            var el = e.target;

            if (!el || el.dataIndex == null) {
                return;
            }

            var dataModel = el.dataModel || this.ecModel.getSeriesByIndex(el.seriesIndex);
            var data = dataModel.getData(el.dataType);
            var dim = data.getDimension(this.visualMapModel.getDataDimension(data));
            var value = data.get(dim, el.dataIndex, true);

            this._showIndicator(value);
        },

        /**
         * @private
         */
        _hideIndicator: function () {
            var shapes = this._shapes;
            shapes.indicator && shapes.indicator.attr('invisible', true);
            shapes.indicatorLabel && shapes.indicatorLabel.attr('invisible', true);
        },

        /**
         * @private
         */
        _clearHoverLinkToSeries: function () {
            this._hideIndicator();

            var indices = this._hoverLinkDataIndices;

            this.api.dispatchAction({
                type: 'downplay',
                batch: convertDataIndicesToBatch(indices)
            });

            indices.length = 0;
        },

        /**
         * @private
         */
        _clearHoverLinkFromSeries: function () {
            this._hideIndicator();

            var zr = this.api.getZr();
            zr.off('mouseover', this._hoverLinkFromSeriesMouseOver);
            zr.off('mouseout', this._hideIndicator);
        },

        /**
         * @private
         */
        _applyTransform: function (vertex, element, inverse, global) {
            var transform = graphic.getTransform(element, global ? null : this.group);

            return graphic[
                zrUtil.isArray(vertex) ? 'applyTransform' : 'transformDirection'
            ](vertex, transform, inverse);
        },

        /**
         * @override
         */
        dispose: function () {
            this._clearHoverLinkFromSeries();
            this._clearHoverLinkToSeries();
        },

        /**
         * @override
         */
        remove: function () {
            this._clearHoverLinkFromSeries();
            this._clearHoverLinkToSeries();
        }

    });

    function createPolygon(points, onDrift, cursor) {
        return new graphic.Polygon({
            shape: {points: points},
            draggable: !!onDrift,
            cursor: cursor,
            drift: onDrift
        });
    }

    function createHandlePoints(handleIndex, textSize) {
        return handleIndex === 0
            ? [[0, 0], [textSize, 0], [textSize, -textSize]]
            : [[0, 0], [textSize, 0], [textSize, textSize]];
    }

    function createIndicatorPoints(isRange, pos, extentMax) {
        return isRange
            ? [ // indicate range
                [0, -mathMin(HOVER_LINK_RANGE, mathMax(pos, 0))],
                [HOVER_LINK_OUT, 0],
                [0, mathMin(HOVER_LINK_RANGE, mathMax(extentMax - pos, 0))]
            ]
            : [ // indicate single value
                [0, 0], [5, -5], [5, 5]
            ];
    }

    return ContinuousVisualMapView;
});
