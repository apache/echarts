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

import { getContentFromModel } from '../../../../../src/component/toolbox/feature/DataView';
import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';


describe('toolbox/DataView', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('aligns category-axis series values by data item name', function () {
        chart.setOption({
            xAxis: {
                type: 'category',
                data: ['cat-1', 'cat-2', 'col-1', 'col-2', 'col-3', 'col-4']
            },
            yAxis: {},
            series: [
                {
                    type: 'line',
                    name: 'cats',
                    data: [
                        { name: 'cat-1', value: 1 },
                        { name: 'cat-2', value: 2 }
                    ]
                },
                {
                    type: 'line',
                    name: 'cols',
                    data: [
                        { name: 'col-1', value: 3 },
                        { name: 'col-2', value: 4 },
                        { name: 'col-3', value: 5 },
                        { name: 'col-4', value: 6 }
                    ]
                }
            ]
        });

        expect(getContentFromModel(getECModel(chart)).value).toEqual([
            ' \tcats\tcols',
            'cat-1\t1\t',
            'cat-2\t2\t',
            'col-1\t\t3',
            'col-2\t\t4',
            'col-3\t\t5',
            'col-4\t\t6'
        ].join('\n'));
    });

});
