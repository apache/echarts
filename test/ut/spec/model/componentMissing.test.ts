
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

import { init, use, EChartsType } from '@/src/export/core';
import {
    PieChart
} from '@/src/export/charts';
import {
    TitleComponent
} from '@/src/export/components';
import {
    CanvasRenderer
} from '@/src/export/renderers';
use([PieChart, TitleComponent, CanvasRenderer]);
import { EChartsOption } from '@/src/export/option';


function createChart(theme?: object): EChartsType {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', {
        get() {
            return 500;
        }
    });
    Object.defineProperty(el, 'clientHeight', {
        get() {
            return 400;
        }
    });
    const chart = init(el, theme);
    return chart;
};

function makeComponentError(componentName: string, componentImportName: string) {
    return `[ECharts] Component ${componentName} is used but not imported.
import { ${componentImportName} } from 'echarts/components';
echarts.use([${componentImportName}]);`;
}

function makeSerieError(seriesName: string, seriesImportName: string) {
    return `[ECharts] Series ${seriesName} is used but not imported.
import { ${seriesImportName} } from 'echarts/charts';
echarts.use([${seriesImportName}]);`;
}


// !!!!IMPORTANTE NOTE:
// DO NOT test on the same component twice.
// Because error message will be cached. It will not report on the same component twice.

describe('model_componentMissing', function () {
    const oldConsoleErr = console.error;

    it('Should report grid component missing error', function () {
        const chart = createChart();
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            xAxis: {},
            yAxis: {},
            series: []
        });
        expect(console.error).toHaveBeenCalledWith(
            makeComponentError('xAxis', 'GridComponent')
        );

        console.error = oldConsoleErr;
    });

    it('Should report dataZoom component missing error', function () {
        const chart = createChart();
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            dataZoom: {}
        });
        expect(console.error).toHaveBeenCalledWith(
            makeComponentError('dataZoom', 'DataZoomComponent')
        );

        console.error = oldConsoleErr;
    });

    it('Should not report title component missing error', function () {
        const chart = createChart();
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            title: {},
            series: []
        });
        expect(console.error).not.toBeCalled();

        console.error = oldConsoleErr;
    });

    it('Should report funnel series missing error', function () {
        const chart = createChart();
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            series: [{
                type: 'funnel'
            }]
        });
        expect(console.error).toHaveBeenCalledWith(
            makeSerieError('funnel', 'FunnelChart')
        );

        console.error = oldConsoleErr;
    });

    it('Should not report pie series missing error', function () {
        const chart = createChart();
        console.error = jest.fn();
        chart.setOption<EChartsOption>({
            series: [{
                type: 'pie'
            }]
        });
        expect(console.error).not.toBeCalled();
        console.error = oldConsoleErr;
    });


    it('Should not report visualMap component missing error when using theme', function () {
        const chart = createChart({
            visualMap: {
                borderColor: '#71708A'
            }
        });

        console.error = jest.fn();
        chart.setOption<EChartsOption>({});
        expect(console.error).not.toBeCalled();

        console.error = oldConsoleErr;
    });
});