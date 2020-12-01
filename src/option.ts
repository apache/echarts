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

import type {GridOption} from './coord/cartesian/GridModel';
import type {PolarOption} from './coord/polar/PolarModel';
import type {GeoOption} from './coord/geo/GeoModel';
import type {RadiusAxisOption, AngleAxisOption} from './coord/polar/AxisModel';
import type {CartesianAxisOption} from './coord/cartesian/AxisModel';
import type {SingleAxisOption} from './coord/single/AxisModel';
import type {ParallelAxisOption} from './coord/parallel/AxisModel';
import type {ParallelCoordinateSystemOption} from './coord/parallel/ParallelModel';
import type {CalendarOption} from './coord/calendar/CalendarModel';
import type {ToolboxOption} from './component/toolbox/ToolboxModel';
import type {TooltipOption} from './component/tooltip/TooltipModel';
import type {AxisPointerOption} from './component/axisPointer/AxisPointerModel';
import type {BrushOption} from './component/brush/BrushModel';
import type {TitleOption} from './component/title/install';

import type {TimelineOption} from './component/timeline/TimelineModel';
import type {SliderTimelineOption} from './component/timeline/SliderTimelineModel';

import type {LegendOption} from './component/legend/LegendModel';
import type {ScrollableLegendOption} from './component/legend/ScrollableLegendModel';

import type {SliderDataZoomOption} from './component/dataZoom/SliderZoomModel';
import type {InsideDataZoomOption} from './component/dataZoom/InsideZoomModel';

import type {ContinousVisualMapOption} from './component/visualMap/ContinuousModel';
import type {PiecewiseVisualMapOption} from './component/visualMap/PiecewiseModel';

import type {LineSeriesOption} from './chart/line/LineSeries';
import type {BarSeriesOption} from './chart/bar/BarSeries';
import type {ScatterSeriesOption} from './chart/scatter/ScatterSeries';
import type {PieSeriesOption} from './chart/pie/PieSeries';
import type {RadarSeriesOption} from './chart/radar/RadarSeries';
import type {MapSeriesOption} from './chart/map/MapSeries';
import type {TreeSeriesOption} from './chart/tree/TreeSeries';
import type {TreemapSeriesOption} from './chart/treemap/TreemapSeries';
import type {GraphSeriesOption} from './chart/graph/GraphSeries';
import type {GaugeSeriesOption} from './chart/gauge/GaugeSeries';
import type {FunnelSeriesOption} from './chart/funnel/FunnelSeries';
import type {ParallelSeriesOption} from './chart/parallel/ParallelSeries';
import type {SankeySeriesOption} from './chart/sankey/SankeySeries';
import type {BoxplotSeriesOption} from './chart/boxplot/BoxplotSeries';
import type {CandlestickSeriesOption} from './chart/candlestick/CandlestickSeries';
import type {EffectScatterSeriesOption} from './chart/effectScatter/EffectScatterSeries';
import type {LinesSeriesOption} from './chart/lines/LinesSeries';
import type {HeatmapSeriesOption} from './chart/heatmap/HeatmapSeries';
import type {PictorialBarSeriesOption} from './chart/bar/PictorialBarSeries';
import type {ThemeRiverSeriesOption} from './chart/themeRiver/ThemeRiverSeries';
import type {SunburstSeriesOption} from './chart/sunburst/SunburstSeries';
import type {CustomSeriesOption} from './chart/custom/install';

import {ToolboxBrushFeatureOption} from './component/toolbox/feature/Brush';
import {ToolboxDataViewFeatureOption} from './component/toolbox/feature/DataView';
import {ToolboxDataZoomFeatureOption} from './component/toolbox/feature/DataZoom';
import {ToolboxMagicTypeFeatureOption} from './component/toolbox/feature/MagicType';
import {ToolboxRestoreFeatureOption} from './component/toolbox/feature/Restore';
import {ToolboxSaveAsImageFeatureOption} from './component/toolbox/feature/SaveAsImage';
import {ToolboxFeatureOption} from './component/toolbox/featureManager';
import { MarkAreaOption } from './component/marker/MarkAreaModel';


import { ECOption, SeriesTooltipOption } from './util/types';
import { GraphicComponentLooseOption } from './component/graphic/install';
import { MarkLineOption } from './component/marker/MarkLineModel';
import { MarkPointOption } from './component/marker/MarkPointModel';

interface ToolboxFullOptionWithFeatures extends ToolboxOption {
    feature?: {
        brush?: ToolboxBrushFeatureOption
        dataView?: ToolboxDataViewFeatureOption
        dataZoom?: ToolboxDataZoomFeatureOption
        magicType?: ToolboxMagicTypeFeatureOption
        restore?: ToolboxRestoreFeatureOption
        saveAsImage?: ToolboxSaveAsImageFeatureOption
        // custom feature
        [key: string]: ToolboxFeatureOption | {
            [key: string]: any
        }
    }
}

type SeriesOption = (LineSeriesOption
    | BarSeriesOption
    | ScatterSeriesOption
    | PieSeriesOption
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
    | SunburstSeriesOption
    | CustomSeriesOption) & {
        // Inject markArea markLine
        markArea?: MarkAreaOption
        markLine?: MarkLineOption
        markPoint?: MarkPointOption
        tooltip?: SeriesTooltipOption
    };

export interface EChartsFullOption extends ECOption {
    title?: TitleOption | TitleOption[]
    grid?: GridOption | GridOption[]
    polar?: PolarOption | PolarOption[]
    geo?: GeoOption | GeoOption[]
    angleAxis?: AngleAxisOption | AngleAxisOption[]
    radiusAxis?: RadiusAxisOption | RadiusAxisOption[]
    xAxis?: CartesianAxisOption | CartesianAxisOption[]
    yAxis?: CartesianAxisOption | CartesianAxisOption[]
    singleAxis?: SingleAxisOption | SingleAxisOption[]
    parallel?: ParallelCoordinateSystemOption | ParallelCoordinateSystemOption[]
    parallelAxis?: ParallelAxisOption | ParallelAxisOption[]
    calendar?: CalendarOption | CalendarOption[]
    toolbox?: ToolboxFullOptionWithFeatures | ToolboxFullOptionWithFeatures[]
    tooltip?: TooltipOption | TooltipOption[]
    axisPointer?: AxisPointerOption | AxisPointerOption[]
    brush?: BrushOption | BrushOption[]
    timeline?: TimelineOption | SliderTimelineOption
    legend?: LegendOption | ScrollableLegendOption | (LegendOption | ScrollableLegendOption)[]
    dataZoom?: SliderDataZoomOption | InsideDataZoomOption | (SliderDataZoomOption | InsideDataZoomOption)[]
    visualMap?: ContinousVisualMapOption | PiecewiseVisualMapOption
        | (ContinousVisualMapOption | PiecewiseVisualMapOption)[]
    graphic?: GraphicComponentLooseOption | GraphicComponentLooseOption[]

    // TODO Generally we support specify a single object on series.
    // But in practice we found the error hint in monaco editor is not clear if we also support
    // single object in type.
    series?: SeriesOption | SeriesOption[]

    options?: EChartsFullOption[]
    baseOption?: EChartsFullOption
}