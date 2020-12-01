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

export {use} from './extension';

import './component/dataset';
import './component/transform';

// ----------------------------------------------
// All of the modules that are allowed to be
// imported are listed below.
//
// Users MUST NOT import other modules that are
// not included in this list.
// ----------------------------------------------


// In somehow. If we export like
// export * as LineChart './chart/line/install'
// The exported code will be transformed to
// import * as LineChart_1 './chart/line/install'; export {LineChart_1 as LineChart};
// Treeshaking in webpack will not work even if we configured sideEffects to false in package.json

export {install as LineChart} from './chart/line/install';
export {install as BarChart} from './chart/bar/install';

export {install as PieChart} from './chart/pie/install';
export {install as ScatterChart} from './chart/scatter/install';
export {install as RadarChart} from './chart/radar/install';
export {install as MapChart} from './chart/map/install';
export {install as TreeChart} from './chart/tree/install';
export {install as TreemapChart} from './chart/treemap/install';
export {install as GraphChart} from './chart/graph/install';
export {install as GaugeChart} from './chart/gauge/install';
export {install as FunnelChart} from './chart/funnel/install';
export {install as ParallelChart} from './chart/parallel/install';
export {install as SankeyChart} from './chart/sankey/install';
export {install as BoxplotChart} from './chart/boxplot/install';
export {install as CandlestickChart} from './chart/candlestick/install';
export {install as EffectScatterChart} from './chart/effectScatter/install';
export {install as LinesChart} from './chart/lines/install';
export {install as HeatmapChart} from './chart/heatmap/install';
export {install as PictorialBarChart} from './chart/bar/installPictorialBar';
export {install as ThemeRiverChart} from './chart/themeRiver/install';
export {install as SunburstChart} from './chart/sunburst/install';
export {install as CustomChart} from './chart/custom/install';


export {install as GridSimple} from './component/grid/installSimple';

export {install as Polar} from './component/polar/install';

export {install as Geo} from './component/geo/install';

export {install as SingleAxis} from './component/singleAxis/install';
export {install as Parallel} from './component/parallel/install';
export {install as Calendar} from './component/calendar/install';



export {install as Graphic} from './component/graphic/install';

export {install as Toolbox} from './component/toolbox/install';

export {install as Tooltip} from './component/tooltip/install';

export {install as AxisPointer} from './component/axisPointer/install';
export {install as Brush} from './component/brush/install';
export {install as Title} from './component/title/install';
export {install as Timeline} from './component/timeline/install';
export {install as MarkPoint} from './component/marker/installMarkPoint';
export {install as MarkLine} from './component/marker/installMarkLine';
export {install as MarkArea} from './component/marker/installMarkArea';
export {install as LegendScroll} from './component/legend/installLegendScroll';

export {install as Legend} from './component/legend/install';

export {install as DataZoom} from './component/dataZoom/install';

export {install as DataZoomInside} from './component/dataZoom/installDataZoomInside';

export {install as DataZoomSlider} from './component/dataZoom/installDataZoomSlider';

export {install as VisualMap} from './component/visualMap/install';

export {install as VisualMapContinuous} from './component/visualMap/installVisualMapContinuous';

export {install as VisualMapPiecewise} from './component/visualMap/installVisualMapPiecewise';

export {install as Aria} from './component/aria/install';



// Provide IE 6,7,8 compatibility.
// import 'zrender/vml/vml';

// Render via SVG rather than canvas.
import 'zrender/src/svg/svg';
