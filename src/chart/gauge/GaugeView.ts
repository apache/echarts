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

import PointerPath from './PointerPath';
import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';
import {parsePercent, round, linearMap} from '../../util/number';
import GaugeSeriesModel, { GaugeDataItemOption } from './GaugeSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { ColorString } from '../../util/types';
import List from '../../data/List';

interface PosInfo {
    cx: number
    cy: number
    r: number
}

function parsePosition(seriesModel: GaugeSeriesModel, api: ExtensionAPI): PosInfo {
    let center = seriesModel.get('center');
    let width = api.getWidth();
    let height = api.getHeight();
    let size = Math.min(width, height);
    let cx = parsePercent(center[0], api.getWidth());
    let cy = parsePercent(center[1], api.getHeight());
    let r = parsePercent(seriesModel.get('radius'), size / 2);

    return {
        cx: cx,
        cy: cy,
        r: r
    };
}

function formatLabel(value: number, labelFormatter: string | ((value: number) => string)): string {
    let label = value == null ? '' : (value + '');
    if (labelFormatter) {
        if (typeof labelFormatter === 'string') {
            label = labelFormatter.replace('{value}', label);
        }
        else if (typeof labelFormatter === 'function') {
            label = labelFormatter(value);
        }
    }

    return label;
}

const PI2 = Math.PI * 2;

class GaugeView extends ChartView {
    static type = 'gauge' as const;
    type = GaugeView.type;

    private _data: List;

