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
import Group from 'zrender/src/graphic/Group';
import Polygon from 'zrender/src/graphic/shape/Polygon';
import Polyline from 'zrender/src/graphic/shape/Polyline';
import { createChart, getViewGroup } from '../../core/utHelper';


type Point = number[];
type DrawCall = [string, ...number[]];

const INDICATORS = [
    { name: 'A', max: 100 },
    { name: 'B', max: 100 },
    { name: 'C', max: 100 },
    { name: 'D', max: 100 },
    { name: 'E', max: 100 },
    { name: 'F', max: 100 }
];

function setRadarData(chart: EChartsType, values: unknown[]) {
    chart.setOption({
        animation: false,
        radar: {
            center: [200, 200],
            radius: 150,
            indicator: INDICATORS
        },
        series: [{
            type: 'radar',
            data: [{ value: values }]
        }]
    });
}

function getRadarGraphic(chart: EChartsType) {
    const seriesGroup = getViewGroup(chart, 'series', 0);
    const itemGroup = seriesGroup.childAt(0) as Group;

    return {
        polyline: itemGroup.childAt(0) as Polyline,
        polygon: itemGroup.childAt(1) as Polygon,
        symbolGroup: itemGroup.childAt(2) as Group
    };
}

function getLayout(chart: EChartsType): Point[] {
    return getSeriesModel(chart).getData().getItemLayout(0);
}

function getSeriesModel(chart: EChartsType) {
    return (chart as any).getModel().getSeriesByIndex(0);
}

function recordPath(path: Polyline | Polygon): DrawCall[] {
    const calls: DrawCall[] = [];
    const context = {
        moveTo(x: number, y: number) {
            calls.push(['moveTo', x, y]);
        },
        lineTo(x: number, y: number) {
            calls.push(['lineTo', x, y]);
        },
        bezierCurveTo() {
            throw new Error('Radar paths are not expected to be smoothed.');
        },
        closePath() {
            calls.push(['closePath']);
        }
    };

    path.buildPath(context as any, path.shape);
    return calls;
}

function expectedPolylineCalls(points: Point[], validIndices: number[]): DrawCall[] {
    return validIndices.map((pointIndex, validIndex) => [
        validIndex === 0 ? 'moveTo' : 'lineTo',
        points[pointIndex][0],
        points[pointIndex][1]
    ]);
}


describe('radar', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({ width: 400, height: 400 });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('connects neighboring values without coercing missing dimensions to zero', function () {
        setRadarData(chart, [80, null, 40, 0, undefined, 20]);

        const points = getLayout(chart);
        const graphic = getRadarGraphic(chart);

        expect(points).toHaveLength(INDICATORS.length + 1);
        expect(points[1][0]).toBeNaN();
        expect(points[1][1]).toBeNaN();
        expect(points[4][0]).toBeNaN();
        expect(points[4][1]).toBeNaN();

        // A real zero remains a drawable value at the radar center.
        expect(points[3]).toEqual([200, 200]);

        // The last point closes the line at the first valid dimension.
        expect(points[6]).toEqual(points[0]);

        const expectedCalls = expectedPolylineCalls(points, [0, 2, 3, 5, 6]);
        expect(recordPath(graphic.polyline)).toEqual(expectedCalls);
        expect(recordPath(graphic.polygon)).toEqual([
            ...expectedCalls,
            ['closePath']
        ]);
        expect(graphic.symbolGroup.children()).toHaveLength(4);

        const tooltip = getSeriesModel(chart).formatTooltip(0);
        expect(tooltip.blocks.map((block: any) => block.value)).toEqual([
            80, NaN, 40, 0, NaN, 20
        ]);
    });

    it('does not render geometry or symbols when every dimension is missing', function () {
        setRadarData(chart, [null, undefined, NaN, '-', null, undefined]);

        const points = getLayout(chart);
        const graphic = getRadarGraphic(chart);

        expect(points).toHaveLength(INDICATORS.length + 1);
        points.forEach(function (point) {
            expect(point[0]).toBeNaN();
            expect(point[1]).toBeNaN();
        });
        expect(recordPath(graphic.polyline)).toEqual([]);
        expect(recordPath(graphic.polygon)).toEqual([]);
        expect(graphic.symbolGroup.children()).toHaveLength(0);
    });

    it('rebuilds connected geometry when the missing dimensions change', function () {
        setRadarData(chart, [80, null, 40, 30, undefined, 20]);
        setRadarData(chart, [null, 0, undefined, 60, 50, 20]);

        const points = getLayout(chart);
        const graphic = getRadarGraphic(chart);

        expect(points[0][0]).toBeNaN();
        expect(points[2][0]).toBeNaN();
        expect(points[1]).toEqual([200, 200]);
        expect(points[6]).toEqual(points[1]);

        expect(recordPath(graphic.polyline)).toEqual(
            expectedPolylineCalls(points, [1, 3, 4, 5, 6])
        );
        expect(graphic.symbolGroup.children()).toHaveLength(4);
    });

    it('keeps complete numeric radar geometry unchanged', function () {
        setRadarData(chart, [100, 80, 60, 40, 20, 0]);

        const points = getLayout(chart);
        const graphic = getRadarGraphic(chart);

        points.forEach(function (point) {
            expect(Number.isFinite(point[0])).toBe(true);
            expect(Number.isFinite(point[1])).toBe(true);
        });
        expect(recordPath(graphic.polyline)).toEqual(
            expectedPolylineCalls(points, [0, 1, 2, 3, 4, 5, 6])
        );
        expect(graphic.symbolGroup.children()).toHaveLength(6);
    });
});
