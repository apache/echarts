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

/**
 * [Notice]:
 * Consider custom bundle on demand, chart specified
 * or component specified types and constants should
 * not put here. Only common types and constants can
 * be put in this file.
 */

import Group from 'zrender/src/container/Group';
import Element, {ElementEvent} from 'zrender/src/Element';
import DataFormatMixin from '../model/mixin/dataFormat';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../ExtensionAPI';
import SeriesModel from '../model/Series';
import { createHashMap, HashMap } from 'zrender/src/core/util';
import { TaskPlanCallbackReturn, TaskProgressParams } from '../stream/task';
import List, {ListDimensionType} from '../data/List';
import { Dictionary, ImageLike } from 'zrender/src/core/types';
import { GradientObject } from 'zrender/src/graphic/Gradient';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import Source from '../data/Source';
import { TooltipMarker } from './format';
import { easingType } from 'zrender/src/animation/easing';



// ---------------------------
// Common types and constants
// ---------------------------

export type RendererType = 'canvas' | 'svg';

export type ColorString = string;
export type ZRColor = ColorString | GradientObject | PatternObject
export type ZRLineType = 'solid' | 'dotted'
export type ZRAlign = 'left' | 'center' | 'right'
export type ZRVerticalAlign = 'top' | 'middle' | 'bottom'

export type ZRFontStyle = 'normal' | 'italic' | 'oblique'
export type ZRFontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number

export type ZREasing = easingType


// Actually ComponentFullType is ComponentMainType.ComponentSubType
// See `checkClassType` check the restict definition.
export type ComponentFullType = string;
export type ComponentMainType = keyof ECUnitOption & string;
export type ComponentSubType = ComponentOption['type'];
/**
 * Use `parseClassType` to parse componentType declaration to componentTypeInfo.
 * For example:
 * componentType declaration: 'xxx.yyy', get componentTypeInfo {main: 'xxx', sub: 'yyy'}.
 * componentType declaration: '', get componentTypeInfo {main: '', sub: ''}.
 */
export interface ComponentTypeInfo {
    main: ComponentMainType; // Never null/undefined. `''` represents absence.
    sub: ComponentSubType; // Never null/undefined. `''` represents absence.
}

export interface ECElement extends Element {
    useHoverLayer?: boolean;
    dataIndex?: number;
    dataModel?: DataModel;
    eventData?: ECEventData;
    seriesIndex?: number;
    dataType?: string;
}

export interface DataHost {
    getData(dataType?: string): List;
}

export interface DataModel extends DataHost, DataFormatMixin {}
    // Pick<DataHost, 'getData'>,
    // Pick<DataFormatMixin, 'getDataParams' | 'formatTooltip'> {}

export interface PayloadItem {
    excludeSeriesId?: string | string[];
    [other: string]: any;
}

export interface Payload extends PayloadItem {
    type: string;
    escapeConnect?: boolean;
    batch?: PayloadItem[];
}

export interface ViewRootGroup extends Group {
    __ecComponentInfo?: {
        mainType: string,
        index: number
    };
}

/**
 * The echarts event type to user.
 * Also known as packedEvent.
 */
export interface ECEvent extends ECEventData{
    // event type
    type: string;
    componentType?: string;
    componentIndex?: number;
    seriesIndex?: number;
    escapeConnect?: boolean;
    event?: ElementEvent;
    batch?: ECEventData;
}
export interface ECEventData {
    [key: string]: any;
}

export interface EventQueryItem{
    [key: string]: any;
}
export interface NormalizedEventQuery {
    cptQuery: EventQueryItem;
    dataQuery: EventQueryItem;
    otherQuery: EventQueryItem;
}

export interface ActionInfo {
    // action type
    type: string;
    // If not provided, use the same string of `type`.
    event?: string;
    // update method
    update?: string;
}
export interface ActionHandler {
    (payload: Payload, ecModel: GlobalModel, api: ExtensionAPI): void | ECEventData;
}

export interface OptionPreprocessor {
    (option: ECUnitOption, isTheme: boolean): void
}

export interface PostUpdater {
    (ecModel: GlobalModel, api: ExtensionAPI): void;
}

export type VisualType = 'layout' | 'visual';

export interface StageHandlerOverallReset {
    (ecModel: GlobalModel, api: ExtensionAPI, payload?: Payload): void
}
export interface StageHandler {
    seriesType?: string;
    createOnAllSeries?: boolean;
    performRawSeries?: boolean;
    plan?: StageHandlerPlan;
    overallReset?: StageHandlerOverallReset;
    reset?: StageHandlerReset;
    getTargetSeries?: (ecModel: GlobalModel, api: ExtensionAPI) => HashMap<SeriesModel>;
}

