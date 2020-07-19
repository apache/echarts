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
import { setStatesStylesFromModel, enableHoverEmphasis } from '../../util/states';
import {createTextStyle} from '../../label/labelStyle';
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
    const center = seriesModel.get('center');
    const width = api.getWidth();
    const height = api.getHeight();
    const size = Math.min(width, height);
    const cx = parsePercent(center[0], api.getWidth());
    const cy = parsePercent(center[1], api.getHeight());
    const r = parsePercent(seriesModel.get('radius'), size / 2);

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

        const colorList = seriesModel.get(['axisLine', 'lineStyle', 'color']);
        const posInfo = parsePosition(seriesModel, api);

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
        const group = this.group;

        const axisLineModel = seriesModel.getModel('axisLine');
        const lineStyleModel = axisLineModel.getModel('lineStyle');

        const clockwise = seriesModel.get('clockwise');
        let startAngle = -seriesModel.get('startAngle') / 180 * Math.PI;
        let endAngle = -seriesModel.get('endAngle') / 180 * Math.PI;

        const angleRangeSpan = (endAngle - startAngle) % PI2;

        let prevEndAngle = startAngle;
        const axisLineWidth = lineStyleModel.get('width');
        const showAxis = axisLineModel.get('show');

        for (let i = 0; showAxis && i < colorList.length; i++) {
            // Clamp
            const percent = Math.min(Math.max(colorList[i][0], 0), 1);
            endAngle = startAngle + angleRangeSpan * percent;
            const sector = new graphic.Sector({
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

        const getColor = function (percent: number) {
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
            const tmp = startAngle;
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
        const group = this.group;
        const cx = posInfo.cx;
        const cy = posInfo.cy;
        const r = posInfo.r;

        const minVal = +seriesModel.get('min');
        const maxVal = +seriesModel.get('max');

        const splitLineModel = seriesModel.getModel('splitLine');
        const tickModel = seriesModel.getModel('axisTick');
        const labelModel = seriesModel.getModel('axisLabel');

        const splitNumber = seriesModel.get('splitNumber');
        const subSplitNumber = tickModel.get('splitNumber');

        const splitLineLen = parsePercent(
            splitLineModel.get('length'), r
        );
        const tickLen = parsePercent(
            tickModel.get('length'), r
        );

        let angle = startAngle;
        const step = (endAngle - startAngle) / splitNumber;
        const subStep = step / subSplitNumber;

        const splitLineStyle = splitLineModel.getModel('lineStyle').getLineStyle();
        const tickLineStyle = tickModel.getModel('lineStyle').getLineStyle();

        let unitX;
        let unitY;

        for (let i = 0; i <= splitNumber; i++) {
            unitX = Math.cos(angle);
            unitY = Math.sin(angle);
            // Split line
            if (splitLineModel.get('show')) {
                const splitLine = new graphic.Line({
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
                const label = formatLabel(
                    round(i / splitNumber * (maxVal - minVal) + minVal),
                    labelModel.get('formatter')
                );
                const distance = labelModel.get('distance');
                const autoColor = getColor(i / splitNumber);

                group.add(new graphic.Text({
                    style: createTextStyle(labelModel, {
                        text: label,
                        x: unitX * (r - splitLineLen - distance) + cx,
                        y: unitY * (r - splitLineLen - distance) + cy,
                        verticalAlign: unitY < -0.4 ? 'top' : (unitY > 0.4 ? 'bottom' : 'middle'),
                        align: unitX < -0.4 ? 'left' : (unitX > 0.4 ? 'right' : 'center')
                    }, {inheritColor: autoColor}),
                    silent: true
                }));
            }

            // Axis tick
            if (tickModel.get('show') && i !== splitNumber) {
                for (let j = 0; j <= subSplitNumber; j++) {
                    unitX = Math.cos(angle);
                    unitY = Math.sin(angle);
                    const tickLine = new graphic.Line({
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

        const group = this.group;
        const oldData = this._data;

        if (!seriesModel.get(['pointer', 'show'])) {
            // Remove old element
            oldData && oldData.eachItemGraphicEl(function (el) {
                group.remove(el);
            });
            return;
        }

        const valueExtent = [+seriesModel.get('min'), +seriesModel.get('max')];
        const angleExtent = [startAngle, endAngle];

        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');

        data.diff(oldData)
            .add(function (idx) {
                const pointer = new PointerPath({
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
                const pointer = oldData.getItemGraphicEl(oldIdx) as PointerPath;

                graphic.updateProps(pointer, {
                    shape: {
                        angle: linearMap(data.get(valueDim, newIdx) as number, valueExtent, angleExtent, true)
                    }
                }, seriesModel);

                group.add(pointer);
                data.setItemGraphicEl(newIdx, pointer);
            })
            .remove(function (idx) {
                const pointer = oldData.getItemGraphicEl(idx);
                group.remove(pointer);
            })
            .execute();

        data.eachItemGraphicEl(function (pointer: PointerPath, idx) {
            const itemModel = data.getItemModel<GaugeDataItemOption>(idx);
            const pointerModel = itemModel.getModel('pointer');
            const emphasisModel = itemModel.getModel('emphasis');

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


            setStatesStylesFromModel(pointer, itemModel);
            enableHoverEmphasis(pointer, emphasisModel.get('focus'), emphasisModel.get('blurScope'));
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
        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');
        const titleModel = seriesModel.getModel('title');
        if (titleModel.get('show')) {
            const offsetCenter = titleModel.get('offsetCenter');
            const x = posInfo.cx + parsePercent(offsetCenter[0], posInfo.r);
            const y = posInfo.cy + parsePercent(offsetCenter[1], posInfo.r);

            const minVal = +seriesModel.get('min');
            const maxVal = +seriesModel.get('max');
            const value = seriesModel.getData().get(valueDim, 0) as number;
            const autoColor = getColor(
                linearMap(value, [minVal, maxVal], [0, 1], true)
            );

            this.group.add(new graphic.Text({
                silent: true,
                style: createTextStyle(titleModel, {
                    x: x,
                    y: y,
                    // FIXME First data name ?
                    text: data.getName(0),
                    align: 'center',
                    verticalAlign: 'middle'
                }, {inheritColor: autoColor})
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
        const detailModel = seriesModel.getModel('detail');
        const minVal = +seriesModel.get('min');
        const maxVal = +seriesModel.get('max');
        if (detailModel.get('show')) {
            const offsetCenter = detailModel.get('offsetCenter');
            const x = posInfo.cx + parsePercent(offsetCenter[0], posInfo.r);
            const y = posInfo.cy + parsePercent(offsetCenter[1], posInfo.r);
            const width = parsePercent(detailModel.get('width'), posInfo.r);
            const height = parsePercent(detailModel.get('height'), posInfo.r);
            const data = seriesModel.getData();
            const value = data.get(data.mapDimension('value'), 0) as number;
            const autoColor = getColor(
                linearMap(value, [minVal, maxVal], [0, 1], true)
            );

            this.group.add(new graphic.Text({
                silent: true,
                style: createTextStyle(detailModel, {
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
                }, {inheritColor: autoColor})
            }));
        }
    }
}

ChartView.registerClass(GaugeView);

export default GaugeView;
