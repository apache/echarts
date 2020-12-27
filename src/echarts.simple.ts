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

import {install as CanvasRenderer} from './renderer/installCanvasRenderer';

import {install as LineChart} from './chart/line/install';
import {install as BarChart} from './chart/bar/install';
import {install as PieChart} from './chart/pie/install';

import {install as GridSimpleComponent} from './component/grid/installSimple';
import {install as AriaComponent} from './component/aria/install';
import {install as DatasetComponent} from './component/dataset/install';

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