export interface StageHandlerInternal extends StageHandler {
    uid: string;
    visualType?: VisualType;
    // modifyOutputEnd?: boolean;
    __prio: number;
    __raw: StageHandler | StageHandlerOverallReset;
    isVisual?: boolean; // PENDING: not used
    isLayout?: boolean; // PENDING: not used
}
export type StageHandlerProgressParams = TaskProgressParams;
export interface StageHandlerProgressExecutor {
    dataEach?: (data: List, idx: number) => void;
    progress?: (params: StageHandlerProgressParams, data: List) => void;
}
export interface StageHandlerReset {
    (seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload?: Payload):
        StageHandlerProgressExecutor | StageHandlerProgressExecutor[]
}
export type StageHandlerPlanReturn = TaskPlanCallbackReturn;
export interface StageHandlerPlan {
    (seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload?: Payload):
        StageHandlerPlanReturn
}

export interface LoadingEffectCreator {
    (api: ExtensionAPI, cfg: object): LoadingEffect;
}
export interface LoadingEffect extends Element {
    resize: () => void;
}

export type TooltipRenderMode = 'html' | 'richText';


// ---------------------------------
// Data and dimension related types
// ---------------------------------

// Finally the user data will be parsed and stored in `list._storage`.
// `NaN` represents "no data" (raw data `null`/`undefined`/`NaN`/`'-'`).
// `Date` will be parsed to timestamp.
// Ordinal/category data will be parsed to its index if possible, otherwise
// keep its original string in list._storage.
// Check `convertDataValue` for more details.
export type OrdinalRawValue = string;
export type OrdinalRawValueIndex = number;
export type ParsedDataNumeric = number | OrdinalRawValueIndex;
export type ParsedDataValue = ParsedDataNumeric | OrdinalRawValue;

export type AxisValue = ParsedDataNumeric;

// Can only be string or index, because it is used in object key in some code.
// Making the type alias here just intending to show the meaning clearly in code.
export type DimensionIndex = number;
// If being a number-like string but not being defined a dimension name.
// See `List.js#getDimension` for more details.
export type DimensionIndexLoose = DimensionIndex | string;
export type DimensionName = string;
export type DimensionLoose = DimensionName | DimensionIndexLoose;
export type DimensionType = ListDimensionType;

export var VISUAL_DIMENSIONS = createHashMap([
    'tooltip', 'label', 'itemName', 'itemId', 'seriesName'
]);
// The key is VISUAL_DIMENSIONS
export interface DataVisualDimensions {
    // can be set as false to directly to prevent this data
    // dimension from displaying in the default tooltip.
    // see `Series.ts#formatTooltip`.
    tooltip?: DimensionIndex | false;
    label?: DimensionIndex;
    itemName?: DimensionIndex;
    itemId?: DimensionIndex;
    seriesName?: DimensionIndex;
}

export type DimensionDefinition = {
    type: string, name: string, displayName?: string
};
export type DimensionDefinitionLoose = DimensionDefinition['type'] | DimensionDefinition;

export var SOURCE_FORMAT_ORIGINAL = 'original' as const;
export var SOURCE_FORMAT_ARRAY_ROWS = 'arrayRows' as const;
export var SOURCE_FORMAT_OBJECT_ROWS = 'objectRows' as const;
export var SOURCE_FORMAT_KEYED_COLUMNS = 'keyedColumns' as const;
export var SOURCE_FORMAT_TYPED_ARRAY = 'typedArray' as const;
export var SOURCE_FORMAT_UNKNOWN = 'unknown' as const;

export type SourceFormat =
    typeof SOURCE_FORMAT_ORIGINAL
    | typeof SOURCE_FORMAT_ARRAY_ROWS
    | typeof SOURCE_FORMAT_OBJECT_ROWS
    | typeof SOURCE_FORMAT_KEYED_COLUMNS
    | typeof SOURCE_FORMAT_TYPED_ARRAY
    | typeof SOURCE_FORMAT_UNKNOWN;

export var SERIES_LAYOUT_BY_COLUMN = 'column' as const;
export var SERIES_LAYOUT_BY_ROW = 'row' as const;

export type SeriesLayoutBy = typeof SERIES_LAYOUT_BY_COLUMN | typeof SERIES_LAYOUT_BY_ROW;





// --------------------------------------------
// echarts option types (base and common part)
// --------------------------------------------

