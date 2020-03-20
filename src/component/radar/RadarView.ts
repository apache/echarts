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

import {__DEV__} from '../../config';
import * as zrUtil from 'zrender/src/core/util';
import AxisBuilder from '../axis/AxisBuilder';
import * as graphic from '../../util/graphic';
import ComponentView from '../../view/Component';
import RadarModel from '../../coord/radar/RadarModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { ZRColor } from '../../util/types';

const axisBuilderAttrs = [
    'axisLine', 'axisTickLabel', 'axisName'
] as const;

class RadarView extends ComponentView {

    static type = 'radar';
    type = RadarView.type;

    render(radarModel: RadarModel, ecModel: GlobalModel, api: ExtensionAPI) {
        let group = this.group;
        group.removeAll();

        this._buildAxes(radarModel);
        this._buildSplitLineAndArea(radarModel);
    }

    _buildAxes(radarModel: RadarModel) {
        let radar = radarModel.coordinateSystem;
        let indicatorAxes = radar.getIndicatorAxes();
        let axisBuilders = zrUtil.map(indicatorAxes, function (indicatorAxis) {
            let axisBuilder = new AxisBuilder(indicatorAxis.model, {
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
        let radar = radarModel.coordinateSystem;
        let indicatorAxes = radar.getIndicatorAxes();
        if (!indicatorAxes.length) {
            return;
        }
        let shape = radarModel.get('shape');
        let splitLineModel = radarModel.getModel('splitLine');
        let splitAreaModel = radarModel.getModel('splitArea');
        let lineStyleModel = splitLineModel.getModel('lineStyle');
        let areaStyleModel = splitAreaModel.getModel('areaStyle');

        let showSplitLine = splitLineModel.get('show');
        let showSplitArea = splitAreaModel.get('show');
        let splitLineColors = lineStyleModel.get('color');
        let splitAreaColors = areaStyleModel.get('color');

        let splitLineColorsArr = zrUtil.isArray(splitLineColors) ? splitLineColors : [splitLineColors];
        let splitAreaColorsArr = zrUtil.isArray(splitAreaColors) ? splitAreaColors : [splitAreaColors];

        let splitLines: (graphic.Circle | graphic.Polyline)[][] = [];
        let splitAreas: (graphic.Ring | graphic.Polygon)[][] = [];

        function getColorIndex(
            areaOrLine: any[][],
            areaOrLineColorList: ZRColor[],
            idx: number
        ) {
            let colorIndex = idx % areaOrLineColorList.length;
            areaOrLine[colorIndex] = areaOrLine[colorIndex] || [];
            return colorIndex;
        }

        if (shape === 'circle') {
            let ticksRadius = indicatorAxes[0].getTicksCoords();
            let cx = radar.cx;
            let cy = radar.cy;
            for (let i = 0; i < ticksRadius.length; i++) {
                if (showSplitLine) {
                    let colorIndex = getColorIndex(splitLines, splitLineColorsArr, i);
                    splitLines[colorIndex].push(new graphic.Circle({
                        shape: {
                            cx: cx,
                            cy: cy,
                            r: ticksRadius[i].coord
                        }
                    }));
                }
                if (showSplitArea && i < ticksRadius.length - 1) {
                    let colorIndex = getColorIndex(splitAreas, splitAreaColorsArr, i);
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
            let axesTicksPoints = zrUtil.map(indicatorAxes, function (indicatorAxis, idx) {
                let ticksCoords = indicatorAxis.getTicksCoords();
                realSplitNumber = realSplitNumber == null
                    ? ticksCoords.length - 1
                    : Math.min(ticksCoords.length - 1, realSplitNumber);
                return zrUtil.map(ticksCoords, function (tickCoord) {
                    return radar.coordToPoint(tickCoord.coord, idx);
                });
            });

            let prevPoints: number[][] = [];
            for (let i = 0; i <= realSplitNumber; i++) {
                let points: number[][] = [];
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
                    let colorIndex = getColorIndex(splitLines, splitLineColorsArr, i);
                    splitLines[colorIndex].push(new graphic.Polyline({
                        shape: {
                            points: points
                        }
                    }));
                }
                if (showSplitArea && prevPoints) {
                    let colorIndex = getColorIndex(splitAreas, splitAreaColorsArr, i - 1);
                    splitAreas[colorIndex].push(new graphic.Polygon({
                        shape: {
                            points: points.concat(prevPoints)
                        }
                    }));
                }
                prevPoints = points.slice().reverse();
            }
        }

        let lineStyle = lineStyleModel.getLineStyle();
        let areaStyle = areaStyleModel.getAreaStyle();
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

ComponentView.registerClass(RadarView);