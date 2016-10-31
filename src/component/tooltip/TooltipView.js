define(function (require) {

    var TooltipContent = require('./TooltipContent');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../../util/format');
    var numberUtil = require('../../util/number');
    var modelUtil = require('../../util/model');
    var parsePercent = numberUtil.parsePercent;
    var env = require('zrender/core/env');
    var Model = require('../../model/Model');

    function dataEqual(a, b) {
        if (!a || !b) {
            return false;
        }
        var round = numberUtil.round;
        return round(a[0]) === round(b[0])
            && round(a[1]) === round(b[1]);
    }
    /**
     * @inner
     */
    function makeLineShape(x1, y1, x2, y2) {
        return {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        };
    }

    /**
     * @inner
     */
    function makeRectShape(x, y, width, height) {
        return {
            x: x,
            y: y,
            width: width,
            height: height
        };
    }

    /**
     * @inner
     */
    function makeSectorShape(cx, cy, r0, r, startAngle, endAngle) {
        return {
            cx: cx,
            cy: cy,
            r0: r0,
            r: r,
            startAngle: startAngle,
            endAngle: endAngle,
            clockwise: true
        };
    }

    function refixTooltipPosition(x, y, el, viewWidth, viewHeight) {
        var width = el.clientWidth;
        var height = el.clientHeight;
        var gap = 20;

        if (x + width + gap > viewWidth) {
            x -= width + gap;
        }
        else {
            x += gap;
        }
        if (y + height + gap > viewHeight) {
            y -= height + gap;
        }
        else {
            y += gap;
        }
        return [x, y];
    }

    function calcTooltipPosition(position, rect, dom) {
        var domWidth = dom.clientWidth;
        var domHeight = dom.clientHeight;
        var gap = 5;
        var x = 0;
        var y = 0;
        var rectWidth = rect.width;
        var rectHeight = rect.height;
        switch (position) {
            case 'inside':
                x = rect.x + rectWidth / 2 - domWidth / 2;
                y = rect.y + rectHeight / 2 - domHeight / 2;
                break;
            case 'top':
                x = rect.x + rectWidth / 2 - domWidth / 2;
                y = rect.y - domHeight - gap;
                break;
            case 'bottom':
                x = rect.x + rectWidth / 2 - domWidth / 2;
                y = rect.y + rectHeight + gap;
                break;
            case 'left':
                x = rect.x - domWidth - gap;
                y = rect.y + rectHeight / 2 - domHeight / 2;
                break;
            case 'right':
                x = rect.x + rectWidth + gap;
                y = rect.y + rectHeight / 2 - domHeight / 2;
        }
        return [x, y];
    }

    /**
     * @param  {string|Function|Array.<number>} positionExpr
     * @param  {number} x Mouse x
     * @param  {number} y Mouse y
     * @param  {module:echarts/component/tooltip/TooltipContent} content
     * @param  {Object|<Array.<Object>} params
     * @param  {module:zrender/Element} el target element
     * @param  {module:echarts/ExtensionAPI} api
     * @return {Array.<number>}
     */
    function updatePosition(positionExpr, x, y, content, params, el, api) {
        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();

        var rect = el && el.getBoundingRect().clone();
        el && rect.applyTransform(el.transform);
        if (typeof positionExpr === 'function') {
            // Callback of position can be an array or a string specify the position
            positionExpr = positionExpr([x, y], params, content.el, rect);
        }

        if (zrUtil.isArray(positionExpr)) {
            x = parsePercent(positionExpr[0], viewWidth);
            y = parsePercent(positionExpr[1], viewHeight);
        }
        // Specify tooltip position by string 'top' 'bottom' 'left' 'right' around graphic element
        else if (typeof positionExpr === 'string' && el) {
            var pos = calcTooltipPosition(
                positionExpr, rect, content.el
            );
            x = pos[0];
            y = pos[1];
        }
        else {
            var pos = refixTooltipPosition(
                x, y, content.el, viewWidth, viewHeight
            );
            x = pos[0];
            y = pos[1];
        }

        content.moveTo(x, y);
    }

    function ifSeriesSupportAxisTrigger(seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        var trigger = seriesModel.get('tooltip.trigger', true);
        // Ignore series use item tooltip trigger and series coordinate system is not cartesian or
        return !(!coordSys
            || (coordSys.type !== 'cartesian2d' && coordSys.type !== 'polar' && coordSys.type !== 'singleAxis')
            || trigger === 'item');
    }

    require('../../echarts').extendComponentView({

        type: 'tooltip',

        _axisPointers: {},

        init: function (ecModel, api) {
            if (env.node) {
                return;
            }
            var tooltipContent = new TooltipContent(api.getDom(), api);
            this._tooltipContent = tooltipContent;

            api.on('showTip', this._manuallyShowTip, this);
            api.on('hideTip', this._manuallyHideTip, this);
        },

        render: function (tooltipModel, ecModel, api) {
            if (env.node) {
                return;
            }

            // Reset
            this.group.removeAll();

            /**
             * @type {Object}
             * @private
             */
            this._axisPointers = {};

            /**
             * @private
             * @type {module:echarts/component/tooltip/TooltipModel}
             */
            this._tooltipModel = tooltipModel;

            /**
             * @private
             * @type {module:echarts/model/Global}
             */
            this._ecModel = ecModel;

            /**
             * @private
             * @type {module:echarts/ExtensionAPI}
             */
            this._api = api;

            /**
             * @type {Object}
             * @private
             */
            this._lastHover = {
                // data
                // payloadBatch
            };

            var tooltipContent = this._tooltipContent;
            tooltipContent.update();
            tooltipContent.enterable = tooltipModel.get('enterable');
            this._alwaysShowContent = tooltipModel.get('alwaysShowContent');

            /**
             * @type {Object.<string, Array>}
             */
            this._seriesGroupByAxis = this._prepareAxisTriggerData(
                tooltipModel, ecModel
            );

            var crossText = this._crossText;
            if (crossText) {
                this.group.add(crossText);
            }

            var triggerOn = tooltipModel.get('triggerOn');

            // Try to keep the tooltip show when refreshing
            if (this._lastX != null
                && this._lastY != null
                // When user is willing to control tooltip totally using API,
                // self._manuallyShowTip({x, y}) might cause tooltip hide,
                // which is not expected.
                && triggerOn !== 'none'
            ) {
                var self = this;
                clearTimeout(this._refreshUpdateTimeout);
                this._refreshUpdateTimeout = setTimeout(function () {
                    // Show tip next tick after other charts are rendered
                    // In case highlight action has wrong result
                    // FIXME
                    self._manuallyShowTip({
                        x: self._lastX,
                        y: self._lastY
                    });
                });
            }

            var zr = this._api.getZr();
            zr.off('click', this._tryShow);
            zr.off('mousemove', this._mousemove);
            zr.off('mouseout', this._hide);
            zr.off('globalout', this._hide);

            if (triggerOn === 'click') {
                zr.on('click', this._tryShow, this);
            }
            else if (triggerOn === 'mousemove') {
                zr.on('mousemove', this._mousemove, this);
                zr.on('mouseout', this._hide, this);
                zr.on('globalout', this._hide, this);
            }
            // else triggerOn is 'none', which enable user
            // to control tooltip totally using API.
        },

        _mousemove: function (e) {
            var showDelay = this._tooltipModel.get('showDelay');
            var self = this;
            clearTimeout(this._showTimeout);
            if (showDelay > 0) {
                this._showTimeout = setTimeout(function () {
                    self._tryShow(e);
                }, showDelay);
            }
            else {
                this._tryShow(e);
            }
        },

        /**
         * Show tip manually by
         * dispatchAction({
         *     type: 'showTip',
         *     x: 10,
         *     y: 10
         * });
         * Or
         * dispatchAction({
         *      type: 'showTip',
         *      seriesIndex: 0,
         *      dataIndex or dataIndexInside or name
         * });
         *
         *  TODO Batch
         */
        _manuallyShowTip: function (event) {
            // From self
            if (event.from === this.uid) {
                return;
            }

            var ecModel = this._ecModel;
            var seriesIndex = event.seriesIndex;
            var seriesModel = ecModel.getSeriesByIndex(seriesIndex);
            var api = this._api;

            if (event.x == null || event.y == null) {
                if (!seriesModel) {
                    // Find the first series can use axis trigger
                    ecModel.eachSeries(function (_series) {
                        if (ifSeriesSupportAxisTrigger(_series) && !seriesModel) {
                            seriesModel = _series;
                        }
                    });
                }
                if (seriesModel) {
                    var data = seriesModel.getData();
                    var dataIndex = modelUtil.queryDataIndex(data, event);

                    if (dataIndex == null || zrUtil.isArray(dataIndex)) {
                        return;
                    }

                    var el = data.getItemGraphicEl(dataIndex);
                    var cx;
                    var cy;
                    // Try to get the point in coordinate system
                    var coordSys = seriesModel.coordinateSystem;
                    if (seriesModel.getTooltipPosition) {
                        var point = seriesModel.getTooltipPosition(dataIndex) || [];
                        cx = point[0];
                        cy = point[1];
                    }
                    else if (coordSys && coordSys.dataToPoint) {
                        var point = coordSys.dataToPoint(
                            data.getValues(
                                zrUtil.map(coordSys.dimensions, function (dim) {
                                    return seriesModel.coordDimToDataDim(dim)[0];
                                }), dataIndex, true
                            )
                        );
                        cx = point && point[0];
                        cy = point && point[1];
                    }
                    else if (el) {
                        // Use graphic bounding rect
                        var rect = el.getBoundingRect().clone();
                        rect.applyTransform(el.transform);
                        cx = rect.x + rect.width / 2;
                        cy = rect.y + rect.height / 2;
                    }

                    if (cx != null && cy != null) {
                        this._tryShow({
                            offsetX: cx,
                            offsetY: cy,
                            position: event.position,
                            target: el,
                            event: {}
                        });
                    }
                }
            }
            else {
                var el = api.getZr().handler.findHover(event.x, event.y);
                this._tryShow({
                    offsetX: event.x,
                    offsetY: event.y,
                    position: event.position,
                    target: el,
                    event: {}
                });
            }
        },

        _manuallyHideTip: function (e) {
            if (e.from === this.uid) {
                return;
            }

            this._hide();
        },

        _prepareAxisTriggerData: function (tooltipModel, ecModel) {
            // Prepare data for axis trigger
            var seriesGroupByAxis = {};
            ecModel.eachSeries(function (seriesModel) {
                if (ifSeriesSupportAxisTrigger(seriesModel)) {
                    var coordSys = seriesModel.coordinateSystem;
                    var baseAxis;
                    var key;

                    // Only cartesian2d, polar and single support axis trigger
                    if (coordSys.type === 'cartesian2d') {
                        // FIXME `axisPointer.axis` is not baseAxis
                        baseAxis = coordSys.getBaseAxis();
                        key = baseAxis.dim + baseAxis.index;
                    }
                    else if (coordSys.type === 'singleAxis') {
                        baseAxis = coordSys.getAxis();
                        key = baseAxis.dim + baseAxis.type;
                    }
                    else {
                        baseAxis = coordSys.getBaseAxis();
                        key = baseAxis.dim + coordSys.name;
                    }

                    seriesGroupByAxis[key] = seriesGroupByAxis[key] || {
                        coordSys: [],
                        series: []
                    };
                    seriesGroupByAxis[key].coordSys.push(coordSys);
                    seriesGroupByAxis[key].series.push(seriesModel);
                }
            }, this);

            return seriesGroupByAxis;
        },

        /**
         * mousemove handler
         * @param {Object} e
         * @private
         */
        _tryShow: function (e) {
            var el = e.target;
            var tooltipModel = this._tooltipModel;
            var globalTrigger = tooltipModel.get('trigger');
            var ecModel = this._ecModel;
            var api = this._api;

            if (!tooltipModel) {
                return;
            }

            // Save mouse x, mouse y. So we can try to keep showing the tip if chart is refreshed
            this._lastX = e.offsetX;
            this._lastY = e.offsetY;

            // Always show item tooltip if mouse is on the element with dataIndex
            if (el && el.dataIndex != null) {
                // Use dataModel in element if possible
                // Used when mouseover on a element like markPoint or edge
                // In which case, the data is not main data in series.
                var dataModel = el.dataModel || ecModel.getSeriesByIndex(el.seriesIndex);
                var dataIndex = el.dataIndex;
                var itemModel = dataModel.getData().getItemModel(dataIndex);
                // Series or single data may use item trigger when global is axis trigger
                if ((itemModel.get('tooltip.trigger') || globalTrigger) === 'axis') {
                    this._showAxisTooltip(tooltipModel, ecModel, e);
                }
                else {
                    // Reset ticket
                    this._ticket = '';
                    // If either single data or series use item trigger
                    this._hideAxisPointer();
                    // Reset last hover and dispatch downplay action
                    this._resetLastHover();

                    this._showItemTooltipContent(dataModel, dataIndex, el.dataType, e);
                }

                api.dispatchAction({
                    type: 'showTip',
                    from: this.uid,
                    dataIndexInside: el.dataIndex,
                    seriesIndex: el.seriesIndex
                });
            }
            // Tooltip provided directly. Like legend
            else if (el && el.tooltip) {
                var tooltipOpt = el.tooltip;
                if (typeof tooltipOpt === 'string') {
                    var content = tooltipOpt;
                    tooltipOpt = {
                        content: content,
                        // Fixed formatter
                        formatter: content
                    };
                }
                var subTooltipModel = new Model(tooltipOpt, tooltipModel);
                var defaultHtml = subTooltipModel.get('content');
                var asyncTicket = Math.random();
                this._showTooltipContent(
                    // TODO params
                    subTooltipModel, defaultHtml, subTooltipModel.get('formatterParams') || {},
                    asyncTicket, e.offsetX, e.offsetY, e.position, el, api
                );
            }
            else {
                if (globalTrigger === 'item') {
                    this._hide();
                }
                else {
                    // Try show axis tooltip
                    this._showAxisTooltip(tooltipModel, ecModel, e);
                }

                // Action of cross pointer
                // other pointer types will trigger action in _dispatchAndShowSeriesTooltipContent method
                if (tooltipModel.get('axisPointer.type') === 'cross') {
                    api.dispatchAction({
                        type: 'showTip',
                        from: this.uid,
                        x: e.offsetX,
                        y: e.offsetY
                    });
                }
            }
        },

        /**
         * Show tooltip on axis
         * @param {module:echarts/component/tooltip/TooltipModel} tooltipModel
         * @param {module:echarts/model/Global} ecModel
         * @param {Object} e
         * @private
         */
        _showAxisTooltip: function (tooltipModel, ecModel, e) {
            var axisPointerModel = tooltipModel.getModel('axisPointer');
            var axisPointerType = axisPointerModel.get('type');

            if (axisPointerType === 'cross') {
                var el = e.target;
                if (el && el.dataIndex != null) {
                    var seriesModel = ecModel.getSeriesByIndex(el.seriesIndex);
                    var dataIndex = el.dataIndex;
                    this._showItemTooltipContent(seriesModel, dataIndex, el.dataType, e);
                }
            }

            this._showAxisPointer();
            var allNotShow = true;
            zrUtil.each(this._seriesGroupByAxis, function (seriesCoordSysSameAxis) {
                // Try show the axis pointer
                var allCoordSys = seriesCoordSysSameAxis.coordSys;
                var coordSys = allCoordSys[0];

                // If mouse position is not in the grid or polar
                var point = [e.offsetX, e.offsetY];

                if (!coordSys.containPoint(point)) {
                    // Hide axis pointer
                    this._hideAxisPointer(coordSys.name);
                    return;
                }

                allNotShow = false;
                // Make sure point is discrete on cateogry axis
                var dimensions = coordSys.dimensions;
                var value = coordSys.pointToData(point, true);
                point = coordSys.dataToPoint(value);
                var baseAxis = coordSys.getBaseAxis();
                var axisType = axisPointerModel.get('axis');
                if (axisType === 'auto') {
                    axisType = baseAxis.dim;
                }

                var contentNotChange = false;
                var lastHover = this._lastHover;
                if (axisPointerType === 'cross') {
                    // If hover data not changed
                    // Possible when two axes are all category
                    if (dataEqual(lastHover.data, value)) {
                        contentNotChange = true;
                    }
                    lastHover.data = value;
                }
                else {
                    var valIndex = zrUtil.indexOf(dimensions, axisType);

                    // If hover data not changed on the axis dimension
                    if (lastHover.data === value[valIndex]) {
                        contentNotChange = true;
                    }
                    lastHover.data = value[valIndex];
                }

                if (coordSys.type === 'cartesian2d' && !contentNotChange) {
                    this._showCartesianPointer(
                        axisPointerModel, coordSys, axisType, point
                    );
                }
                else if (coordSys.type === 'polar' && !contentNotChange) {
                    this._showPolarPointer(
                        axisPointerModel, coordSys, axisType, point
                    );
                }
                else if (coordSys.type === 'singleAxis' && !contentNotChange) {
                    this._showSinglePointer(
                        axisPointerModel, coordSys, axisType, point
                    );
                }

                if (axisPointerType !== 'cross') {
                    this._dispatchAndShowSeriesTooltipContent(
                        coordSys, seriesCoordSysSameAxis.series, point, value, contentNotChange, e.position
                    );
                }
            }, this);

            if (!this._tooltipModel.get('show')) {
                this._hideAxisPointer();
            }

            if (allNotShow) {
                this._hide();
            }
        },

        /**
         * Show tooltip on axis of cartesian coordinate
         * @param {module:echarts/model/Model} axisPointerModel
         * @param {module:echarts/coord/cartesian/Cartesian2D} cartesians
         * @param {string} axisType
         * @param {Array.<number>} point
         * @private
         */
        _showCartesianPointer: function (axisPointerModel, cartesian, axisType, point) {
            var self = this;

            var axisPointerType = axisPointerModel.get('type');
            var baseAxis = cartesian.getBaseAxis();
            var moveAnimation = axisPointerType !== 'cross'
                && baseAxis.type === 'category'
                && baseAxis.getBandWidth() > 20;

            if (axisPointerType === 'cross') {
                moveGridLine('x', point, cartesian.getAxis('y').getGlobalExtent());
                moveGridLine('y', point, cartesian.getAxis('x').getGlobalExtent());

                this._updateCrossText(cartesian, point, axisPointerModel);
            }
            else {
                var otherAxis = cartesian.getAxis(axisType === 'x' ? 'y' : 'x');
                var otherExtent = otherAxis.getGlobalExtent();

                if (cartesian.type === 'cartesian2d') {
                    (axisPointerType === 'line' ? moveGridLine : moveGridShadow)(
                        axisType, point, otherExtent
                    );
                }
            }

            /**
             * @inner
             */
            function moveGridLine(axisType, point, otherExtent) {
                var targetShape = axisType === 'x'
                    ? makeLineShape(point[0], otherExtent[0], point[0], otherExtent[1])
                    : makeLineShape(otherExtent[0], point[1], otherExtent[1], point[1]);

                var pointerEl = self._getPointerElement(
                    cartesian, axisPointerModel, axisType, targetShape
                );
                graphic.subPixelOptimizeLine({
                    shape: targetShape,
                    style: pointerEl.style
                });

                moveAnimation
                    ? graphic.updateProps(pointerEl, {
                        shape: targetShape
                    }, axisPointerModel)
                    :  pointerEl.attr({
                        shape: targetShape
                    });
            }

            /**
             * @inner
             */
            function moveGridShadow(axisType, point, otherExtent) {
                var axis = cartesian.getAxis(axisType);
                var bandWidth = axis.getBandWidth();
                var span = otherExtent[1] - otherExtent[0];
                var targetShape = axisType === 'x'
                    ? makeRectShape(point[0] - bandWidth / 2, otherExtent[0], bandWidth, span)
                    : makeRectShape(otherExtent[0], point[1] - bandWidth / 2, span, bandWidth);

                var pointerEl = self._getPointerElement(
                    cartesian, axisPointerModel, axisType, targetShape
                );
                moveAnimation
                    ? graphic.updateProps(pointerEl, {
                        shape: targetShape
                    }, axisPointerModel)
                    :  pointerEl.attr({
                        shape: targetShape
                    });
            }
        },

        _showSinglePointer: function (axisPointerModel, single, axisType, point) {
            var self = this;
            var axisPointerType = axisPointerModel.get('type');
            var moveAnimation = axisPointerType !== 'cross' && single.getBaseAxis().type === 'category';
            var rect = single.getRect();
            var otherExtent = [rect.y, rect.y + rect.height];

            moveSingleLine(axisType, point, otherExtent);

            /**
             * @inner
             */
            function moveSingleLine(axisType, point, otherExtent) {
                var axis = single.getAxis();
                var orient = axis.orient;

                var targetShape = orient === 'horizontal'
                    ? makeLineShape(point[0], otherExtent[0], point[0], otherExtent[1])
                    : makeLineShape(otherExtent[0], point[1], otherExtent[1], point[1]);

                var pointerEl = self._getPointerElement(
                    single, axisPointerModel, axisType, targetShape
                );
                moveAnimation
                    ? graphic.updateProps(pointerEl, {
                        shape: targetShape
                    }, axisPointerModel)
                    :  pointerEl.attr({
                        shape: targetShape
                    });
            }

        },

        /**
         * Show tooltip on axis of polar coordinate
         * @param {module:echarts/model/Model} axisPointerModel
         * @param {Array.<module:echarts/coord/polar/Polar>} polar
         * @param {string} axisType
         * @param {Array.<number>} point
         */
        _showPolarPointer: function (axisPointerModel, polar, axisType, point) {
            var self = this;

            var axisPointerType = axisPointerModel.get('type');

            var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

            var moveAnimation = axisPointerType !== 'cross'
                && polar.getBaseAxis().type === 'category';

            if (axisPointerType === 'cross') {
                movePolarLine('angle', point, radiusAxis.getExtent());
                movePolarLine('radius', point, angleAxis.getExtent());

                this._updateCrossText(polar, point, axisPointerModel);
            }
            else {
                var otherAxis = polar.getAxis(axisType === 'radius' ? 'angle' : 'radius');
                var otherExtent = otherAxis.getExtent();

                (axisPointerType === 'line' ? movePolarLine : movePolarShadow)(
                    axisType, point, otherExtent
                );
            }
            /**
             * @inner
             */
            function movePolarLine(axisType, point, otherExtent) {
                var mouseCoord = polar.pointToCoord(point);

                var targetShape;

                if (axisType === 'angle') {
                    var p1 = polar.coordToPoint([otherExtent[0], mouseCoord[1]]);
                    var p2 = polar.coordToPoint([otherExtent[1], mouseCoord[1]]);
                    targetShape = makeLineShape(p1[0], p1[1], p2[0], p2[1]);
                }
                else {
                    targetShape = {
                        cx: polar.cx,
                        cy: polar.cy,
                        r: mouseCoord[0]
                    };
                }

                var pointerEl = self._getPointerElement(
                    polar, axisPointerModel, axisType, targetShape
                );

                moveAnimation
                    ? graphic.updateProps(pointerEl, {
                        shape: targetShape
                    }, axisPointerModel)
                    :  pointerEl.attr({
                        shape: targetShape
                    });
            }

            /**
             * @inner
             */
            function movePolarShadow(axisType, point, otherExtent) {
                var axis = polar.getAxis(axisType);
                var bandWidth = axis.getBandWidth();

                var mouseCoord = polar.pointToCoord(point);

                var targetShape;

                var radian = Math.PI / 180;

                if (axisType === 'angle') {
                    targetShape = makeSectorShape(
                        polar.cx, polar.cy,
                        otherExtent[0], otherExtent[1],
                        // In ECharts y is negative if angle is positive
                        (-mouseCoord[1] - bandWidth / 2) * radian,
                        (-mouseCoord[1] + bandWidth / 2) * radian
                    );
                }
                else {
                    targetShape = makeSectorShape(
                        polar.cx, polar.cy,
                        mouseCoord[0] - bandWidth / 2,
                        mouseCoord[0] + bandWidth / 2,
                        0, Math.PI * 2
                    );
                }

                var pointerEl = self._getPointerElement(
                    polar, axisPointerModel, axisType, targetShape
                );
                moveAnimation
                    ? graphic.updateProps(pointerEl, {
                        shape: targetShape
                    }, axisPointerModel)
                    :  pointerEl.attr({
                        shape: targetShape
                    });
            }
        },

        _updateCrossText: function (coordSys, point, axisPointerModel) {
            var crossStyleModel = axisPointerModel.getModel('crossStyle');
            var textStyleModel = crossStyleModel.getModel('textStyle');

            var tooltipModel = this._tooltipModel;

            var text = this._crossText;
            if (!text) {
                text = this._crossText = new graphic.Text({
                    style: {
                        textAlign: 'left',
                        textVerticalAlign: 'bottom'
                    }
                });
                this.group.add(text);
            }

            var value = coordSys.pointToData(point);

            var dims = coordSys.dimensions;
            value = zrUtil.map(value, function (val, idx) {
                var axis = coordSys.getAxis(dims[idx]);
                if (axis.type === 'category' || axis.type === 'time') {
                    val = axis.scale.getLabel(val);
                }
                else {
                    val = formatUtil.addCommas(
                        val.toFixed(axis.getPixelPrecision())
                    );
                }
                return val;
            });

            text.setStyle({
                fill: textStyleModel.getTextColor() || crossStyleModel.get('color'),
                textFont: textStyleModel.getFont(),
                text: value.join(', '),
                x: point[0] + 5,
                y: point[1] - 5
            });
            text.z = tooltipModel.get('z');
            text.zlevel = tooltipModel.get('zlevel');
        },

        _getPointerElement: function (coordSys, pointerModel, axisType, initShape) {
            var tooltipModel = this._tooltipModel;
            var z = tooltipModel.get('z');
            var zlevel = tooltipModel.get('zlevel');
            var axisPointers = this._axisPointers;
            var coordSysName = coordSys.name;
            axisPointers[coordSysName] = axisPointers[coordSysName] || {};
            if (axisPointers[coordSysName][axisType]) {
                return axisPointers[coordSysName][axisType];
            }

            // Create if not exists
            var pointerType = pointerModel.get('type');
            var styleModel = pointerModel.getModel(pointerType + 'Style');
            var isShadow = pointerType === 'shadow';
            var style = styleModel[isShadow ? 'getAreaStyle' : 'getLineStyle']();

            var elementType = coordSys.type === 'polar'
                ? (isShadow ? 'Sector' : (axisType === 'radius' ? 'Circle' : 'Line'))
                : (isShadow ? 'Rect' : 'Line');

            isShadow ? (style.stroke = null) : (style.fill = null);

            var el = axisPointers[coordSysName][axisType] = new graphic[elementType]({
                style: style,
                z: z,
                zlevel: zlevel,
                silent: true,
                shape: initShape
            });

            this.group.add(el);
            return el;
        },

        /**
         * Dispatch actions and show tooltip on series
         * @param {Array.<module:echarts/model/Series>} seriesList
         * @param {Array.<number>} point
         * @param {Array.<number>} value
         * @param {boolean} contentNotChange
         * @param {Array.<number>|string|Function} [positionExpr]
         */
        _dispatchAndShowSeriesTooltipContent: function (
            coordSys, seriesList, point, value, contentNotChange, positionExpr
        ) {

            var rootTooltipModel = this._tooltipModel;

            var baseAxis = coordSys.getBaseAxis();
            var baseDimIndex = baseAxis.dim === 'x' || baseAxis.dim === 'radius' ? 0 : 1;

            var payloadBatch = zrUtil.map(seriesList, function (series) {
                return {
                    seriesIndex: series.seriesIndex,
                    dataIndexInside: series.getAxisTooltipDataIndex
                        ? series.getAxisTooltipDataIndex(series.coordDimToDataDim(baseAxis.dim), value, baseAxis)
                        : series.getData().indexOfNearest(
                            series.coordDimToDataDim(baseAxis.dim)[0],
                            value[baseDimIndex],
                            // Add a threshold to avoid find the wrong dataIndex when data length is not same
                            false, baseAxis.type === 'category' ? 0.5 : null
                        )
                };
            });

            var lastHover = this._lastHover;
            var api = this._api;
            // Dispatch downplay action
            if (lastHover.payloadBatch && !contentNotChange) {
                api.dispatchAction({
                    type: 'downplay',
                    batch: lastHover.payloadBatch
                });
            }
            // Dispatch highlight action
            if (!contentNotChange) {
                api.dispatchAction({
                    type: 'highlight',
                    batch: payloadBatch
                });
                lastHover.payloadBatch = payloadBatch;
            }
            // Dispatch showTip action
            api.dispatchAction({
                type: 'showTip',
                dataIndexInside: payloadBatch[0].dataIndexInside,
                seriesIndex: payloadBatch[0].seriesIndex,
                from: this.uid
            });

            if (baseAxis && rootTooltipModel.get('showContent') && rootTooltipModel.get('show')) {
                var paramsList = zrUtil.map(seriesList, function (series, index) {
                    return series.getDataParams(payloadBatch[index].dataIndexInside);
                });

                if (!contentNotChange) {
                    // Update html content
                    var firstDataIndex = payloadBatch[0].dataIndexInside;

                    // Default tooltip content
                    // FIXME
                    // (1) shold be the first data which has name?
                    // (2) themeRiver, firstDataIndex is array, and first line is unnecessary.
                    var firstLine = baseAxis.type === 'time'
                        ? baseAxis.scale.getLabel(value[baseDimIndex])
                        : seriesList[0].getData().getName(firstDataIndex);
                    var defaultHtml = (firstLine ? firstLine + '<br />' : '')
                        + zrUtil.map(seriesList, function (series, index) {
                            return series.formatTooltip(payloadBatch[index].dataIndexInside, true);
                        }).join('<br />');

                    var asyncTicket = 'axis_' + coordSys.name + '_' + firstDataIndex;

                    this._showTooltipContent(
                        rootTooltipModel, defaultHtml, paramsList, asyncTicket,
                        point[0], point[1], positionExpr, null, api
                    );
                }
                else {
                    updatePosition(
                        positionExpr || rootTooltipModel.get('position'), point[0], point[1],
                        this._tooltipContent, paramsList, null, api
                    );
                }
            }
        },

        /**
         * Show tooltip on item
         * @param {module:echarts/model/Series} seriesModel
         * @param {number} dataIndex
         * @param {string} dataType
         * @param {Object} e
         */
        _showItemTooltipContent: function (seriesModel, dataIndex, dataType, e) {
            // FIXME Graph data
            var api = this._api;
            var data = seriesModel.getData(dataType);
            var itemModel = data.getItemModel(dataIndex);

            var tooltipOpt = itemModel.get('tooltip', true);
            if (typeof tooltipOpt === 'string') {
                // In each data item tooltip can be simply write:
                // {
                //  value: 10,
                //  tooltip: 'Something you need to know'
                // }
                var tooltipContent = tooltipOpt;
                tooltipOpt = {
                    formatter: tooltipContent
                };
            }
            var rootTooltipModel = this._tooltipModel;
            var seriesTooltipModel = seriesModel.getModel(
                'tooltip', rootTooltipModel
            );
            var tooltipModel = new Model(tooltipOpt, seriesTooltipModel, seriesTooltipModel.ecModel);

            var params = seriesModel.getDataParams(dataIndex, dataType);
            var defaultHtml = seriesModel.formatTooltip(dataIndex, false, dataType);

            var asyncTicket = 'item_' + seriesModel.name + '_' + dataIndex;

            this._showTooltipContent(
                tooltipModel, defaultHtml, params, asyncTicket,
                e.offsetX, e.offsetY, e.position, e.target, api
            );
        },

        _showTooltipContent: function (
            tooltipModel, defaultHtml, params, asyncTicket, x, y, positionExpr, target, api
        ) {
            // Reset ticket
            this._ticket = '';

            if (tooltipModel.get('showContent') && tooltipModel.get('show')) {
                var tooltipContent = this._tooltipContent;

                var formatter = tooltipModel.get('formatter');
                positionExpr = positionExpr || tooltipModel.get('position');
                var html = defaultHtml;

                if (formatter) {
                    if (typeof formatter === 'string') {
                        html = formatUtil.formatTpl(formatter, params);
                    }
                    else if (typeof formatter === 'function') {
                        var self = this;
                        var ticket = asyncTicket;
                        var callback = function (cbTicket, html) {
                            if (cbTicket === self._ticket) {
                                tooltipContent.setContent(html);

                                updatePosition(
                                    positionExpr, x, y,
                                    tooltipContent, params, target, api
                                );
                            }
                        };
                        self._ticket = ticket;
                        html = formatter(params, ticket, callback);
                    }
                }

                tooltipContent.show(tooltipModel);
                tooltipContent.setContent(html);

                updatePosition(
                    positionExpr, x, y,
                    tooltipContent, params, target, api
                );
            }
        },

        /**
         * Show axis pointer
         * @param {string} [coordSysName]
         */
        _showAxisPointer: function (coordSysName) {
            if (coordSysName) {
                var axisPointers = this._axisPointers[coordSysName];
                axisPointers && zrUtil.each(axisPointers, function (el) {
                    el.show();
                });
            }
            else {
                this.group.eachChild(function (child) {
                    child.show();
                });
                this.group.show();
            }
        },

        _resetLastHover: function () {
            var lastHover = this._lastHover;
            if (lastHover.payloadBatch) {
                this._api.dispatchAction({
                    type: 'downplay',
                    batch: lastHover.payloadBatch
                });
            }
            // Reset lastHover
            this._lastHover = {};
        },
        /**
         * Hide axis pointer
         * @param {string} [coordSysName]
         */
        _hideAxisPointer: function (coordSysName) {
            if (coordSysName) {
                var axisPointers = this._axisPointers[coordSysName];
                axisPointers && zrUtil.each(axisPointers, function (el) {
                    el.hide();
                });
            }
            else {
                if (this.group.children().length) {
                    this.group.hide();
                }
            }
        },

        _hide: function () {
            clearTimeout(this._showTimeout);

            this._hideAxisPointer();
            this._resetLastHover();
            if (!this._alwaysShowContent) {
                this._tooltipContent.hideLater(this._tooltipModel.get('hideDelay'));
            }

            this._api.dispatchAction({
                type: 'hideTip',
                from: this.uid
            });

            this._lastX = this._lastY = null;
        },

        dispose: function (ecModel, api) {
            if (env.node) {
                return;
            }
            var zr = api.getZr();
            this._tooltipContent.hide();

            zr.off('click', this._tryShow);
            zr.off('mousemove', this._mousemove);
            zr.off('mouseout', this._hide);
            zr.off('globalout', this._hide);

            api.off('showTip', this._manuallyShowTip);
            api.off('hideTip', this._manuallyHideTip);
        }
    });
});