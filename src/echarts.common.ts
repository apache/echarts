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
    RendererSVG,
    RendererCanvas
} from './export/renderers';

import {
    ChartLine,
    ChartBar,
    ChartPie,
    ChartScatter
} from './export/charts';

import {
    ComponentGrid,
    ComponentGraphic,
    ComponentToolbox,
    ComponentTooltip,
    ComponentAxisPointer,
    ComponentTitle,
    ComponentMarkPoint,
    ComponentMarkLine,
    ComponentMarkArea,
    ComponentLegendScroll,
    ComponentDataZoom,
    ComponentAria,
    ComponentDataset
} from './export/components';


// -----------------
// Render engines
// -----------------


// Render via Canvas.
// echarts.init(dom, null, { renderer: 'canvas' })
use([RendererCanvas]);
// Render via SVG.
// echarts.init(dom, null, { renderer: 'svg' })
use([RendererSVG]);

use([
    ChartLine,
    ChartBar,
    ChartPie,
    ChartScatter
]);

use([
    ComponentGraphic,
    ComponentTooltip,
    ComponentAxisPointer,
    ComponentLegendScroll,
    ComponentGrid,
    ComponentTitle,
    ComponentMarkPoint,
    ComponentMarkLine,
    ComponentMarkArea,
    ComponentDataZoom,
    ComponentToolbox,
    ComponentAria,
    ComponentDataset
]);
