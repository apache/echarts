define(function(require) {

    var VisualMapView = require('./VisualMapView');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var sliderMove = require('../helper/sliderMove');
    var LinearGradient = require('zrender/graphic/LinearGradient');
    var helper = require('./helper');
    var modelUtil = require('../../util/model');

    var linearMap = numberUtil.linearMap;
    var each = zrUtil.each;
    var mathMin = Math.min;
    var mathMax = Math.max;

    // Arbitrary value
    var HOVER_LINK_SIZE = 12;
    var HOVER_LINK_OUT = 6;

    // Notice:
    // Any "interval" should be by the order of [low, high].
    // "handle0" (handleIndex === 0) maps to
    // low data value: this._dataInterval[0] and has low coord.
    // "handle1" (handleIndex === 1) maps to
    // high data value: this._dataInterval[1] and has high coord.
    // The logic of transform is implemented in this._createBarGroup.

    var ContinuousView = VisualMapView.extend({

        type: 'visualMap.continuous',

        /**
         * @override
         */
        init: function () {

            ContinuousView.superApply(this, 'init', arguments);

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

            /**
             * @private
             */
            this._dragging;

            /**
             * @private
             */
            this._hovering;
        },

        /**
         * @protected
         * @override
         */
        doRender: function (visualMapModel, ecModel, api, payload) {
            if (!payload || payload.type !== 'selectDataRange' || payload.from !== this.uid) {
                this._buildView();
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
                useHandle ? 'move' : null,
                zrUtil.bind(this._dragHandle, this, 'all', false),
                zrUtil.bind(this._dragHandle, this, 'all', true)
            ));

            var textRect = visualMapModel.textStyleModel.getTextRect('国');
            var textSize = mathMax(textRect.width, textRect.height);

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
            var onDrift = zrUtil.bind(this._dragHandle, this, handleIndex, false);
            var onDragEnd = zrUtil.bind(this._dragHandle, this, handleIndex, true);
            var handleThumb = createPolygon(
                createHandlePoints(handleIndex, textSize),
                'move',
                onDrift,
                onDragEnd
            );
            handleThumb.position[0] = itemSize[0];
            barGroup.add(handleThumb);

            // Text is always horizontal layout but should not be effected by
            // transform (orient/inverse). So label is built separately but not
            // use zrender/graphic/helper/RectText, and is located based on view
            // group (according to handleLabelPoint) but not barGroup.
            var textStyleModel = this.visualMapModel.textStyleModel;
            var handleLabel = new graphic.Text({
                draggable: true,
                drift: onDrift,
                ondragend: onDragEnd,
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
            var indicator = createPolygon([[0, 0]], 'move');
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
        _dragHandle: function (handleIndex, isEnd, dx, dy) {
            if (!this._useHandle) {
                return;
            }

            this._dragging = !isEnd;

            if (!isEnd) {
                // Transform dx, dy to bar coordination.
                var vertex = this._applyTransform([dx, dy], this._shapes.barGroup, true);
                this._updateInterval(handleIndex, vertex[1]);

                // Considering realtime, update view should be executed
                // before dispatch action.
                this._updateView();
            }

            // dragEnd do not dispatch action when realtime.
            if (isEnd === !this.visualMapModel.get('realtime')) { // jshint ignore:line
                this.api.dispatchAction({
                    type: 'selectDataRange',
                    from: this.uid,
                    visualMapId: this.visualMapModel.id,
                    selected: this._dataInterval.slice()
                });
            }

            if (isEnd) {
                !this._hovering && this._clearHoverLinkToSeries();
            }
            else if (useHoverLinkOnHandle(this.visualMapModel)) {
                this._doHoverLinkToSeries(this._handleEnds[handleIndex], false);
            }
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
         * @param {number} cursorValue
         * @param {number} textValue
         * @param {string} [rangeSymbol]
         * @param {number} [halfHoverLinkSize]
         */
        _showIndicator: function (cursorValue, textValue, rangeSymbol, halfHoverLinkSize) {
            var visualMapModel = this.visualMapModel;
            var dataExtent = visualMapModel.getExtent();
            var itemSize = visualMapModel.itemSize;
            var sizeExtent = [0, itemSize[1]];
            var pos = linearMap(cursorValue, dataExtent, sizeExtent, true);

            var shapes = this._shapes;
            var indicator = shapes.indicator;
            if (!indicator) {
                return;
            }

            indicator.position[1] = pos;
            indicator.attr('invisible', false);
            indicator.setShape('points', createIndicatorPoints(
                !!rangeSymbol, halfHoverLinkSize, pos, itemSize[1]
            ));

            var opts = {convertOpacityToAlpha: true};
            var color = this.getControllerVisual(cursorValue, 'color', opts);
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
                text: (rangeSymbol ? rangeSymbol : '') + visualMapModel.formatValueText(textValue),
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
            var self = this;
            this._shapes.barGroup

                .on('mousemove', function (e) {
                    self._hovering = true;

                    if (!self._dragging) {
                        var itemSize = self.visualMapModel.itemSize;
                        var pos = self._applyTransform(
                            [e.offsetX, e.offsetY], self._shapes.barGroup, true, true
                        );
                        // For hover link show when hover handle, which might be
                        // below or upper than sizeExtent.
                        pos[1] = mathMin(mathMax(0, pos[1]), itemSize[1]);

                        self._doHoverLinkToSeries(
                            pos[1],
                            0 <= pos[0] && pos[0] <= itemSize[0]
                        );
                    }
                })

                .on('mouseout', function () {
                    // When mouse is out of handle, hoverLink still need
                    // to be displayed when realtime is set as false.
                    self._hovering = false;
                    !self._dragging && self._clearHoverLinkToSeries();
                });
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
        _doHoverLinkToSeries: function (cursorPos, hoverOnBar) {
            var visualMapModel = this.visualMapModel;
            var itemSize = visualMapModel.itemSize;

            if (!visualMapModel.option.hoverLink) {
                return;
            }

            var sizeExtent = [0, itemSize[1]];
            var dataExtent = visualMapModel.getExtent();

            // For hover link show when hover handle, which might be below or upper than sizeExtent.
            cursorPos = mathMin(mathMax(sizeExtent[0], cursorPos), sizeExtent[1]);

            var halfHoverLinkSize = getHalfHoverLinkSize(visualMapModel, dataExtent, sizeExtent);
            var hoverRange = [cursorPos - halfHoverLinkSize, cursorPos + halfHoverLinkSize];
            var cursorValue = linearMap(cursorPos, sizeExtent, dataExtent, true);
            var valueRange = [
                linearMap(hoverRange[0], sizeExtent, dataExtent, true),
                linearMap(hoverRange[1], sizeExtent, dataExtent, true)
            ];
            // Consider data range is out of visualMap range, see test/visualMap-continuous.html,
            // where china and india has very large population.
            hoverRange[0] < sizeExtent[0] && (valueRange[0] = -Infinity);
            hoverRange[1] > sizeExtent[1] && (valueRange[1] = Infinity);

            // Do not show indicator when mouse is over handle,
            // otherwise labels overlap, especially when dragging.
            if (hoverOnBar) {
                if (valueRange[0] === -Infinity) {
                    this._showIndicator(cursorValue, valueRange[1], '< ', halfHoverLinkSize);
                }
                else if (valueRange[1] === Infinity) {
                    this._showIndicator(cursorValue, valueRange[0], '> ', halfHoverLinkSize);
                }
                else {
                    this._showIndicator(cursorValue, cursorValue, '≈ ', halfHoverLinkSize);
                }
            }

            // When realtime is set as false, handles, which are in barGroup,
            // also trigger hoverLink, which help user to realize where they
            // focus on when dragging. (see test/heatmap-large.html)
            // When realtime is set as true, highlight will not show when hover
            // handle, because the label on handle, which displays a exact value
            // but not range, might mislead users.
            var oldBatch = this._hoverLinkDataIndices;
            var newBatch = [];
            if (hoverOnBar || useHoverLinkOnHandle(visualMapModel)) {
                newBatch = this._hoverLinkDataIndices = visualMapModel.findTargetDataIndices(valueRange);
            }

            var resultBatches = modelUtil.compressBatches(oldBatch, newBatch);
            this._dispatchHighDown('downplay', resultBatches[0]);
            this._dispatchHighDown('highlight', resultBatches[1]);
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

            this._showIndicator(value, value);
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

            this._dispatchHighDown('downplay', indices);

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
         * @private
         */
        _dispatchHighDown: function (type, batch) {
            batch && batch.length && this.api.dispatchAction({
                type: type,
                batch: batch
            });
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

    function createPolygon(points, cursor, onDrift, onDragEnd) {
        return new graphic.Polygon({
            shape: {points: points},
            draggable: !!onDrift,
            cursor: cursor,
            drift: onDrift,
            ondragend: onDragEnd
        });
    }

    function createHandlePoints(handleIndex, textSize) {
        return handleIndex === 0
            ? [[0, 0], [textSize, 0], [textSize, -textSize]]
            : [[0, 0], [textSize, 0], [textSize, textSize]];
    }

    function createIndicatorPoints(isRange, halfHoverLinkSize, pos, extentMax) {
        return isRange
            ? [ // indicate range
                [0, -mathMin(halfHoverLinkSize, mathMax(pos, 0))],
                [HOVER_LINK_OUT, 0],
                [0, mathMin(halfHoverLinkSize, mathMax(extentMax - pos, 0))]
            ]
            : [ // indicate single value
                [0, 0], [5, -5], [5, 5]
            ];
    }

    function getHalfHoverLinkSize(visualMapModel, dataExtent, sizeExtent) {
        var halfHoverLinkSize = HOVER_LINK_SIZE / 2;
        var hoverLinkDataSize = visualMapModel.get('hoverLinkDataSize');
        if (hoverLinkDataSize) {
            halfHoverLinkSize = linearMap(hoverLinkDataSize, dataExtent, sizeExtent, true) / 2;
        }
        return halfHoverLinkSize;
    }

    function useHoverLinkOnHandle(visualMapModel) {
        return !visualMapModel.get('realtime') && visualMapModel.get('hoverLinkOnHandle');
    }

    return ContinuousView;
});
