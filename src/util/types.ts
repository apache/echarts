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
import { Dictionary, ImageLike, TextAlign, TextVerticalAlign } from 'zrender/src/core/types';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import Source from '../data/Source';
import { TooltipMarker } from './format';
import { easingType } from 'zrender/src/animation/easing';
import { LinearGradientObject } from 'zrender/src/graphic/LinearGradient';
import { RadialGradientObject } from 'zrender/src/graphic/RadialGradient';
import { RectLike } from 'zrender/src/core/BoundingRect';
import ZRText from 'zrender/src/graphic/Text';



// ---------------------------
// Common types and constants
// ---------------------------

export {Dictionary};

export type RendererType = 'canvas' | 'svg';

export type LayoutOrient = 'vertical' | 'horizontal'
export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'

// Types from zrender
export type ColorString = string;
export type ZRColor = ColorString | LinearGradientObject | RadialGradientObject | PatternObject
export type ZRLineType = 'solid' | 'dotted' | 'dashed'

export type ZRFontStyle = 'normal' | 'italic' | 'oblique'
export type ZRFontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number

export type ZREasing = easingType

export type ZRTextAlign = TextAlign
export type ZRTextVerticalAlign = TextVerticalAlign

export type ZRElementEvent = ElementEvent

export type ZRRectLike = RectLike

// ComponentFullType can be:
//     'xxx.yyy': means ComponentMainType.ComponentSubType.
//     'xxx': means ComponentMainType.
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
    tooltip?: CommonTooltipOption<unknown> & {
        content?: string
        formatterParams?: unknown
    }
}

export interface DataHost {
    getData(dataType?: string): List;
}

export interface DataModel extends DataHost, DataFormatMixin {}
    // Pick<DataHost, 'getData'>,
    // Pick<DataFormatMixin, 'getDataParams' | 'formatTooltip'> {}

interface PayloadItem {
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

export interface StageHandlerReset {
    (seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload?: Payload):
        StageHandlerProgressExecutor | StageHandlerProgressExecutor[] | void
}
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
    visualType?: 'layout' | 'visual';
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
export type OrdinalRawValue = string | number;
export type OrdinalNumber = number; // The number mapped from each OrdinalRawValue.
export type ParsedValueNumeric = number | OrdinalNumber;
export type ParsedValue = ParsedValueNumeric | OrdinalRawValue;
// FIXME:TS better name?
// This is not `OptionDataPrimitive` because the "dataProvider parse"
// will not be performed. But "scale parse" will be performed.
export type ScaleDataValue = ParsedValue | Date;

export type AxisValue = ParsedValueNumeric;

// Can only be string or index, because it is used in object key in s   ome code.
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
    // Exclude these reserverd word for `ECOption` to avoid to infer to "any".
    baseOption?: never
    options?: never
    media?: never
    timeline?: ComponentOption | ComponentOption[]
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
    media?: MediaUnit[],
};

// series.data or dataset.source
export type OptionSourceData =
    ArrayLike<OptionDataItem>
    | Dictionary<ArrayLike<OptionDataItem>>; // Only for `SOURCE_FORMAT_KEYED_COLUMNS`.
// See also `model.js#getDataItemValue`.
export type OptionDataItem =
    OptionDataValue
    | Dictionary<OptionDataValue>
    | ArrayLike<OptionDataValue>
    // FIXME: In some case (markpoint in geo (geo-map.html)), dataItem is {coord: [...]}
    | {value: ArrayLike<OptionDataValue>}; // Only for `SOURCE_FORMAT_KEYED_ORIGINAL`
export type OptionDataValue = string | number | Date;

export type OptionDataValueNumeric = number | '-';
export type OptionDataValueCategory = string;
export type OptionDataValueDate = Date;

// export type ModelOption = Dictionary<any> | any[] | string | number | boolean | ((...args: any) => any);
export type ModelOption = any;
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

// TODO: TYPE Different callback param for different series
export interface CallbackDataParams {
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
    color?: ZRColor;
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
    ignoreSize?: boolean | [boolean, boolean]
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
export interface StackOptionMixin {
    stack?: string
}

/**
 * Mixin of option set to control the box layout of each component.
 */
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
    shadowColor?: ColorString
    shadowOffsetX?: number
    shadowOffsetY?: number
}

export interface BorderOptionMixin {
    borderColor?: string
    borderWidth?: number
    borderType?: ZRLineType
}

export type AnimationDelayCallbackParam = {
    count: number
    index: number
}
export type AnimationDurationCallback = (idx: number) => number;
export type AnimationDelayCallback = (idx: number, params?: AnimationDelayCallbackParam) => number;

