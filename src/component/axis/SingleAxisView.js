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
import AxisBuilder from './AxisBuilder';
import * as graphic from '../../util/graphic';
import * as singleAxisHelper from '../../coord/single/singleAxisHelper';
import AxisView from './AxisView';

var axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
];

var selfBuilderAttrs = ['splitArea', 'splitLine'];

var SingleAxisView = AxisView.extend({

    type: 'singleAxis',

    axisPointerClass: 'SingleAxisPointer',

    render: function (axisModel, ecModel, api, payload) {

        var group = this.group;

        group.removeAll();

        var oldAxisGroup = this._axisGroup;
        this._axisGroup = new graphic.Group();

        var layout = singleAxisHelper.layout(axisModel);

        var axisBuilder = new AxisBuilder(axisModel, layout);

        zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

        group.add(this._axisGroup);
        group.add(axisBuilder.getGroup());

        var gridModel = axisModel.getCoordSysModel();
        zrUtil.each(selfBuilderAttrs, function (name) {
            if (axisModel.get(name + '.show')) {
                this['_' + name](axisModel, gridModel);
            }
        }, this);

        graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);

        SingleAxisView.superCall(this, 'render', axisModel, ecModel, api, payload);
    },

    _splitLine: function (axisModel) {
        var axis = axisModel.axis;

        if (axis.scale.isBlank()) {
            return;
        }

        var splitLineModel = axisModel.getModel('splitLine');
        var lineStyleModel = splitLineModel.getModel('lineStyle');
        var lineWidth = lineStyleModel.get('width');
        var lineColors = lineStyleModel.get('color');

        lineColors = lineColors instanceof Array ? lineColors : [lineColors];

        var gridRect = axisModel.coordinateSystem.getRect();
        var isHorizontal = axis.isHorizontal();

        var splitLines = [];
        var lineCount = 0;

        var ticksCoords = axis.getTicksCoords({
            tickModel: splitLineModel
        });

        var p1 = [];
        var p2 = [];

        for (var i = 0; i < ticksCoords.length; ++i) {
            var tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);
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
            splitLines[colorIndex].push(new graphic.Line({
                subPixelOptimize: true,
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
            }));
        }

        for (var i = 0; i < splitLines.length; ++i) {
            this.group.add(graphic.mergePath(splitLines[i], {
                style: {
                    stroke: lineColors[i % lineColors.length],
                    lineDash: lineStyleModel.getLineDash(lineWidth),
                    lineWidth: lineWidth
                },
                silent: true
            }));
        }
    },

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @param {module:echarts/coord/cartesian/GridModel} gridModel
     * @private
     */
    _splitArea: function (axisModel, gridModel) {
        var axis = axisModel.axis;

        if (axis.scale.isBlank()) {
            return;
        }

        var splitAreaModel = axisModel.getModel('splitArea');
        var areaStyleModel = splitAreaModel.getModel('areaStyle');
        var areaColors = areaStyleModel.get('color');

        var gridRect = gridModel.coordinateSystem.getRect();

        var ticksCoords = axis.getTicksCoords({
            tickModel: splitAreaModel,
            clamp: true
        });

        if (!ticksCoords.length) {
            return;
        }

        // For Making appropriate splitArea animation, the color and anid
        // should be corresponding to previous one if possible.
        var areaColorsLen = areaColors.length;
        var lastSplitAreaColors = this._splitAreaColors;
        var newSplitAreaColors = zrUtil.createHashMap();
        var colorIndex = 0;
        if (lastSplitAreaColors) {
            for (var i = 0; i < ticksCoords.length; i++) {
                var cIndex = lastSplitAreaColors.get(ticksCoords[i].tickValue);
                if (cIndex != null) {
                    colorIndex = (cIndex + (areaColorsLen - 1) * i) % areaColorsLen;
                    break;
                }
            }
        }

        var prev = axis.toGlobalCoord(ticksCoords[0].coord);

        var areaStyle = areaStyleModel.getAreaStyle();
        areaColors = zrUtil.isArray(areaColors) ? areaColors : [areaColors];

        for (var i = 1; i < ticksCoords.length; i++) {
            var tickCoord = axis.toGlobalCoord(ticksCoords[i].coord);

            var x;
            var y;
            var width;
            var height;
            if (axis.isHorizontal()) {
                x = prev;
                y = gridRect.y;
                width = tickCoord - x;
                height = gridRect.height;
                prev = x + width;
            }
            else {
                x = gridRect.x;
                y = prev;
                width = gridRect.width;
                height = tickCoord - y;
                prev = y + height;
            }

            var tickValue = ticksCoords[i - 1].tickValue;
            tickValue != null && newSplitAreaColors.set(tickValue, colorIndex);

            this._axisGroup.add(new graphic.Rect({
                anid: tickValue != null ? 'area_' + tickValue : null,
                shape: {
                    x: x,
                    y: y,
                    width: width,
                    height: height
                },
                style: zrUtil.defaults({
                    fill: areaColors[colorIndex]
                }, areaStyle),
                silent: true
            }));

            colorIndex = (colorIndex + 1) % areaColorsLen;
        }

        this._splitAreaColors = newSplitAreaColors;
    }
});

export default SingleAxisView;
