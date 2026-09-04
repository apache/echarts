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

import * as echarts from 'echarts';

const chart: echarts.EChartsType = echarts.init(document.createElement('div'));

// `min`/`max` accept `null`/`undefined` to enable auto calculation.
// See https://echarts.apache.org/en/option.html#yAxis.max
const option: echarts.EChartsOption = {
    xAxis: {
        min: null,
        max: undefined
    },
    yAxis: {
        // Function returning null/undefined should also be allowed (fixed in #21313).
        min: () => null,
        max: () => undefined
    },
    series: [{
        type: 'line',
        data: [[1, 2], [2, 3]]
    }]
};

chart.setOption(option);