/**
 * Mixin of option set to control the animation of series.
 */
export interface AnimationOptionMixin {
    /**
     * If enable animation
     */
    animation?: boolean
    /**
     * Disable animation when the number of elements exceeds the threshold
     */
    animationThreshold?: number
    // For init animation
    /**
     * Duration of initialize animation.
     * Can be a callback to specify duration of each element
     */
    animationDuration?: number | AnimationDurationCallback
    /**
     * Easing of initialize animation
     */
    animationEasing?: easingType
    /**
     * Delay of initialize animation
     * Can be a callback to specify duration of each element
     */
    animationDelay?: AnimationDelayCallback
    // For update animation
    /**
     * Delay of data update animation.
     * Can be a callback to specify duration of each element
     */
    animationDurationUpdate?: number | AnimationDurationCallback
    /**
     * Easing of data update animation.
     */
    animationEasingUpdate?: easingType
    /**
     * Delay of data update animation.
     * Can be a callback to specify duration of each element
     */
    animationDelayUpdate?: number | AnimationDelayCallback
}

// TODO: TYPE value type?
export type SymbolSizeCallback = (rawValue: any, params: CallbackDataParams) => number | number[]
export type SymbolCallback = (rawValue: any, params: CallbackDataParams) => string
/**
 * Mixin of option set to control the element symbol.
 * Include type of symbol, and size of symbol.
 */
export interface SymbolOptionMixin {
    /**
     * type of symbol, like `cirlce`, `rect`, or custom path and image.
     */
    symbol?: string | SymbolCallback
    /**
     * Size of symbol.
     */
    symbolSize?: number | number[] | SymbolSizeCallback
    symbolKeepAspect?: boolean
}

/**
 * ItemStyleOption is a most common used set to config element styles.
 * It includes both fill and stroke style.
 */
export interface ItemStyleOption extends ShadowOptionMixin, BorderOptionMixin {
    color?: ZRColor
    opacity?: number
}

/**
 * ItemStyleOption is a option set to control styles on lines.
 * Used in the components or series like `line`, `axis`
 * It includes stroke style.
 */
export interface LineStyleOption<Clr = ZRColor> extends ShadowOptionMixin {
    width?: number
    color?: Clr
    opacity?: number
    type?: ZRLineType
}

/**
 * ItemStyleOption is a option set to control styles on an area, like polygon, rectangle.
 * It only include fill style.
 */
export interface AreaStyleOption<Clr = ZRColor> extends ShadowOptionMixin {
    color?: Clr
}

type Arrayable<T extends Dictionary<any>> = { [key in keyof T]: T[key] | T[key][] }
type Dictionaryable<T extends Dictionary<any>> = { [key in keyof T]: T[key] | Dictionary<T[key]>}

export interface VisualOptionUnit {
    symbol?: string
    // TODO Support [number, number]?
    symbolSize?: number
    color?: ColorString
    colorAlpha?: number
    opacity?: number
    colorLightness?: number
    colorSaturation?: number
    colorHue?: number

    // Not exposed?
    liftZ?: number
}
export type VisualOptionFixed = VisualOptionUnit;
/**
 * Option about visual properties used in piecewise mapping
 * Used in each piece.
 */
export type VisualOptionPiecewise = VisualOptionUnit
/**
 * Option about visual properties used in linear mapping
 */
export type VisualOptionLinear = Arrayable<VisualOptionUnit>

/**
 * Option about visual properties can be encoded from ordinal categories.
 * Each value can either be a dictonary to lookup with category name, or
 * be an array to lookup with category index. In this case the array length should
 * be same with categories
 */
export type VisualOptionCategory = Arrayable<VisualOptionUnit> | Dictionaryable<VisualOptionUnit>

/**
 * All visual properties can be encoded.
 */
export type BuiltinVisualProperty = keyof VisualOptionUnit;

export interface TextCommonOption extends ShadowOptionMixin {
    color?: string
    fontStyle?: ZRFontStyle
    fontWeight?: ZRFontWeight
    fontFamily?: string
    fontSize?: number
    align?: HorizontalAlign
    verticalAlign?: VerticalAlign
    // @deprecated
    baseline?: VerticalAlign

    lineHeight?: number
    backgroundColor?: ColorString | {
        image: ImageLike
    }
    borderColor?: string
    borderWidth?: number
    borderRadius?: number | number[]
    padding?: number | number[]

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
/**
 * LabelOption is an option set to control the style of labels.
 * Include color, background, shadow, truncate, rotation, distance, etc..
 */
export interface LabelOption extends TextCommonOption {
    /**
     * If show label
     */
    show?: boolean
    // TODO: TYPE More specified 'inside', 'insideTop'....
    // x, y can be both percent string or number px.
    position?: string | (number | string)[]
    distance?: number
    rotate?: number | boolean
    offset?: number[]

