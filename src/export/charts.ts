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


// In somehow. If we export like
// export * as LineChart './chart/line/install'
// The exported code will be transformed to
// import * as LineChart_1 './chart/line/install'; export {LineChart_1 as LineChart};
// Treeshaking in webpack will not work even if we configured sideEffects to false in package.json

export {install as ChartLine} from '../chart/line/install';
export {install as ChartBar} from '../chart/bar/install';

export {install as ChartPie} from '../chart/pie/install';
export {install as ChartScatter} from '../chart/scatter/install';
export {install as ChartRadar} from '../chart/radar/install';
export {install as ChartMap} from '../chart/map/install';
export {install as ChartTree} from '../chart/tree/install';
export {install as ChartTreemap} from '../chart/treemap/install';
export {install as ChartGraph} from '../chart/graph/install';
export {install as ChartGauge} from '../chart/gauge/install';
export {install as ChartFunnel} from '../chart/funnel/install';
export {install as ChartParallel} from '../chart/parallel/install';
export {install as ChartSankey} from '../chart/sankey/install';
export {install as ChartBoxplot} from '../chart/boxplot/install';
export {install as ChartCandlestick} from '../chart/candlestick/install';
export {install as ChartEffectScatter} from '../chart/effectScatter/install';
export {install as ChartLines} from '../chart/lines/install';
export {install as ChartHeatmap} from '../chart/heatmap/install';
export {install as ChartPictorialBar} from '../chart/bar/installPictorialBar';
export {install as ChartThemeRiver} from '../chart/themeRiver/install';
export {install as ChartSunburst} from '../chart/sunburst/install';
export {install as ChartCustom} from '../chart/custom/install';

