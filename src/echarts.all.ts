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
    ChartScatter,
    ChartRadar,
    ChartMap,
    ChartTree,
    ChartTreemap,
    ChartGraph,
    ChartGauge,
    ChartFunnel,
    ChartParallel,
    ChartSankey,
    ChartBoxplot,
    ChartCandlestick,
    ChartEffectScatter,
    ChartLines,
    ChartHeatmap,
    ChartPictorialBar,
    ChartThemeRiver,
    ChartSunburst,
    ChartCustom
} from './export/charts';

import {
    ComponentGrid,
    ComponentPolar,
    ComponentGeo,
    ComponentSingleAxis,
    ComponentParallel,
    ComponentCalendar,
    ComponentGraphic,
    ComponentToolbox,
    ComponentTooltip,
    ComponentAxisPointer,
    ComponentBrush,
    ComponentTitle,
    ComponentTimeline,
    ComponentMarkPoint,
    ComponentMarkLine,
    ComponentMarkArea,
    ComponentLegendScroll,
    ComponentLegend,
    ComponentDataZoom,
    ComponentDataZoomInside,
    ComponentDataZoomSlider,
    ComponentVisualMap,
    ComponentVisualMapContinuous,
    ComponentVisualMapPiecewise,
    ComponentAria,
    ComponentDataset,
    ComponentTransform
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

// ----------------
// Charts (series)
// ----------------

// All of the series types, for example:
// chart.setOption({
//     series: [{
//         type: 'line' // or 'bar', 'pie', ...
//     }]
// });


use([
    ChartLine,
    ChartBar,
    ChartPie,
    ChartScatter,
    ChartRadar,
    ChartMap,
    ChartTree,
    ChartTreemap,
    ChartGraph,
    ChartGauge,
    ChartFunnel,
    ChartParallel,
    ChartSankey,
    ChartBoxplot,
    ChartCandlestick,
    ChartEffectScatter,
    ChartLines,
    ChartHeatmap,
    ChartPictorialBar,
    ChartThemeRiver,
    ChartSunburst,
    ChartCustom
]);

// -------------------
// Coordinate systems
// -------------------



// All of the axis modules have been included in the
// coordinate system module below, do not need to
// make extra import.

// `cartesian` coordinate system. For some historical
// reasons, it is named as grid, for example:
// chart.setOption({
//     grid: {...},
//     xAxis: {...},
//     yAxis: {...},
//     series: [{...}]
// });
use(ComponentGrid);

// `polar` coordinate system, for example:
// chart.setOption({
//     polar: {...},
//     radiusAxis: {...},
//     angleAxis: {...},
//     series: [{
//         coordinateSystem: 'polar'
//     }]
// });
use(ComponentPolar);

// `geo` coordinate system, for example:
// chart.setOption({
//     geo: {...},
//     series: [{
//         coordinateSystem: 'geo'
//     }]
// });
use(ComponentGeo);

// `singleAxis` coordinate system (notice, it is a coordinate system
// with only one axis, work for chart like theme river), for example:
// chart.setOption({
//     singleAxis: {...}
//     series: [{type: 'themeRiver', ...}]
// });
use(ComponentSingleAxis);

// `parallel` coordinate system, only work for parallel series, for example:
// chart.setOption({
//     parallel: {...},
//     parallelAxis: [{...}, ...],
//     series: [{
//         type: 'parallel'
//     }]
// });
use(ComponentParallel);

// `calendar` coordinate system. for example,
// chart.setOptionp({
//     calendar: {...},
//     series: [{
//         coordinateSystem: 'calendar'
//     }]
// );
use(ComponentCalendar);



// ------------------
// Other components
// ------------------



// `graphic` component, for example:
// chart.setOption({
//     graphic: {...}
// });
use(ComponentGraphic);

// `toolbox` component, for example:
// chart.setOption({
//     toolbox: {...}
// });
use(ComponentToolbox);

// `tooltip` component, for example:
// chart.setOption({
//     tooltip: {...}
// });
use(ComponentTooltip);

// `axisPointer` component, for example:
// chart.setOption({
//     tooltip: {axisPointer: {...}, ...}
// });
// Or
// chart.setOption({
//     axisPointer: {...}
// });
use(ComponentAxisPointer);

// `brush` component, for example:
// chart.setOption({
//     brush: {...}
// });
// Or
// chart.setOption({
//     tooltip: {feature: {brush: {...}}
// })
use(ComponentBrush);

// `title` component, for example:
// chart.setOption({
//     title: {...}
// });
use(ComponentTitle);

// `timeline` component, for example:
// chart.setOption({
//     timeline: {...}
// });
use(ComponentTimeline);

// `markPoint` component, for example:
// chart.setOption({
//     series: [{markPoint: {...}}]
// });
use(ComponentMarkPoint);

// `markLine` component, for example:
// chart.setOption({
//     series: [{markLine: {...}}]
// });
use(ComponentMarkLine);

// `markArea` component, for example:
// chart.setOption({
//     series: [{markArea: {...}}]
// });
use(ComponentMarkArea);

// `legend` component scrollable, for example:
// chart.setOption({
//     legend: {type: 'scroll'}
// });
use(ComponentLegendScroll);

// `legend` component not scrollable. for example:
// chart.setOption({
//     legend: {...}
// });
use(ComponentLegend);

// `dataZoom` component including both `dataZoomInside` and `dataZoomSlider`.
use(ComponentDataZoom);

// `dataZoom` component providing drag, pinch, wheel behaviors
// inside coodinate system, for example:
// chart.setOption({
//     dataZoom: {type: 'inside'}
// });
use(ComponentDataZoomInside);

// `dataZoom` component providing a slider bar, for example:
// chart.setOption({
//     dataZoom: {type: 'slider'}
// });
use(ComponentDataZoomSlider);

// `dataZoom` component including both `visualMapContinuous` and `visualMapPiecewise`.
use(ComponentVisualMap);

// `visualMap` component providing continuous bar, for example:
// chart.setOption({
//     visualMap: {type: 'continuous'}
// });
use(ComponentVisualMapContinuous);

// `visualMap` component providing pieces bar, for example:
// chart.setOption({
//     visualMap: {type: 'piecewise'}
// });
use(ComponentVisualMapPiecewise);

// `aria` component providing aria, for example:
// chart.setOption({
//     aria: {...}
// });
use(ComponentAria);


// dataset transform
// chart.setOption({
//     dataset: {
//          transform: []
//     }
// });
use(ComponentTransform);

use(ComponentDataset);