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

import { EChartsType } from '../../../../../src/echarts';
import { createChart, getECModel } from '../../../core/utHelper';


describe('toolbox/dataZoom', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('restore exits dataZoom select cursor', function () {
        chart.setOption({
            toolbox: {
                feature: {
                    dataZoom: {},
                    restore: {}
                }
            },
            xAxis: {},
            yAxis: {},
            series: {
                type: 'line',
                data: [1, 2, 3]
            }
        });

        chart.dispatchAction({
            type: 'takeGlobalCursor',
            key: 'dataZoomSelect',
            dataZoomSelectActive: true
        });

        const dataZoomFeature = getDataZoomFeature(chart);

        expect(dataZoomFeature._isZoomActive).toEqual(true);
        expect(dataZoomFeature._brushController._brushType).toEqual('auto');
        expect(dataZoomFeature.model.get(['iconStatus', 'zoom'])).toEqual('emphasis');

        const restoreFeature = getToolboxFeature(chart, 'restore');
        restoreFeature.onclick(restoreFeature.ecModel, restoreFeature.api);

        expect(dataZoomFeature._brushController._brushType).toBeFalsy();
        expect(dataZoomFeature._isZoomActive).toEqual(false);
        expect(getDataZoomFeature(chart).model.get(['iconStatus', 'zoom'])).toEqual('normal');
    });

});

function getDataZoomFeature(chart: EChartsType): any {
    return getToolboxFeature(chart, 'dataZoom');
}

function getToolboxFeature(chart: EChartsType, featureName: string): any {
    const toolboxModel = getECModel(chart).getComponent('toolbox');
    // @ts-ignore access internal view state for regression verification.
    const toolboxView = chart._componentsMap[toolboxModel.__viewId] as any;
    return toolboxView._features.get(featureName);
}