/**
 * [ECUnitOption]:
 * An object that contains definitions of components
 * and other properties. For example:
 *
 * ```ts
 * var option: ECUnitOption = {
 *
 *     // Single `title` component:
 *     title: {...},
 *
 *     // Two `visualMap` components:
 *     visualMap: [{...}, {...}],
 *
 *     // Two `series.bar` components
 *     // and one `series.pie` component:
 *     series: [
 *         {type: 'bar', data: [...]},
 *         {type: 'bar', data: [...]},
 *         {type: 'pie', data: [...]}
 *     ],
 *
 *     // A property:
 *     backgroundColor: '#421ae4'
 *
 *     // A property object:
 *     textStyle: {
 *         color: 'red',
 *         fontSize: 20
 *     }
 * };
 * ```
 */
export type ECUnitOption = {
    [key: string]: ComponentOption | ComponentOption[] | Dictionary<any> | any
}

/**
 * [ECOption]:
 * An object input to echarts.setOption(option).
 * May be an 'option: ECUnitOption',
 * or may be an object contains multi-options. For example:
 *
 * ```ts
 * var option: ECOption = {
 *     baseOption: {
 *         title: {...},
 *         legend: {...},
 *         series: [
 *             {data: [...]},
 *             {data: [...]},
 *             ...
 *         ]
 *     },
 *     timeline: {...},
 *     options: [
 *         {title: {...}, series: {data: [...]}},
 *         {title: {...}, series: {data: [...]}},
 *         ...
 *     ],
 *     media: [
 *         {
 *             query: {maxWidth: 320},
 *             option: {series: {x: 20}, visualMap: {show: false}}
 *         },
 *         {
 *             query: {minWidth: 320, maxWidth: 720},
 *             option: {series: {x: 500}, visualMap: {show: true}}
 *         },
 *         {
 *             option: {series: {x: 1200}, visualMap: {show: true}}
 *         }
 *     ]
 * };
 * ```
 */
export type ECOption = ECUnitOption | {
    baseOption?: ECUnitOption,
    timeline?: ComponentOption,
    options?: ECUnitOption[],
    media?: MediaUnit
};

// series.data or dataset.source
export type OptionSourceData =
    ArrayLike<OptionDataItem>
    | Dictionary<ArrayLike<OptionDataItem>>; // Only for `SOURCE_FORMAT_KEYED_COLUMNS`.
// See also `model.js#getDataItemValue`.
export type OptionDataItem =
    OptionDataPrimitive
    | Dictionary<OptionDataPrimitive>
    | ArrayLike<OptionDataPrimitive>
    // FIXME: In some case (markpoint in geo (geo-map.html)), dataItem is {coord: [...]}
    | {value: ArrayLike<OptionDataPrimitive>}; // Only for `SOURCE_FORMAT_KEYED_ORIGINAL`
export type OptionDataPrimitive = string | number | Date;

// export type ModelOption = Dictionary<any> | any[] | string | number | boolean | ((...args: any) => any);
export type ModelOption = Dictionary<any>;
export type ThemeOption = Dictionary<any>;

export type DisplayState = 'normal' | 'emphasis';
export type DisplayStateHostOption = {
    emphasis?: Dictionary<any>,
    [key: string]: any
};

// The key is VISUAL_DIMENSIONS
export interface OptionEncodeVisualDimensions {
    tooltip?: OptionEncodeValue;
    label?: OptionEncodeValue;
    itemName?: OptionEncodeValue;
    itemId?: OptionEncodeValue;
    seriesName?: OptionEncodeValue;
    // Notice: `value` is coordDim, not nonCoordDim.
}
export interface OptionEncode extends OptionEncodeVisualDimensions {
    [coordDim: string]: OptionEncodeValue
}
export type OptionEncodeValue = DimensionIndex[] | DimensionIndex | DimensionName[] | DimensionName;
export type EncodeDefaulter = (source: Source, dimCount: number) => OptionEncode;

export interface DataParamsUserOutput {
    // component main type
    componentType: string;
    // component sub type
    componentSubType: string;
    componentIndex: number;
    // series component sub type
    seriesType?: string;
    // series component index (the alias of `componentIndex` for series)
    seriesIndex?: number;
    seriesId?: string;
    seriesName?: string;
    name: string;
    dataIndex: number;
    data: any;
    dataType?: string;
    value: any;
    color?: string;
    borderColor?: string;
    dimensionNames?: DimensionName[];
    encode?: DimensionUserOuputEncode;
    marker?: TooltipMarker;
    status?: DisplayState;
    dimensionIndex?: number;
    percent?: number; // Only for chart like 'pie'

