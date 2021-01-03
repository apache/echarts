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

export {install as LineChart} from '../chart/line/install';
export {install as BarChart} from '../chart/bar/install';

export {install as PieChart} from '../chart/pie/install';
export {install as ScatterChart} from '../chart/scatter/install';
export {install as RadarChart} from '../chart/radar/install';
export {install as MapChart} from '../chart/map/install';
export {install as TreeChart} from '../chart/tree/install';
export {install as TreemapChart} from '../chart/treemap/install';
export {install as GraphChart} from '../chart/graph/install';
export {install as GaugeChart} from '../chart/gauge/install';
export {install as FunnelChart} from '../chart/funnel/install';
export {install as ParallelChart} from '../chart/parallel/install';
export {install as SankeyChart} from '../chart/sankey/install';
export {install as BoxplotChart} from '../chart/boxplot/install';
export {install as CandlestickChart} from '../chart/candlestick/install';
export {install as EffectScatterChart} from '../chart/effectScatter/install';
export {install as LinesChart} from '../chart/lines/install';
export {install as HeatmapChart} from '../chart/heatmap/install';
export {install as PictorialBarChart} from '../chart/bar/installPictorialBar';
export {install as ThemeRiverChart} from '../chart/themeRiver/install';
export {install as SunburstChart} from '../chart/sunburst/install';
export {install as CustomChart} from '../chart/custom/install';


// // NOTE: Don't use XXXSeriesOption from 'option.ts' becuase they have been injected markPoint, markLine etc.
// export {LineSeriesOption} from '../chart/line/LineSeries';
// export {BarSeriesOption} from '../chart/bar/BarSeries';
// export {ScatterSeriesOption} from '../chart/scatter/ScatterSeries';
// export {PieSeriesOption} from '../chart/pie/PieSeries';
// export {RadarSeriesOption} from '../chart/radar/RadarSeries';
// export {MapSeriesOption} from '../chart/map/MapSeries';
// export {TreeSeriesOption} from '../chart/tree/TreeSeries';
// export {TreemapSeriesOption} from '../chart/treemap/TreemapSeries';
// export {GraphSeriesOption} from '../chart/graph/GraphSeries';
// export {GaugeSeriesOption} from '../chart/gauge/GaugeSeries';
// export {FunnelSeriesOption} from '../chart/funnel/FunnelSeries';
// export {ParallelSeriesOption} from '../chart/parallel/ParallelSeries';
// export {SankeySeriesOption} from '../chart/sankey/SankeySeries';
// export {BoxplotSeriesOption} from '../chart/boxplot/BoxplotSeries';
// export {CandlestickSeriesOption} from '../chart/candlestick/CandlestickSeries';
// export {EffectScatterSeriesOption} from '../chart/effectScatter/EffectScatterSeries';
// export {LinesSeriesOption} from '../chart/lines/LinesSeries';
// export {HeatmapSeriesOption} from '../chart/heatmap/HeatmapSeries';
// export {PictorialBarSeriesOption} from '../chart/bar/PictorialBarSeries';
// export {ThemeRiverSeriesOption} from '../chart/themeRiver/ThemeRiverSeries';
// export {SunburstSeriesOption} from '../chart/sunburst/SunburstSeries';
// export {CustomSeriesOption} from '../chart/custom/install';

export {
    LineSeriesOption,
    BarSeriesOption,
    ScatterSeriesOption,
    PieSeriesOption,
    RadarSeriesOption,
    MapSeriesOption,
    TreeSeriesOption,
    TreemapSeriesOption,
    GraphSeriesOption,
    GaugeSeriesOption,
    FunnelSeriesOption,
    ParallelSeriesOption,
    SankeySeriesOption,
    BoxplotSeriesOption,
    CandlestickSeriesOption,
    EffectScatterSeriesOption,
    LinesSeriesOption,
    HeatmapSeriesOption,
    PictorialBarSeriesOption,
    ThemeRiverSeriesOption,
    SunburstSeriesOption,
    CustomSeriesOption
} from './option';