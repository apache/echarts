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
import AxisBuilder from './AxisBuilder';
import AxisView from './AxisView';

var axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
];
var selfBuilderAttrs = [
    'splitLine', 'splitArea', 'minorSplitLine'
];

export default AxisView.extend({

    type: 'radiusAxis',

    axisPointerClass: 'PolarAxisPointer',

    render: function (radiusAxisModel, ecModel) {
        this.group.removeAll();
        if (!radiusAxisModel.get('show')) {
            return;
        }
        var radiusAxis = radiusAxisModel.axis;
        var polar = radiusAxis.polar;
        var angleAxis = polar.getAngleAxis();
        var ticksCoords = radiusAxis.getTicksCoords();
        var minorTicksCoords = radiusAxis.getMinorTicksCoords();
        var axisAngle = angleAxis.getExtent()[0];
        var radiusExtent = radiusAxis.getExtent();

        var layout = layoutAxis(polar, radiusAxisModel, axisAngle);
        var axisBuilder = new AxisBuilder(radiusAxisModel, layout);
        zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);
        this.group.add(axisBuilder.getGroup());

        zrUtil.each(selfBuilderAttrs, function (name) {
            if (radiusAxisModel.get(name + '.show') && !radiusAxis.scale.isBlank()) {
                this['_' + name](radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords, minorTicksCoords);
            }
        }, this);
    },

    /**
     * @private
     */
    _splitLine: function (radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords) {
        var splitLineModel = radiusAxisModel.getModel('splitLine');
        var lineStyleModel = splitLineModel.getModel('lineStyle');
        var lineColors = lineStyleModel.get('color');
        var lineCount = 0;

        lineColors = lineColors instanceof Array ? lineColors : [lineColors];

        var splitLines = [];

        for (var i = 0; i < ticksCoords.length; i++) {
            var colorIndex = (lineCount++) % lineColors.length;
            splitLines[colorIndex] = splitLines[colorIndex] || [];
            splitLines[colorIndex].push(new graphic.Circle({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r: ticksCoords[i].coord
                }
            }));
        }

        // Simple optimization
        // Batching the lines if color are the same
        for (var i = 0; i < splitLines.length; i++) {
            this.group.add(graphic.mergePath(splitLines[i], {
                style: zrUtil.defaults({
                    stroke: lineColors[i % lineColors.length],
                    fill: null
                }, lineStyleModel.getLineStyle()),
                silent: true
            }));
        }
    },

    /**
     * @private
     */
    _minorSplitLine: function (radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords, minorTicksCoords) {
        if (!minorTicksCoords.length) {
            return;
        }

        var minorSplitLineModel = radiusAxisModel.getModel('minorSplitLine');
        var lineStyleModel = minorSplitLineModel.getModel('lineStyle');

        var lines = [];

        for (var i = 0; i < minorTicksCoords.length; i++) {
            for (var k = 0; k < minorTicksCoords[i].length; k++) {
                lines.push(new graphic.Circle({
                    shape: {
                        cx: polar.cx,
                        cy: polar.cy,
                        r: minorTicksCoords[i][k].coord
                    }
                }));
            }
        }

        this.group.add(graphic.mergePath(lines, {
            style: zrUtil.defaults({
                fill: null
            }, lineStyleModel.getLineStyle()),
            silent: true
        }));
    },

    /**
     * @private
     */
    _splitArea: function (radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords) {
        if (!ticksCoords.length) {
            return;
        }

        var splitAreaModel = radiusAxisModel.getModel('splitArea');
        var areaStyleModel = splitAreaModel.getModel('areaStyle');
        var areaColors = areaStyleModel.get('color');
        var lineCount = 0;

        areaColors = areaColors instanceof Array ? areaColors : [areaColors];

        var splitAreas = [];

        var prevRadius = ticksCoords[0].coord;
        for (var i = 1; i < ticksCoords.length; i++) {
            var colorIndex = (lineCount++) % areaColors.length;
            splitAreas[colorIndex] = splitAreas[colorIndex] || [];
            splitAreas[colorIndex].push(new graphic.Sector({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r0: prevRadius,
                    r: ticksCoords[i].coord,
                    startAngle: 0,
                    endAngle: Math.PI * 2
                },
                silent: true
            }));
            prevRadius = ticksCoords[i].coord;
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

/**
 * @inner
 */
function layoutAxis(polar, radiusAxisModel, axisAngle) {
    return {
        position: [polar.cx, polar.cy],
        rotation: axisAngle / 180 * Math.PI,
        labelDirection: -1,
        tickDirection: -1,
        nameDirection: 1,
        labelRotate: radiusAxisModel.getModel('axisLabel').get('rotate'),
        // Over splitLine and splitArea
        z2: 1
    };
}