define(function(require) {
    'use strict';

    var numberUtil = require('../util/number');

    require('../coord/cartesian/AxisModel');

    var AxisView = require('../echarts').extendComponentView({

        type: 'axis',

        render: function (axisModel, ecModel, api) {

            this.group.clear();

            var gridModel = ecModel.getComponent('grid', axisModel.get('gridIndex'));
            if (axisModel.get('axisLine.show')) {
                this._renderAxisLine(axisModel, gridModel, api);
            }
            if (axisModel.get('axisTick.show')) {
                this._renderAxisTick(axisModel, gridModel, api);
            }
            var labelShowList;
            if (axisModel.get('axisLabel.show')) {
                labelShowList = this._renderAxisLabel(axisModel, gridModel, api);
            }

            if (axisModel.get('splitLine.show')) {
                this._renderSplitLine(axisModel, gridModel, api, labelShowList);
            }
            if (axisModel.get('splitArea.show')) {
                this._renderSplitArea(axisModel, gridModel, api, labelShowList);
            }
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         * @private
         */
        _renderAxisLine: function (axisModel, gridModel, api) {
            var axis = axisModel.axis;

            var p1 = [];
            var p2 = [];

            var lineStyleModel = axisModel.getModel('axisLine.lineStyle');
            var lineWidth = lineStyleModel.get('width');
            var lineColor = lineStyleModel.get('color');
            var lineType = lineStyleModel.get('type');

            var rect = gridModel.coordinateSystem.getRect();

            var otherCoord = axis.otherCoord;
            if (axis.isHorizontal()) {
                p1[0] = rect.x;
                p2[0] = rect.x + rect.width;
                p1[1] = p2[1] = otherCoord;
            }
            else {
                p1[1] = rect.y;
                p2[1] = rect.y + rect.height;
                p1[0] = p2[0] = otherCoord;
            }

            api.subPixelOptimizeLine(p1, p2, lineWidth);

            this.group.add(new api.Line({
                shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1]
                },
                style: {
                    stroke: lineColor,
                    lineWidth: lineWidth,
                    lineCap: 'round',
                    lineType: lineType
                },
                z: axisModel.get('z'),
                silent: true
            }));
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         * @private
         */
        _renderAxisTick: function (axisModel, gridModel, api) {
            var axis = axisModel.axis;
            var tickModel = axisModel.getModel('axisTick');

            var lineStyleModel = tickModel.getModel('lineStyle');
            var tickLen = tickModel.get('length');
            var tickColor = lineStyleModel.get('color');
            var tickLineWidth = lineStyleModel.get('width');
            var tickInterval = tickModel.get('interval') || 0;
            var isTickIntervalFunction = typeof tickInterval === 'function';
            // PENDING Axis tick don't have the situation that don't have enough space to place
            if (tickInterval === 'auto') {
                tickInterval = 0;
            }

            var isOrdinalAxis = axis.scale.type === 'ordinal';

            var axisPosition = axis.position;
            var ticksCoords = isOrdinalAxis && axis.boundaryGap
                ? axis.getBandsCoords(true) : axis.getTicksCoords();

            var tickLines = [];
            for (var i = 0; i < ticksCoords.length; i++) {
                // Only ordinal scale support tick interval
                if (isOrdinalAxis) {
                    if (isTickIntervalFunction) {
                        if (!tickInterval(i, axis.scale.getItem(i))) {
                            continue;
                        }
                    }
                    else {
                        if (i % (tickInterval + 1)) {
                            continue;
                        }
                    }
                }

                var tickCoord = ticksCoords[i];

                var x;
                var y;
                var offX = 0;
                var offY = 0;

                if (axis.isHorizontal()) {
                    x = tickCoord;
                    y = axis.otherCoord;
                    offY = axisPosition === 'top' ? -tickLen : tickLen;
                }
                else {
                    x = axis.otherCoord;
                    y = tickCoord;
                    offX = axisPosition === 'left' ? -tickLen : tickLen;
                }
                if (tickModel.get('inside')) {
                    offX = -offX;
                    offY = -offY;
                }
                var p1 = [x, y];
                var p2 = [x + offX, y + offY];
                api.subPixelOptimizeLine(p1, p2, tickLineWidth);
                // Tick line
                tickLines.push(new api.Line({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                }));
            }
            var tickEl = api.mergePath(tickLines, {
                style: {
                    stroke: tickColor,
                    lineWidth: tickLineWidth
                },
                silent: true,
                z: axisModel.get('z')
            });
            this.group.add(tickEl);
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         * @private
         */
        _renderAxisLabel: function (axisModel, gridModel, api) {
            var axis = axisModel.axis;

            var labelModel = axisModel.getModel('axisLabel');
            var textStyleModel = labelModel.getModel('textStyle');

            var labelFormatter = labelModel.get('formatter');
            if (!labelFormatter) {
               // Default formatter
               switch (axisModel.get('type')) {
                   // TODO
                   case 'log':
                       break;
                   case 'category':
                       labelFormatter = function (val) {return val;};
                       break;
                   default:
                       labelFormatter = function (val) {
                           return numberUtil.addCommas(numberUtil.round(val));
                       }
                       break;
               }
            }
            else if (typeof labelFormatter === 'string') {
                labelFormatter = (function (tpl) {
                   return function (val) {
                       return tpl.replace('{value}', val);
                   };
               })(labelFormatter);
            }

            var gridRect = gridModel.coordinateSystem.getRect();

            var ticks = axis.scale.getTicks();
            var labelMargin = labelModel.get('margin');
            var labelRotate = labelModel.get('rotate');
            var labelInterval = labelModel.get('interval') || 0;
            var isLabelIntervalFunction = typeof labelInterval === 'function';

            var labelShowList = [];

            var textSpaceTakenRect;
            var needsCheckTextSpace;

            for (var i = 0; i < ticks.length; i++) {
                // Default is false
                labelShowList[i] = false;

                needsCheckTextSpace = false;

                // Only ordinal scale support label interval
                if (axis.scale.type === 'ordinal') {
                    if (labelInterval === 'auto') {
                        needsCheckTextSpace = true;
                    }
                    else if (isLabelIntervalFunction) {
                        if (!labelInterval(tick, axis.scale.getItem(tick))) {
                            continue;
                        }
                    }
                    else {
                        if (tick % (labelInterval + 1)) {
                            continue;
                        }
                    }
                }

                var x;
                var y;
                var tick = ticks[i];
                var tickCoord = axis.dataToCoord(tick);
                var labelTextAlign = 'center';
                var labelTextBaseline = 'middle';

                var label = tick;
                switch (axis.type) {
                    case 'category':
                        label = axis.scale.getItem(tick);
                        break;
                    case 'time':
                        // TODO
                }

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
                if (axis.isHorizontal()) {
                    if (labelRotate) {
                        labelTextAlign = labelRotate > 0 ? 'left' : 'right';
                    }
                }

                var textEl = new api.Text({
                    style: {
                        x: x,
                        y: y,
                        text: labelFormatter(label),
                        textAlign: labelTextAlign,
                        textBaseline: labelTextBaseline
                    },
                    rotation: labelRotate * Math.PI / 180,
                    origin: [x, y],
                    silent: true,
                    z: axisModel.get('z')
                });

                if (needsCheckTextSpace && !labelRotate) {
                    var rect = textEl.getBoundingRect();
                    if (!textSpaceTakenRect) {
                        textSpaceTakenRect = rect;
                    }
                    else {
                        // There is no space for current label;
                        if (textSpaceTakenRect.intersect(rect)) {
                            continue;
                        }
                        else {
                            textSpaceTakenRect.union(rect);
                        }
                    }
                }

                labelShowList[i] = true;

                this.group.add(textEl);
             }
         },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         * @param {Array.<boolean>} showList
         * @private
         */
        _renderSplitLine: function (axisModel, gridModel, api, showList) {
            var axis = axisModel.axis;

            var splitLineModel = axisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineWidth = lineStyleModel.get('width');
            var lineColors = lineStyleModel.get('color');
            var lineType = lineStyleModel.get('type');

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var gridRect = gridModel.coordinateSystem.getRect();
            var isHorizontal = axis.isHorizontal();

            var splitLines = [];
            var lineCount = 0;

            var isOrdinalAxis = axis.scale.type === 'ordinal';
            var ticksCoords = isOrdinalAxis && axis.boundaryGap
                ? axis.getBandsCoords(true) : axis.getTicksCoords();

            var p1 = [];
            var p2 = [];
            for (var i = 0; i < ticksCoords.length; i++) {
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
                api.subPixelOptimizeLine(p1, p2, lineWidth);

                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new api.Line({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                }));
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitLines.length; i++) {
                this.group.add(api.mergePath(splitLines[i], {
                    style: {
                        stroke: lineColors[i % lineColors.length],
                        lineType: lineType,
                        lineWidth: lineWidth
                    },
                    silent: true,
                    z: axisModel.get('z')
                }));
            }
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {module:echarts/ExtensionAPI} api
         * @param {Array.<boolean>} showList
         * @private
         */
        _renderSplitArea: function (axisModel, gridModel, api, showList) {
            var axis = axisModel.axis;

            var splitAreaModel = axisModel.getModel('splitArea');
            var areaColors = splitAreaModel.get('areaStyle.color');

            var gridRect = gridModel.coordinateSystem.getRect();
            var isOrdinalAxis = axis.scale.type === 'ordinal';
            var ticksCoords = isOrdinalAxis && axis.boundaryGap
                ? axis.getBandsCoords(true) : axis.getTicksCoords();

            var prevX;
            var prevY;

            var splitAreaRects = [];
            var count = 0;

            areaColors = areaColors instanceof Array ? areaColors : [areaColors];

            for (var i = 1; i < ticksCoords.length; i++) {
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
                splitAreaRects[colorIndex].push(new api.Rect({
                    shape: {
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    }
                }));

                prevX = x;
                prevY = y;
            }

            // Simple optimization
            // Batching the rects if color are the same
            for (var i = 0; i < splitAreaRects.length; i++) {
                this.group.add(api.mergePath(splitAreaRects[i], {
                    style: {
                        fill: areaColors[i % areaColors.length]
                    },
                    silent: true,
                    z: axisModel.get('z')
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