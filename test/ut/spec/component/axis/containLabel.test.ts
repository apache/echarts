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

import { platformApi, setPlatformAPI } from 'zrender/src/core/platform';

// The unit test environment (jest-canvas-mock) measures every character
// as 1px wide, which makes label size estimations meaningless. Install a
// deterministic, browser-like `measureText` (CJK glyphs are full-width,
// latin glyphs about half-width, at the default 12px font) before any
// chart is created, so that the label layout behaves like in a browser.
const origCreateCanvas = platformApi.createCanvas;
const origLoadImage = platformApi.loadImage;
const FONT_SIZE = 12;
function charWidth(ch: string): number {
    const code = ch.charCodeAt(0);
    if (code >= 0x2E80) { // CJK and other wide glyphs: full width
        return FONT_SIZE;
    }
    if (ch >= 'A' && ch <= 'Z') {
        return FONT_SIZE * 0.71;
    }
    return FONT_SIZE * 0.56;
}
setPlatformAPI({
    measureText(text: string) {
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            width += charWidth(text[i]);
        }
        return {width};
    },
    createCanvas() {
        return origCreateCanvas();
    },
    loadImage(src, onload, onerror) {
        return origLoadImage(src, onload, onerror);
    }
});

import { createChart, getECModel, getViewGroup } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { EChartsOption } from '../../../../../src/export/option';
import BoundingRect from 'zrender/src/core/BoundingRect';

const CHART_WIDTH = 500;
const CHART_HEIGHT = 400;
// With the deterministic `measureText` above and the data below, the
// y-axis tick labels are '0', '100', '200', '300', '400'.
const MAX_Y_LABEL_WIDTH = 3 * FONT_SIZE * 0.56; // '100' .. '400': 20.16
const X_LABEL_HEIGHT = FONT_SIZE; // one text line: 12

