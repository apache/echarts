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

import * as echarts from '../../';

const dom = document.createElement('div');
dom.className = 'chart';

const chart: echarts.EChartsType = echarts.init(dom);

const option: echarts.EChartsOption = {
    series: [{
        type: 'bar',
        emphasis: {
            itemStyle: {
                color: 'red'
            }
        }
    }]
};
chart.setOption(option);

/**
 * See https://github.com/apache/echarts/issues/16833
 */
const option2: echarts.EChartsOption = {
    title: { text: 'World Population' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {},
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', boundaryGap: [0, 0.01] },
    yAxis: {
        axisLabel: { width: 40, overflow: 'break' },
        data: ['Brazil', 'Indonesia', 'USA', 'India', 'China', 'World']
    },
    series: [
        {
        name: '2011',
        type: 'bar',
        data: [18203, 23489, 29034, 104970, 131744, 630230]
        },
        {
        name: '2012',
        type: 'bar',
        data: [19325, 23438, 31000, 121594, 134141, 681807]
        }
    ]
};