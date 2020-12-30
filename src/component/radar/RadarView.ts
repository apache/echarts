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
import AxisBuilder from '../axis/AxisBuilder';
import * as graphic from '../../util/graphic';
import ComponentView from '../../view/Component';
import RadarModel from '../../coord/radar/RadarModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { ZRColor } from '../../util/types';

const axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
] as const;

class RadarView extends ComponentView {

    static type = 'radar';
    type = RadarView.type;

    render(radarModel: RadarModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const group = this.group;
        group.removeAll();

        this._buildAxes(radarModel);
        this._buildSplitLineAndArea(radarModel);
    }

    _buildAxes(radarModel: RadarModel) {
        const radar = radarModel.coordinateSystem;
        const indicatorAxes = radar.getIndicatorAxes();
        const axisBuilders = zrUtil.map(indicatorAxes, function (indicatorAxis) {
            const axisBuilder = new AxisBuilder(indicatorAxis.model, {
                position: [radar.cx, radar.cy],
                rotation: indicatorAxis.angle,
                labelDirection: -1,
                tickDirection: -1,
                nameDirection: 1
            });
            return axisBuilder;
        });

        zrUtil.each(axisBuilders, function (axisBuilder) {
            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);
            this.group.add(axisBuilder.getGroup());
        }, this);
    }

    _buildSplitLineAndArea(radarModel: RadarModel) {
        const radar = radarModel.coordinateSystem;
        const indicatorAxes = radar.getIndicatorAxes();
        if (!indicatorAxes.length) {
            return;
        }
        const shape = radarModel.get('shape');
        const splitLineModel = radarModel.getModel('splitLine');
        const splitAreaModel = radarModel.getModel('splitArea');
        const lineStyleModel = splitLineModel.getModel('lineStyle');
        const areaStyleModel = splitAreaModel.getModel('areaStyle');

        const showSplitLine = splitLineModel.get('show');
        const showSplitArea = splitAreaModel.get('show');
        const splitLineColors = lineStyleModel.get('color');
        const splitAreaColors = areaStyleModel.get('color');

        const splitLineColorsArr = zrUtil.isArray(splitLineColors) ? splitLineColors : [splitLineColors];
        const splitAreaColorsArr = zrUtil.isArray(splitAreaColors) ? splitAreaColors : [splitAreaColors];

        const splitLines: (graphic.Circle | graphic.Polyline)[][] = [];
        const splitAreas: (graphic.Ring | graphic.Polygon)[][] = [];

        function getColorIndex(
            areaOrLine: any[][],
            areaOrLineColorList: ZRColor[],
            idx: number
        ) {
            const colorIndex = idx % areaOrLineColorList.length;
            areaOrLine[colorIndex] = areaOrLine[colorIndex] || [];
            return colorIndex;
        }

        if (shape === 'circle') {
            const ticksRadius = indicatorAxes[0].getTicksCoords();
            const cx = radar.cx;
            const cy = radar.cy;
            for (let i = 0; i < ticksRadius.length; i++) {
                if (showSplitLine) {
                    const colorIndex = getColorIndex(splitLines, splitLineColorsArr, i);
                    splitLines[colorIndex].push(new graphic.Circle({
                        shape: {
                            cx: cx,
                            cy: cy,
                            r: ticksRadius[i].coord
                        }
                    }));
                }
                if (showSplitArea && i < ticksRadius.length - 1) {
                    const colorIndex = getColorIndex(splitAreas, splitAreaColorsArr, i);
                    splitAreas[colorIndex].push(new graphic.Ring({
                        shape: {
                            cx: cx,
                            cy: cy,
                            r0: ticksRadius[i].coord,
                            r: ticksRadius[i + 1].coord
                        }
                    }));
                }
            }
        }
        // Polyyon
        else {
            let realSplitNumber: number;
            const axesTicksPoints = zrUtil.map(indicatorAxes, function (indicatorAxis, idx) {
                const ticksCoords = indicatorAxis.getTicksCoords();
                realSplitNumber = realSplitNumber == null
                    ? ticksCoords.length - 1
                    : Math.min(ticksCoords.length - 1, realSplitNumber);
                return zrUtil.map(ticksCoords, function (tickCoord) {
                    return radar.coordToPoint(tickCoord.coord, idx);
                });
            });

            let prevPoints: number[][] = [];
            for (let i = 0; i <= realSplitNumber; i++) {
                const points: number[][] = [];
                for (let j = 0; j < indicatorAxes.length; j++) {
                    points.push(axesTicksPoints[j][i]);
                }
                // Close
                if (points[0]) {
                    points.push(points[0].slice());
                }
                else {
                    if (__DEV__) {
                        console.error('Can\'t draw value axis ' + i);
                    }
                }

                if (showSplitLine) {
                    const colorIndex = getColorIndex(splitLines, splitLineColorsArr, i);
                    splitLines[colorIndex].push(new graphic.Polyline({
                        shape: {
                            points: points
                        }
                    }));
                }
                if (showSplitArea && prevPoints) {
                    const colorIndex = getColorIndex(splitAreas, splitAreaColorsArr, i - 1);
                    splitAreas[colorIndex].push(new graphic.Polygon({
                        shape: {
                            points: points.concat(prevPoints)
                        }
                    }));
                }
                prevPoints = points.slice().reverse();
            }
        }

        const lineStyle = lineStyleModel.getLineStyle();
        const areaStyle = areaStyleModel.getAreaStyle();
        // Add splitArea before splitLine
        zrUtil.each(splitAreas, function (splitAreas, idx) {
            this.group.add(graphic.mergePath(
                splitAreas, {
                    style: zrUtil.defaults({
                        stroke: 'none',
                        fill: splitAreaColorsArr[idx % splitAreaColorsArr.length]
                    }, areaStyle),
                    silent: true
                }
            ));
        }, this);

        zrUtil.each(splitLines, function (splitLines, idx) {
            this.group.add(graphic.mergePath(
                splitLines, {
                    style: zrUtil.defaults({
                        fill: 'none',
                        stroke: splitLineColorsArr[idx % splitLineColorsArr.length]
                    }, lineStyle),
                    silent: true
                }
            ));
        }, this);

    }
}

export default RadarView;