    // TODO: TYPE not all label support formatter
    // formatter?: string | ((params: CallbackDataParams) => string)

    rich?: Dictionary<TextCommonOption>
}

export interface LabelLineOption {
    show?: boolean
    length?: number
    length2?: number
    smooth?: boolean
    lineStyle?: LineStyleOption
}

interface TooltipFormatterCallback<T> {
    /**
     * For sync callback
     * params will be an array on axis trigger.
     */
    (params: T, asyncTicket: string): string
    /**
     * For async callback.
     * Returned html string will be a placeholder when callback is not invoked.
     */
    (params: T, asyncTicket: string, callback: (cbTicket: string, html: string) => void): string
}

type TooltipBuiltinPosition = 'inside' | 'top' | 'left' | 'right' | 'bottom'
type TooltipBoxLayoutOption = Pick<
    BoxLayoutOptionMixin, 'top' | 'left' | 'right' | 'bottom'
>
/**
 * Position relative to the hoverred element. Only available when trigger is item.
 */
interface PositionCallback {
    (
        point: [number, number],
        /**
         * params will be an array on axis trigger.
         */
        params: CallbackDataParams | CallbackDataParams[],
        /**
         * Will be HTMLDivElement when renderMode is html
         * Otherwise it's graphic.Text
         */
        el: HTMLDivElement | ZRText | null,
        /**
         * Rect of hover elements. Will be null if not hovered
         */
        rect: RectLike | null,
        size: {
            /**
             * Size of popup content
             */
            contentSize: [number, number]
            /**
             * Size of the chart view
             */
            viewSize: [number, number]
        }
    ): number[] | string[] | TooltipBuiltinPosition | TooltipBoxLayoutOption
}
/**
 * Common tooltip option
 */
export interface CommonTooltipOption<FormatterParams> {

    show?: boolean

    /**
     * When to trigger
     */
    triggerOn?: 'mousemove' | 'click' | 'none' | 'mousemove|click'
    /**
     * Whether to not hide popup content automatically
     */
    alwaysShowContent?: boolean

    formatter?: string | TooltipFormatterCallback<FormatterParams>
    /**
     * Absolution pixel [x, y] array. Or relative percent string [x, y] array.
     * If trigger is 'item'. position can be set to 'inside' / 'top' / 'left' / 'right' / 'bottom',
     * which is relative to the hovered element.
     *
     * Support to be a callback
     */
    position?: number[] | string[] | TooltipBuiltinPosition | PositionCallback | TooltipBoxLayoutOption

    confine?: boolean

    /**
     * Consider triggered from axisPointer handle, verticalAlign should be 'middle'
     */
    align?: HorizontalAlign

    verticalAlign?: VerticalAlign
    /**
     * Delay of show. milesecond.
     */
    showDelay?: number

    /**
     * Delay of hide. milesecond.
     */
    hideDelay?: number

    transitionDuration?: number
    /**
     * Whether mouse is allowed to enter the floating layer of tooltip
     * If you need to interact in the tooltip like with links or buttons, it can be set as true.
     */
    enterable?: boolean

    backgroundColor?: ColorString
    borderColor?: ColorString
    borderRadius?: number
    borderWidth?: number

    /**
     * Padding between tooltip content and tooltip border.
     */
    padding?: number | number[]

    /**
     * Available when renderMode is 'html'
     */
    extraCssText?: string

    textStyle?: Pick<LabelOption,
        'color' | 'fontStyle' | 'fontWeight' | 'fontFamily' | 'fontSize' |
        'lineHeight' | 'width' | 'height' | 'textBorderColor' | 'textBorderWidth' |
        'textShadowColor' | 'textShadowBlur' | 'textShadowOffsetX' | 'textShadowOffsetY'
        | 'align'> & {

        // Available when renderMode is html
        decoration?: string
    }
}

/**
 * Tooltip option configured on each series
 */
export type SeriesTooltipOption = CommonTooltipOption<CallbackDataParams>

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
    name?: string

    silent?: boolean

    blendMode?: string

    // Needs to be override
    data?: any;

    legendHoverLink?: boolean

    progressive?: number | false
    progressiveThreshold?: number
    progressiveChunkMode?: 'mod'

    coordinateSystem?: string

    // FIXME:TS more
}
