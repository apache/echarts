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
import TreeSeriesModel, { TreeSeriesOption } from '@/src/chart/tree/TreeSeries';
import { createChart, getECModel } from '../../core/utHelper';

interface NodeLayout {
    x: number
    y: number
    rawX: number
    rawY: number
}

interface NodeGeometry extends NodeLayout {
    depth: number
}

type TreeGeometry = {[name: string]: NodeGeometry};


describe('tree radialLevelGap', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({width: 400, height: 300});
    });

    afterEach(function () {
        chart.dispose();
    });

    function setTree(option: TreeSeriesOption = {}) {
        const series: TreeSeriesOption = {
            id: 'tree',
            type: 'tree',
            layout: 'radial',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            initialTreeDepth: -1,
            data: [{
                name: 'root',
                children: [{
                    name: 'branch',
                    children: [{
                        name: 'twig',
                        children: [{name: 'deep-leaf'}]
                    }, {name: 'branch-leaf'}]
                }, {
                    name: 'short',
                    children: [{name: 'short-leaf'}]
                }, {name: 'tip'}]
            }],
            ...option
        };
        chart.setOption({animation: false, series: [series]}, true);
    }

    function updateGap(radialLevelGap: number | number[]) {
        const series: TreeSeriesOption = {id: 'tree', radialLevelGap};
        chart.setOption({series: [series]});
    }

    function getGeometry(): TreeGeometry {
        const series = getECModel(chart).getSeriesByIndex(0) as TreeSeriesModel;
        const geometry: TreeGeometry = {};
        // Start at the actual data root, not ECharts' internal virtual root.
        series.getData().tree.root.children[0].eachNode(function (node) {
            const layout: NodeLayout = node.getLayout();
            geometry[node.name] = {
                depth: node.depth - 1,
                x: layout.x,
                y: layout.y,
                rawX: layout.rawX,
                rawY: layout.rawY
            };
        });
        return geometry;
    }

    function expectRadii(geometry: TreeGeometry, radii: number[]) {
        Object.keys(geometry).forEach(function (name) {
            const node = geometry[name];
            const radius = radii[node.depth];
            expect(node.rawY).toBeCloseTo(radius, 10);
            // Check rendered Cartesian layout as well as the stored polar radius.
            expect(Math.sqrt(node.x * node.x + node.y * node.y)).toBeCloseTo(radius, 10);
            expect(node.x).toBeCloseTo(radius * Math.sin(node.rawX), 10);
            expect(node.y).toBeCloseTo(-radius * Math.cos(node.rawX), 10);
        });
    }

    function expectAngles(geometry: TreeGeometry, baseline: TreeGeometry) {
        Object.keys(baseline).forEach(function (name) {
            expect(geometry[name].rawX).toBe(baseline[name].rawX);
        });
    }

    it('preserves automatic radii and exact positions for an empty array', function () {
        setTree();
        const baseline = getGeometry();
        // The 400 x 300 layout has radius 150 and three actual depth gaps.
        expectRadii(baseline, [0, 50, 100, 150]);

        setTree({radialLevelGap: []});
        expect(getGeometry()).toEqual(baseline);
    });

    it('uses a scalar at every depth without changing angles or fitting the viewport', function () {
        setTree();
        const baseline = getGeometry();

        [37.5, 0, 240].forEach(function (gap) {
            setTree({radialLevelGap: gap});
            const geometry = getGeometry();
            expectRadii(geometry, [0, gap, gap * 2, gap * 3]);
            expectAngles(geometry, baseline);
        });
    });

    it('indexes independent array gaps from the actual root across unequal branches', function () {
        setTree();
        const baseline = getGeometry();
        const cases = [
            {gaps: [17, 61, 29], radii: [0, 17, 78, 107]},
            {gaps: [43, 61, 29], radii: [0, 43, 104, 133]},
            {gaps: [43, 8, 29], radii: [0, 43, 51, 80]}
        ];

        cases.forEach(function (testCase) {
            setTree({radialLevelGap: testCase.gaps});
            const geometry = getGeometry();
            expectRadii(geometry, testCase.radii);
            expectAngles(geometry, baseline);
        });
    });

    it('uses the automatic gap for missing entries and retains explicit zero gaps', function () {
        setTree();
        const baseline = getGeometry();
        const cases = [
            {gaps: [12], radii: [0, 12, 62, 112]},
            {gaps: [12, 0], radii: [0, 12, 12, 62]},
            {gaps: [12, 0, 23, 999], radii: [0, 12, 12, 35]},
            {gaps: [], radii: [0, 50, 100, 150]}
        ];

        cases.forEach(function (testCase) {
            setTree({radialLevelGap: testCase.gaps});
            const geometry = getGeometry();
            expectRadii(geometry, testCase.radii);
            expectAngles(geometry, baseline);
        });
    });

    it('recomputes missing gaps on resize and replaces configured gaps on option updates', function () {
        setTree({radialLevelGap: [20]});
        const baseline = getGeometry();
        expectRadii(baseline, [0, 20, 70, 120]);

        chart.resize({width: 800, height: 600});
        let geometry = getGeometry();
        expectRadii(geometry, [0, 20, 120, 220]);
        expectAngles(geometry, baseline);

        updateGap([30, 40, 50]);
        expectRadii(getGeometry(), [0, 30, 70, 120]);

        chart.resize({width: 200, height: 120});
        geometry = getGeometry();
        expectRadii(geometry, [0, 30, 70, 120]);
        expectAngles(geometry, baseline);

        updateGap(10);
        expectRadii(getGeometry(), [0, 10, 20, 30]);

        updateGap([]);
        geometry = getGeometry();
        expectRadii(geometry, [0, 20, 40, 60]);
        expectAngles(geometry, baseline);
    });

    it('recomputes automatic gaps when a deep branch collapses and expands', function () {
        setTree({radialLevelGap: [20]});
        const baseline = getGeometry();
        const series = getECModel(chart).getSeriesByIndex(0) as TreeSeriesModel;
        const root = series.getData().tree.root.children[0];
        const branch = root.children[0];
        const shortLeaf = root.children[1].children[0];

        chart.dispatchAction({type: 'treeExpandAndCollapse', seriesIndex: 0, dataIndex: branch.dataIndex});
        const layout: NodeLayout = shortLeaf.getLayout();
        expect(layout.rawY).toBe(95);
        expect(Math.hypot(layout.x, layout.y)).toBeCloseTo(95, 10);

        chart.dispatchAction({type: 'treeExpandAndCollapse', seriesIndex: 0, dataIndex: branch.dataIndex});
        expect(getGeometry()).toEqual(baseline);
    });

    it('ignores radial gaps in every orthogonal orientation', function () {
        const orientations: TreeSeriesOption['orient'][] = ['LR', 'RL', 'TB', 'BT'];
        orientations.forEach(function (orient) {
            setTree({layout: 'orthogonal', orient});
            const baseline = getGeometry();

            setTree({layout: 'orthogonal', orient, radialLevelGap: [17, 61, 29]});
            expect(getGeometry()).toEqual(baseline);

            updateGap(0);
            expect(getGeometry()).toEqual(baseline);
        });
    });

    it('keeps a root-only tree finite and centered with or without configured gaps', function () {
        const options: TreeSeriesOption[] = [
            {}, {radialLevelGap: 75}, {radialLevelGap: 0},
            {radialLevelGap: [17, 61]}, {radialLevelGap: []}
        ];
        options.forEach(function (option) {
            setTree({...option, data: [{name: 'root'}]});
            const geometry = getGeometry();
            expect(Object.keys(geometry)).toEqual(['root']);
            const root = geometry.root;
            expect(Number.isFinite(root.rawX)).toBe(true);
            expect(root.rawY).toBe(0);
            expect(root.x).toBeCloseTo(0, 10);
            expect(root.y).toBeCloseTo(0, 10);
        });
    });
});
