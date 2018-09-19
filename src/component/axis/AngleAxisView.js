/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

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

// Remove the last tick which will overlap the first tick
function fixAngleOverlap(list) {
    var firstItem = list[0];
    var lastItem = list[list.length - 1];
    if (firstItem
        && lastItem
        && Math.abs(Math.abs(firstItem.coord - lastItem.coord) - 360) < 1e-4
    ) {
        list.pop();
    }
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
        var labels = zrUtil.map(angleAxis.getViewLabels(), function (labelItem) {
            var labelItem = zrUtil.clone(labelItem);
            labelItem.coord = angleAxis.dataToCoord(labelItem.tickValue);
            return labelItem;
        });

        fixAngleOverlap(labels);
        fixAngleOverlap(ticksAngles);

        zrUtil.each(elementList, function (name) {
            if (angleAxisModel.get(name + '.show')
                && (!angleAxis.scale.isBlank() || name === 'axisLine')
            ) {
                this['_' + name](angleAxisModel, polar, ticksAngles, radiusExtent, labels);
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

        var lines = zrUtil.map(ticksAngles, function (tickAngleItem) {
            return new graphic.Line({
                shape: getAxisLineShape(polar, [radius, radius + tickLen], tickAngleItem.coord)
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
    _axisLabel: function (angleAxisModel, polar, ticksAngles, radiusExtent, labels) {
        var rawCategoryData = angleAxisModel.getCategories(true);

        var commonLabelModel = angleAxisModel.getModel('axisLabel');

        var labelMargin = commonLabelModel.get('margin');

        // Use length of ticksAngles because it may remove the last tick to avoid overlapping
        zrUtil.each(labels, function (labelItem, idx) {
            var labelModel = commonLabelModel;
            var tickValue = labelItem.tickValue;

            var r = radiusExtent[getRadiusIdx(polar)];
            var p = polar.coordToPoint([r + labelMargin, labelItem.coord]);
            var cx = polar.cx;
            var cy = polar.cy;

            var labelTextAlign = Math.abs(p[0] - cx) / r < 0.3
                ? 'center' : (p[0] > cx ? 'left' : 'right');
            var labelTextVerticalAlign = Math.abs(p[1] - cy) / r < 0.3
                ? 'middle' : (p[1] > cy ? 'top' : 'bottom');

            if (rawCategoryData && rawCategoryData[tickValue] && rawCategoryData[tickValue].textStyle) {
                labelModel = new Model(
                    rawCategoryData[tickValue].textStyle, commonLabelModel, commonLabelModel.ecModel
                );
            }

            var textEl = new graphic.Text({silent: true});
            this.group.add(textEl);
            graphic.setTextStyle(textEl.style, labelModel, {
                x: p[0],
                y: p[1],
                textFill: labelModel.getTextColor() || angleAxisModel.get('axisLine.lineStyle.color'),
                text: labelItem.formattedLabel,
                textAlign: labelTextAlign,
                textVerticalAlign: labelTextVerticalAlign
            });
        }, this);
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
                shape: getAxisLineShape(polar, radiusExtent, ticksAngles[i].coord)
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
        if (!ticksAngles.length) {
            return;
        }

        var splitAreaModel = angleAxisModel.getModel('splitArea');
        var areaStyleModel = splitAreaModel.getModel('areaStyle');
        var areaColors = areaStyleModel.get('color');
        var lineCount = 0;

        areaColors = areaColors instanceof Array ? areaColors : [areaColors];

        var splitAreas = [];

        var RADIAN = Math.PI / 180;
        var prevAngle = -ticksAngles[0].coord * RADIAN;
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
                    endAngle: -ticksAngles[i].coord * RADIAN,
                    clockwise: clockwise
                },
                silent: true
            }));
            prevAngle = -ticksAngles[i].coord * RADIAN;
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