
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

import { createChart, getECModel } from '../../core/utHelper';
import { EChartsType } from '../../../../src/echarts';


describe('api/setTheme', function () {

    const oldConsoleWarn = console.warn;

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({ theme: 'dark' });
        chart.setOption({
            xAxis: { type: 'category', data: ['a', 'b'] },
            yAxis: {},
            series: [{ type: 'bar', data: [1, 2] }]
        });
    });

    afterEach(function () {
        console.warn = oldConsoleWarn;
        chart.dispose();
    });

    function getThemeBackgroundColor(): unknown {
        return getECModel(chart).getTheme().get('backgroundColor');
    }

    it('should use the dark theme', function () {
        expect(getThemeBackgroundColor()).toBeTruthy();
    });

    it('should reset to the default theme with undefined', function () {
        chart.setTheme(undefined);
        expect(getThemeBackgroundColor()).toBeUndefined();
    });

    it('should reset to the default theme with null', function () {
        chart.setTheme(null);
        expect(getThemeBackgroundColor()).toBeUndefined();
    });

    it('should warn and keep the current theme with an unregistered name', function () {
        const darkBackgroundColor = getThemeBackgroundColor();
        console.warn = jest.fn();
        chart.setTheme('someUnregisteredTheme');
        expect(console.warn).toHaveBeenCalledWith(
            '[ECharts] Theme someUnregisteredTheme is not registered.'
        );
        expect(getThemeBackgroundColor()).toEqual(darkBackgroundColor);
    });

});
