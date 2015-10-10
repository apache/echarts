define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
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
             * @private
             */
            this._dataInterval;

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
            // FIXME
            // 需要区别用户事件在本component上触发的render和其他render。
            // 后者不重新构造shape。否则难于实现拖拽。
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
            this._renderFrame(barGroup);
            this._renderFiller(barGroup);
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
            var rect = thisGroup.getBoundingRect();

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

            barGroup.add(new graphic.Rect({
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
            // Data shadow
            // TODO
        },

        _renderFrame: function (barGroup) {
            var frames = this._displables.frames = [];

            each([0, 1], function (handleIndex) {
                barGroup.add(frames[handleIndex] = new graphic.Rect({
                    silent: true,
                    style: {
                        stroke: this.dataZoomModel.get('handleColor'),
                        lineWidth: DEFAULT_FRAME_BORDER_WIDTH,
                        fill: 'rgba(0,0,0,0)'
                    }
                }));
            }, this);
        },

        _renderFiller: function (barGroup) {
            barGroup.add(this._displables.filler = new graphic.Rect({
                draggable: true,
                cursor: 'move',
                drift: zrUtil.bind(this._onDragMove, this, 'all'),
                ondragend: zrUtil.bind(this._onDragEnd, this),
                style: {
                    fill: this.dataZoomModel.get('fillerColor'),
                    text: this._orient === HORIZONTAL ? ':::' : '::',
                    textPosition : 'inside'
                }
            }));
        },

        _renderHandle: function (barGroup) {
            // FIXME
            // var detailInfo = this.zoomOption.showDetail ? this._getDetail() : {start: '',end: ''};

            var handles = this._displables.handles = [];

            each([0, 1], function (handleIndex) {
                barGroup.add(handles[handleIndex] = new graphic.Rect({
                    style: {
                        fill: this.dataZoomModel.get('handleColor'),
                        textColor: DEFAULT_HANDLE_INNER_COLOR,
                        text: '=',
                        textPosition: 'inside'
                    },
                    cursor: 'move',
                    draggable: true,
                    drift: zrUtil.bind(this._onDragMove, this, handleIndex),
                    ondragend: zrUtil.bind(this._onDragEnd, this)
                }));
            }, this);
        },

        /**
         * @private
         */
        _resetInterval: function () {
            var dataInterval = this._dataInterval = this.dataZoomModel.getRange();

            this._handleEnds = linearMap(dataInterval, [0, 100], this._getViewExtent(), true);
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

            this._dataInterval = asc(linearMap(handleEnds, viewExtend, [0, 100], true));

            function compare(a, b, signal) {
                return Math[delta * signal > 0 ? 'max' : 'min'](a, b);
            }
        },

        _updateView: function () {
            var shapes = this._createShapes();
            var displables = this._displables;

            each([0, 1], function (handleIndex) {

                displables.handles[handleIndex].setShape(shapes.handles[handleIndex]);

                // FIXME
                // 是否要在这里做
                displables.frames[handleIndex].setShape(graphic.subPixelOptimizeRect({
                    shape: shapes.frames[handleIndex],
                    style: {lineWidth: DEFAULT_FRAME_BORDER_WIDTH}
                }).shape);

            }, this);

            displables.filler.setShape(shapes.filler);
        },

        _getDetailInfo: function () {

        },

        _onDragMove: function (handleIndex, dx, dy) {
            // Transform dx, dy to bar coordination.
            var vertex = this._applyBarTransform([dx, dy], true);

            this._updateInterval(handleIndex, vertex[0]);
            this._updateView();

            var dataZoomModel = this.dataZoomModel;
            if (dataZoomModel.get('realtime')) {
                // FIXME
                // if (this.zoomOption.showDetail) {
                // }

                this.api.dispatch({
                    type: 'dataZoom',
                    from: this.uid,
                    dataZoomModelId: dataZoomModel.uid,
                    dataZoomRange: this._dataInterval.slice()
                });
            }
        },

        _onDragEnd : function () {
            // FIXME
            // if (this.zoomOption.showDetail) {
            // }
            // var dataZoomModel = this.dataZoomModel;

            // if (!dataZoomModel.get('realtime')) {
            //     this.api.dispatch({
            //         type: 'dataZoom',
            //         from: this.uid,
            //         dataZoomModelId: dataZoomModel.uid,
            //         dataZoomRange: this._dataInterval.slice()
            //     });
            // }
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
        _createShapes: function () {
            var shapes = {frames: [], handles: []};

            var handleInterval = asc(this._handleEnds.slice());
            var size = this._size;
            var halfHandleSize = this._halfHandleSize;

            var frameIntervals = [
                [0, handleInterval[0] - halfHandleSize],
                [handleInterval[1] + halfHandleSize, size[0]]
            ];

            each([0, 1], function (handleIndex) {
                var frameInterval = frameIntervals[handleIndex];
                shapes.frames[handleIndex] = {
                    x: frameInterval[0],
                    y: 0,
                    width: frameInterval[1] - frameInterval[0],
                    height: size[1]
                };
                shapes.handles[handleIndex] = {
                    x: this._handleEnds[handleIndex] - halfHandleSize,
                    y: 0,
                    width: halfHandleSize * 2,
                    height: this._size[1]
                };
            }, this);

            shapes.filler = {
                x: handleInterval[0],
                y: 0,
                width: handleInterval[1] - handleInterval[0],
                height: this._size[1]
            };

            return shapes;
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