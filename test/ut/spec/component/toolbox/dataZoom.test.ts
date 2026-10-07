
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
import GridModel from '../../../../../src/coord/cartesian/GridModel';
import DataZoomModel from '../../../../../src/component/dataZoom/DataZoomModel';


describe('toolbox/feature/DataZoom', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function brushRect(x: [number, number], y: [number, number]) {
        const ecModel = getECModel(chart);
        const toolboxView = (chart as any).getViewOfComponentModel(ecModel.getComponent('toolbox'));
        const gridModel = ecModel.getComponent('grid') as GridModel;
        const rect = gridModel.coordinateSystem.getRect();
        toolboxView._features.get('dataZoom')._brushController.trigger('brush', {
            isEnd: true,
            areas: [{
                brushType: 'rect',
                panelId: 'grid--' + gridModel.id,
                range: [
                    [rect.x + rect.width * x[0], rect.x + rect.width * x[1]],
                    [rect.y + rect.height * y[0], rect.y + rect.height * y[1]]
                ]
            }]
        });
    }

    function zoomedAxes() {
        return getECModel(chart).findComponents({ mainType: 'dataZoom', subType: 'select' })
            .map(dzModel => (dzModel as DataZoomModel).option)
            .filter(dz => dz.startValue != null)
            .map(dz => ({
                xAxisIndex: dz.xAxisIndex,
                yAxisIndex: dz.yAxisIndex,
                startValue: dz.startValue,
                endValue: dz.endValue
            }));
    }

    it('zooms only the declared yAxis when another yAxis shares the grid', function () {
        chart.setOption({
            toolbox: {
                feature: {
                    dataZoom: { yAxisIndex: [0] }
                }
            },
            xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
            yAxis: [{ type: 'value' }, { type: 'value', position: 'right' }],
            series: [
                { type: 'line', data: [150, 230, 224, 218, 135, 147, 260] },
                { type: 'line', yAxisIndex: 1, data: [100, 20, 22, 18, 13, 47, 60] }
            ]
        });

        brushRect([0, 1], [0.2, 0.4]);

        expect(zoomedAxes()).toEqual([
            { xAxisIndex: 0, startValue: 0, endValue: 6 },
            { yAxisIndex: 0, startValue: 180, endValue: 240 }
        ]);
    });

});
