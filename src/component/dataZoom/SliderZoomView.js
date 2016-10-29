define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var throttle = require('../../util/throttle');
    var DataZoomView = require('./DataZoomView');
    var Rect = graphic.Rect;
    var numberUtil = require('../../util/number');
    var linearMap = numberUtil.linearMap;
    var layout = require('../../util/layout');
    var sliderMove = require('../helper/sliderMove');
    var asc = numberUtil.asc;
    var bind = zrUtil.bind;
    // var mathMax = Math.max;
    var each = zrUtil.each;

    // Constants
    var DEFAULT_LOCATION_EDGE_GAP = 7;
    var DEFAULT_FRAME_BORDER_WIDTH = 1;
    var DEFAULT_FILLER_SIZE = 30;
    var HORIZONTAL = 'horizontal';
    var VERTICAL = 'vertical';
    var LABEL_GAP = 5;
    var SHOW_DATA_SHADOW_SERIES_TYPE = ['line', 'bar', 'candlestick', 'scatter'];

    var SliderZoomView = DataZoomView.extend({

        type: 'dataZoom.slider',

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
            this._handleWidth;

            /**
             * @private
             * @type {number}
             */
            this._handleHeight;

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

        /**
         * @override
         */
        render: function (dataZoomModel, ecModel, api, payload) {
            SliderZoomView.superApply(this, 'render', arguments);

            throttle.createOrUpdate(
                this,
                '_dispatchZoomAction',
                this.dataZoomModel.get('throttle'),
                'fixRate'
            );

            this._orient = dataZoomModel.get('orient');

            if (this.dataZoomModel.get('show') === false) {
                this.group.removeAll();
                return;
            }

            // Notice: this._resetInterval() should not be executed when payload.type
            // is 'dataZoom', origin this._range should be maintained, otherwise 'pan'
            // or 'zoom' info will be missed because of 'throttle' of this.dispatchAction,
            if (!payload || payload.type !== 'dataZoom' || payload.from !== this.uid) {
                this._buildView();
            }

            this._updateView();
        },

        /**
         * @override
         */
        remove: function () {
            SliderZoomView.superApply(this, 'remove', arguments);
            throttle.clear(this, '_dispatchZoomAction');
        },

        /**
         * @override
         */
        dispose: function () {
            SliderZoomView.superApply(this, 'dispose', arguments);
            throttle.clear(this, '_dispatchZoomAction');
        },

        _buildView: function () {
            var thisGroup = this.group;

            thisGroup.removeAll();

            this._resetLocation();
            this._resetInterval();

            var barGroup = this._displayables.barGroup = new graphic.Group();

            this._renderBackground();

            this._renderHandle();

            this._renderDataShadow();

            thisGroup.add(barGroup);

            this._positionGroup();
        },

        /**
         * @private
         */
        _resetLocation: function () {
            var dataZoomModel = this.dataZoomModel;
            var api = this.api;

            // If some of x/y/width/height are not specified,
            // auto-adapt according to target grid.
            var coordRect = this._findCoordRect();
            var ecSize = {width: api.getWidth(), height: api.getHeight()};
            // Default align by coordinate system rect.
            var positionInfo = this._orient === HORIZONTAL
                ? {
                    // Why using 'right', because right should be used in vertical,
                    // and it is better to be consistent for dealing with position param merge.
                    right: ecSize.width - coordRect.x - coordRect.width,
                    top: (ecSize.height - DEFAULT_FILLER_SIZE - DEFAULT_LOCATION_EDGE_GAP),
                    width: coordRect.width,
                    height: DEFAULT_FILLER_SIZE
                }
                : { // vertical
                    right: DEFAULT_LOCATION_EDGE_GAP,
                    top: coordRect.y,
                    width: DEFAULT_FILLER_SIZE,
                    height: coordRect.height
                };

            // Do not write back to option and replace value 'ph', because
            // the 'ph' value should be recalculated when resize.
            var layoutParams = layout.getLayoutParams(dataZoomModel.option);

            // Replace the placeholder value.
            zrUtil.each(['right', 'top', 'width', 'height'], function (name) {
                if (layoutParams[name] === 'ph') {
                    layoutParams[name] = positionInfo[name];
                }
            });

            var layoutRect = layout.getLayoutRect(
                layoutParams,
                ecSize,
                dataZoomModel.padding
            );

            this._location = {x: layoutRect.x, y: layoutRect.y};
            this._size = [layoutRect.width, layoutRect.height];
            this._orient === VERTICAL && this._size.reverse();
        },

        /**
         * @private
         */
        _positionGroup: function () {
            var thisGroup = this.group;
            var location = this._location;
            var orient = this._orient;

            // Just use the first axis to determine mapping.
            var targetAxisModel = this.dataZoomModel.getFirstTargetAxisModel();
            var inverse = targetAxisModel && targetAxisModel.get('inverse');

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
            thisGroup.attr('position', [location.x - rect.x, location.y - rect.y]);
        },

        /**
         * @private
         */
        _getViewExtent: function () {
            return [0, this._size[0]];
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
                },
                z2: -40
            }));
        },

        _renderDataShadow: function () {
            var info = this._dataShadowInfo = this._prepareDataShadowInfo();

            if (!info) {
                return;
            }

            var size = this._size;
            var seriesModel = info.series;
            var data = seriesModel.getRawData();
            var otherDim = seriesModel.getShadowDim
                ? seriesModel.getShadowDim() // @see candlestick
                : info.otherDim;

            var otherDataExtent = data.getDataExtent(otherDim);
            // Nice extent.
            var otherOffset = (otherDataExtent[1] - otherDataExtent[0]) * 0.3;
            otherDataExtent = [
                otherDataExtent[0] - otherOffset,
                otherDataExtent[1] + otherOffset
            ];
            var otherShadowExtent = [0, size[1]];

            var thisShadowExtent = [0, size[0]];

            var areaPoints = [[size[0], 0], [0, 0]];
            var linePoints = [];
            var step = thisShadowExtent[1] / (data.count() - 1);
            var thisCoord = 0;

            // Optimize for large data shadow
            var stride = Math.round(data.count() / size[0]);
            var lastIsEmpty;
            data.each([otherDim], function (value, index) {
                if (stride > 0 && (index % stride)) {
                    thisCoord += step;
                    return;
                }

                // FIXME
                // Should consider axis.min/axis.max when drawing dataShadow.

                // FIXME
                // 应该使用统一的空判断？还是在list里进行空判断？
                var isEmpty = value == null || isNaN(value) || value === '';
                // See #4235.
                var otherCoord = isEmpty
                    ? 0 : linearMap(value, otherDataExtent, otherShadowExtent, true);

                // Attempt to draw data shadow precisely when there are empty value.
                if (isEmpty && !lastIsEmpty && index) {
                    areaPoints.push([areaPoints[areaPoints.length - 1][0], 0]);
                    linePoints.push([linePoints[linePoints.length - 1][0], 0]);
                }
                else if (!isEmpty && lastIsEmpty) {
                    areaPoints.push([thisCoord, 0]);
                    linePoints.push([thisCoord, 0]);
                }

                areaPoints.push([thisCoord, otherCoord]);
                linePoints.push([thisCoord, otherCoord]);

                thisCoord += step;
                lastIsEmpty = isEmpty;
            });

            var dataZoomModel = this.dataZoomModel;
            // var dataBackgroundModel = dataZoomModel.getModel('dataBackground');
            this._displayables.barGroup.add(new graphic.Polygon({
                shape: {points: areaPoints},
                style: zrUtil.defaults(
                    {fill: dataZoomModel.get('dataBackgroundColor')},
                    dataZoomModel.getModel('dataBackground.areaStyle').getAreaStyle()
                ),
                silent: true,
                z2: -20
            }));
            this._displayables.barGroup.add(new graphic.Polyline({
                shape: {points: linePoints},
                style: dataZoomModel.getModel('dataBackground.lineStyle').getLineStyle(),
                silent: true,
                z2: -19
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
            var ecModel = this.ecModel;

            dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
                var seriesModels = dataZoomModel
                    .getAxisProxy(dimNames.name, axisIndex)
                    .getTargetSeriesModels();

                zrUtil.each(seriesModels, function (seriesModel) {
                    if (result) {
                        return;
                    }

                    if (showDataShadow !== true && zrUtil.indexOf(
                            SHOW_DATA_SHADOW_SERIES_TYPE, seriesModel.get('type')
                        ) < 0
                    ) {
                        return;
                    }

                    var otherDim = getOtherDim(dimNames.name);

                    var thisAxis = ecModel.getComponent(dimNames.axis, axisIndex).axis;

                    result = {
                        thisAxis: thisAxis,
                        series: seriesModel,
                        thisDim: dimNames.name,
                        otherDim: otherDim,
                        otherAxisInverse: seriesModel
                            .coordinateSystem.getOtherAxis(thisAxis).inverse
                    };

                }, this);

            }, this);

            return result;
        },

        _renderHandle: function () {
            var displaybles = this._displayables;
            var handles = displaybles.handles = [];
            var handleLabels = displaybles.handleLabels = [];
            var barGroup = this._displayables.barGroup;
            var size = this._size;
            var dataZoomModel = this.dataZoomModel;

            barGroup.add(displaybles.filler = new Rect({
                draggable: true,
                cursor: 'move',
                drift: bind(this._onDragMove, this, 'all'),
                ondragstart: bind(this._showDataInfo, this, true),
                ondragend: bind(this._onDragEnd, this),
                onmouseover: bind(this._showDataInfo, this, true),
                onmouseout: bind(this._showDataInfo, this, false),
                style: {
                    fill: dataZoomModel.get('fillerColor'),
                    textPosition : 'inside'
                }
            }));

            // Frame border.
            barGroup.add(new Rect(graphic.subPixelOptimizeRect({
                silent: true,
                shape: {
                    x: 0,
                    y: 0,
                    width: size[0],
                    height: size[1]
                },
                style: {
                    stroke: dataZoomModel.get('dataBackgroundColor')
                        || dataZoomModel.get('borderColor'),
                    lineWidth: DEFAULT_FRAME_BORDER_WIDTH,
                    fill: 'rgba(0,0,0,0)'
                }
            })));

            var iconStr = dataZoomModel.get('handleIcon');
            each([0, 1], function (handleIndex) {
                var path = graphic.makePath(iconStr, {
                    style: {
                        strokeNoScale: true
                    },
                    rectHover: true,
                    cursor: this._orient === 'vertical' ? 'ns-resize' : 'ew-resize',
                    draggable: true,
                    drift: bind(this._onDragMove, this, handleIndex),
                    ondragend: bind(this._onDragEnd, this),
                    onmouseover: bind(this._showDataInfo, this, true),
                    onmouseout: bind(this._showDataInfo, this, false)
                }, {
                    x: -0.5,
                    y: 0,
                    width: 1,
                    height: 1
                }, 'center');

                var bRect = path.getBoundingRect();
                this._handleHeight = numberUtil.parsePercent(dataZoomModel.get('handleSize'), this._size[1]);
                this._handleWidth = bRect.width / bRect.height * this._handleHeight;

                path.setStyle(dataZoomModel.getModel('handleStyle').getItemStyle());
                var handleColor = dataZoomModel.get('handleColor');
                // Compatitable with previous version
                if (handleColor != null) {
                    path.style.fill = handleColor;
                }

                barGroup.add(handles[handleIndex] = path);

                var textStyleModel = dataZoomModel.textStyleModel;

                this.group.add(
                    handleLabels[handleIndex] = new graphic.Text({
                    silent: true,
                    invisible: true,
                    style: {
                        x: 0, y: 0, text: '',
                        textVerticalAlign: 'middle',
                        textAlign: 'center',
                        fill: textStyleModel.getTextColor(),
                        textFont: textStyleModel.getFont()
                    },
                    z2: 10
                }));

            }, this);
        },

        /**
         * @private
         */
        _resetInterval: function () {
            var range = this._range = this.dataZoomModel.getPercentRange();
            var viewExtent = this._getViewExtent();

            this._handleEnds = [
                linearMap(range[0], [0, 100], viewExtent, true),
                linearMap(range[1], [0, 100], viewExtent, true)
            ];
        },

        /**
         * @private
         * @param {(number|string)} handleIndex 0 or 1 or 'all'
         * @param {number} dx
         * @param {number} dy
         */
        _updateInterval: function (handleIndex, delta) {
            var handleEnds = this._handleEnds;
            var viewExtend = this._getViewExtent();

            sliderMove(
                delta,
                handleEnds,
                viewExtend,
                (handleIndex === 'all' || this.dataZoomModel.get('zoomLock'))
                    ? 'rigid' : 'cross',
                handleIndex
            );

            this._range = asc([
                linearMap(handleEnds[0], viewExtend, [0, 100], true),
                linearMap(handleEnds[1], viewExtend, [0, 100], true)
            ]);
        },

        /**
         * @private
         */
        _updateView: function () {
            var displaybles = this._displayables;
            var handleEnds = this._handleEnds;
            var handleInterval = asc(handleEnds.slice());
            var size = this._size;

            each([0, 1], function (handleIndex) {
                // Handles
                var handle = displaybles.handles[handleIndex];
                var handleHeight = this._handleHeight;
                handle.attr({
                    scale: [handleHeight, handleHeight],
                    position: [handleEnds[handleIndex], size[1] / 2 - handleHeight / 2]
                });
            }, this);

            // Filler
            displaybles.filler.setShape({
                x: handleInterval[0],
                y: 0,
                width: handleInterval[1] - handleInterval[0],
                height: size[1]
            });

            this._updateDataInfo();
        },

        /**
         * @private
         */
        _updateDataInfo: function () {
            var dataZoomModel = this.dataZoomModel;
            var displaybles = this._displayables;
            var handleLabels = displaybles.handleLabels;
            var orient = this._orient;
            var labelTexts = ['', ''];

            // FIXME
            // date型，支持formatter，autoformatter（ec2 date.getAutoFormatter）
            if (dataZoomModel.get('showDetail')) {
                var dataInterval;
                var axis;
                dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
                    // Using dataInterval of the first axis.
                    if (!dataInterval) {
                        dataInterval = dataZoomModel
                            .getAxisProxy(dimNames.name, axisIndex)
                            .getDataValueWindow();
                        axis = this.ecModel.getComponent(dimNames.axis, axisIndex).axis;
                    }
                }, this);

                if (dataInterval) {
                    labelTexts = [
                        this._formatLabel(dataInterval[0], axis),
                        this._formatLabel(dataInterval[1], axis)
                    ];
                }
            }

            var orderedHandleEnds = asc(this._handleEnds.slice());

            setLabel.call(this, 0);
            setLabel.call(this, 1);

            function setLabel(handleIndex) {
                // Label
                // Text should not transform by barGroup.
                // Ignore handlers transform
                var barTransform = graphic.getTransform(
                    displaybles.handles[handleIndex].parent, this.group
                );
                var direction = graphic.transformDirection(
                    handleIndex === 0 ? 'right' : 'left', barTransform
                );
                var offset = this._handleWidth / 2 + LABEL_GAP;
                var textPoint = graphic.applyTransform(
                    [
                        orderedHandleEnds[handleIndex] + (handleIndex === 0 ? -offset : offset),
                        this._size[1] / 2
                    ],
                    barTransform
                );
                handleLabels[handleIndex].setStyle({
                    x: textPoint[0],
                    y: textPoint[1],
                    textVerticalAlign: orient === HORIZONTAL ? 'middle' : direction,
                    textAlign: orient === HORIZONTAL ? direction : 'center',
                    text: labelTexts[handleIndex]
                });
            }
        },

        /**
         * @private
         */
        _formatLabel: function (value, axis) {
            var dataZoomModel = this.dataZoomModel;
            var labelFormatter = dataZoomModel.get('labelFormatter');

            var labelPrecision = dataZoomModel.get('labelPrecision');
            if (labelPrecision == null || labelPrecision === 'auto') {
                labelPrecision = axis.getPixelPrecision();
            }

            var valueStr = (value == null && isNaN(value))
                ? ''
                // FIXME Glue code
                : (axis.type === 'category' || axis.type === 'time')
                    ? axis.scale.getLabel(Math.round(value))
                    // param of toFixed should less then 20.
                    : value.toFixed(Math.min(labelPrecision, 20));

            return zrUtil.isFunction(labelFormatter)
                ? labelFormatter(value, valueStr)
                : zrUtil.isString(labelFormatter)
                ? labelFormatter.replace('{value}', valueStr)
                : valueStr;
        },

        /**
         * @private
         * @param {boolean} showOrHide true: show, false: hide
         */
        _showDataInfo: function (showOrHide) {
            // Always show when drgging.
            showOrHide = this._dragging || showOrHide;

            var handleLabels = this._displayables.handleLabels;
            handleLabels[0].attr('invisible', !showOrHide);
            handleLabels[1].attr('invisible', !showOrHide);
        },

        _onDragMove: function (handleIndex, dx, dy) {
            this._dragging = true;

            // Transform dx, dy to bar coordination.
            var vertex = this._applyBarTransform([dx, dy], true);

            this._updateInterval(handleIndex, vertex[0]);
            this._updateView();

            if (this.dataZoomModel.get('realtime')) {
                this._dispatchZoomAction();
            }
        },

        _onDragEnd: function () {
            this._dragging = false;
            this._showDataInfo(false);
            this._dispatchZoomAction();
        },

        /**
         * This action will be throttled.
         * @private
         */
        _dispatchZoomAction: function () {
            var range = this._range;

            this.api.dispatchAction({
                type: 'dataZoom',
                from: this.uid,
                dataZoomId: this.dataZoomModel.id,
                start: range[0],
                end: range[1]
            });
        },

        /**
         * @private
         */
        _applyBarTransform: function (vertex, inverse) {
            var barTransform = this._displayables.barGroup.getLocalTransform();
            return graphic.applyTransform(vertex, barTransform, inverse);
        },

        /**
         * @private
         */
        _findCoordRect: function () {
            // Find the grid coresponding to the first axis referred by dataZoom.
            var targetInfo = this.getTargetInfo();

            // FIXME
            // 判断是catesian还是polar
            var rect;
            if (targetInfo.cartesians.length) {
                rect = targetInfo.cartesians[0].model.coordinateSystem.getRect();
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

    return SliderZoomView;

});