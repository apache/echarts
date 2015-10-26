// FIXME Better way to pack data in graphic element
define(function (require) {

    var TooltipContent = require('./tooltip/TooltipContent');
    var graphic = require('../util/graphic');
    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../util/format');

    require('./tooltip/TooltipModel');

    /**
     * @inner
     */
    function getAxisPointerKey(coordName, axisType) {
        return coordName + axisType;
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

    var TPL_VAR_ALIAS = ['a', 'b', 'c', 'd', 'e'];


    function wrapVar(varName, seriesIdx) {
        return '{' + varName + (seriesIdx == null ? '' : seriesIdx) + '}';
    }
    /**
     * @inner
     */
    function formatTpl(tpl, paramsList) {
        var seriesLen = paramsList.length;
        if (!seriesLen) {
            return '';
        }

        var $vars = paramsList[0].$vars;
        for (var i = 0; i < $vars.length; i++) {
            var alias = TPL_VAR_ALIAS[i];
            tpl = tpl.replace(wrapVar(alias),  wrapVar(alias, 0));
        }
        for (var seriesIdx = 0; seriesIdx < seriesLen; seriesIdx++) {
            for (var k = 0; k < $vars.length; k++) {
                tpl = tpl.replace(
                    wrapVar(TPL_VAR_ALIAS[k], seriesIdx),
                    paramsList[seriesIdx][$vars[k]]
                );
            }
        }

        return tpl;
    }

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

            this._tooltipContent.update();

            this._seriesGroupByAxis = this._prepareAxisTriggerData(
                tooltipModel, ecModel
            );

            var crossText = this._crossText;
            if (crossText) {
                this.group.add(crossText);
            }
        },

        _prepareAxisTriggerData: function (tooltipModel, ecModel) {
            // Prepare data for axis trigger
            var seriesGroupByAxis = {};
            ecModel.eachSeries(function (seriesModel) {
                var coordSys = seriesModel.coordinateSystem;
                var trigger = seriesModel.get('tooltip.trigger', true);
                // Ignore series use item tooltip trigger
                if (!coordSys ||  trigger === 'item') {
                    return;
                }

                var coordSysType = coordSys.type;

                var baseAxis;
                var key;

                // Only cartesian2d and polar support axis trigger
                if (coordSysType === 'cartesian2d') {
                    // FIXME `axisPointer.axis` is not baseAxis
                    baseAxis = coordSys.getBaseAxis();
                    var baseDim = baseAxis.dim;
                    var axisIndex = seriesModel.get(baseDim + 'AxisIndex');

                    key = baseDim + axisIndex;
                }
                else if (coordSysType === 'polar') {
                    baseAxis = coordSys.getBaseAxis();
                    key = baseAxis.dim + coordSys.name;
                }

                if (!key) {
                    return;
                }

                seriesGroupByAxis[key] = seriesGroupByAxis[key] || {
                    coordSys: [],
                    series: []
                };
                seriesGroupByAxis[key].coordSys.push(coordSys);
                seriesGroupByAxis[key].series.push(seriesModel);

            }, this);

            return seriesGroupByAxis;
        },

        /**
         * mousemove handler
         * @param {Object} e
         * @private
         */
        _mouseMove: function (e) {
            var el = e.target;
            var tooltipModel = this._tooltipModel;
            var trigger = tooltipModel.get('trigger');
            var ecModel = this._ecModel;

            if (!tooltipModel) {
                return;
            }

            // Reset ticket
            this._ticket = '';

            // Always show item tooltip if mouse is on the element with dataIndex
            if (el && el.dataIndex != null) {

                var seriesModel = ecModel.getSeriesByIndex(
                    el.seriesIndex, true
                );

                this._hideAxisPointer();

                this._showItemTooltip(seriesModel, el.dataIndex, e);
            }
            else {
                if (trigger === 'item') {
                    this._hide();
                }
                else {
                    // Try show axis tooltip
                    this._showAxisTooltip(e);
                }
            }
        },

        /**
         * Show tooltip on axis
         * @param {Object} e
         * @private
         */
        _showAxisTooltip: function (e) {
            var tooltipModel = this._tooltipModel;
            var axisPointerModel = tooltipModel.getModel('axisPointer');

            zrUtil.each(this._seriesGroupByAxis, function (item) {
                // Try show the axis pointer
                this.group.show();

                var allCoordSys = item.coordSys;
                var coordSys = allCoordSys[0];

                // If mouse position is not in the grid or polar
                var point = [e.offsetX, e.offsetY];

                if (!coordSys.containPoint(point)) {
                    // Hide axis pointer
                    this._hide();
                    return;
                }

                // Make sure point is discrete on cateogry axis

                var value = coordSys.pointToData(point, true);
                point = coordSys.dataToPoint(value);

                if (coordSys.type === 'cartesian2d') {
                    this._showCartesianPointer(axisPointerModel, allCoordSys, point);
                }
                else if (coordSys.type === 'polar') {
                    this._showPolarPointer(axisPointerModel, allCoordSys, point);
                }

                if (axisPointerModel.get('type') !== 'cross') {
                    this._showSeriesTooltip(coordSys, item.series, point, value);
                }
            }, this);

        },

        /**
         * Show tooltip on axis of cartesian coordinate
         * @param {module:echarts/model/Model} axisPointerModel
         * @param {Array.<module:echarts/coord/cartesian/Cartesian2D>} cartesians
         * @param {Array.<number>} point
         * @private
         */
        _showCartesianPointer: function (axisPointerModel, cartesians, point) {
            var self = this;

            var axisPointerType = axisPointerModel.get('type');

            var cartesian = cartesians[0];

            if (axisPointerType === 'cross') {
                moveGridLine('x', point, cartesian.getAxis('y').getExtent());
                moveGridLine('y', point, cartesian.getAxis('x').getExtent());

                this._updateCrossText(cartesian, point, axisPointerModel);
            }
            else {
                // Use the first cartesian
                var baseAxis = cartesian.getBaseAxis();

                var axisType = axisPointerModel.get('axis');
                if (axisType === 'auto') {
                    axisType = (baseAxis && baseAxis.dim) || 'x';
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
                var span = otherExtent[1] - otherExtent[0];
                var targetShape = axisType === 'x'
                    ? makeRectShape(point[0] - bandWidth / 2, otherExtent[0], bandWidth, span)
                    : makeRectShape(otherExtent[0], point[1] - bandWidth / 2, span, bandWidth);

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
         * @param {Array.<module:echarts/coord/polar/Polar>} polars
         * @param {Array.<number>} point
         */
        _showPolarPointer: function (axisPointerModel, polars, point) {
            var self = this;

            var axisPointerType = axisPointerModel.get('type');

            var polar = polars[0];

            var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();

            if (axisPointerType === 'cross') {
                movePolarLine('angle', point, radiusAxis.getExtent());
                movePolarLine('radius', point, angleAxis.getExtent());

                this._updateCrossText(polar, point, axisPointerModel);
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

        _updateCrossText: function (coordSys, point, axisPointerModel) {
            var crossStyleModel = axisPointerModel.getModel('crossStyle');
            var textStyleModel = crossStyleModel.getModel('textStyle');

            var tooltipModel = this._tooltipModel;

            var text = this._crossText;
            if (!text) {
                text = this._crossText = new graphic.Text({
                    style: {
                        textAlign: 'left',
                        textBaseline: 'bottom'
                    }
                });
                this.group.add(text);
            }

            var value = coordSys.pointToData(point);

            var dims = coordSys.dimensions;
            value = zrUtil.map(value, function (val, idx) {
                var axis = coordSys.getAxis(dims[idx]);
                if (axis.type === 'category') {
                    val = axis.scale.getLabel(val);
                }
                else {
                    val = formatUtil.addCommas(
                        val.toFixed(axis.getFormatPrecision())
                    );
                }
                return val;
            });

            text.setStyle({
                fill: textStyleModel.get('color') || crossStyleModel.get('color'),
                textFont: textStyleModel.getFont(),
                text: value.join(', '),
                x: point[0] + 5,
                y: point[1] - 5
            });
            text.z = tooltipModel.get('z');
            text.zlevel = tooltipModel.get('zlevel');
        },

        /**
         * Hide axis tooltip
         */
        _hideAxisPointer: function () {
            this.group.hide();
        },

        _getPointerElement: function (coordSys, pointerModel, axisType) {
            var tooltipModel = this._tooltipModel;
            var z = tooltipModel.get('z');
            var zlevel = tooltipModel.get('zlevel');
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
                ? (isShadow ? 'Sector' : (axisType === 'radius' ? 'Circle' : 'Line'))
                : (isShadow ? 'Rect' : 'Line');

           isShadow ? (style.stroke = null) : (style.fill = null);

            var el = axisPointers[key] = new graphic[elementType]({
                style: style,
                z: z,
                zlevel: zlevel,
                silent: true
            });

            this.group.add(el);
            return el;
        },

        /**
         * Show tooltip on item
         * @param {Array.<module:echarts/model/Series>} seriesList
         * @param {Array.<number>} point
         * @param {Array.<number>} value
         * @param {Object} e
         */
        _showSeriesTooltip: function (coordSys, seriesList, point, value) {

            var rootTooltipModel = this._tooltipModel;
            var tooltipContent = this._tooltipContent;

            var data = seriesList[0].getData();
            var baseAxis = coordSys.getBaseAxis();

            if (baseAxis && rootTooltipModel.get('showContent')) {
                var val = value[baseAxis.dim === 'x' ? 0 : 1];
                var dataIndex = data.indexOfNearest(baseAxis.dim, val);

                var formatter = rootTooltipModel.get('formatter');
                var html;
                if (!formatter) {
                    // Default tooltip content
                    html = data.getName(dataIndex) + '<br />'
                        + zrUtil.map(seriesList, function (series) {
                            return series.formatTooltip(dataIndex, true);
                        }).join('<br />');
                }
                else {
                    var paramsList = zrUtil.map(seriesList, function (series) {
                        return series.getFormatParams(dataIndex);
                    });
                    if (typeof formatter === 'string') {
                        html = formatTpl(formatter, paramsList);
                    }
                    else if (typeof formatter === 'function') {
                        var self = this;
                        var ticket = 'axis_' + coordSys.name + '_' + dataIndex;
                        self._ticket = ticket;
                        function callback(cbTicket, html) {
                            if (cbTicket === self._ticket) {
                                tooltipContent.setContent(html);
                            }
                        }
                        html = formatter(paramsList, ticket, callback)
                    }
                }


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

            var tooltipContent = this._tooltipContent;

            var tooltipModel = itemModel.getModel('tooltip');

            // If series model
            if (tooltipModel.parentModel) {
                tooltipModel.parentModel.parentModel = rootTooltipModel;
            }
            else {
                tooltipModel.parentModel = this._tooltipModel;
            }

            if (tooltipModel.get('showContent')) {
                var formatter = tooltipModel.get('formatter');
                var html;
                if (!formatter) {
                    html = seriesModel.formatTooltip(dataIndex);
                }
                else {
                    var params = seriesModel.getFormatParams(dataIndex);
                    if (typeof formatter === 'string') {
                        html = formatTpl(formatter, [params]);
                    }
                    else if (typeof formatter === 'function') {
                        var self = this;
                        var ticket = 'item_' + seriesModel.name + '_' + dataIndex;
                        self._ticket = ticket;
                        function callback(cbTicket, html) {
                            if (cbTicket === self._ticket) {
                                tooltipContent.setContent(html);
                            }
                        }
                        html = formatter([params], ticket, callback);
                    }
                }

                tooltipContent.show(tooltipModel);

                tooltipContent.setContent(html);

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