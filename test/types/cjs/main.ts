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

import echarts = require('echarts');

function init() {
    var myChart = echarts.init(document.getElementById('chart0'));

    const option: echarts.EChartsOption = {
        title: {
            text: 'ECharts Getting Started Example'
        },
        tooltip: {},
        xAxis: {
            data: ['a', 'b', 'c', 'd', 'e', 'f']
        },
        yAxis: {},
        series: [
            {
            name: 'sales',
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20]
            }
        ]
    };

    myChart.on('click', function (params) {
        console.log(params.name);
        this.off('click');
    });

    myChart.on('rendered', function (params) {
        console.log(params.elapsedTime);
        this.off('rendered');
    });

    myChart.getZr().on('click', function (params) {
        console.log(params.offsetX);
        this.off('click');
    });

    myChart.setOption(option);
}

export function start() {
    init();
};
