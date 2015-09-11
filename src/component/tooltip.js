define(function (require) {

    var TooltipContent = require('./tooltip/TooltipContent');
    var graphic = require('../util/graphic');

    function getAxisPointerKey(coordName, axisType) {
        return coordName + axisType;
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
            this.group.clear();
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

            ecModel.eachSeries(function (seriesModel) {
                // Try show the axis pointer
                this.group.show();

                var coordinateSystem = seriesModel.coordinateSystem;

                // If mouse position is not in the grid or polar
                var point = [e.offsetX, e.offsetY];
                if (coordinateSystem && ! coordinateSystem.containPoint(point)) {
                    // Hide axis pointer
                    this._hideAxisTooltip();
                    return;
                }

                if (coordinateSystem.type === 'cartesian2d') {
                    this._showCartesianAxis(coordinateSystem, point);
                }
                else if (coordinateSystem.type === 'polar') {
                    this._showPolarAxis(coordinateSystem, point);
                }
            }, this)
        },

        /**
         * Show tooltip on axis of cartesian coordinate
         * @param {Object} e
         */
        _showCartesianAxis: function (cartesian, point) {
            var self = this;

            var tooltipModel = this._tooltipModel;

            var axisPointerModel = tooltipModel.getModel('axisPointer');

            var cateogryAxis = cartesian.getAxesByScale('ordinal')[0];

            var axisPointerType = axisPointerModel.get('type');

            var value = cartesian.pointToData(point);

            // Make sure point is discrete on cateogry axis
            if (cateogryAxis) {
                point = cartesian.dataToPoint(value);
            }

            if (axisPointerType === 'line') {
                var axisType = axisPointerModel.get('axis');
                if (axisType === 'auto') {
                    axisType = (cateogryAxis && cateogryAxis.dim) || 'x';
                }

                var pointerAxis = cartesian.getAxis(axisType);
                var otherAxis = cartesian.getOtherAxis(pointerAxis);
                var otherExtent = otherAxis.getExtent();

                moveLine(axisType, point, otherExtent);
            }
            else if (axisPointerType === 'cross') {
                moveLine('x', point, cartesian.getAxis('y').getExtent());
                moveLine('y', point, cartesian.getAxis('x').getExtent());
            }
            else if (axisPointerType === 'shadow') {

            }

            function moveLine(axisType, point, otherExtent) {

                var pointerEl = self._getPointerElement(cartesian, axisPointerModel, axisType)
                var targetShape;
                if (axisType === 'x') {
                    targetShape = {
                        x1: point[0],
                        y1: otherExtent[0],
                        x2: point[0],
                        y2: otherExtent[1]
                    };
                }
                else {
                    targetShape = {
                        x1: otherExtent[0],
                        y1: point[1],
                        x2: otherExtent[1],
                        y2: point[1]
                    };
                }

                // pointerEl.animateTo({
                //     shape: targetShape
                // }, 100, 'cubicOut');
                pointerEl.attr({
                    shape: targetShape
                })
            }
        },

        /**
         * Show tooltip on axis of polar coordinate
         * @param {Object} e
         */
        _showPolarAxis: function () {

        },

        /**
         * Hide axis tooltip
         */
        _hideAxisTooltip: function () {
            this.group.hide();
        },

        _getPointerElement: function (coordSystem, pointerModel, axisType) {
            var axisPointers = this._axisPointers;
            var key = getAxisPointerKey(coordSystem.name, axisType);
            if (axisPointers[key]) {
                return axisPointers[key];
            }

            // Create if not exists
            var pointerType = pointerModel.get('type');
            var styleModel = pointerModel.getModel(pointerType + 'Style');
            var isShadow = pointerType === 'shadow';
            var style = styleModel[isShadow ? 'getAreaStyle' : 'getLineStyle']();

            var elementType = axisType === 'radius'
                ? (isShadow ? 'Sector' : 'Circle')
                : (isShadow ? 'Rect' : 'Line');

            var el = axisPointers[key] = new graphic[elementType]({
                style: style,
                silent: true
            });

            this.group.add(el);
            return el;
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