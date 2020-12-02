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


// In somehow. If we export like
// export * as LineChart './chart/line/install'
// The exported code will be transformed to
// import * as LineChart_1 './chart/line/install'; export {LineChart_1 as LineChart};
// Treeshaking in webpack will not work even if we configured sideEffects to false in package.json

export {install as ChartLine} from './chart/line/install';
export {install as ChartBar} from './chart/bar/install';

export {install as ChartPie} from './chart/pie/install';
export {install as ChartScatter} from './chart/scatter/install';
export {install as ChartRadar} from './chart/radar/install';
export {install as ChartMap} from './chart/map/install';
export {install as ChartTree} from './chart/tree/install';
export {install as ChartTreemap} from './chart/treemap/install';
export {install as ChartGraph} from './chart/graph/install';
export {install as ChartGauge} from './chart/gauge/install';
export {install as ChartFunnel} from './chart/funnel/install';
export {install as ChartParallel} from './chart/parallel/install';
export {install as ChartSankey} from './chart/sankey/install';
export {install as ChartBoxplot} from './chart/boxplot/install';
export {install as ChartCandlestick} from './chart/candlestick/install';
export {install as ChartEffectScatter} from './chart/effectScatter/install';
export {install as ChartLines} from './chart/lines/install';
export {install as ChartHeatmap} from './chart/heatmap/install';
export {install as ChartPictorialBar} from './chart/bar/installPictorialBar';
export {install as ChartThemeRiver} from './chart/themeRiver/install';
export {install as ChartSunburst} from './chart/sunburst/install';
export {install as ChartCustom} from './chart/custom/install';


export {install as ComponentGridSimple} from './component/grid/installSimple';

export {install as ComponentPolar} from './component/polar/install';

export {install as ComponentGeo} from './component/geo/install';

export {install as ComponentSingleAxis} from './component/singleAxis/install';
export {install as ComponentParallel} from './component/parallel/install';
export {install as ComponentCalendar} from './component/calendar/install';



export {install as ComponentGraphic} from './component/graphic/install';

export {install as ComponentToolbox} from './component/toolbox/install';

export {install as ComponentTooltip} from './component/tooltip/install';

export {install as ComponentAxisPointer} from './component/axisPointer/install';
export {install as ComponentBrush} from './component/brush/install';
export {install as ComponentTitle} from './component/title/install';
export {install as ComponentTimeline} from './component/timeline/install';
export {install as ComponentMarkPoint} from './component/marker/installMarkPoint';
export {install as ComponentMarkLine} from './component/marker/installMarkLine';
export {install as ComponentMarkArea} from './component/marker/installMarkArea';
export {install as ComponentLegendScroll} from './component/legend/installLegendScroll';

export {install as ComponentLegend} from './component/legend/install';

export {install as ComponentDataZoom} from './component/dataZoom/install';

export {install as ComponentDataZoomInside} from './component/dataZoom/installDataZoomInside';

export {install as ComponentDataZoomSlider} from './component/dataZoom/installDataZoomSlider';

export {install as ComponentVisualMap} from './component/visualMap/install';

export {install as ComponentVisualMapContinuous} from './component/visualMap/installVisualMapContinuous';

export {install as ComponentVisualMapPiecewise} from './component/visualMap/installVisualMapPiecewise';

export {install as ComponentAria} from './component/aria/install';

/**
 * If developers write
 * import * as echarts from 'echarts'.
 * It will use all components by default.
 *
 * But if developers want to import partially.
 * import {use, ChartLine} from 'echarts';
 *
 * This will be treeshaked.
 */
export {_$useAll} from './importsAll';

// Provide IE 6,7,8 compatibility.
// import 'zrender/vml/vml';

// Render via SVG rather than canvas.
import 'zrender/src/svg/svg';
