define(function(require) {

    var VisualMapView = require('./VisualMapView');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var sliderMove = require('../helper/sliderMove');
    var linearMap = numberUtil.linearMap;
    var LinearGradient = require('zrender/graphic/LinearGradient');
    var helper = require('./helper');
    var each = zrUtil.each;

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
                shapes.handleGroups = [];
                shapes.handleThumbs = [];
                shapes.handleLabels = [];
                shapes.handleLabelPoints = [];

                this._createHandle(barGroup, 0, itemSize, textSize, orient, itemAlign);
                this._createHandle(barGroup, 1, itemSize, textSize, orient, itemAlign);
            }

            // Indicator
            // FIXME

            targetGroup.add(barGroup);
        },

        /**
         * @private
         */
        _createHandle: function (barGroup, handleIndex, itemSize, textSize, orient) {
            var handleGroup = new graphic.Group({position: [itemSize[0], 0]});
            var handleThumb = createPolygon(
                createHandlePoints(handleIndex, textSize),
                zrUtil.bind(this._modifyHandle, this, handleIndex),
                'move'
            );
            handleGroup.add(handleThumb);

            // For text locating. Text is always horizontal layout
            // but should not be effected by transform.
            var handleLabelPoint = {
                x: orient === 'horizontal'
                    ? textSize / 2
                    : textSize * 1.5,
                y: orient === 'horizontal'
                    ? (handleIndex === 0 ? -(textSize * 1.5) : (textSize * 1.5))
                    : (handleIndex === 0 ? -textSize / 2 : textSize / 2)
            };

            var textStyleModel = this.visualMapModel.textStyleModel;
            var handleLabel = new graphic.Text({
                silent: true,
                style: {
                    x: 0, y: 0, text: '',
                    textVerticalAlign: 'middle',
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor()
                }
            });

            this.group.add(handleLabel); // Text do not transform

            var shapes = this._shapes;
            shapes.handleThumbs[handleIndex] = handleThumb;
            shapes.handleGroups[handleIndex] = handleGroup;
            shapes.handleLabelPoints[handleIndex] = handleLabelPoint;
            shapes.handleLabels[handleIndex] = handleLabel;

            barGroup.add(handleGroup);
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
                linearMap(dataInterval[0], dataExtent, sizeExtent,true),
                linearMap(dataInterval[1], dataExtent, sizeExtent,true)
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
            var dataInterval = this._dataInterval;

            var outOfRangeHandleEnds = [0, visualMapModel.itemSize[1]];
            var inRangeHandleEnds = forSketch ? outOfRangeHandleEnds : this._handleEnds;

            var visualInRange = this._createBarVisual(
                dataInterval, dataExtent, inRangeHandleEnds, 'inRange'
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

            this._useHandle && each([0, 1], function (handleIndex) {

                shapes.handleThumbs[handleIndex].setStyle(
                    'fill', visualInRange.handlesColor[handleIndex]
                );

                shapes.handleLabels[handleIndex].setStyle({
                    text: visualMapModel.formatValueText(dataInterval[handleIndex]),
                    textAlign: this._applyTransform(
                        this._orient === 'horizontal'
                            ? (handleIndex === 0 ? 'bottom' : 'top')
                            : 'left',
                        shapes.barGroup
                    )
                });

            }, this);

            this._updateHandlePosition(inRangeHandleEnds);
        },

        /**
         * @private
         */
        _createBarVisual: function (dataInterval, dataExtent, handleEnds, forceState) {
            var opts = {
                forceState: forceState,
                convertOpacityToAlpha: true
            };
            var colorStops = this.getControllerVisual(dataInterval, 'color', opts);

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
        _updateHandlePosition: function (handleEnds) {
            if (!this._useHandle) {
                return;
            }

            var shapes = this._shapes;

            each([0, 1], function (handleIndex) {
                var handleGroup = shapes.handleGroups[handleIndex];
                handleGroup.position[1] = handleEnds[handleIndex];

                // Update handle label position.
                var labelPoint = shapes.handleLabelPoints[handleIndex];
                var textPoint = graphic.applyTransform(
                    [labelPoint.x, labelPoint.y],
                    graphic.getTransform(handleGroup, this.group)
                );

                shapes.handleLabels[handleIndex].setStyle({
                    x: textPoint[0], y: textPoint[1]
                });
            }, this);
        },

        /**
         * @private
         */
        _applyTransform: function (vertex, element, inverse) {
            var transform = graphic.getTransform(element, this.group);

            return graphic[
                zrUtil.isArray(vertex)
                    ? 'applyTransform' : 'transformDirection'
            ](vertex, transform, inverse);
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

    return ContinuousVisualMapView;
});
