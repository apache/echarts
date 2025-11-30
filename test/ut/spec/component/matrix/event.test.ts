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

    it('should trigger click event on matrix cell when triggerEvent is true', function () {
        const option = {
            matrix: {
                triggerEvent: true,
                x: {
                    data: ['A', 'B']
                },
                y: {
                    data: ['Y']
                },
                body: {
                    data: [
                        { coord: [0, 0], value: 'Cell A' }
                    ]
                }
            }
        };

        chart.setOption(option);

        let clickedParams: any = null;

        chart.on('click', function (params) {
            clickedParams = params;
        });

        // Find the matrix cell element
        const zr = chart.getZr();
        const displayList = zr.storage.getDisplayList();

        let targetEl;
        for (let i = 0; i < displayList.length; i++) {
            const el = displayList[i];
            const ecData = getECData(el);
            if (ecData && ecData.eventData && ecData.eventData.name === 'Cell A') {
                // Find the cell with the specific name
                targetEl = el;
                break;
            }
        }

        expect(targetEl).toBeDefined();

        // Trigger click
        zr.trigger('click', {
            target: targetEl,
            offsetX: 10, // Dummy
            offsetY: 10  // Dummy
        });

        expect(clickedParams).not.toBeNull();
        expect(clickedParams.componentType).toEqual('matrix');
        expect(clickedParams.matrixIndex).toEqual(0);
        expect(clickedParams.targetType).toEqual('body');
        expect(clickedParams.name).toEqual('Cell A');
        expect(clickedParams.coord).toEqual([0, 0]);
    });

    it('should not attach eventData when triggerEvent is false (default)', function () {
        const option = {
            matrix: {
                x: {
                    data: ['A']
                },
                y: {
                    data: ['Y']
                },
                body: {
                    data: [
                        { coord: [0, 0], value: 'Cell A' }
                    ]
                }
            }
        };

        chart.setOption(option);

        const zr = chart.getZr();
        const displayList = zr.storage.getDisplayList();

        let hasEventData = false;
        for (let i = 0; i < displayList.length; i++) {
            const el = displayList[i];
            const ecData = getECData(el);
            if (ecData && ecData.eventData && ecData.eventData.componentType === 'matrix') {
                hasEventData = true;
                break;
            }
        }

        expect(hasEventData).toEqual(false);
    });
});
