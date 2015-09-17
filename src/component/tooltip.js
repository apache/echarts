// FIXME Better way to pack data in graphic element
define(function (require) {

    var TooltipContent = require('./tooltip/TooltipContent');
    var graphic = require('../util/graphic');
    var zrUtil = require('zrender/core/util');

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
            var zr = api.getZr();
            zr.on('mousemove', this._mouseMove, this);
            zr.on('mouseout', this._hide, this);

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

            var seriesGroupByCoordinateSystem = {};
            ecModel.eachSeries(function (seriesModel) {
                var coordSys = seriesModel.coordinateSystem;
                var name = coordSys.name;
                seriesGroupByCoordinateSystem[name] = seriesGroupByCoordinateSystem[name] || {
                    coordSys: coordSys,
                    series: []
                };
                seriesGroupByCoordinateSystem[name].series.push(seriesModel);
            }, this);

            this._coordinateSystems = seriesGroupByCoordinateSystem;
        },

        _mouseMove: function (e) {
            var el = e.target;
            var tooltipModel = this._tooltipModel;
            var trigger = tooltipModel.get('trigger');
            var ecModel = this._ecModel;

            if (!tooltipModel) {
                return;
            }

            if (trigger === 'item') {
                if (!el || el.dataIndex == null) {

                    this._hide();

                    return;
                }

                var seriesModel = ecModel.getSeriesByIndex(el.seriesIndex);

                this._showItemTooltip(seriesModel, el.dataIndex, e);
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
            var tooltipModel = this._tooltipModel;
            var axisPointerModel = tooltipModel.getModel('axisPointer');

            zrUtil.each(this._coordinateSystems, function (item) {
                // Try show the axis pointer
                this.group.show();

                var coordSys = item.coordSys;

                // If mouse position is not in the grid or polar
                var point = [e.offsetX, e.offsetY];
                if (coordSys && !coordSys.containPoint(point)) {
                    // Hide axis pointer
                    this._hide();
                    return;
                }

                // Make sure point is discrete on cateogry axis
                var value = coordSys.pointToData(point);
                point = coordSys.dataToPoint(value);

                if (coordSys.type === 'cartesian2d') {
                    this._showCartesianPointer(axisPointerModel, coordSys, point);
                }
                else if (coordSys.type === 'polar') {
                    this._showPolarPointer(axisPointerModel, coordSys, point);
                }

                this._showSeriesTooltip(coordSys, item.series, point, value);
            }, this);

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

            var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

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
        _hideAxisPointer: function () {
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

        _showSeriesTooltip: function (coordSys, seriesList, point, value) {

            var rootTooltipModel = this._tooltipModel;
            var tooltipContent = this._tooltipContent;

            var data = seriesList[0].getData();
            var categoryAxis = coordSys.getAxesByScale('ordinal')[0];
            if (categoryAxis && rootTooltipModel.get('showContent')) {
                var rank = value[categoryAxis.dim === 'x' ? 0 : 1];
                var dataIndex = data.indexOf(categoryAxis.dim, rank);

                var html = data.getName(dataIndex) + '<br />'
                    + zrUtil.map(seriesList, function (series) {
                        return series.formatTooltip(dataIndex, true);
                    }).join('<br />');

                tooltipContent.show(rootTooltipModel);

                tooltipContent.setContent(html);

                tooltipContent.moveTo(point[0], point[1]);
            }
        },

        /**
         * Show tooltip on item
         * @param {module:echarts/model/Series} seriesModel
         * @param {number} dataIndex
         * @param {Object} e
         */
        _showItemTooltip: function (seriesModel, dataIndex, e) {
            // FIXME Graph data
            var data = seriesModel.getData();
            var itemModel = data.getItemModel(dataIndex);

            var rootTooltipModel = this._tooltipModel;
            var showContent = rootTooltipModel.get('showContent');

            var tooltipContent = this._tooltipContent;

            var tooltipModel = itemModel.getModel('tooltip');

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
                    seriesModel.formatTooltip(dataIndex)
                );

                var x = e.offsetX + 20;
                var y = e.offsetY + 20;
                tooltipContent.moveTo(x, y);
            }
        },

        _hide: function () {
            this._hideAxisPointer();
            this._tooltipContent.hideLater(this._tooltipModel.get('hideDelay'));
        },

        dispose: function (api) {
            var zr = api.getZr();
            zr.off('mousemove', this._mouseMove);
            zr.off('mouseout', this._hide);
        }
    })
});