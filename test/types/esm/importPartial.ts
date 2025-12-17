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

import {init, use, ComposeOption} from '../../core';
import {
    BarChart,
    BarSeriesOption,
    LineChart,
    LineSeriesOption
} from '../../charts';
import {
    GridComponent,
    GridComponentOption,

    DataZoomComponent,
    DataZoomComponentOption,
} from '../../components';
import {
    CanvasRenderer
} from '../../renderers';

use([BarChart, LineChart, GridComponent, DataZoomComponent, CanvasRenderer]);

type Option = ComposeOption<
    GridComponentOption | DataZoomComponentOption
    | BarSeriesOption | LineSeriesOption
>;

const option: Option= {
    // xAxis and yAxis should been add as dependencies
    xAxis: {
        min: 0,
        max: 10
    },
    yAxis: {
        min: 0,
        max: 10
    },
    series: [{
        type: 'bar'
    }]
}

const dom = document.createElement('div');
dom.className = 'chart';

const chart = init(dom);
chart.setOption(option);