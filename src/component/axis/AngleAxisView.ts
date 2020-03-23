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
import AxisBuilder from './AxisBuilder';
import { AngleAxisModel } from '../../coord/polar/AxisModel';
import GlobalModel from '../../model/Global';
import Polar from '../../coord/polar/Polar';
import ComponentView from '../../view/Component';
import AngleAxis from '../../coord/polar/AngleAxis';
import { ZRTextAlign, ZRTextVerticalAlign, ColorString } from '../../util/types';

const elementList = [
    'axisLine',
    'axisLabel',
    'axisTick',
    'minorTick',
    'splitLine',
    'minorSplitLine',
    'splitArea'
] as const;

function getAxisLineShape(polar: Polar, rExtent: number[], angle: number) {
    rExtent[1] > rExtent[0] && (rExtent = rExtent.slice().reverse());
    let start = polar.coordToPoint([rExtent[0], angle]);
    let end = polar.coordToPoint([rExtent[1], angle]);

    return {
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1]
    };
}

function getRadiusIdx(polar: Polar) {
    let radiusAxis = polar.getRadiusAxis();
    return radiusAxis.inverse ? 0 : 1;
}

// Remove the last tick which will overlap the first tick
function fixAngleOverlap(list: TickCoord[]) {
    let firstItem = list[0];
    let lastItem = list[list.length - 1];
    if (firstItem
        && lastItem
        && Math.abs(Math.abs(firstItem.coord - lastItem.coord) - 360) < 1e-4
    ) {
        list.pop();
    }
}

type TickCoord = ReturnType<AngleAxis['getTicksCoords']>[number];
type TickLabel = ReturnType<AngleAxis['getViewLabels']>[number] & {
    coord: number
};

class AngleAxisView extends AxisView {

    static readonly type = 'angleAxis';
    readonly type = AngleAxisView.type;

    axisPointerClass = 'PolarAxisPointer';

    render(angleAxisModel: AngleAxisModel, ecModel: GlobalModel) {
        this.group.removeAll();
        if (!angleAxisModel.get('show')) {
            return;
        }

        let angleAxis = angleAxisModel.axis;
        let polar = angleAxis.polar;
        let radiusExtent = polar.getRadiusAxis().getExtent();

        let ticksAngles = angleAxis.getTicksCoords();
        let minorTickAngles = angleAxis.getMinorTicksCoords();

        let labels = zrUtil.map(angleAxis.getViewLabels(), function (labelItem: TickLabel) {
            labelItem = zrUtil.clone(labelItem);
            labelItem.coord = angleAxis.dataToCoord(labelItem.tickValue);
            return labelItem;
        });

        fixAngleOverlap(labels);
        fixAngleOverlap(ticksAngles);

        zrUtil.each(elementList, function (name) {
            if (angleAxisModel.get([name, 'show'])
                && (!angleAxis.scale.isBlank() || name === 'axisLine')
            ) {
                angelAxisElementsBuilders[name](
                    this.group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent, labels
                );
            }
        }, this);
    }

}

interface AngleAxisElementBuilder {
    (
        group: graphic.Group,
        angleAxisModel: AngleAxisModel,
        polar: Polar,
        ticksAngles: TickCoord[],
        minorTickAngles: TickCoord[][],
        radiusExtent: number[],
        labels?: TickLabel[]
    ): void
}

