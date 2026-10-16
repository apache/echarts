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

import { EChartsType } from '@/src/echarts';
import { TreemapSeriesOption } from '@/src/chart/treemap/TreemapSeries';
import Text, { TextStyleProps } from 'zrender/src/graphic/Text';
import TSpan from 'zrender/src/graphic/TSpan';
import { createChart, getGraphicElements } from '../../core/utHelper';

type TreemapLabelPosition = NonNullable<TreemapSeriesOption['label']>['position'];

interface RenderedLabel {
    height: number | null
    x: number
    y: number
}

function getTreemapText(chart: EChartsType): Text {
    const elements = getGraphicElements(chart, 'series', 0);
    for (let i = 0; i < elements.length; i++) {
        const text = elements[i].getTextContent();
        if (text) {
            return text;
        }
    }
    throw new Error('Treemap label was not rendered.');
}

function renderLabel(position: TreemapLabelPosition, rich: boolean): RenderedLabel {
    const chart = createChart({width: 400, height: 300});

    try {
        chart.setOption({
            animation: false,
            series: [{
                type: 'treemap',
                breadcrumb: {show: false},
                nodeClick: false,
                roam: false,
                left: 0,
                top: 0,
                width: 400,
                height: 300,
                data: [{name: 'foo', value: 100}],
                label: {
                    show: true,
                    position,
                    fontSize: 18,
                    formatter: rich ? '{label|foo}\nbar' : 'foo\nbar',
                    rich: rich ? {label: {fontSize: 18}} : undefined
                }
            }]
        });
        chart.getZr().refreshImmediately();

        const text = getTreemapText(chart);
        const textSpan = text.childrenRef().filter(child => child instanceof TSpan)[0] as TSpan;
        if (!textSpan) {
            throw new Error('Treemap label text span was not rendered.');
        }

        return {
            height: (text.style as TextStyleProps & {height: number | null}).height,
            x: textSpan.style.x,
            y: textSpan.style.y
        };
    }
    finally {
        chart.dispose();
    }
}

describe('treemap label', function () {
    it.each([
        'insideBottom',
        'insideBottomLeft',
        'insideBottomRight'
    ] as const)('aligns rich text at %s like plain text', function (position) {
        const plainLabel = renderLabel(position, false);
        const richLabel = renderLabel(position, true);

        expect(richLabel.height).toBeNull();
        expect(richLabel.x).toBeCloseTo(plainLabel.x);
        expect(richLabel.y).toBeCloseTo(plainLabel.y);
    });

    it.each([
        'insideTopLeft',
        'inside'
    ] as const)('retains the rich text height constraint at %s', function (position) {
        const plainLabel = renderLabel(position, false);
        const richLabel = renderLabel(position, true);

        expect(richLabel.height).toBe(plainLabel.height);
        expect(richLabel.height).toBeGreaterThan(0);
    });
});
