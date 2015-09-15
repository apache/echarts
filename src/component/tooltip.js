define(function (require) {

    var TooltipContent = require('./tooltip/TooltipContent');
    var graphic = require('../util/graphic');

    function getAxisPointerKey(coordName, axisType) {
        return coordName + axisType;
    }

    function makeLineShape(x1, y1, x2, y2) {
        return {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        };
    }

    function makeRectShape(x, y, width, height) {
        return {
            x: x,
            y: y,
            width: width,
            height: height
        };
    }

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

    require('./tooltip/TooltipModel');

    require('../echarts').extendComponentView({

        type: 'tooltip',

        _axisPointers: {},

        init: function (ecModel, api) {
            api.getZr().on('mousemove', this._mouseMove, this);

            this._tooltipContent = new TooltipContent(api.getDom());
        },

        render: function (tooltipModel, ecModel, api) {
            // Reset
            this.group.removeAll();
            this._axisPointers = {};

            this._tooltipModel = tooltipModel;

            this._ecModel = ecModel;

            this._api = api;

            this._tooltipContent.hide();
        },

        _mouseMove: function (e) {
            var el = e.target;
            var tooltipModel = this._tooltipModel;
            var trigger = tooltipModel.get('trigger');

            if (!tooltipModel) {
                return;
            }

            if (trigger === 'item') {

                if (!el || !el.data) {

                    this._tooltipContent.hideLater(tooltipModel.get('hideDelay'));

                    return;
                }

                var dataItem = el.data;

                this._showItemTooltip(dataItem, e);
            }
            else {

                this._showAxisTooltip(e);
            }
        },

        /**
         * Show tooltip on axis
         * @param {Object} e
         */
        _showAxisTooltip: function (e) {
            var ecModel = this._ecModel;
            var tooltipModel = this._tooltipModel;
            var axisPointerModel = tooltipModel.getModel('axisPointer');

            ecModel.eachSeries(function (seriesModel) {
                // Try show the axis pointer
                this.group.show();

                var coordSys = seriesModel.coordinateSystem;

                // If mouse position is not in the grid or polar
                var point = [e.offsetX, e.offsetY];
                if (coordSys && ! coordSys.containPoint(point)) {
                    // Hide axis pointer
                    this._hideAxisTooltip();
                    return;
                }

                if (coordSys.type === 'cartesian2d') {
                    this._showCartesianPointer(axisPointerModel, coordSys, point);
                }
                else if (coordSys.type === 'polar') {
                    this._showPolarPointer(axisPointerModel, coordSys, point);
                }
            }, this)
        },

        /**
         * Show tooltip on axis of cartesian coordinate
         * @param {module:echarts/model/Model} axisPointerModel
         * @param {module:echarts/coord/cartesian/Cartesian2D} cartesian
         * @param {Array.<number>} point
         * @private
         */
        _showCartesianPointer: function (axisPointerModel, cartesian, point) {
            var self = this;

            var cateogryAxis = cartesian.getAxesByScale('ordinal')[0];

            var axisPointerType = axisPointerModel.get('type');

            var value = cartesian.pointToData(point);

            // Make sure point is discrete on cateogry axis
            if (cateogryAxis) {
                point = cartesian.dataToPoint(value);
            }

            if (axisPointerType === 'cross') {
                moveGridLine('x', point, cartesian.getAxis('y').getExtent());
                moveGridLine('y', point, cartesian.getAxis('x').getExtent());
            }
            else {
                var axisType = axisPointerModel.get('axis');
                if (axisType === 'auto') {
                    axisType = (cateogryAxis && cateogryAxis.dim) || 'x';
                }

                var otherAxis = cartesian.getAxis(axisType === 'x' ? 'y' : 'x');
                var otherExtent = otherAxis.getExtent();

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
                var pointerEl = self._getPointerElement(cartesian, axisPointerModel, axisType)
                var targetShape = axisType === 'x'
                    ? makeLineShape(point[0], otherExtent[0], point[0], otherExtent[1])
                    : makeLineShape(otherExtent[0], point[1], otherExtent[1], point[1]);

                // pointerEl.animateTo({
                //     shape: targetShape
                // }, 100, 'cubicOut');
                pointerEl.attr({
                    shape: targetShape
                });
            }

            /**
             * @inner
             */
            function moveGridShadow(axisType, point, otherExtent) {
                var axis = cartesian.getAxis(axisType);
                var pointerEl = self._getPointerElement(cartesian, axisPointerModel, axisType);
                var bandWidth = axis.getBandWidth();
                var extentSize = otherExtent[1] - otherExtent[0];
                var targetShape = axisType === 'x'
                    ? makeRectShape(point[0] - bandWidth / 2, otherExtent[0], bandWidth, extentSize)
                    : makeRectShape(otherExtent[0], point[1] - bandWidth / 2, extentSize, bandWidth);

                // FIXME 动画总是感觉不连贯
                // pointerEl.animateTo({
                //     shape: targetShape
                // }, 100, 'cubicOut');
                pointerEl.attr({
                    shape: targetShape
                });
            }

        },

        /**
         * Show tooltip on axis of polar coordinate
         * @param {module:echarts/model/Model} axisPointerModel
         * @param {module:echarts/coord/polar/Polar} polar
         * @param {Array.<number>} point
         */
        _showPolarPointer: function (axisPointerModel, polar, point) {
            var self = this;

            var axisPointerType = axisPointerModel.get('type');

            var value = polar.pointToData(point);
            var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

            // Make sure point is discrete on cateogry axis
            point = polar.dataToPoint(value);

            if (axisPointerType === 'cross') {
                movePolarLine('angle', point, angleAxis.getExtent());
                movePolarLine('radius', point, radiusAxis.getExtent());
            }
            else {
                var axisType = axisPointerModel.get('axis');
                if (axisType === 'auto') {
                    axisType = radiusAxis.type === 'category' ? 'radius' : 'angle';
                }

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
                var pointerEl = self._getPointerElement(polar, axisPointerModel, axisType);

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

                pointerEl.attr({
                    shape: targetShape
                });
            }

            /**
             * @inner
             */
            function movePolarShadow(axisType, point, otherExtent) {
                var axis = polar.getAxis(axisType);
                var pointerEl = self._getPointerElement(polar, axisPointerModel, axisType)
                var bandWidth = axis.getBandWidth();

                var mouseCoord = polar.pointToCoord(point);

                var targetShape;

                var radian = Math.PI / 180;

                if (axisType === 'angle') {
                    targetShape = makeSectorShape(
                        polar.cx, polar.cy,
                        otherExtent[0], otherExtent[1],
                        (mouseCoord[1] - bandWidth / 2) * radian,
                        (mouseCoord[1] + bandWidth / 2) * radian
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

                pointerEl.attr({
                    shape: targetShape
                });
            }
        },

        /**
         * Hide axis tooltip
         */
        _hideAxisTooltip: function () {
            this.group.hide();
        },

        _getPointerElement: function (coordSys, pointerModel, axisType) {
            var axisPointers = this._axisPointers;
            var key = getAxisPointerKey(coordSys.name, axisType);
            if (axisPointers[key]) {
                return axisPointers[key];
            }

            // Create if not exists
            var pointerType = pointerModel.get('type');
            var styleModel = pointerModel.getModel(pointerType + 'Style');
            var isShadow = pointerType === 'shadow';
            var style = styleModel[isShadow ? 'getAreaStyle' : 'getLineStyle']();

            var elementType = coordSys.type === 'polar'
                ? (isShadow ? 'Sector' : 'Circle')
                : (isShadow ? 'Rect' : 'Line');

           isShadow ? (style.stroke = null) : (style.fill = null);

            var el = axisPointers[key] = new graphic[elementType]({
                style: style,
                silent: true
            });

            this.group.add(el);
            return el;
        },

        _showSeriesTooltip: function (series, e) {

        },

        /**
         * Show tooltip on item
         * @param {module:echarts/model/Model}
         * @param {Object} e
         */
        _showItemTooltip: function (dataItem, e) {

            var seriesModel = dataItem.parentModel;

            if (!seriesModel) {
                return;
            }
            var rootTooltipModel = this._tooltipModel;
            var showContent = rootTooltipModel.get('showContent');

            var tooltipContent = this._tooltipContent;

            var tooltipModel = dataItem.getModel('tooltip');

            // If series model
            if (tooltipModel.parentModel) {
                tooltipModel.parentModel.parentModel = rootTooltipModel;
            }
            else {
                tooltipModel.parentModel = this._tooltipModel;
            }

            if (showContent) {
                tooltipContent.show(tooltipModel);

                tooltipContent.setContent(
                    seriesModel.formatTooltipHTML(dataItem)
                );

                var x = e.offsetX + 20;
                var y = e.offsetY + 20;
                tooltipContent.moveTo(x, y);
            }
        },

        dispose: function (api) {
            api.getZr().off('mousemove', this._mouseMove, this);
        }
    })
});