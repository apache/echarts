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

import { EChartsType } from '@/src/echarts';
import { createChart, getViewGroup } from '../../core/utHelper';
import Group from 'zrender/src/graphic/Group';
import { ZRColor } from '@/src/util/types';
import { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from '@/src/chart/custom/CustomSeries';


describe('custom_series', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });


    it('visual_palette', function () {
        const colors = ['#111111', '#222222', '#333333'];
        const resultPaletteColors: ZRColor[] = [];

        function renderItem(params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) {
            const color = api.visual('color');
            resultPaletteColors.push(color);
            return {
                type: 'circle'
            };
        }

        chart.setOption({
            color: colors,
            xAxis: { data: ['a'] },
            yAxis: {},
            series: [{
                type: 'custom',
                renderItem: renderItem,
                data: [11]
            }, {
                type: 'custom',
                renderItem: renderItem,
                data: [22]
            }, {
                type: 'custom',
                renderItem: renderItem,
                data: [33]
            }]
        }, true);

        expect(resultPaletteColors).toEqual(colors);
    });

    it('should pass user defined data to event handlers', async () => {
        const data = [
            [10, 16],
            [20, 18],
            [30, 26],
            [40, 32],
            [50, 56],
          ];
        const option = {
            xAxis: { scale: true },
            yAxis: {},
            grid: {
                containLabel: false,
                left: '10%',
                right: '10%',
                top: 60,
                bottom: 70
            },
            series: [
                {
                    type: 'custom',
                    renderItem: function (params: any, api:any) {
                        const yValue = api.value(1);
                        const start = api.coord([api.value(0), yValue]);
                        const size = api.size([0, yValue]);
                        return {
                            type: 'rect',
                            info: { foo: 'bar' },
                            shape: {
                                x: start[0],
                                y: start[1],
                                width: 50,
                                height: size[1]
                            }
                        };
                    },
                    data: data
                }
            ]
        };
        chart.setOption(option);
        let customInfo: any;
        chart.on('mousemove', param => customInfo = param.info);
        const el = chart.getDom().children.item(0);
        const e = new MouseEvent('mousemove');
        Object.assign(e, { zrX: 100, zrY: 270 });
        el.dispatchEvent(e)
        expect(customInfo).toEqual({ foo: 'bar' });
    })

    // https://github.com/apache/echarts/issues/18402
    describe('remove_elements_with_leaveTo', function () {

        function makeOption(data: number[][], renderItem: () => unknown) {
            return {
                animationDurationUpdate: 10,
                xAxis: {},
                yAxis: {},
                series: {
                    type: 'custom',
                    data: data,
                    renderItem: renderItem
                }
            };
        }

        function makeGroupOption(childNames: string[], mergeChildren?: 'byName') {
            return makeOption([[11, 22]], function () {
                return {
                    type: 'group',
                    $mergeChildren: mergeChildren,
                    children: childNames.map((name, idx) => ({
                        type: 'rect',
                        name: name,
                        leaveTo: { style: { opacity: 0 } },
                        shape: { x: idx * 20, y: 0, width: 10, height: 10 },
                        style: { fill: 'green' }
                    }))
                };
            });
        }

        function getSeriesGroup() {
            return getViewGroup(chart, 'series', 0);
        }

        // Elements that have `leaveTo` are kept until the leave animation ends.
        function waitForLeaveAnimation() {
            return new Promise(resolve => setTimeout(resolve, 200));
        }

        it('should remove a data item element that has leaveTo', async function () {
            function renderItem() {
                return {
                    type: 'rect',
                    transition: 'all',
                    enterFrom: { style: { opacity: 0 } },
                    leaveTo: { style: { opacity: 0 } },
                    x: 100,
                    y: 100,
                    shape: { x: 0, y: 0, width: 100, height: 100 },
                    style: { fill: 'green', opacity: 1 }
                };
            }

            chart.setOption(makeOption([[11, 22], [33, 44]], renderItem));
            expect(getSeriesGroup().childCount()).toEqual(2);

            // Remove the second element and update the first one.
            expect(() => chart.setOption(makeOption([[11, 22]], renderItem))).not.toThrow();
            await waitForLeaveAnimation();
            expect(getSeriesGroup().childCount()).toEqual(1);

            // Remove the first element, which has been updated.
            expect(() => chart.setOption(makeOption([], renderItem))).not.toThrow();
            await waitForLeaveAnimation();
            expect(getSeriesGroup().childCount()).toEqual(0);
        });

        it('should remove a group child that has leaveTo', async function () {
            chart.setOption(makeGroupOption(['a', 'b', 'c']));
            const group = getSeriesGroup().childAt(0) as Group;
            expect(group.childCount()).toEqual(3);

            expect(() => chart.setOption(makeGroupOption(['a']))).not.toThrow();
            expect(group.childCount()).toEqual(3);
            await waitForLeaveAnimation();
            expect(group.childCount()).toEqual(1);
            expect(group.childAt(0).name).toEqual('a');
        });

        it('should remove a group child that has leaveTo when merging children by name', async function () {
            chart.setOption(makeGroupOption(['a', 'b', 'c'], 'byName'));
            const group = getSeriesGroup().childAt(0) as Group;
            expect(group.childCount()).toEqual(3);

            expect(() => chart.setOption(makeGroupOption(['b'], 'byName'))).not.toThrow();
            expect(group.childCount()).toEqual(3);
            await waitForLeaveAnimation();
            expect(group.childCount()).toEqual(1);
            expect(group.childAt(0).name).toEqual('b');
        });
    });
});