    render(seriesModel: GaugeSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {

        this.group.removeAll();

        let colorList = seriesModel.get(['axisLine', 'lineStyle', 'color']);
        let posInfo = parsePosition(seriesModel, api);

        this._renderMain(
            seriesModel, ecModel, api, colorList, posInfo
        );
    }

    dispose() {}

    _renderMain(
        seriesModel: GaugeSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        colorList: [number, ColorString][],
        posInfo: PosInfo
    ) {
        let group = this.group;

        let axisLineModel = seriesModel.getModel('axisLine');
        let lineStyleModel = axisLineModel.getModel('lineStyle');

        let clockwise = seriesModel.get('clockwise');
        let startAngle = -seriesModel.get('startAngle') / 180 * Math.PI;
        let endAngle = -seriesModel.get('endAngle') / 180 * Math.PI;

        let angleRangeSpan = (endAngle - startAngle) % PI2;

        let prevEndAngle = startAngle;
        let axisLineWidth = lineStyleModel.get('width');
        let showAxis = axisLineModel.get('show');

        for (let i = 0; showAxis && i < colorList.length; i++) {
            // Clamp
            let percent = Math.min(Math.max(colorList[i][0], 0), 1);
            endAngle = startAngle + angleRangeSpan * percent;
            let sector = new graphic.Sector({
                shape: {
                    startAngle: prevEndAngle,
                    endAngle: endAngle,
                    cx: posInfo.cx,
                    cy: posInfo.cy,
                    clockwise: clockwise,
                    r0: posInfo.r - axisLineWidth,
                    r: posInfo.r
                },
                silent: true
            });

            sector.setStyle({
                fill: colorList[i][1]
            });

            sector.setStyle(lineStyleModel.getLineStyle(
                // Because we use sector to simulate arc
                // so the properties for stroking are useless
                ['color', 'width']
            ));

            group.add(sector);

            prevEndAngle = endAngle;
        }

        let getColor = function (percent: number) {
            // Less than 0
            if (percent <= 0) {
                return colorList[0][1];
            }
            let i;
            for (i = 0; i < colorList.length; i++) {
                if (colorList[i][0] >= percent
                    && (i === 0 ? 0 : colorList[i - 1][0]) < percent
                ) {
                    return colorList[i][1];
                }
            }
            // More than 1
            return colorList[i - 1][1];
        };

        if (!clockwise) {
            let tmp = startAngle;
            startAngle = endAngle;
            endAngle = tmp;
        }

        this._renderTicks(
            seriesModel, ecModel, api, getColor, posInfo,
            startAngle, endAngle, clockwise
        );

        this._renderPointer(
            seriesModel, ecModel, api, getColor, posInfo,
            startAngle, endAngle, clockwise
        );

        this._renderTitle(
            seriesModel, ecModel, api, getColor, posInfo
        );
        this._renderDetail(
            seriesModel, ecModel, api, getColor, posInfo
        );
    }

    _renderTicks(
        seriesModel: GaugeSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        getColor: (percent: number) => ColorString,
        posInfo: PosInfo,
        startAngle: number,
        endAngle: number,
        clockwise: boolean
    ) {
        let group = this.group;
        let cx = posInfo.cx;
        let cy = posInfo.cy;
        let r = posInfo.r;

        let minVal = +seriesModel.get('min');
        let maxVal = +seriesModel.get('max');

        let splitLineModel = seriesModel.getModel('splitLine');
        let tickModel = seriesModel.getModel('axisTick');
        let labelModel = seriesModel.getModel('axisLabel');

        let splitNumber = seriesModel.get('splitNumber');
        let subSplitNumber = tickModel.get('splitNumber');

        let splitLineLen = parsePercent(
            splitLineModel.get('length'), r
        );
        let tickLen = parsePercent(
            tickModel.get('length'), r
        );

        let angle = startAngle;
        let step = (endAngle - startAngle) / splitNumber;
        let subStep = step / subSplitNumber;

        let splitLineStyle = splitLineModel.getModel('lineStyle').getLineStyle();
        let tickLineStyle = tickModel.getModel('lineStyle').getLineStyle();

        let unitX;
        let unitY;

        for (let i = 0; i <= splitNumber; i++) {
            unitX = Math.cos(angle);
            unitY = Math.sin(angle);
            // Split line
            if (splitLineModel.get('show')) {
                let splitLine = new graphic.Line({
                    shape: {
                        x1: unitX * r + cx,
                        y1: unitY * r + cy,
                        x2: unitX * (r - splitLineLen) + cx,
                        y2: unitY * (r - splitLineLen) + cy
                    },
                    style: splitLineStyle,
                    silent: true
                });
                if (splitLineStyle.stroke === 'auto') {
                    splitLine.setStyle({
                        stroke: getColor(i / splitNumber)
                    });
                }

                group.add(splitLine);
            }

            // Label
            if (labelModel.get('show')) {
                let label = formatLabel(
                    round(i / splitNumber * (maxVal - minVal) + minVal),
                    labelModel.get('formatter')
                );
                let distance = labelModel.get('distance');
                let autoColor = getColor(i / splitNumber);

                group.add(new graphic.Text({
                    style: graphic.createTextStyle(labelModel, {
                        text: label,
                        x: unitX * (r - splitLineLen - distance) + cx,
                        y: unitY * (r - splitLineLen - distance) + cy,
                        verticalAlign: unitY < -0.4 ? 'top' : (unitY > 0.4 ? 'bottom' : 'middle'),
                        align: unitX < -0.4 ? 'left' : (unitX > 0.4 ? 'right' : 'center')
                    }, {autoColor: autoColor}),
                    silent: true
                }));
            }

            // Axis tick
            if (tickModel.get('show') && i !== splitNumber) {
                for (let j = 0; j <= subSplitNumber; j++) {
                    unitX = Math.cos(angle);
                    unitY = Math.sin(angle);
                    let tickLine = new graphic.Line({
                        shape: {
                            x1: unitX * r + cx,
                            y1: unitY * r + cy,
                            x2: unitX * (r - tickLen) + cx,
                            y2: unitY * (r - tickLen) + cy
                        },
                        silent: true,
                        style: tickLineStyle
                    });

                    if (tickLineStyle.stroke === 'auto') {
                        tickLine.setStyle({
                            stroke: getColor((i + j / subSplitNumber) / splitNumber)
                        });
                    }

                    group.add(tickLine);
                    angle += subStep;
                }
                angle -= subStep;
            }
            else {
                angle += step;
            }
        }
    }

    _renderPointer(
        seriesModel: GaugeSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        getColor: (percent: number) => ColorString,
        posInfo: PosInfo,
        startAngle: number,
        endAngle: number,
        clockwise: boolean
    ) {

        let group = this.group;
        let oldData = this._data;

        if (!seriesModel.get(['pointer', 'show'])) {
            // Remove old element
            oldData && oldData.eachItemGraphicEl(function (el) {
                group.remove(el);
            });
            return;
        }

        let valueExtent = [+seriesModel.get('min'), +seriesModel.get('max')];
        let angleExtent = [startAngle, endAngle];

        let data = seriesModel.getData();
        let valueDim = data.mapDimension('value');

        data.diff(oldData)
            .add(function (idx) {
                let pointer = new PointerPath({
                    shape: {
                        angle: startAngle
                    }
                });

                graphic.initProps(pointer, {
                    shape: {
                        angle: linearMap(data.get(valueDim, idx) as number, valueExtent, angleExtent, true)
                    }
                }, seriesModel);

                group.add(pointer);
                data.setItemGraphicEl(idx, pointer);
            })
            .update(function (newIdx, oldIdx) {
                let pointer = oldData.getItemGraphicEl(oldIdx) as PointerPath;

                graphic.updateProps(pointer, {
                    shape: {
                        angle: linearMap(data.get(valueDim, newIdx) as number, valueExtent, angleExtent, true)
                    }
                }, seriesModel);

                group.add(pointer);
                data.setItemGraphicEl(newIdx, pointer);
            })
            .remove(function (idx) {
                let pointer = oldData.getItemGraphicEl(idx);
                group.remove(pointer);
            })
            .execute();

        data.eachItemGraphicEl(function (pointer: PointerPath, idx) {
            let itemModel = data.getItemModel<GaugeDataItemOption>(idx);
            let pointerModel = itemModel.getModel('pointer');

            pointer.setShape({
                x: posInfo.cx,
                y: posInfo.cy,
                width: parsePercent(
                    pointerModel.get('width'), posInfo.r
                ),
                r: parsePercent(pointerModel.get('length'), posInfo.r)
            });

            pointer.useStyle(itemModel.getModel('itemStyle').getItemStyle());

            if (pointer.style.fill === 'auto') {
                pointer.setStyle('fill', getColor(
                    linearMap(data.get(valueDim, idx) as number, valueExtent, [0, 1], true)
                ));
            }

            graphic.enableHoverEmphasis(
                pointer, itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle()
            );
        });

        this._data = data;
    }

    _renderTitle(
        seriesModel: GaugeSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        getColor: (percent: number) => ColorString,
        posInfo: PosInfo
    ) {
        let data = seriesModel.getData();
        let valueDim = data.mapDimension('value');
        let titleModel = seriesModel.getModel('title');
        if (titleModel.get('show')) {
            let offsetCenter = titleModel.get('offsetCenter');
            let x = posInfo.cx + parsePercent(offsetCenter[0], posInfo.r);
            let y = posInfo.cy + parsePercent(offsetCenter[1], posInfo.r);

            let minVal = +seriesModel.get('min');
            let maxVal = +seriesModel.get('max');
            let value = seriesModel.getData().get(valueDim, 0) as number;
            let autoColor = getColor(
                linearMap(value, [minVal, maxVal], [0, 1], true)
            );

            this.group.add(new graphic.Text({
                silent: true,
                style: graphic.createTextStyle(titleModel, {
                    x: x,
                    y: y,
                    // FIXME First data name ?
                    text: data.getName(0),
                    align: 'center',
                    verticalAlign: 'middle'
                }, {autoColor: autoColor, forceRich: true})
            }));
        }
    }

    _renderDetail(
        seriesModel: GaugeSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        getColor: (percent: number) => ColorString,
        posInfo: PosInfo
    ) {
        let detailModel = seriesModel.getModel('detail');
        let minVal = +seriesModel.get('min');
        let maxVal = +seriesModel.get('max');
        if (detailModel.get('show')) {
            let offsetCenter = detailModel.get('offsetCenter');
            let x = posInfo.cx + parsePercent(offsetCenter[0], posInfo.r);
            let y = posInfo.cy + parsePercent(offsetCenter[1], posInfo.r);
            let width = parsePercent(detailModel.get('width'), posInfo.r);
            let height = parsePercent(detailModel.get('height'), posInfo.r);
            let data = seriesModel.getData();
            let value = data.get(data.mapDimension('value'), 0) as number;
            let autoColor = getColor(
                linearMap(value, [minVal, maxVal], [0, 1], true)
            );

            this.group.add(new graphic.Text({
                silent: true,
                style: graphic.createTextStyle(detailModel, {
                    x: x,
                    y: y,
                    text: formatLabel(
                        // FIXME First data name ?
                        value, detailModel.get('formatter')
                    ),
                    width: isNaN(width) ? null : width,
                    height: isNaN(height) ? null : height,
                    align: 'center',
                    verticalAlign: 'middle'
                }, {autoColor: autoColor, forceRich: true})
            }));
        }
    }
}

ChartView.registerClass(GaugeView);

export default GaugeView;
