import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import Model from '../../model/Model';
import AxisView from './AxisView';

var elementList = ['axisLine', 'axisLabel', 'axisTick', 'splitLine', 'splitArea'];

function getAxisLineShape(polar, rExtent, angle) {
    rExtent[1] > rExtent[0] && (rExtent = rExtent.slice().reverse());
    var start = polar.coordToPoint([rExtent[0], angle]);
    var end = polar.coordToPoint([rExtent[1], angle]);

    return {
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1]
    };
}

function getRadiusIdx(polar) {
    var radiusAxis = polar.getRadiusAxis();
    return radiusAxis.inverse ? 0 : 1;
}

export default AxisView.extend({

    type: 'angleAxis',

    axisPointerClass: 'PolarAxisPointer',

    render: function (angleAxisModel, ecModel) {
        this.group.removeAll();
        if (!angleAxisModel.get('show')) {
            return;
        }

        var angleAxis = angleAxisModel.axis;
        var polar = angleAxis.polar;
        var radiusExtent = polar.getRadiusAxis().getExtent();
        var ticksAngles = angleAxis.getTicksCoords();

        if (angleAxis.type !== 'category') {
            // Remove the last tick which will overlap the first tick
            ticksAngles.pop();
        }

        zrUtil.each(elementList, function (name) {
            if (angleAxisModel.get(name +'.show')
                && (!angleAxis.scale.isBlank() || name === 'axisLine')
            ) {
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
                r: radiusExtent[getRadiusIdx(polar)]
            },
            style: lineStyleModel.getLineStyle(),
            z2: 1,
            silent: true
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
        var radius = radiusExtent[getRadiusIdx(polar)];

        var lines = zrUtil.map(ticksAngles, function (tickAngle) {
            return new graphic.Line({
                shape: getAxisLineShape(polar, [radius, radius + tickLen], tickAngle)
            });
        });
        this.group.add(graphic.mergePath(
            lines, {
                style: zrUtil.defaults(
                    tickModel.getModel('lineStyle').getLineStyle(),
                    {
                        stroke: angleAxisModel.get('axisLine.lineStyle.color')
                    }
                )
            }
        ));
    },

    /**
     * @private
     */
    _axisLabel: function (angleAxisModel, polar, ticksAngles, radiusExtent) {
        var axis = angleAxisModel.axis;

        var categoryData = angleAxisModel.get('data');

        var labelModel = angleAxisModel.getModel('axisLabel');
        var labels = angleAxisModel.getFormattedLabels();

        var labelMargin = labelModel.get('margin');
        var labelsAngles = axis.getLabelsCoords();

        // Use length of ticksAngles because it may remove the last tick to avoid overlapping
        for (var i = 0; i < ticksAngles.length; i++) {
            var r = radiusExtent[getRadiusIdx(polar)];
            var p = polar.coordToPoint([r + labelMargin, labelsAngles[i]]);
            var cx = polar.cx;
            var cy = polar.cy;

            var labelTextAlign = Math.abs(p[0] - cx) / r < 0.3
                ? 'center' : (p[0] > cx ? 'left' : 'right');
            var labelTextVerticalAlign = Math.abs(p[1] - cy) / r < 0.3
                ? 'middle' : (p[1] > cy ? 'top' : 'bottom');

            if (categoryData && categoryData[i] && categoryData[i].textStyle) {
                labelModel = new Model(categoryData[i].textStyle, labelModel, labelModel.ecModel);
            }

            var textEl = new graphic.Text({silent: true});
            this.group.add(textEl);
            graphic.setTextStyle(textEl.style, labelModel, {
                x: p[0],
                y: p[1],
                textFill: labelModel.getTextColor() || angleAxisModel.get('axisLine.lineStyle.color'),
                text: labels[i],
                textAlign: labelTextAlign,
                textVerticalAlign: labelTextVerticalAlign
            });
        }
    },

    /**
     * @private
     */
    _splitLine: function (angleAxisModel, polar, ticksAngles, radiusExtent) {
        var splitLineModel = angleAxisModel.getModel('splitLine');
        var lineStyleModel = splitLineModel.getModel('lineStyle');
        var lineColors = lineStyleModel.get('color');
        var lineCount = 0;

        lineColors = lineColors instanceof Array ? lineColors : [lineColors];

        var splitLines = [];

        for (var i = 0; i < ticksAngles.length; i++) {
            var colorIndex = (lineCount++) % lineColors.length;
            splitLines[colorIndex] = splitLines[colorIndex] || [];
            splitLines[colorIndex].push(new graphic.Line({
                shape: getAxisLineShape(polar, radiusExtent, ticksAngles[i])
            }));
        }

        // Simple optimization
        // Batching the lines if color are the same
        for (var i = 0; i < splitLines.length; i++) {
            this.group.add(graphic.mergePath(splitLines[i], {
                style: zrUtil.defaults({
                    stroke: lineColors[i % lineColors.length]
                }, lineStyleModel.getLineStyle()),
                silent: true,
                z: angleAxisModel.get('z')
            }));
        }
    },

    /**
     * @private
     */
    _splitArea: function (angleAxisModel, polar, ticksAngles, radiusExtent) {

        var splitAreaModel = angleAxisModel.getModel('splitArea');
        var areaStyleModel = splitAreaModel.getModel('areaStyle');
        var areaColors = areaStyleModel.get('color');
        var lineCount = 0;

        areaColors = areaColors instanceof Array ? areaColors : [areaColors];

        var splitAreas = [];

        var RADIAN = Math.PI / 180;
        var prevAngle = -ticksAngles[0] * RADIAN;
        var r0 = Math.min(radiusExtent[0], radiusExtent[1]);
        var r1 = Math.max(radiusExtent[0], radiusExtent[1]);

        var clockwise = angleAxisModel.get('clockwise');

        for (var i = 1; i < ticksAngles.length; i++) {
            var colorIndex = (lineCount++) % areaColors.length;
            splitAreas[colorIndex] = splitAreas[colorIndex] || [];
            splitAreas[colorIndex].push(new graphic.Sector({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r0: r0,
                    r: r1,
                    startAngle: prevAngle,
                    endAngle: -ticksAngles[i] * RADIAN,
                    clockwise: clockwise
                },
                silent: true
            }));
            prevAngle = -ticksAngles[i] * RADIAN;
        }

        // Simple optimization
        // Batching the lines if color are the same
        for (var i = 0; i < splitAreas.length; i++) {
            this.group.add(graphic.mergePath(splitAreas[i], {
                style: zrUtil.defaults({
                    fill: areaColors[i % areaColors.length]
                }, areaStyleModel.getAreaStyle()),
                silent: true
            }));
        }
    }
});