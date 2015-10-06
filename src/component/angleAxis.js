define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../util/graphic');

    var elementList = ['axisLine', 'axisLabel', 'axisTick', 'splitLine', 'splitArea'];

    function getAxisLineShape(polar, r0, r, angle) {
        var start = polar.coordToPoint([r0, angle]);
        var end = polar.coordToPoint([r, angle]);

        return {
            x1: start[0],
            y1: start[1],
            x2: end[0],
            y2: end[1]
        };
    }

    require('../coord/polar/polarCreator');

    require('../echarts').extendComponentView({

        type: 'angleAxis',

        render: function (angleAxisModel, ecModel) {
            this.group.removeAll();

            var polarModel = ecModel.getComponent('polar', angleAxisModel.get('polarIndex'));
            var angleAxis = angleAxisModel.axis;
            var polar = polarModel.coordinateSystem;
            var radiusExtent = polar.getRadiusAxis().getExtent();
            var ticksAngles = angleAxis.getTicksCoords();

            if (angleAxis.type !== 'category') {
                // Remove the last tick which will overlap the first tick
                ticksAngles.pop();
            }

            zrUtil.each(elementList, function (name) {
                if (angleAxisModel.get(name +'.show')) {
                    this['_' + name](angleAxisModel, polar, ticksAngles, radiusExtent);
                }
            }, this);
        },

        /**
         * @private
         */
        _axisLine: function (angleAxisModel, polar, ticksAngles, radiusExtent) {
            var lineStyleModel = angleAxisModel.getModel('axisLine.lineStyle');

            var circle = new graphic.Circle({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r: radiusExtent[1]
                },
                style: lineStyleModel.getLineStyle()
            });
            circle.style.fill = null;

            this.group.add(circle);
        },

        /**
         * @private
         */
        _axisTick: function (angleAxisModel, polar, ticksAngles, radiusExtent) {
            var tickModel = angleAxisModel.getModel('axisTick');

            var tickLen = (tickModel.get('inside') ? -1 : 1) * tickModel.get('length');

            var lines = zrUtil.map(ticksAngles, function (tickAngle) {
                return new graphic.Line({
                    shape: getAxisLineShape(polar, radiusExtent[1], radiusExtent[1] + tickLen, tickAngle)
                });
            });
            this.group.add(graphic.mergePath(
                lines, {
                    style: tickModel.getModel('lineStyle').getLineStyle()
                }
            ));
        },

        /**
         * @private
         */
        _axisLabel: function (angleAxisModel, polar, ticksAngles, radiusExtent) {
            var axis = angleAxisModel.axis;

            var labelModel = angleAxisModel.getModel('axisLabel');
            var textStyleModel = labelModel.getModel('textStyle');

            var labels = angleAxisModel.formatLabels(axis.scale.getTicksLabels());

            var labelMargin = labelModel.get('margin');
            var labelsAngles = axis.getLabelsCoords();

            // Use length of ticksAngles because it may remove the last tick to avoid overlapping
            for (var i = 0; i < ticksAngles.length; i++) {
                var r = radiusExtent[1];
                var p = polar.coordToPoint([r + labelMargin, labelsAngles[i]]);
                var cx = polar.cx;
                var cy = polar.cy;

                var labelTextAlign = Math.abs(p[0] - cx) / r < 0.3
                    ? 'center' : (p[0] > cx ? 'left' : 'right');
                var labelTextBaseline = Math.abs(p[1] - cy) / r < 0.3
                    ? 'middle' : (p[1] > cy ? 'top' : 'bottom');

                this.group.add(new graphic.Text({
                    style: {
                        x: p[0],
                        y: p[1],
                        text: labels[i],
                        textAlign: labelTextAlign,
                        textBaseline: labelTextBaseline,
                        font: textStyleModel.getFont()
                    },
                    silent: true
                }))
            }
        },

        /**
         * @private
         */
        _splitLine: function (angleAxisModel, polar, ticksAngles, radiusExtent) {
            var splitLineModel = angleAxisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineColors = lineStyleModel.get('color');
            var lineWidth = lineStyleModel.get('width');
            var lineCount = 0;

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var splitLines = [];

            for (var i = 0; i < ticksAngles.length; i++) {
                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new graphic.Line({
                    shape: getAxisLineShape(polar, radiusExtent[0], radiusExtent[1], ticksAngles[i])
                }))
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitLines.length; i++) {
                this.group.add(graphic.mergePath(splitLines[i], {
                    style: {
                        stroke: lineColors[i % lineColors.length],
                        lineType: lineStyleModel.getLineDash(),
                        lineWidth: lineWidth
                    },
                    silent: true,
                    z: angleAxisModel.get('z')
                }));
            }
        },

        /**
         * @private
         */
        _splitArea: function (angleAxisModel, polar, ticksAngles, radiusExtent) {

        }
    });
});