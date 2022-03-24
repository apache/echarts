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
import { RadiusAxisModel } from '../../coord/polar/AxisModel';
import Polar from '../../coord/polar/Polar';
import RadiusAxis from '../../coord/polar/RadiusAxis';
import GlobalModel from '../../model/Global';

const axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
] as const;
const selfBuilderAttrs = [
    'splitLine', 'splitArea', 'minorSplitLine'
] as const;

type TickCoord = ReturnType<RadiusAxis['getTicksCoords']>[number];

class RadiusAxisView extends AxisView {

    static readonly type = 'radiusAxis';
    readonly type = RadiusAxisView.type;

    axisPointerClass = 'PolarAxisPointer';

    private _axisGroup: graphic.Group;

    render(radiusAxisModel: RadiusAxisModel, ecModel: GlobalModel) {
        this.group.removeAll();
        if (!radiusAxisModel.get('show')) {
            return;
        }

        const oldAxisGroup = this._axisGroup;
        const newAxisGroup = this._axisGroup = new graphic.Group();
        this.group.add(newAxisGroup);

        const radiusAxis = radiusAxisModel.axis;
        const polar = radiusAxis.polar;
        const angleAxis = polar.getAngleAxis();
        const ticksCoords = radiusAxis.getTicksCoords();
        const minorTicksCoords = radiusAxis.getMinorTicksCoords();
        const axisAngle = angleAxis.getExtent()[0];
        const radiusExtent = radiusAxis.getExtent();

        const layout = layoutAxis(polar, radiusAxisModel, axisAngle);
        const axisBuilder = new AxisBuilder(radiusAxisModel, layout);
        zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);
        newAxisGroup.add(axisBuilder.getGroup());

        graphic.groupTransition(oldAxisGroup, newAxisGroup, radiusAxisModel);

        zrUtil.each(selfBuilderAttrs, function (name) {
            if (radiusAxisModel.get([name, 'show']) && !radiusAxis.scale.isBlank()) {
                axisElementBuilders[name](
                    this.group,
                    radiusAxisModel,
                    polar,
                    axisAngle,
                    radiusExtent,
                    ticksCoords,
                    minorTicksCoords
                );
            }
        }, this);
    }
}

interface AxisElementBuilder {
    (
        group: graphic.Group,
        axisModel: RadiusAxisModel,
        polar: Polar,
        axisAngle: number,
        radiusExtent: number[],
        ticksCoords: TickCoord[],
        minorTicksCoords?: TickCoord[][]
    ): void
}

const axisElementBuilders: Record<typeof selfBuilderAttrs[number], AxisElementBuilder> = {

    splitLine(group, radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords) {
        const splitLineModel = radiusAxisModel.getModel('splitLine');
        const lineStyleModel = splitLineModel.getModel('lineStyle');
        let lineColors = lineStyleModel.get('color');
        let lineCount = 0;

        lineColors = lineColors instanceof Array ? lineColors : [lineColors];

        const splitLines: graphic.Circle[][] = [];

        for (let i = 0; i < ticksCoords.length; i++) {
            const colorIndex = (lineCount++) % lineColors.length;
            splitLines[colorIndex] = splitLines[colorIndex] || [];
            splitLines[colorIndex].push(new graphic.Circle({
                shape: {
                    cx: polar.cx,
                    cy: polar.cy,
                    // ensure circle radius >= 0
                    r: Math.max(ticksCoords[i].coord, 0)
                }
            }));
        }

        // Simple optimization
        // Batching the lines if color are the same
        for (let i = 0; i < splitLines.length; i++) {
            group.add(graphic.mergePath(splitLines[i], {
                style: zrUtil.defaults({
                    stroke: lineColors[i % lineColors.length],
                    fill: null
                }, lineStyleModel.getLineStyle()),
                silent: true
            }));
        }
    },

    minorSplitLine(group, radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords, minorTicksCoords) {
        if (!minorTicksCoords.length) {
            return;
        }

        const minorSplitLineModel = radiusAxisModel.getModel('minorSplitLine');
        const lineStyleModel = minorSplitLineModel.getModel('lineStyle');

        const lines: graphic.Circle[] = [];

        for (let i = 0; i < minorTicksCoords.length; i++) {
            for (let k = 0; k < minorTicksCoords[i].length; k++) {
                lines.push(new graphic.Circle({
                    shape: {
                        cx: polar.cx,
                        cy: polar.cy,
                        r: minorTicksCoords[i][k].coord
                    }
                }));
            }
        }

        group.add(graphic.mergePath(lines, {
            style: zrUtil.defaults({
                fill: null
            }, lineStyleModel.getLineStyle()),
            silent: true
        }));
    },

    splitArea(group, radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords) {
        if (!ticksCoords.length) {
            return;
        }

        const splitAreaModel = radiusAxisModel.getModel('splitArea');
        const areaStyleModel = splitAreaModel.getModel('areaStyle');
        let areaColors = areaStyleModel.get('color');
        let lineCount = 0;

        areaColors = areaColors instanceof Array ? areaColors : [areaColors];

        const splitAreas: graphic.Sector[][] = [];

        let prevRadius = ticksCoords[0].coord;
        for (let i = 1; i < ticksCoords.length; i++) {
            const colorIndex = (lineCount++) % areaColors.length;
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

/**
 * @inner
 */
function layoutAxis(polar: Polar, radiusAxisModel: RadiusAxisModel, axisAngle: number) {
    return {
        position: [polar.cx, polar.cy],
        rotation: axisAngle / 180 * Math.PI,
        labelDirection: -1 as const,
        tickDirection: -1 as const,
        nameDirection: 1 as const,
        labelRotate: radiusAxisModel.getModel('axisLabel').get('rotate'),
        // Over splitLine and splitArea
        z2: 1
    };
}

export default RadiusAxisView;
