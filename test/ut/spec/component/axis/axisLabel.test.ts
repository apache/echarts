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
// as 1px wide, which makes the auto category interval calculation
// meaningless: labels that overlap in a real browser would never be
// detected. Install a deterministic, browser-like `measureText`
// (CJK glyphs are full-width, latin glyphs about half-width, at the
// default 12px font) before any chart is created, so that the label
// layout behaves like it does in a browser.
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

import { createChart, getViewGroup } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { EChartsOption } from '../../../../../src/export/option';


// The option from https://github.com/apache/echarts/issues/21194 :
// with `axisLabel.width: 50` and `overflow: 'break'` the labels wrap
// into the configured width, so they do not overlap and every label
// should be displayed even though the chart (grid) width is limited.
function makeIssueOption(): EChartsOption {
    return {
        legend: {show: true},
        grid: {width: 300, top: '10%', left: 0, bottom: 0, containLabel: true},
        xAxis: {
            type: 'category',
            data: ['XX当日发电量', 'YY当日发电量', 'ZZ当日发电量'],
            axisLabel: {width: 50, overflow: 'break', hideOverlap: false}
        },
        yAxis: {
            type: 'value',
            splitLine: {show: true, lineStyle: {width: 1, color: 'rgba(128,128,128,0.5)'}}
        },
        series: [{type: 'bar', data: [1417.69, 1372.82, 1254.72]}]
    } as EChartsOption;
}

function getVisibleXAxisLabels(chart: EChartsType): string[] {
    const group = getViewGroup(chart, 'xAxis', 0);
    const labels: string[] = [];
    group.traverse(function (el) {
        const anyEl = el as unknown as {
            type: string,
            ignore?: boolean,
            style?: {text?: string},
            getTextContent?: () => {style: {text: string}, ignore?: boolean}
        };
        // A label is rendered either as a standalone text element or as
        // the text content attached to another element.
        let text: string;
        let ignored = !!anyEl.ignore;
        if (anyEl.type === 'text' && anyEl.style && anyEl.style.text != null) {
            text = anyEl.style.text;
        }
        else if (anyEl.getTextContent) {
            const textContent = anyEl.getTextContent();
            if (textContent) {
                text = textContent.style.text;
                ignored = ignored || !!textContent.ignore;
            }
        }
        if (text != null && !ignored) {
            // Wrapped labels contain line breaks; compare them flattened.
            labels.push(text.replace(/\n/g, ''));
        }
    });
    return labels;
}

describe('axis_label_layout', function () {

    let chart: EChartsType;
    afterEach(function () {
        if (chart) {
            chart.dispose();
            chart = null;
        }
    });

    it('labels wrapped by axisLabel.width and overflow break are not dropped by auto interval', function () {
        chart = createChart({width: 900, height: 800});
        chart.setOption(makeIssueOption());
        expect(getVisibleXAxisLabels(chart)).toEqual([
            'XX当日发电量', 'YY当日发电量', 'ZZ当日发电量'
        ]);
    });

    it('labels truncated by axisLabel.width and overflow truncate are not dropped by auto interval', function () {
        chart = createChart({width: 900, height: 800});
        const option = makeIssueOption();
        (option.xAxis as {axisLabel: object}).axisLabel = {width: 50, overflow: 'truncate', hideOverlap: false};
        chart.setOption(option);
        expect(getVisibleXAxisLabels(chart)).toEqual([
            'XX当日发电量', 'YY当日发电量', 'ZZ当日发电量'
        ]);
    });

    it('width without overflow break or truncate does not disable auto interval', function () {
        chart = createChart({width: 900, height: 800});
        const option = makeIssueOption();
        // `width` alone has no effect on the label layout, so the labels
        // keep their natural width and the auto interval still applies.
        (option.xAxis as {axisLabel: object}).axisLabel = {width: 50, hideOverlap: false};
        chart.setOption(option);
        expect(getVisibleXAxisLabels(chart)).toEqual([
            'XX当日发电量', 'ZZ当日发电量'
        ]);
    });

    it('wide labels without width limit are still thinned by auto interval', function () {
        chart = createChart({width: 900, height: 800});
        const option = makeIssueOption();
        (option.xAxis as {axisLabel: object}).axisLabel = {hideOverlap: false};
        chart.setOption(option);
        // Sanity check of the measurement setup: without `width`/`overflow`
        // the 89px wide labels do not fit into the ~86px bands, so the
        // auto interval must keep dropping the middle label.
        expect(getVisibleXAxisLabels(chart)).toEqual([
            'XX当日发电量', 'ZZ当日发电量'
        ]);
    });

});
