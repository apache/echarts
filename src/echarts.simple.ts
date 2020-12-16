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

import {use} from './extension';

export * from './export/core';
// ----------------------------------------------
// All of the modules that are allowed to be
// imported are listed below.
//
// Users MUST NOT import other modules that are
// not included in this list.
// ----------------------------------------------

import {
    CanvasRenderer
} from './export/renderers';

import {
    LineChart,
    BarChart,
    PieChart
} from './export/charts';

import {
    GridSimpleComponent,
    AriaComponent,
    DatasetComponent
} from './export/components';

// Render via Canvas.
// echarts.init(dom, null, { renderer: 'canvas' })
use([CanvasRenderer]);

use([
    LineChart,
    BarChart,
    PieChart
]);

use([
    GridSimpleComponent,
    AriaComponent,
    DatasetComponent
]);
