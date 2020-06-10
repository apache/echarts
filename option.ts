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

import {GridOption} from './src/coord/cartesian/GridModel';
import {PolarOption} from './src/coord/polar/PolarModel';
import {GeoOption} from './src/coord/geo/GeoModel';
import {SingleAxisOption} from './src/coord/single/AxisModel';
import {ParallelAxisOption} from './src/coord/parallel/AxisModel';
import {ParallelCoordinateSystemOption} from './src/coord/parallel/ParallelModel';
import {CalendarOption} from './src/coord/calendar/CalendarModel';
import {ToolboxOption} from './src/component/toolbox/ToolboxModel';
import {TooltipOption} from './src/component/tooltip/TooltipModel';
import {AxisPointerOption} from './src/component/axisPointer/AxisPointerModel';
import {BrushOption} from './src/component/brush/BrushModel';
import {TitleOption} from './src/component/title';

import {TimelineOption} from './src/component/timeline/TimelineModel';
import {SliderTimelineOption} from './src/component/timeline/SliderTimelineModel';

import {LegendOption} from './src/component/legend/LegendModel';
import {ScrollableLegendOption} from './src/component/legend/ScrollableLegendModel';

import {DataZoomOption} from './src/component/dataZoom/DataZoomModel';
import {SliderDataZoomOption} from './src/component/dataZoom/SliderZoomModel';
import {InsideDataZoomOption} from './src/component/dataZoom/InsideZoomModel';

import {VisualMapOption} from './src/component/visualMap/VisualMapModel';
import {ContinousVisualMapOption} from './src/component/visualMap/ContinuousModel';
import {PiecewiseVisualMapOption} from './src/component/visualMap/PiecewiseModel';

import {LineSeriesOption} from './src/chart/line/LineSeries';
import {BarSeriesOption} from './src/chart/bar/BarSeries';
import {ScatterSeriesOption} from './src/chart/scatter/ScatterSeries';
import {RadarSeriesOption} from './src/chart/radar/RadarSeries';
import {MapSeriesOption} from './src/chart/map/MapSeries';
import {TreeSeriesOption} from './src/chart/tree/TreeSeries';
import {TreemapSeriesOption} from './src/chart/treemap/TreemapSeries';
import {GraphSeriesOption} from './src/chart/graph/GraphSeries';
import {GaugeSeriesOption} from './src/chart/gauge/GaugeSeries';
import {FunnelSeriesOption} from './src/chart/funnel/FunnelSeries';
import {ParallelSeriesOption} from './src/chart/parallel/ParallelSeries';
import {SankeySeriesOption} from './src/chart/sankey/SankeySeries';
import {BoxplotSeriesOption} from './src/chart/boxplot/BoxplotSeries';
import {CandlestickSeriesOption} from './src/chart/candlestick/CandlestickSeries';
import {EffectScatterSeriesOption} from './src/chart/effectScatter/EffectScatterSeries';
import {LinesSeriesOption} from './src/chart/lines/LinesSeries';
import {HeatmapSeriesOption} from './src/chart/heatmap/HeatmapSeries';
import {PictorialBarSeriesOption} from './src/chart/bar/PictorialBarSeries';
import {ThemeRiverSeriesOption} from './src/chart/themeRiver/ThemeRiverSeries';
import {SunburstSeriesOption} from './src/chart/sunburst/SunburstSeries';


export interface EChartsOption {
    title?: TitleOption | TitleOption[]
    grid?: GridOption | GridOption[]
    polar?: PolarOption | PolarOption[]
    geo?: GeoOption | GeoOption[]
    singleAxis?: SingleAxisOption | SingleAxisOption[]
    parallel?: ParallelCoordinateSystemOption | ParallelCoordinateSystemOption[]
    parallelAxis?: ParallelAxisOption | ParallelAxisOption[]
    calendar?: CalendarOption | CalendarOption[]
    toolbox?: ToolboxOption | ToolboxOption[]
    tooltip?: TooltipOption | TooltipOption[]
    axisPointer?: AxisPointerOption | AxisPointerOption[]
    brush?: BrushOption | BrushOption[]
    timeline?: TimelineOption | SliderTimelineOption | (TimelineOption | SliderTimelineOption)[]
    legend?: LegendOption | ScrollableLegendOption | (LegendOption | ScrollableLegendOption)[]
    dataZoom?: SliderDataZoomOption | InsideDataZoomOption | (SliderDataZoomOption | InsideDataZoomOption)[]
    visualMap?: (ContinousVisualMapOption | PiecewiseVisualMapOption)[]

    series?: (LineSeriesOption
        | BarSeriesOption
        | ScatterSeriesOption
        | RadarSeriesOption
        | MapSeriesOption
        | TreeSeriesOption
        | TreemapSeriesOption
        | GraphSeriesOption
        | GaugeSeriesOption
        | FunnelSeriesOption
        | ParallelSeriesOption
        | SankeySeriesOption
        | BoxplotSeriesOption
        | CandlestickSeriesOption
        | EffectScatterSeriesOption
        | LinesSeriesOption
        | HeatmapSeriesOption
        | PictorialBarSeriesOption
        | ThemeRiverSeriesOption
        | SunburstSeriesOption)[]
}