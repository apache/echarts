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

import type Path from 'zrender/src/graphic/Path';
import { EChartsType } from '@/src/echarts';
import SankeySeriesModel, { SankeySeriesOption } from '@/src/chart/sankey/SankeySeries';
import { createChart, getECModel } from '../../core/utHelper';

describe('Sankey ARIA decals', function () {
    let chart: EChartsType;

    beforeEach(() => {
        chart = createChart({opts: {renderer: 'svg'}});
    });
    afterEach(() => chart.dispose());

    function setSankey(series: SankeySeriesOption) {
        chart.setOption({
            animation: false,
            aria: {enabled: true, decal: {show: true, decals: [{symbol: 'rect'}, {symbol: 'circle'}, {symbol: 'diamond'}]}},
            series: [{type: 'sankey', ...series}]
        });
        return (getECModel(chart).getSeries()[0] as SankeySeriesModel).getGraph();
    }

    it('uses one pattern per node color and reuses it for matching link colors', () => {
        const graph = setSankey({
            data: [
                {name: 'Red source', itemStyle: {color: '#c00'}},
                {name: 'Red target', itemStyle: {color: '#c00'}},
                {name: 'Blue', itemStyle: {color: '#03c'}}
            ],
            links: [
                {source: 'Red source', target: 'Blue', value: 3, lineStyle: {color: 'source'}},
                {source: 'Blue', target: 'Red target', value: 2, lineStyle: {color: 'target'}},
                {source: 'Red source', target: 'Red target', value: 1, lineStyle: {color: '#03c'}}
            ]
        });
        const red = graph.nodes[0].getVisual('style').decal;
        const blue = graph.nodes[2].getVisual('style').decal;
        expect(red).toBeTruthy();
        expect(blue).toBeTruthy();
        expect(red).not.toBe(blue);
        expect(graph.nodes[1].getVisual('style').decal).toBe(red);
        expect(graph.edges.map(edge => (edge.getGraphicEl() as Path).style.decal)).toEqual([red, red, blue]);

        chart.setOption({aria: {decal: {show: false}}});
        const updated = (getECModel(chart).getSeries()[0] as SankeySeriesModel).getGraph();
        expect(updated.nodes.every(node => !node.getVisual('style').decal)).toBe(true);
        expect(updated.edges.every(edge => !(edge.getGraphicEl() as Path).style.decal)).toBe(true);
    });

    it('uses resolved value colors and preserves level and node overrides', () => {
        const graph = setSankey({
            data: [{name: 'A'}, {name: 'B'}, {name: 'C', itemStyle: {decal: {symbol: 'triangle'}}}],
            links: [{source: 'A', target: 'B', value: 5}, {source: 'B', target: 'C', value: 2}],
            levels: [{depth: 0, itemStyle: {decal: {symbolSize: 0.5}}}]
        });
        const [a, b, c] = graph.nodes;
        expect(a.getVisual('color')).toBe(b.getVisual('color'));
        expect(a.getVisual('color')).not.toBe(c.getVisual('color'));
        expect(a.getVisual('decal')).toMatchObject({symbol: 'rect', symbolSize: 0.5});
        expect(b.getVisual('decal').symbol).toBe('rect');
        expect(c.getVisual('decal').symbol).toBe('triangle');
    });
});
