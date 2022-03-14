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
const echarts = require('../../dist/echarts');
const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: 510,
    height: 510
});

chart.setOption({
    series: [
        {
            name: 'Nightingale Chart',
            type: 'pie',
            radius: [50, 250],
            center: ['50%', '50%'],
            roseType: 'radius',
            label: {
                show: false,
            },
            itemStyle: {
                borderColor: 'white',
                borderWidth: 4,
            },
            labelLine: {
                show: false,
            },
            animationType: 'scale',
            animationDuration: 500,
            animationEasing: 'cubicOut',
            animationDelay(idx) {
                return (1 - idx / 8) * 500;
            },
            data: [
                { value: 40, name: 'rose 1', itemStyle: { borderRadius: [5, 20] } },
                { value: 32, name: 'rose 2', itemStyle: { borderRadius: [5, 18] } },
                { value: 28, name: 'rose 3', itemStyle: { borderRadius: [5, 16] } },
                { value: 24, name: 'rose 4', itemStyle: { borderRadius: [5, 14] } },
                { value: 19, name: 'rose 5', itemStyle: { borderRadius: [5, 12] } },
                { value: 15, name: 'rose 6', itemStyle: { borderRadius: [5, 10] } },
                { value: 12, name: 'rose 7', itemStyle: { borderRadius: [5, 8] } },
                { value: 10, name: 'rose 8', itemStyle: { borderRadius: [5, 6] } },
            ],
        },
    ],
});
const str = chart.renderToSVGString();
console.log(str);
chart.dispose();