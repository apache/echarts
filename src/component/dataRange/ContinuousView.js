define(function(require) {

    var DataRangeView = require('./DataRangeView');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var linearMap = numberUtil.linearMap;
    var asc = numberUtil.asc;
    var LinearGradient = require('zrender/graphic/LinearGradient');
    var parsePercent = numberUtil.parsePercent;

    // Constants
    var DEFAULT_BAR_BOUND = [20, 140];

    var PiecewiseDataRangeView = DataRangeView.extend({

        type: 'dataRange.continuous',

        /**
         * @override
         */
        init: function () {
            DataRangeView.prototype.init.apply(this, arguments);

            /**
             * @private
             */
            this._shapes = {};

            /**
             * @private
             */
            this._barBound = [];

            /**
             * @private
             */
            this._textSize;

            /**
             * @private
             */
            this._dataInterval = [];
        },

        /**
         * @protected
         * @override
         */
        doRender: function (dataRangeModel, ecModel, api, event) {
            if (!event || event.type !== 'dataRangeSelected' || event.from !== this.uid) {
                this._buildView();
            }
            this._updateView();
        },

        /**
         * @private
         */
        _buildView: function () {
            this.group.removeAll();

            var dataRangeModel = this.dataRangeModel;
            var dataRangeText = dataRangeModel.get('text');
            var thisGroup = this.group;

            // Reset data range.
            this._dataInterval = dataRangeModel.get('range');

            var barBound = this._resetBarBound();

            dataRangeText && this.renderEndsText(
                thisGroup, dataRangeText[0], barBound[0], barBound[1]
            );
            this._renderBar(thisGroup, !dataRangeText);
            dataRangeText && this.renderEndsText(
                thisGroup, dataRangeText[1], barBound[0], barBound[1]
            );

            this.renderBackground(thisGroup);

            this.positionGroup(thisGroup);

            this._modifyHandle(0, 0, 0, true);
            this._modifyHandle(1, 0, 0, true);
        },

        /**
         * @private
         */
        _resetBarBound: function () {
            var dataRangeModel = this.dataRangeModel;
            var api = this.api;
            var itemWidth = parsePercent(dataRangeModel.get('itemWidth'), api.getWidth());
            var itemHeight = parsePercent(dataRangeModel.get('itemHeight'), api.getHeight());

            var barBound = this._barBound = [itemWidth, itemHeight];
            dataRangeModel.get('orient') === 'horizontal' && barBound.reverse();

            (barBound[0] == null || isNaN(barBound[0])) && (barBound[0] = DEFAULT_BAR_BOUND[0]);
            (barBound[1] == null || isNaN(barBound[1])) && (barBound[1] = DEFAULT_BAR_BOUND[1]);

            return barBound;
        },

        /**
         * @private
         * @param {number|Array} source
         * @param {string} direction 'value2Coord' or 'coord2Value'
         * @return {number} target
         */
        _mapViewValue: function (source, direction) {
            var handleExtent = this._handleInfoReverse([0, this._barBound[1]]);

            var extents = [this.dataRangeModel.getExtent(), handleExtent];
            if (direction === 'coord2Value') {
                extents.reverse();
            }

            if (zrUtil.isArray(source)) {
                return asc([
                    linearMap(source[0], extents[0], extents[1], true),
                    linearMap(source[1], extents[0], extents[1], true)
                ]);
            }
            else {
                return linearMap(source, extents[0], extents[1], true);
            }
        },

        /**
         * @private
         */
        _handleInfoReverse: function (handleInfoArr) {
            var dataRangeModel = this.dataRangeModel;
            var inverse = dataRangeModel.get('inverse');
            if (dataRangeModel.get('orient') === 'horizontal' ? inverse : !inverse) {
                handleInfoArr = handleInfoArr.slice().reverse();
            }
            return handleInfoArr;
        },

        /**
         * @private
         */
        _renderBar: function (targetGroup, renderHandle) {
            var dataRangeModel = this.dataRangeModel;
            var orient = dataRangeModel.get('orient');
            var api = this.api;
            var shapes = this._shapes;
            var ecSize = orient === 'horizontal' ? api.getWidth() : api.getHeight();
            var itemAlign = this.getItemAlignByOrient(
                orient === 'horizontal' ? 'vertical' : 'horizontal',
                ecSize
            );
            var barBound = this._barBound;
            var handleInterval = [0, barBound[1]];

            var barGroup = new graphic.Group({
                rotation: orient === 'horizontal' ? Math.PI / 2 : 0,
                scale: (itemAlign === 'left' || itemAlign === 'bottom') ? [-1, 1] : [1, 1]
            });

            // Bar
            barGroup.add(shapes.outOfRange = createPolygon(
                createBarPoints(barBound, handleInterval)
            ));
            barGroup.add(shapes.inRange = createPolygon(
                createBarPoints(barBound, handleInterval),
                zrUtil.bind(this._modifyHandle, this, 'all'),
                'move'
            ));

            var textRect = dataRangeModel.textStyleModel.getTextRect('国');
            var textSize = this._textSize = Math.max(textRect.width, textRect.height);

            // Handle
            if (renderHandle) {
                shapes.handleGroups = [];
                shapes.handleThumbs = [];
                shapes.handleLabels = [];

                this._createHandle(barGroup, 0, barBound, textSize, orient, itemAlign);
                this._createHandle(barGroup, 1, barBound, textSize, orient, itemAlign);

                updateHandlePosition(shapes.handleGroups, handleInterval);

                // var font = dataRangeModel.textStyleModel.getFont();
                // barGroup.add(shapes.label0 = createLabels(
                //     barBound, textSize, handleInterval, orient, itemAlign, font
                // ));
                // barGroup.add(shapes.label1 = createLabel(
                //     barBound, textSize, handleInterval, orient, itemAlign, font
                // ));
            }

            // Indicator
            // FIXME

            targetGroup.add(barGroup);
        },

        /**
         * @private
         */
        _createBarColor: function (dataInterval, dataExtent, forceState) {
            var viewOrderDataInterval = this._handleInfoReverse(dataInterval);
            var colors = [
                this.getControllerVisual(viewOrderDataInterval[0], forceState).color,
                this.getControllerVisual(viewOrderDataInterval[1], forceState).color
            ];

            var colorStops = [];
            var handles = [];
            zrUtil.each(viewOrderDataInterval, function (value, index) {
                colorStops.push({offset: index, color: colors[index]});
                handles.push(colors[index]);
            });

            return {
                bar: new LinearGradient(0, 0, 1, 1, colorStops),
                handles: handles
            };
        },

        /**
         * @private
         */
        _modifyHandle: function (handleIndex, dx, dy, silent) {
            this._updateInterval(handleIndex, dx, dy);

            !silent && this.api.dispatch({
                type: 'dataRangeSelected',
                from: this.uid,
                dataRangeModelId: this.dataRangeModel.uid,
                selected: this._dataInterval
            });
        },

        /**
         * @private
         */
        _updateInterval: function (handleIndex, dx, dy) {
            var dataRangeModel = this.dataRangeModel;
            var delta = (dataRangeModel.get('orient') === 'horizontal' ? dx : dy) || 0;
            var handleInterval = this._mapViewValue(this._dataInterval, 'value2Coord');
            var extent = [0, this._barBound[1]];

            if (handleIndex === 'all') {
                handleInterval[0] += delta;
                handleInterval[1] += delta;

                if (handleInterval[0] < extent[0]
                    || handleInterval[0] > extent[1]
                    || handleInterval[1] < extent[0]
                    || handleInterval[1] > extent[1]
                ) {
                    return;
                }
            }
            else {
                handleInterval[handleIndex] += delta;

                if (handleInterval[handleIndex] < extent[0]
                    || handleInterval[handleIndex] > extent[1]
                ) {
                    return;
                }

                if (handleInterval[0] > handleInterval[1]) {
                    handleInterval[1 - handleIndex] = handleInterval[handleIndex];
                }
            }

            // Update data interval.
            this._dataInterval = this._mapViewValue(handleInterval, 'coord2Value');
        },

        /**
         * @private
         */
        _updateView: function () {
            var dataRangeModel = this.dataRangeModel;
            var dataExtent = dataRangeModel.getExtent();
            var shapes = this._shapes;
            var dataInterval = this._dataInterval;
            var handleInterval = this._mapViewValue(dataInterval, 'value2Coord');
            var colorsInRange = this._createBarColor(dataInterval, dataExtent);
            var colorsOutOfRange = this._createBarColor(dataExtent, dataExtent, 'outOfRange');
            var barBound = this._barBound;

            shapes.inRange
                .setStyle('fill', colorsInRange.bar)
                .setShape('points', createBarPoints(barBound, handleInterval));
            shapes.outOfRange.setStyle('fill', colorsOutOfRange.bar);

            var handleThumbs = shapes.handleThumbs;
            if (handleThumbs) {
                handleThumbs[0].setStyle('fill', colorsInRange.handles[0]);
                handleThumbs[1].setStyle('fill', colorsInRange.handles[1]);
            }

            var handleLabels = shapes.handleLabels;
            if (handleLabels) {
                handleLabels[0].setStyle('text', '' + dataInterval[0]);
                handleLabels[1].setStyle('text', '' + dataInterval[1]);
            }

            updateHandlePosition(shapes.handleGroups, handleInterval);
        },

        /**
         * @private
         */
        _createHandle: function (barGroup, handleIndex, barBound, textSize, orient, itemAlign) {
            var handleGroup = new graphic.Group({position: [barBound[0], 0]});
            var handleThumb = createPolygon(
                createHandlePoints(handleIndex, textSize),
                zrUtil.bind(this._modifyHandle, this, handleIndex),
                'move'
            );
            handleGroup.add(handleThumb);

            // Is there any neat approach to position text?
            var handleLabel = new graphic.Text({
                silent: true,
                rotation: orient === 'horizontal' ? -Math.PI / 2 : 0,
                scale: orient === 'horizontal'
                    ? (itemAlign === 'bottom' ? [1, -1] : [1, 1])
                    : (itemAlign === 'left' ? [-1, 1] : [1, 1]),
                style: {
                    x: orient === 'horizontal'
                        ? (handleIndex === 0 ? -textSize - 3 : textSize + 3)
                        : (itemAlign === 'left' ? -textSize - 3 : textSize + 3),
                    y: 0,
                    // FIXME
                    // 如果是空字符串，画不出来，可能哪里空判断的问题。
                    text: ' ',
                    textBaseline: orient === 'horizontal'
                        ? (itemAlign === 'bottom' ? 'top' : 'bottom')
                        : (handleIndex === 0 ? 'bottom' : 'top'),
                    textAlign: orient === 'horizontal'
                        ? (handleIndex === 0 ? 'right' : 'left')
                        : (itemAlign === 'left' ? 'right' : 'left'),
                    font: this.dataRangeModel.textStyleModel.getFont()
                }
            });
            handleGroup.add(handleLabel);

            var shapes = this._shapes;
            shapes.handleThumbs[handleIndex] = handleThumb;
            shapes.handleGroups[handleIndex] = handleGroup;
            shapes.handleLabels[handleIndex] = handleLabel;

            barGroup.add(handleGroup);
        }

    });

    function createBarPoints(barBound, handleInterval) {
        return [
            [0, handleInterval[0]],
            [barBound[0], handleInterval[0]],
            [barBound[0], handleInterval[1]],
            [0, handleInterval[1]]
        ];
    }

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
            ? [
                [0, 0],
                [textSize, 0],
                [textSize, -textSize]
            ]
            : [
                [0, 0],
                [textSize, 0],
                [textSize, textSize]
            ];
    }

    function updateHandlePosition(handleGroups, handleInterval) {
        handleGroups[0].position[1] = handleInterval[0];
        handleGroups[1].position[1] = handleInterval[1];
    }

    // function createLabels(font, orient, itemAlign) {
    //     return [
    //         new graphic.Text({
    //             style: {
    //                 text: '',
    //                 textBaseline: 'bottom',
    //                 textAlign: 'left',
    //                 font: font
    //             }
    //         }),
    //         new graphic.Text({
    //             style: {
    //                 text: '',
    //                 textBaseline: 'top',
    //                 textAlign: 'right',
    //                 font: font
    //             }
    //         });
    //     ];
    // }

    // function createLabelStyle(barBound, textSize, handleInterval, ) {
    //     return new graphic.Text({
    //         style: {
    //             x: barBound[0] + textSize,
    //             y: handleInterval[0],
    //             text: '哈士大夫asdf',
    //             textBaseline: 'bottom',
    //             textAlign: 'left',
    //             font: font
    //         }
    //     });
    // }

    return PiecewiseDataRangeView;
});
