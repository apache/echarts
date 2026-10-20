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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { EChartsOption } from '../../../../../src/export/option';


describe('toolbox_magicType', function () {
    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function clickMagicTypeIcon(iconName: 'line' | 'bar' | 'stack') {
        const toolboxModel = getECModel(chart).getComponent('toolbox');
        const toolboxView = (chart as any)._componentsMap[toolboxModel.__viewId];
        toolboxView._features.get('magicType').model.iconPaths[iconName].trigger('click');
    }

    function getSeriesStacks() {
        return getECModel(chart).getSeries().map(seriesModel => seriesModel.get('stack' as any));
    }

    function makeOption(stacks: string[]): EChartsOption {
        return {
            toolbox: {
                feature: {
                    magicType: {
                        type: ['line', 'bar', 'stack']
                    }
                }
            },
            xAxis: {
                type: 'category',
                data: ['a', 'b', 'c']
            },
            yAxis: {},
            series: stacks.map(stack => ({
                type: 'bar',
                stack: stack,
                data: [1, 2, 3]
            }))
        };
    }

    it('should stack series without stack on the first click', function () {
        chart.setOption(makeOption([undefined, undefined]));

        clickMagicTypeIcon('stack');
        const stacks = getSeriesStacks();
        expect(stacks[0]).toBeTruthy();
        expect(stacks[1]).toEqual(stacks[0]);

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks().every(stack => !stack)).toEqual(true);
    });

    it('should toggle the stack of a single series', function () {
        chart.setOption(makeOption([undefined]));

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks()[0]).toBeTruthy();

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks()[0]).toBeFalsy();
    });

    it('should stack series together when only one series has a stack', function () {
        chart.setOption(makeOption([undefined, 'single']));

        clickMagicTypeIcon('stack');
        const stacks = getSeriesStacks();
        expect(stacks[0]).toBeTruthy();
        expect(stacks[1]).toEqual(stacks[0]);
    });

    it('should tile series stacked by series.stack on the first click', function () {
        chart.setOption(makeOption(['cars', 'cars']));

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks().every(stack => !stack)).toEqual(true);
    });

    it('should restore the stack groups defined by series.stack', function () {
        chart.setOption(makeOption(['groupA', 'groupA', 'groupB', 'groupB']));

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks().every(stack => !stack)).toEqual(true);

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks()).toEqual(['groupA', 'groupA', 'groupB', 'groupB']);

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks().every(stack => !stack)).toEqual(true);
    });

    it('should keep the stack groups when switching between line and bar', function () {
        chart.setOption(makeOption(['groupA', 'groupA', 'groupB', 'groupB']));

        clickMagicTypeIcon('line');
        expect(getSeriesStacks()).toEqual(['groupA', 'groupA', 'groupB', 'groupB']);

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks().every(stack => !stack)).toEqual(true);

        clickMagicTypeIcon('stack');
        expect(getSeriesStacks()).toEqual(['groupA', 'groupA', 'groupB', 'groupB']);
    });

});
