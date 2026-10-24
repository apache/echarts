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
import Element from 'zrender/src/Element';


describe('series/tree', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getDataIndex(name: string): number {
        const data = getECModel(chart).getSeriesByIndex(0).getData();
        const dataIndex = data.indexOfName(name);
        expect(dataIndex >= 0).toEqual(true);
        return dataIndex;
    }

    function getEdge(dataIndex: number): Element & {
        selected?: boolean,
        states?: {
            select?: {
                style?: {
                    stroke?: string
                }
            }
        }
    } {
        const seriesModel = getECModel(chart).getSeriesByIndex(0);
        const symbolEl = seriesModel.getData().getItemGraphicEl(dataIndex) as Element & {
            __edge: Element
        };
        return symbolEl.__edge;
    }

    it('applies select.lineStyle to selected edges', function () {
        const selectedColor = '#ff6600';

        chart.setOption({
            series: [{
                type: 'tree',
                selectedMode: 'single',
                animation: false,
                select: {
                    itemStyle: {
                        color: selectedColor
                    },
                    lineStyle: {
                        color: selectedColor
                    }
                },
                data: [{
                    name: 'root',
                    children: [{
                        name: 'child 1'
                    }, {
                        name: 'child 2'
                    }]
                }]
            }]
        });

        const childDataIndex = getDataIndex('child 1');
        const siblingDataIndex = getDataIndex('child 2');
        const childEdge = getEdge(childDataIndex);
        const siblingEdge = getEdge(siblingDataIndex);

        expect(childEdge.states.select.style.stroke).toEqual(selectedColor);
        expect(childEdge.selected).toEqual(false);

        chart.dispatchAction({
            type: 'select',
            seriesIndex: 0,
            dataIndex: childDataIndex
        });

        expect(childEdge.selected).toEqual(true);
        expect(siblingEdge.selected).toEqual(false);

        chart.dispatchAction({
            type: 'select',
            seriesIndex: 0,
            dataIndex: siblingDataIndex
        });

        expect(childEdge.selected).toEqual(false);
        expect(siblingEdge.selected).toEqual(true);
    });

});
