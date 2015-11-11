define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var elementList = ['axisLine', 'axisLabel', 'axisTick', 'splitLine', 'splitArea'];

    // Mixin axis label interval calculation helper
    var axisLabelInterval = require('../../coord/cartesian/axisLabelInterval');
    var Axis2D = require('../../coord/cartesian/Axis2D');

    Axis2D.prototype.getLabelInterval = function () {
        var labelInterval = this._labelInterval;
        if (!labelInterval) {
            labelInterval = this._labelInterval = axisLabelInterval(this);
        }
        return labelInterval;
    };

    /**
     * @inner
     */
    function getAxisLinePosition(axisModel, gridModel) {
        var axis = axisModel.axis;
        var grid = gridModel.coordinateSystem;
        var rect = grid.getRect();

        // FIXME Other dimension has two axes
        var otherAxis = grid.getAxis(axis.dim === 'x' ? 'y' : 'x');

        var position = 0;
        if (axis.onZero) {
            position = otherAxis.dataToCoord(0);
        }
        else {
            switch (axis.position) {
                case 'left':
                    position = rect.x;
                    break;
                case 'right':
                    position = rect.x + rect.width;
                    break;
                case 'top':
                    position = rect.y;
                    break;
                case 'bottom':
                    position = rect.y + rect.height;
            }
        }

        return position;
    }

    /**
     * @inner
     */
    function ifIgnoreOnTick(axis, i, interval) {
        return axis.scale.type === 'ordinal'
            && (typeof interval === 'function')
                && !interval(i, axis.scale.getItem(i))
                || i % (interval + 1);
    }

    /**
     * @inner
     */
    function getInterval(model, labelInterval) {
        var interval = model.get('interval');
        if (interval == null || interval == 'auto') {
            interval = labelInterval;
        }
        return interval;
    }

    var AxisView = require('../../echarts').extendComponentView({

        type: 'axis',

        /**
         * Position of axis line
         * @private
         */
        _axisLinePosition: 0,

        render: function (axisModel, ecModel) {

            this.group.removeAll();

            if (!axisModel.get('show')) {
                return;
            }

            var gridModel = ecModel.getComponent('grid', axisModel.get('gridIndex'));
            var labelInterval = axisModel.axis.getLabelInterval();

            this._axisLinePosition = getAxisLinePosition(axisModel, gridModel);

            zrUtil.each(elementList, function (name) {
                if (axisModel.get(name +'.show')) {
                    this['_' + name](axisModel, gridModel, labelInterval);
                }
            }, this);

            this._renderName(axisModel, gridModel);
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel}
         * @private
         */
        _renderName: function (axisModel, gridModel) {
            var axis = axisModel.axis;

            var name = axisModel.get('name');

            if (name) {
                var nameLocation = axisModel.get('nameLocation');
                var textStyleModel = axisModel.getModel('nameTextStyle');

                var isHorizontal = axis.isHorizontal();
                var axisPosition = this._axisLinePosition;

                var axisExtent = axis.getExtent();

                var sign = axisExtent[1] - axisExtent[0] > 0 ? -1 : 1;

                var textAlign;
                var textBaseline;
                var textX;
                var textY;

                var gap = axisModel.get('nameGap') || 0;

                var axisInverse = axis.inverse;

                switch (nameLocation) {
                    case 'start':
                        if (isHorizontal) {
                            textX = axisExtent[0] + sign * gap;
                            textY = axisPosition;
                            textAlign = axisInverse ? 'left' : 'right';
                            textBaseline = 'middle';
                        }
                        else {
                            textX = axisPosition;
                            textY = axisExtent[0] + sign * gap;
                            textAlign = 'center';
                            textBaseline = axisInverse ? 'bottom' : 'top';
                        }
                        break;
                    case 'middle':
                        // TODO
                        break;
                    case 'end':
                        if (isHorizontal) {
                            textX = axisExtent[1] - sign * gap;
                            textY = axisPosition;
                            textAlign = axisInverse ? 'right' : 'left';
                            textBaseline = 'middle';
                        }
                        else {
                            textX = axisPosition;
                            textY = axisExtent[1] - sign * gap;
                            textAlign = 'center';
                            textBaseline = axisInverse ? 'top' : 'bottom';
                        }
                        break;
                }

                var text = new graphic.Text({
                    style: {
                        text: name,
                        textFont: textStyleModel.getFont(),
                        fill: textStyleModel.get('color')
                            || axisModel.get('axisLine.lineStyle.color'),
                        textAlign: textAlign,
                        textBaseline: textBaseline
                    },
                    position: [textX, textY],
                    z2: 1
                });

                this.group.add(text);
            }
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @private
         */
        _axisLabel: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;

            var labelModel = axisModel.getModel('axisLabel');
            var textStyleModel = labelModel.getModel('textStyle');

            var gridRect = gridModel.coordinateSystem.getRect();

            var ticks = axis.scale.getTicks();
            var labels = axisModel.formatLabels(axis.scale.getTicksLabels());
            var labelMargin = labelModel.get('margin');
            var labelRotate = labelModel.get('rotate');

            var isAxisTop = axis.position === 'top';

            if (isAxisTop) {
                labelRotate = -labelRotate;
            }

            for (var i = 0; i < ticks.length; i++) {
                var tick = ticks[i];
                if (ifIgnoreOnTick(axis, i, labelInterval)) {
                     continue;
                }

                var x;
                var y;
                var tickCoord = axis.dataToCoord(tick);
                var labelTextAlign = 'center';
                var labelTextBaseline = 'middle';

                switch (axis.position) {
                    case 'top':
                        y = gridRect.y - labelMargin;
                        x = tickCoord;
                        labelTextBaseline = 'bottom';
                        break;
                    case 'bottom':
                        x = tickCoord;
                        y = gridRect.y + gridRect.height + labelMargin;
                        labelTextBaseline = 'top';
                        break;
                    case 'left':
                        x = gridRect.x - labelMargin;
                        y = tickCoord;
                        labelTextAlign = 'right';
                        break;
                    case 'right':
                        x = gridRect.x + gridRect.width + labelMargin;
                        y = tickCoord;
                        labelTextAlign = 'left';
                }
                if (axis.isHorizontal() && labelRotate) {
                    labelTextAlign = (!isAxisTop && labelRotate < 0) || (isAxisTop && labelRotate > 0)
                         ? 'left' : 'right';
                }

                var textEl = new graphic.Text({
                    style: {
                        x: x,
                        y: y,
                        text: labels[i],
                        textAlign: labelTextAlign,
                        textBaseline: labelTextBaseline,
                        textFont: textStyleModel.getFont(),
                        fill: textStyleModel.get('color')
                    },
                    rotation: labelRotate * Math.PI / 180,
                    origin: [x, y],
                    silent: true
                });

                this.group.add(textEl);
             }
         },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @private
         */
        _axisLine: function (axisModel, gridModel) {
            var axis = axisModel.axis;
            var p1 = [];
            var p2 = [];

            var lineStyleModel = axisModel.getModel('axisLine.lineStyle');

            var coordExtent = axis.getExtent();
            if (axis.isHorizontal()) {
                p1[0] = coordExtent[0];
                p2[0] = coordExtent[1];
                p1[1] = p2[1] = this._axisLinePosition;
            }
            else {
                p1[1] = coordExtent[0];
                p2[1] = coordExtent[1];
                p1[0] = p2[0] = this._axisLinePosition;
            }

            this.group.add(new graphic.Line(graphic.subPixelOptimizeLine({
                shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1]
                },
                style: zrUtil.extend({
                    lineCap: 'round'
                }, lineStyleModel.getLineStyle()),
                silent: true,
                z2: 1
            })));
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {number|Function} labelInterval
         * @private
         */
        _axisTick: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;
            var tickModel = axisModel.getModel('axisTick');

            var lineStyleModel = tickModel.getModel('lineStyle');
            var tickLen = tickModel.get('length');
            var tickLineWidth = lineStyleModel.get('width');
            var isTickInside = tickModel.get('inside');

            var tickInterval = getInterval(tickModel, labelInterval);

            var axisPosition = axis.position;
            var ticksCoords = axis.getTicksCoords();

            var tickLines = [];
            for (var i = 0; i < ticksCoords.length; i++) {
                // Only ordinal scale support tick interval
                if (ifIgnoreOnTick(axis, i, tickInterval)) {
                     continue;
                }

                var tickCoord = ticksCoords[i];

                var x;
                var y;
                var offX = 0;
                var offY = 0;

                if (axis.isHorizontal()) {
                    x = tickCoord;
                    y = this._axisLinePosition;
                    offY = axisPosition === 'top' ? -tickLen : tickLen;
                }
                else {
                    x = this._axisLinePosition;
                    y = tickCoord;
                    offX = axisPosition === 'left' ? -tickLen : tickLen;
                }

                if (isTickInside) {
                    offX = -offX;
                    offY = -offY;
                }

                var p1 = [x, y];
                var p2 = [x + offX, y + offY];

                // Tick line
                tickLines.push(new graphic.Line(graphic.subPixelOptimizeLine({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    },
                    style: {
                        lineWidth: tickLineWidth
                    },
                    silent: true
                })));
            }
            var tickEl = graphic.mergePath(tickLines, {
                style: lineStyleModel.getLineStyle(),
                silent: true
            });
            this.group.add(tickEl);
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {number|Function} labelInterval
         * @private
         */
        _splitLine: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;

            var splitLineModel = axisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineWidth = lineStyleModel.get('width');
            var lineColors = lineStyleModel.get('color');

            var lineInterval = getInterval(splitLineModel, labelInterval);

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var gridRect = gridModel.coordinateSystem.getRect();
            var isHorizontal = axis.isHorizontal();

            var splitLines = [];
            var lineCount = 0;

            var ticksCoords = axis.getTicksCoords();

            var p1 = [];
            var p2 = [];
            for (var i = 0; i < ticksCoords.length; i++) {
                if (ifIgnoreOnTick(axis, i, lineInterval)) {
                    continue;
                }

                var tickCoord = ticksCoords[i];

                if (isHorizontal) {
                    p1[0] = tickCoord;
                    p1[1] = gridRect.y;
                    p2[0] = tickCoord;
                    p2[1] = gridRect.y + gridRect.height;
                }
                else {
                    p1[0] = gridRect.x;
                    p1[1] = tickCoord;
                    p2[0] = gridRect.x + gridRect.width;
                    p2[1] = tickCoord;
                }

                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new graphic.Line(graphic.subPixelOptimizeLine({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    },
                    style: {
                        lineWidth: lineWidth
                    },
                    silent: true
                })));
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitLines.length; i++) {
                this.group.add(graphic.mergePath(splitLines[i], {
                    style: {
                        stroke: lineColors[i % lineColors.length],
                        lineDash: lineStyleModel.getLineDash(),
                        lineWidth: lineWidth
                    },
                    silent: true
                }));
            }
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {number|Function} labelInterval
         * @private
         */
        _splitArea: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;

            var splitAreaModel = axisModel.getModel('splitArea');
            var areaColors = splitAreaModel.get('areaStyle.color');

            var gridRect = gridModel.coordinateSystem.getRect();
            var ticksCoords = axis.getTicksCoords();

            var prevX = ticksCoords[0];
            var prevY = ticksCoords[0];

            var splitAreaRects = [];
            var count = 0;

            var areaInterval = getInterval(splitAreaModel, labelInterval);

            areaColors = areaColors instanceof Array ? areaColors : [areaColors];

            for (var i = 1; i < ticksCoords.length; i++) {
                if (ifIgnoreOnTick(axis, i, areaInterval)) {
                    continue;
                }

                var tickCoord = ticksCoords[i];

                var x;
                var y;
                var width;
                var height;
                if (axis.isHorizontal()) {
                    x = prevX;
                    y = gridRect.y;
                    width = tickCoord - x;
                    height = gridRect.height;
                }
                else {
                    x = gridRect.x;
                    y = prevY;
                    width = gridRect.width;
                    height = tickCoord - y;
                }

                var colorIndex = (count++) % areaColors.length;
                splitAreaRects[colorIndex] = splitAreaRects[colorIndex] || [];
                splitAreaRects[colorIndex].push(new graphic.Rect({
                    shape: {
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    },
                    silent: true
                }));

                prevX = x + width;
                prevY = y + height;
            }

            // Simple optimization
            // Batching the rects if color are the same
            for (var i = 0; i < splitAreaRects.length; i++) {
                this.group.add(graphic.mergePath(splitAreaRects[i], {
                    style: {
                        fill: areaColors[i % areaColors.length]
                    },
                    silent: true
                }));
            }
        }
    });

    AxisView.extend({
        type: 'xAxis'
    });
    AxisView.extend({
        type: 'yAxis'
    });
});