    // Param name list for mapping `a`, `b`, `c`, `d`, `e`
    $vars: string[];
}
export type DimensionUserOuputEncode = {
    [coordOrVisualDimName: string]:
        // index: coordDimIndex, value: dataDimIndex
        DimensionIndex[]
};
export type DimensionUserOuput = {
    // The same as `data.dimensions`
    dimensionNames: DimensionName[]
    encode: DimensionUserOuputEncode
};

export interface MediaQuery {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    minAspectRatio?: number;
    maxAspectRatio?: number;
};
export type MediaUnit = {
    query: MediaQuery,
    option: ECUnitOption
};

export type ComponentLayoutMode = {
    // Only support 'box' now.
    type: 'box',
    ignoreSize: boolean | [boolean, boolean]
};
/******************* Mixins for Common Option Properties   ********************** */
export interface ColorPaletteOptionMixin {
    color?: ZRColor | ZRColor[]
    colorLayer?: ZRColor[][]
}

export interface LarginOptionMixin {
    large?: boolean
    largeThreshold?: number
}

export interface BoxLayoutOptionMixin {
    width?: number | string;
    height?: number | string;
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
}

export interface CircleLayoutOptionMixin {
    // Can be percent
    center?: (number | string)[]
    // Can specify [innerRadius, outerRadius]
    radius?: (number | string)[] | number | string
}

export interface ShadowOptionMixin {
    shadowBlur?: number
    shadowColor?: string
    shadowOffsetX?: number
    shadowOffsetY?: number
}

export type AnimationDelayCallbackParam = {
    count: number
    index: number
}
export type AnimationDurationCallback = (idx: number) => number;
export type AnimationDelayCallback = (idx: number, params?: AnimationDelayCallbackParam) => number;

export interface AnimationOptionMixin {
    animation?: boolean
    animationThreshold?: number
    // For init animation
    animationDuration?: number | AnimationDurationCallback
    animationEasing?: easingType
    animationDelay?: AnimationDelayCallback
    // For update animation
    animationDurationUpdate?: number | AnimationDurationCallback
    animationEasingUpdate?: easingType
    animationDelayUpdate?: number | AnimationDelayCallback
}

export interface ItemStyleOption extends ShadowOptionMixin {
    color?: ZRColor
    borderColor?: string
    borderWidth?: number
    borderType?: ZRLineType
    opacity?: number
}

export interface LineStyleOption extends ShadowOptionMixin {
    width?: number
    color?: string
    opacity?: number
    type?: ZRLineType
}

export interface AreaStyleOption extends ShadowOptionMixin {
    color?: string
}

interface TextCommonOption extends ShadowOptionMixin {
    color?: string
    fontStyle?: ZRFontStyle
    fontWeight?: ZRFontWeight
    fontFamily?: string
    fontSize?: number
    align?: ZRAlign
    verticalAlign?: ZRVerticalAlign
    // @deprecated
    baseline?: ZRVerticalAlign

    lineHeight?: number
    backgroundColor?: ColorString | {
        image: ImageLike
    }
    borderColor?: string
    borderWidth?: number
    borderRadius?: number | [number, number, number, number]
    padding?: number | [number, number] | [number, number, number, number]

    width?: number | string// Percent
    height?: number
    textBorderColor?: string
    textBorderWidth?: number

    textShadowBlur?: number
    textShadowColor?: string
    textShadowOffsetX?: number
    textShadowOffsetY?: number

    tag?: string
}

export interface LabelOption extends TextCommonOption {
    show?: boolean
    // TODO: TYPE More specified 'inside', 'insideTop'....
    position?: string | number[] | string[]
    distance?: number
    rotate?: number | boolean
    offset?: number[]
    formatter?: (params: DataParamsUserOutput) => string

    rich?: Dictionary<TextCommonOption>
}

export interface LabelLineOption {
    show?: boolean
    length?: number
    length2?: number
    smooth?: boolean
    lineStyle?: LineStyleOption
}

export interface ComponentOption {
    type?: string;
    id?: string;
    name?: string;

    z?: number;
    zlevel?: number;
    // FIXME:TS more
}

export interface SeriesOption extends
    ComponentOption,
    AnimationOptionMixin,
    ColorPaletteOptionMixin
{
    silent?: boolean

    blendMode?: string

    // Needs to be override
    data?: unknown;

    legendHoverLink?: boolean

    progressive?: number | false
    progressiveThreshold?: number
    progressiveChunkMode?: 'mod'

    // FIXME:TS more
}