const angelAxisElementsBuilders: Record<typeof elementList[number], AngleAxisElementBuilder> = {

    axisLine(group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent) {
        let lineStyleModel = angleAxisModel.getModel(['axisLine', 'lineStyle']);

        // extent id of the axis radius (r0 and r)
        let rId = getRadiusIdx(polar);
        let r0Id = rId ? 0 : 1;

        let shape;
        if (radiusExtent[r0Id] === 0) {
            shape = new graphic.Circle({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r: radiusExtent[rId]
                },
                style: lineStyleModel.getLineStyle(),
                z2: 1,
                silent: true
            });
        }
        else {
            shape = new graphic.Ring({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    r: radiusExtent[rId],
                    r0: radiusExtent[r0Id]
                },
                style: lineStyleModel.getLineStyle(),
                z2: 1,
                silent: true
            });
        }
        shape.style.fill = null;
        group.add(shape);
    },

    axisTick(group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent) {
        let tickModel = angleAxisModel.getModel('axisTick');

        let tickLen = (tickModel.get('inside') ? -1 : 1) * tickModel.get('length');
        let radius = radiusExtent[getRadiusIdx(polar)];

        let lines = zrUtil.map(ticksAngles, function (tickAngleItem) {
            return new graphic.Line({
                shape: getAxisLineShape(polar, [radius, radius + tickLen], tickAngleItem.coord)
            });
        });
        group.add(graphic.mergePath(
            lines, {
                style: zrUtil.defaults(
                    tickModel.getModel('lineStyle').getLineStyle(),
                    {
                        stroke: angleAxisModel.get(['axisLine', 'lineStyle', 'color'])
                    }
                )
            }
        ));
    },

    minorTick(group, angleAxisModel, polar, tickAngles, minorTickAngles, radiusExtent) {
        if (!minorTickAngles.length) {
            return;
        }

        let tickModel = angleAxisModel.getModel('axisTick');
        let minorTickModel = angleAxisModel.getModel('minorTick');

        let tickLen = (tickModel.get('inside') ? -1 : 1) * minorTickModel.get('length');
        let radius = radiusExtent[getRadiusIdx(polar)];

        let lines = [];

        for (let i = 0; i < minorTickAngles.length; i++) {
            for (let k = 0; k < minorTickAngles[i].length; k++) {
                lines.push(new graphic.Line({
                    shape: getAxisLineShape(polar, [radius, radius + tickLen], minorTickAngles[i][k].coord)
                }));
            }
        }

        group.add(graphic.mergePath(
            lines, {
                style: zrUtil.defaults(
                    minorTickModel.getModel('lineStyle').getLineStyle(),
                    zrUtil.defaults(
                        tickModel.getLineStyle(), {
                            stroke: angleAxisModel.get(['axisLine', 'lineStyle', 'color'])
                        }
                    )
                )
            }
        ));
    },

    axisLabel(group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent, labels) {
        let rawCategoryData = angleAxisModel.getCategories(true);

        let commonLabelModel = angleAxisModel.getModel('axisLabel');

        let labelMargin = commonLabelModel.get('margin');
        let triggerEvent = angleAxisModel.get('triggerEvent');

        // Use length of ticksAngles because it may remove the last tick to avoid overlapping
        zrUtil.each(labels, function (labelItem, idx) {
            let labelModel = commonLabelModel;
            let tickValue = labelItem.tickValue;

            let r = radiusExtent[getRadiusIdx(polar)];
            let p = polar.coordToPoint([r + labelMargin, labelItem.coord]);
            let cx = polar.cx;
            let cy = polar.cy;

            let labelTextAlign: ZRTextAlign = Math.abs(p[0] - cx) / r < 0.3
                ? 'center' : (p[0] > cx ? 'left' : 'right');
            let labelTextVerticalAlign: ZRTextVerticalAlign = Math.abs(p[1] - cy) / r < 0.3
                ? 'middle' : (p[1] > cy ? 'top' : 'bottom');

            if (rawCategoryData && rawCategoryData[tickValue]) {
                const rawCategoryItem = rawCategoryData[tickValue];
                if (zrUtil.isObject(rawCategoryItem) && rawCategoryItem.textStyle) {
                    labelModel = new Model(
                        rawCategoryItem.textStyle, commonLabelModel, commonLabelModel.ecModel
                    );
                    }
            }

            let textEl = new graphic.Text({
                silent: AxisBuilder.isLabelSilent(angleAxisModel)
            });
            group.add(textEl);
            graphic.setTextStyle(textEl.style, null, labelModel, {
                x: p[0],
                y: p[1],
                fill: labelModel.getTextColor()
                    || angleAxisModel.get(['axisLine', 'lineStyle', 'color']) as ColorString,
                text: labelItem.formattedLabel,
                align: labelTextAlign,
                verticalAlign: labelTextVerticalAlign
            });

            // Pack data for mouse event
            if (triggerEvent) {
                const eventData = AxisBuilder.makeAxisEventDataBase(angleAxisModel);
                eventData.targetType = 'axisLabel';
                eventData.value = labelItem.rawLabel;
                graphic.getECData(textEl).eventData = eventData;
            }

        }, this);
    },

    splitLine(group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent) {
        let splitLineModel = angleAxisModel.getModel('splitLine');
        let lineStyleModel = splitLineModel.getModel('lineStyle');
        let lineColors = lineStyleModel.get('color');
        let lineCount = 0;

        lineColors = lineColors instanceof Array ? lineColors : [lineColors];

        let splitLines: graphic.Line[][] = [];

        for (let i = 0; i < ticksAngles.length; i++) {
            let colorIndex = (lineCount++) % lineColors.length;
            splitLines[colorIndex] = splitLines[colorIndex] || [];
            splitLines[colorIndex].push(new graphic.Line({
                shape: getAxisLineShape(polar, radiusExtent, ticksAngles[i].coord)
            }));
        }

        // Simple optimization
        // Batching the lines if color are the same
        for (let i = 0; i < splitLines.length; i++) {
            group.add(graphic.mergePath(splitLines[i], {
                style: zrUtil.defaults({
                    stroke: lineColors[i % lineColors.length]
                }, lineStyleModel.getLineStyle()),
                silent: true,
                z: angleAxisModel.get('z')
            }));
        }
    },

    minorSplitLine(group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent) {
        if (!minorTickAngles.length) {
            return;
        }

        let minorSplitLineModel = angleAxisModel.getModel('minorSplitLine');
        let lineStyleModel = minorSplitLineModel.getModel('lineStyle');

        let lines = [];

        for (let i = 0; i < minorTickAngles.length; i++) {
            for (let k = 0; k < minorTickAngles[i].length; k++) {
                lines.push(new graphic.Line({
                    shape: getAxisLineShape(polar, radiusExtent, minorTickAngles[i][k].coord)
                }));
            }
        }

        group.add(graphic.mergePath(lines, {
            style: lineStyleModel.getLineStyle(),
            silent: true,
            z: angleAxisModel.get('z')
        }));
    },

    splitArea(group, angleAxisModel, polar, ticksAngles, minorTickAngles, radiusExtent) {
        if (!ticksAngles.length) {
            return;
        }

        let splitAreaModel = angleAxisModel.getModel('splitArea');
        let areaStyleModel = splitAreaModel.getModel('areaStyle');
        let areaColors = areaStyleModel.get('color');
        let lineCount = 0;

        areaColors = areaColors instanceof Array ? areaColors : [areaColors];

        let splitAreas: graphic.Sector[][] = [];

        let RADIAN = Math.PI / 180;
        let prevAngle = -ticksAngles[0].coord * RADIAN;
        let r0 = Math.min(radiusExtent[0], radiusExtent[1]);
        let r1 = Math.max(radiusExtent[0], radiusExtent[1]);

        let clockwise = angleAxisModel.get('clockwise');

        for (let i = 1; i < ticksAngles.length; i++) {
            let colorIndex = (lineCount++) % areaColors.length;
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
        for (let i = 0; i < splitAreas.length; i++) {
            group.add(graphic.mergePath(splitAreas[i], {
                style: zrUtil.defaults({
                    fill: areaColors[i % areaColors.length]
                }, areaStyleModel.getAreaStyle()),
                silent: true
            }));
        }
    }
};


ComponentView.registerClass(AngleAxisView);
