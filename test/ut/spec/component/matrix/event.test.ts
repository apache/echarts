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

import { createChart } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { getECData } from '../../../../../src/util/innerStore';

describe('matrix_event', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should trigger click event on matrix cell', function () {
        const option = {
            matrix: {
                x: {
                    data: ['A', 'B']
                },
                y: {
                    data: ['Y']
                },
                body: {
                    silent: false,
                    itemStyle: {
                        color: 'transparent'
                    },
                    data: [
                        { coord: [0, 0], value: 'Cell A' }
                    ]
                }
            }
        };

        chart.setOption(option);

        let clicked = false;
        let componentType = '';
        let name = '';

        chart.on('click', function (params) {
            clicked = true;
            componentType = params.componentType;
            name = params.name;
        });

        // Find the matrix cell element
        const zr = chart.getZr();
        const storage = zr.storage;
        const displayList = storage.getDisplayList();

        let targetEl;
        for (let i = 0; i < displayList.length; i++) {
            const el = displayList[i];
            const ecData = getECData(el);
            if (ecData && ecData.componentMainType === 'matrix' && ecData.eventData) {
                // Find the cell with the specific name
                if (ecData.eventData.name === 'Cell A') {
                    targetEl = el;
                    break;
                }
            }
        }

        expect(targetEl).toBeDefined();

        // Trigger click
        zr.trigger('click', {
            target: targetEl,
            offsetX: 10, // Dummy
            offsetY: 10  // Dummy
        });

        expect(clicked).toEqual(true);
        expect(componentType).toEqual('matrix');
        expect(name).toEqual('Cell A');
    });
});
