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

export * from './echarts';
export * from './exportAPI';

import './component/dataset';
import './component/transform';

// ----------------------------------------------
// All of the modules that are allowed to be
// imported are listed below.
//
// Users MUST NOT import other modules that are
// not included in this list.
// ----------------------------------------------



// ----------------
// Charts (series)
// ----------------



// All of the series types, for example:
// chart.setOption({
//     series: [{
//         type: 'line' // or 'bar', 'pie', ...
//     }]
// });

import './chart/line';
import './chart/bar';
import './chart/pie';
import './chart/scatter';
import './chart/radar';
import './chart/map';
import './chart/tree';
import './chart/treemap';
import './chart/graph';
import './chart/gauge';
import './chart/funnel';
import './chart/parallel';
import './chart/sankey';
import './chart/boxplot';
import './chart/candlestick';
import './chart/effectScatter';
import './chart/lines';
import './chart/heatmap';
import './chart/pictorialBar';
import './chart/themeRiver';
import './chart/sunburst';
import './chart/custom';



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
import './component/grid';

// `polar` coordinate system, for example:
// chart.setOption({
//     polar: {...},
//     radiusAxis: {...},
//     angleAxis: {...},
//     series: [{
//         coordinateSystem: 'polar'
//     }]
// });
import './component/polar';

// `geo` coordinate system, for example:
// chart.setOption({
//     geo: {...},
//     series: [{
//         coordinateSystem: 'geo'
//     }]
// });
import './component/geo';

// `singleAxis` coordinate system (notice, it is a coordinate system
// with only one axis, work for chart like theme river), for example:
// chart.setOption({
//     singleAxis: {...}
//     series: [{type: 'themeRiver', ...}]
// });
import './component/singleAxis';

// `parallel` coordinate system, only work for parallel series, for example:
// chart.setOption({
//     parallel: {...},
//     parallelAxis: [{...}, ...],
//     series: [{
//         type: 'parallel'
//     }]
// });
import './component/parallel';

// `calendar` coordinate system. for example,
// chart.setOptionp({
//     calendar: {...},
//     series: [{
//         coordinateSystem: 'calendar'
//     }]
// );
import './component/calendar';



// ------------------
// Other components
// ------------------



// `graphic` component, for example:
// chart.setOption({
//     graphic: {...}
// });
import './component/graphic';

// `toolbox` component, for example:
// chart.setOption({
//     toolbox: {...}
// });
import './component/toolbox';

// `tooltip` component, for example:
// chart.setOption({
//     tooltip: {...}
// });
import './component/tooltip';

// `axisPointer` component, for example:
// chart.setOption({
//     tooltip: {axisPointer: {...}, ...}
// });
// Or
// chart.setOption({
//     axisPointer: {...}
// });
import './component/axisPointer';

// `brush` component, for example:
// chart.setOption({
//     brush: {...}
// });
// Or
// chart.setOption({
//     tooltip: {feature: {brush: {...}}
// })
import './component/brush';

// `title` component, for example:
// chart.setOption({
//     title: {...}
// });
import './component/title';

// `timeline` component, for example:
// chart.setOption({
//     timeline: {...}
// });
import './component/timeline';

// `markPoint` component, for example:
// chart.setOption({
//     series: [{markPoint: {...}}]
// });
import './component/markPoint';

// `markLine` component, for example:
// chart.setOption({
//     series: [{markLine: {...}}]
// });
import './component/markLine';

// `markArea` component, for example:
// chart.setOption({
//     series: [{markArea: {...}}]
// });
import './component/markArea';

// `legend` component scrollable, for example:
// chart.setOption({
//     legend: {type: 'scroll'}
// });
import './component/legendScroll';

// `legend` component not scrollable. for example:
// chart.setOption({
//     legend: {...}
// });
import './component/legend';

// `dataZoom` component including both `dataZoomInside` and `dataZoomSlider`.
import './component/dataZoom';

// `dataZoom` component providing drag, pinch, wheel behaviors
// inside coodinate system, for example:
// chart.setOption({
//     dataZoom: {type: 'inside'}
// });
import './component/dataZoomInside';

// `dataZoom` component providing a slider bar, for example:
// chart.setOption({
//     dataZoom: {type: 'slider'}
// });
import './component/dataZoomSlider';

// `dataZoom` component including both `visualMapContinuous` and `visualMapPiecewise`.
import './component/visualMap';

// `visualMap` component providing continuous bar, for example:
// chart.setOption({
//     visualMap: {type: 'continuous'}
// });
import './component/visualMapContinuous';

// `visualMap` component providing pieces bar, for example:
// chart.setOption({
//     visualMap: {type: 'piecewise'}
// });
import './component/visualMapPiecewise';

// `aria` component providing aria, for example:
// chart.setOption({
//     aria: {...}
// });
import './component/aria';



// -----------------
// Render engines
// -----------------



// Provide IE 6,7,8 compatibility.
// import 'zrender/vml/vml';

// Render via SVG rather than canvas.
import 'zrender/src/svg/svg';
