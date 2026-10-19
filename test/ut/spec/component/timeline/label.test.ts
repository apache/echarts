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

import ZRText from 'zrender/src/graphic/Text';
import { createChart, getViewGroup } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import { EChartsOption } from '../../../../../src/export/option';


describe('timeline_label', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getLabels(): ZRText[] {
        const labels: ZRText[] = [];
        getViewGroup(chart, 'timeline').traverse(function (el) {
            if (el instanceof ZRText) {
                labels.push(el);
            }
        });
        return labels;
    }

    function getTexts(): string[] {
        return getLabels().map(label => label.style.text);
    }

    function makeOption(timelineOption: EChartsOption['timeline']): EChartsOption {
        return {
            animation: false,
            timeline: timelineOption
        };
    }

    it('should use progress.label.formatter for labels in progress', function () {
        chart.setOption(makeOption({
            axisType: 'category',
            currentIndex: 1,
            data: ['2001', '2002', '2003'],
            label: {
                formatter: 'normal {value}'
            },
            progress: {
                label: {
                    formatter: 'progress {value}'
                }
            }
        }));

        expect(getTexts()).toEqual(['progress 2001', 'progress 2002', 'normal 2003']);
    });

    it('should call progress.label.formatter callback like label.formatter', function () {
        const normalCalls: unknown[][] = [];
        const progressCalls: unknown[][] = [];

        chart.setOption(makeOption({
            axisType: 'category',
            currentIndex: 0,
            data: ['2001', '2002', '2003'],
            label: {
                formatter: function (value, index) {
                    normalCalls.push([value, index]);
                    return 'normal ' + value;
                }
            },
            progress: {
                label: {
                    formatter: function (value, index) {
                        progressCalls.push([value, index]);
                        return 'progress ' + value + ' ' + index;
                    }
                }
            }
        }));

        // Same arguments as the ones `label.formatter` gets for each label.
        expect(progressCalls).toEqual([['2001', 0], ['2002', 1], ['2003', 2]]);
        expect(normalCalls).toEqual(expect.arrayContaining(progressCalls));
        expect(getTexts()).toEqual(['progress 2001 0', 'normal 2002', 'normal 2003']);
    });

    it('should update label text when the current index changes', function () {
        chart.setOption(makeOption({
            axisType: 'category',
            currentIndex: 0,
            data: ['2001', '2002', '2003'],
            progress: {
                label: {
                    formatter: '[{value}]'
                }
            }
        }));

        expect(getTexts()).toEqual(['[2001]', '2002', '2003']);

        chart.dispatchAction({
            type: 'timelineChange',
            currentIndex: 2
        });

        expect(getTexts()).toEqual(['[2001]', '[2002]', '[2003]']);

        chart.dispatchAction({
            type: 'timelineChange',
            currentIndex: 1
        });

        expect(getTexts()).toEqual(['[2001]', '[2002]', '2003']);
    });

    it('should pass the same index as label.formatter on a value axis', function () {
        const normalCalls: unknown[][] = [];

        chart.setOption(makeOption({
            axisType: 'value',
            data: [10, 20, 30],
            label: {
                formatter: function (value, index) {
                    normalCalls.push([value, index]);
                    return 'normal ' + value;
                }
            },
            progress: {
                label: {
                    formatter: function (value, index) {
                        return 'progress ' + value + ' ' + index;
                    }
                }
            },
            emphasis: {
                label: {
                    formatter: function (value, index) {
                        return 'emphasis ' + value + ' ' + index;
                    }
                }
            }
        }));

        const labels = getLabels();
        expect(normalCalls).toEqual(expect.arrayContaining([[10, 0], [20, 1], [30, 2]]));
        expect(labels.map(label => label.states.progress.style.text))
            .toEqual(['progress 10 0', 'progress 20 1', 'progress 30 2']);
        expect(labels.map(label => label.states.emphasis.style.text))
            .toEqual(['emphasis 10 0', 'emphasis 20 1', 'emphasis 30 2']);
    });

    it('should use emphasis.label.formatter for the emphasis state', function () {
        chart.setOption(makeOption({
            axisType: 'category',
            currentIndex: 0,
            data: ['2001', '2002', '2003'],
            progress: {
                label: {
                    formatter: 'progress {value}'
                }
            },
            emphasis: {
                label: {
                    formatter: 'emphasis {value}'
                }
            }
        }));

        const labels = getLabels();
        expect(labels.map(label => label.states.emphasis.style.text))
            .toEqual(['emphasis 2001', 'emphasis 2002', 'emphasis 2003']);

        // Hover on a label that is not in progress.
        labels[1].useState('emphasis', true);
        expect(labels[1].style.text).toEqual('emphasis 2002');

        // Hover on a label in progress, then leave it.
        labels[0].useState('emphasis', true);
        expect(labels[0].style.text).toEqual('emphasis 2001');
        labels[0].removeState('emphasis');
        expect(labels[0].style.text).toEqual('progress 2001');
    });

    it('should keep the normal text in progress and emphasis states without their own formatter', function () {
        chart.setOption(makeOption({
            axisType: 'category',
            currentIndex: 1,
            data: ['2001', '2002', '2003'],
            label: {
                formatter: 'normal {value}'
            },
            progress: {
                label: {
                    color: 'red'
                }
            }
        }));

        const labels = getLabels();
        expect(getTexts()).toEqual(['normal 2001', 'normal 2002', 'normal 2003']);
        expect(labels[0].style.fill).toEqual('red');
        expect(labels[0].states.progress.style).not.toHaveProperty('text');
        expect(labels[0].states.emphasis.style).not.toHaveProperty('text');
    });

    it('should use progress.label.formatter of a data item', function () {
        chart.setOption(makeOption({
            axisType: 'category',
            currentIndex: 2,
            data: [
                '2001',
                {
                    value: '2002',
                    progress: {
                        label: {
                            formatter: 'item {value}'
                        }
                    }
                },
                '2003'
            ],
            progress: {
                label: {
                    formatter: 'progress {value}'
                }
            }
        }));

        expect(getTexts()).toEqual(['progress 2001', 'item 2002', 'progress 2003']);
    });

});
