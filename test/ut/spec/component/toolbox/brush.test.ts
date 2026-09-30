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
import BrushModel from '../../../../../src/component/brush/BrushModel';
import Displayable from 'zrender/src/graphic/Displayable';

describe('toolbox brush mode', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function setup(brushMode?: 'single' | 'multiple') {
        chart.setOption({
            brush: {brushMode},
            toolbox: {feature: {brush: {
                type: ['rect', 'keep'],
                title: {rect: 'select rectangle', keep: 'keep selection'}
            }}},
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[1, 2], [2, 3]]}]
        });
    }

    function icon(title: string) {
        return chart.getZr().storage.getDisplayList().find(function (el) {
            return (el as Displayable & {__title?: string}).__title === title;
        });
    }

    function brush() {
        return getECModel(chart).getComponent('brush') as BrushModel;
    }

    it('uses the configured multiple mode on the first toolbox selection', function () {
        setup('multiple');
        expect(icon('keep selection').currentStates).toContain('emphasis');
        icon('select rectangle').trigger('click', null);
        expect(brush().brushOption.brushMode).toBe('multiple');
        expect(brush().brushType).toBe('rect');
    });

    it('allows the keep button to override the configured mode', function () {
        setup('multiple');
        icon('keep selection').trigger('click', null);
        icon('select rectangle').trigger('click', null);
        expect(brush().brushOption.brushMode).toBe('single');
        expect(icon('keep selection').currentStates).not.toContain('emphasis');
        icon('keep selection').trigger('click', null);
        expect(brush().brushOption.brushMode).toBe('multiple');
    });

    it('keeps single selection as the default', function () {
        setup();
        icon('select rectangle').trigger('click', null);
        expect(brush().brushOption.brushMode).toBe('single');
    });
});
