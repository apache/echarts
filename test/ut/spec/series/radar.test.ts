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


import { createChart } from '../../core/utHelper';
import type { EChartsType } from '@/src/echarts';

function getSymbols(chart: EChartsType) {
    const view = (chart as any)._chartsViews[0];
    const symbolGroup = view.group.childAt(0).childAt(2);
    const symbols: any[] = [];
    symbolGroup.eachChild((symbol: any) => symbols.push(symbol));
    return symbols;
}

function getLayoutPoints(chart: EChartsType): number[][] {
    return (chart as any).getModel().getSeriesByIndex(0).getData().getItemLayout(0);
}

function getRadarCenter(chart: EChartsType): number[] {
    const polar = (chart as any).getModel().getComponent('radar').coordinateSystem;
    return [polar.cx, polar.cy];
}

const option = {
    radar: {
        indicator: [
            { name: 'a', max: 10 },
            { name: 'b', max: 10 },
            { name: 'c', max: 10 }
        ]
    },
    series: [{
        type: 'radar',
        data: [{ value: [8, 6, 9] }]
    }]
};

describe('radar', function () {

    it('should animate symbols from the center along with the lines on enter', function () {
        const chart = createChart({width: 400, height: 400});

        try {
            chart.setOption({
                ...option,
                animationDuration: 100000
            });

            const center = getRadarCenter(chart);
            const points = getLayoutPoints(chart);
            const symbols = getSymbols(chart);

            expect(symbols.length).toBe(3);
            symbols.forEach((symbol, i) => {
                // Starts from the center, like the polyline and polygon.
                expect(symbol.x).toBeCloseTo(center[0]);
                expect(symbol.y).toBeCloseTo(center[1]);

                // And animates towards its final position.
                expect(symbol.animators.length).toBe(1);
                symbol.animators[0].getTracks().forEach((track: any) => {
                    const keyframes = track.keyframes;
                    const dim = track.propName === 'x' ? 0 : 1;
                    expect(keyframes[0].value).toBeCloseTo(center[dim]);
                    expect(keyframes[keyframes.length - 1].value).toBeCloseTo(points[i][dim]);
                });
            });
        }
        finally {
            chart.dispose();
        }
    });

    it('should place symbols at their final positions when animation is disabled', function () {
        const chart = createChart({width: 400, height: 400});

        try {
            chart.setOption({
                ...option,
                animation: false
            });

            const points = getLayoutPoints(chart);
            const symbols = getSymbols(chart);

            expect(symbols.length).toBe(3);
            symbols.forEach((symbol, i) => {
                expect(symbol.x).toBeCloseTo(points[i][0]);
                expect(symbol.y).toBeCloseTo(points[i][1]);
                expect(symbol.animators.length).toBe(0);
            });
        }
        finally {
            chart.dispose();
        }
    });

});