function makeOption(axisOpt: {xAxis?: object, yAxis?: object}): EChartsOption {
    return {
        grid: {left: 0, right: 0, top: 0, bottom: 0, containLabel: true},
        xAxis: Object.assign(
            {data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']},
            axisOpt.xAxis || {}
        ),
        yAxis: axisOpt.yAxis || {},
        series: [{
            name: 'Sale',
            type: 'bar',
            data: [50, 200, 360, 100, 100, 200, 40]
        }]
    } as EChartsOption;
}

function getGridRect(chart: EChartsType): BoundingRect {
    const grid = getECModel(chart).getComponent('grid', 0) as unknown as {
        coordinateSystem: {getRect: () => BoundingRect}
    };
    return grid.coordinateSystem.getRect();
}

function getYLabelMinX(chart: EChartsType): number {
    const group = getViewGroup(chart, 'yAxis', 0);
    let minX = Infinity;
    group.traverse(function (el) {
        const anyEl = el as unknown as {
            type: string,
            ignore?: boolean,
            style?: {text?: string},
            getBoundingRect?: () => BoundingRect,
            getComputedTransform?: () => number[]
        };
        if (anyEl.type === 'text' && anyEl.style && anyEl.style.text != null && !anyEl.ignore) {
            const rect = anyEl.getBoundingRect().clone();
            const transform = anyEl.getComputedTransform();
            if (transform) {
                rect.applyTransform(transform);
            }
            minX = Math.min(minX, rect.x);
        }
    });
    return minX;
}

// Regression tests for https://github.com/apache/echarts/issues/21140 :
// with `grid.containLabel`, the space reserved for the axis labels used
// to be the full label width/height plus `axisLabel.margin`, no matter
// how the labels are aligned. But the labels are anchored `margin` away
// from the axis line, and `axisLabel.align` (vertical axis) /
// `axisLabel.verticalAlign` (horizontal axis) decides how much of the
// label actually lies outside that anchor: e.g. `align: 'left'` on a
// left y-axis makes the labels extend towards the plot area, so only
// the margin has to be reserved on the left of the axis line.
describe('axis_label_contain_label_align', function () {

    let chart: EChartsType;
    afterEach(function () {
        if (chart) {
            chart.dispose();
            chart = null;
        }
    });

    function createWithOption(axisOpt: {xAxis?: object, yAxis?: object}): BoundingRect {
        chart = createChart({width: CHART_WIDTH, height: CHART_HEIGHT});
        chart.setOption(makeOption(axisOpt));
        return getGridRect(chart);
    }

    it('y-axis labels aligned inwards only reserve the margin on the left', function () {
        // The option from #21140: `containLabel: true` and
        // `yAxis.axisLabel: {align: 'left', margin: 100}`.
        const gridRect = createWithOption({
            yAxis: {axisLabel: {align: 'left', margin: 100}}
        });
        // The labels start at the anchor, 100px left of the axis line,
        // and extend inwards, so the reserved space on the left is
        // exactly the margin - not margin + label width.
        expect(gridRect.x).toBeCloseTo(100, 1);
        expect(gridRect.width).toBeCloseTo(CHART_WIDTH - 100, 1);
        // And the rendered labels indeed begin at the chart edge.
        expect(getYLabelMinX(chart)).toBeCloseTo(0, 1);
    });

    it('y-axis align left with the default margin reserves no label width', function () {
        const gridRect = createWithOption({
            yAxis: {axisLabel: {align: 'left', margin: 8}}
        });
        expect(gridRect.x).toBeCloseTo(8, 1);
        expect(getYLabelMinX(chart)).toBeCloseTo(0, 1);
    });

    it('y-axis align center reserves half of the label width', function () {
        const gridRect = createWithOption({
            yAxis: {axisLabel: {align: 'center', margin: 8}}
        });
        expect(gridRect.x).toBeCloseTo(8 + MAX_Y_LABEL_WIDTH / 2, 1);
    });

    it('y-axis align right (outwards) still reserves the full label width', function () {
        const gridRect = createWithOption({
            yAxis: {axisLabel: {align: 'right', margin: 8}}
        });
        expect(gridRect.x).toBeCloseTo(8 + MAX_Y_LABEL_WIDTH, 1);
    });

    it('y-axis default alignment still reserves the full label width', function () {
        const gridRect = createWithOption({
            yAxis: {axisLabel: {margin: 8}}
        });
        expect(gridRect.x).toBeCloseTo(8 + MAX_Y_LABEL_WIDTH, 1);
    });

    it('right y-axis labels aligned inwards only reserve the margin on the right', function () {
        const gridRect = createWithOption({
            yAxis: {position: 'right', axisLabel: {align: 'right', margin: 8}}
        });
        expect(CHART_WIDTH - (gridRect.x + gridRect.width)).toBeCloseTo(8, 1);
    });

    it('right y-axis default alignment still reserves the full label width', function () {
        const gridRect = createWithOption({
            yAxis: {position: 'right', axisLabel: {margin: 8}}
        });
        expect(CHART_WIDTH - (gridRect.x + gridRect.width))
            .toBeCloseTo(8 + MAX_Y_LABEL_WIDTH, 1);
    });

    it('x-axis labels aligned inwards only reserve the margin at the bottom', function () {
        // `verticalAlign: 'bottom'` on a bottom x-axis renders the labels
        // above the anchor (towards the plot area).
        const gridRect = createWithOption({
            xAxis: {axisLabel: {verticalAlign: 'bottom', margin: 8}}
        });
        expect(CHART_HEIGHT - (gridRect.y + gridRect.height)).toBeCloseTo(8, 1);
    });

    it('x-axis default vertical alignment still reserves the full label height', function () {
        const gridRect = createWithOption({
            xAxis: {axisLabel: {margin: 8}}
        });
        expect(CHART_HEIGHT - (gridRect.y + gridRect.height))
            .toBeCloseTo(8 + X_LABEL_HEIGHT, 1);
    });

    it('x-axis align does not change the reserved label height', function () {
        const gridRect = createWithOption({
            xAxis: {axisLabel: {align: 'left', margin: 8}}
        });
        expect(CHART_HEIGHT - (gridRect.y + gridRect.height))
            .toBeCloseTo(8 + X_LABEL_HEIGHT, 1);
    });

    it('rotated y-axis labels keep the full reservation', function () {
        // With `axisLabel.rotate` set, the alignment direction no longer
        // coincides with the direction perpendicular to the axis, so the
        // reserved space must not be reduced.
        const gridRect = createWithOption({
            yAxis: {axisLabel: {align: 'left', margin: 8, rotate: 45}}
        });
        expect(gridRect.x).toBeGreaterThan(8 + MAX_Y_LABEL_WIDTH);
    });
});
