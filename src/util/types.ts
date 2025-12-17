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

import Group from 'zrender/src/graphic/Group';
import Element, {ElementEvent, ElementTextConfig} from 'zrender/src/Element';
import { DataFormatMixin } from '../model/mixin/dataFormat';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../core/ExtensionAPI';
import SeriesModel from '../model/Series';
import { createHashMap, HashMap } from 'zrender/src/core/util';
import { TaskPlanCallbackReturn, TaskProgressParams } from '../core/task';
import SeriesData from '../data/SeriesData';
import { Dictionary, ElementEventName, ImageLike, TextAlign, TextVerticalAlign } from 'zrender/src/core/types';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import { TooltipMarker } from './format';
import { AnimationEasing } from 'zrender/src/animation/easing';
import { LinearGradientObject } from 'zrender/src/graphic/LinearGradient';
import { RadialGradientObject } from 'zrender/src/graphic/RadialGradient';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { TSpanStyleProps } from 'zrender/src/graphic/TSpan';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { ImageStyleProps } from 'zrender/src/graphic/Image';
import ZRText, { TextStyleProps } from 'zrender/src/graphic/Text';
import { Source } from '../data/Source';
import Model from '../model/Model';
import { DataStoreDimensionType } from '../data/DataStore';
import { DimensionUserOuputEncode } from '../data/helper/dimensionHelper';
import { PrimaryTimeUnit } from './time';


// ---------------------------
// Common types and constants
// ---------------------------

export {Dictionary};

export type RendererType = 'canvas' | 'svg';
export type NullUndefined = null | undefined;

export type LayoutOrient = 'vertical' | 'horizontal';
export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

// Types from zrender
export type ColorString = string;
export type ZRColor = ColorString | LinearGradientObject | RadialGradientObject | PatternObject;
export type ZRLineType = 'solid' | 'dotted' | 'dashed' | number | number[];

export type ZRFontStyle = 'normal' | 'italic' | 'oblique';
export type ZRFontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number;

export type ZREasing = AnimationEasing;

export type ZRTextAlign = TextAlign;
export type ZRTextVerticalAlign = TextVerticalAlign;

export type ZRElementEvent = ElementEvent;

export type ZRRectLike = RectLike;

export type ZRStyleProps = PathStyleProps | ImageStyleProps | TSpanStyleProps | TextStyleProps;

export type ZRElementEventName = ElementEventName | 'globalout';

// ComponentFullType can be:
//     'a.b': means ComponentMainType.ComponentSubType.
//     'a': means ComponentMainType.
// See `checkClassType` check the restict definition.
export type ComponentFullType = string;
export type ComponentMainType = keyof ECUnitOption & string;
export type ComponentSubType = Exclude<ComponentOption['type'], undefined>;
/**
 * Use `parseClassType` to parse componentType declaration to componentTypeInfo.
 * For example:
 * componentType declaration: 'a.b', get componentTypeInfo {main: 'a', sub: 'b'}.
 * componentType declaration: '', get componentTypeInfo {main: '', sub: ''}.
 */
export interface ComponentTypeInfo {
    main: ComponentMainType; // Never null/undefined. `''` represents absence.
    sub: ComponentSubType; // Never null/undefined. `''` represents absence.
}

export interface ECElement extends Element {
    highDownSilentOnTouch?: boolean;
    onHoverStateChange?: (toState: DisplayState) => void;

    // 0: normal
    // 1: blur
    // 2: emphasis
    hoverState?: 0 | 1 | 2;
    selected?: boolean;

    z2EmphasisLift?: number;
    z2SelectLift?: number;

    /**
     * Force enable animation.
     * This property is useful when an ignored/invisible/removed element
     * should have label animation, like the case in the bar-racing charts.
     * `forceLabelAnimation` has higher priority than `disableLabelAnimation`.
     */
    forceLabelAnimation?: boolean;
    /**
     * Force disable animation.
     * `forceLabelAnimation` has higher priority than `disableLabelAnimation`.
     */
    disableLabelAnimation?: boolean
    /**
     * Force disable overall layout
     */
    disableLabelLayout?: boolean
    /**
     * Force disable morphing
     */
    disableMorphing?: boolean
    /**
     * Force disable triggering tooltip
     */
    tooltipDisabled?: boolean
}

export interface DataHost {
    getData(dataType?: SeriesDataType): SeriesData;
}

export interface DataModel extends Model<unknown>, DataHost, DataFormatMixin {
    getDataParams(dataIndex: number, dataType?: SeriesDataType, el?: Element): CallbackDataParams;
}
    // Pick<DataHost, 'getData'>,
    // Pick<DataFormatMixin, 'getDataParams' | 'formatTooltip'> {}

interface PayloadItem {
    excludeSeriesId?: OptionId | OptionId[];
    animation?: PayloadAnimationPart
    // TODO use unknown
    [other: string]: any;
}

export interface Payload extends PayloadItem {
    type: string;
    escapeConnect?: boolean;
    batch?: PayloadItem[];
}

export interface HighlightPayload extends Payload {
    type: 'highlight';
    notBlur?: boolean
}

export interface DownplayPayload extends Payload {
    type: 'downplay';
    notBlur?: boolean
}

// Payload includes override anmation info
export interface PayloadAnimationPart {
    duration?: number
    easing?: AnimationEasing
    delay?: number
}

export interface SelectChangedEvent extends ECActionRefinedEvent {
    type: 'selectchanged'
    isFromClick: boolean
    fromAction: 'select' | 'unselect' | 'toggleSelected'
    fromActionPayload: Payload
    selected: {
        seriesIndex: number
        dataType?: SeriesDataType
        dataIndex: number[]
    }[]
}
/**
 * @deprecated Backward compat.
 */
export interface SelectChangedPayload extends Payload {
    type: 'selectchanged'
    isFromClick: boolean
    fromAction: 'select' | 'unselect' | 'toggleSelected'
    fromActionPayload: Payload
    selected: {
        seriesIndex: number
        dataType?: SeriesDataType
        dataIndex: number[]
    }[]
}

export interface ViewRootGroup extends Group {
    __ecComponentInfo?: {
        mainType: string,
        index: number
    };
}

export interface ECElementEvent extends
    ECEventData,
    CallbackDataParams {

    type: ZRElementEventName;
    event?: ElementEvent;

}
/**
 * The echarts event type to user.
 * Also known as packedEvent.
 */
export interface ECActionEvent extends ECEventData {
    // event type
    type: string;
    componentType?: string;
    componentIndex?: number;
    seriesIndex?: number;
    escapeConnect?: boolean;
    batch?: ECEventData[];
}
/**
 * TODO: not applicable in `ECEventProcessor` yet.
 */
export interface ECActionRefinedEvent extends ECActionEvent {
    // event type
    type: string;
    // action types.
    fromAction: string;
    fromActionPayload: Payload;
}
export type ECActionRefinedEventContent<TRefinedEvent extends ECActionRefinedEvent> = Omit<
    TRefinedEvent,
    'type' | 'fromAction' | 'fromActionPayload'
>;

export interface ECEventData {
    // TODO use unknown
    [key: string]: any;
}

export interface EventQueryItem {
    // TODO use unknown
    [key: string]: any;
}
export interface NormalizedEventQuery {
    cptQuery: EventQueryItem;
    dataQuery: EventQueryItem;
    otherQuery: EventQueryItem;
}

/**
 * The rule of creating "public event" and "event for connect":
 *  - If `refineEvent` provided,
 *      `refineEvent` creates the "public event",
 *      and "event for connect" is created internally by replicating the payload.
 *      This is because `makeActionFromEvent` requires the content of event to be
 *      the same as the original payload, while `refineEvent` creates a user-friend
 *      event that differs from the original payload.
 *  - Else if `ActionHandler` returns an object,
 *      it is both the "public event" and the "event for connect".
 *      (@deprecated, but keep this mechanism for backward compatibility).
 *  - Else,
 *      replicate the payload as both the "public event" and "event for connect".
 */
export interface ActionInfo {
    // action type
    type: string;
    // If not provided, use the same string of `type`.
    event?: string;
    // update method.
    update?: string;
    // `ActionHandler` is designed to do nothing other than modify models.
    action?: ActionHandler;
    // - `refineEvent` is intended to create a user-friend event that differs from the original payload,
    //  while enabling feature `connect`, and being called at the last step of the "update" procedure
    //  to ensure the complete update of all models.
    // - If multiple actions need to share one event name, `refineEvent` must be used.
    //  e.g., actions 'doxxx' 'undoxxx' 'togglexxx' share one event name 'xxxchanged'.
    // - The design of refined event should not impose different handling for batch and non-batch on users.
    refineEvent?: ActionRefineEvent;
    // When `refineEvent` is provided, still publish the auto generated "event for connect" to users.
    // Only for backward compatibility, do not use it in future actions and events.
    publishNonRefinedEvent?: boolean;
}
export interface ActionHandler {
    (payload: Payload, ecModel: GlobalModel, api: ExtensionAPI): void | ECEventData;
}
export interface ActionRefineEvent {
    // `actionResult` is the return of the `ActionHandler` call, where some data can be carried.
    // `actionResultBatch` corresponds to both batch payload and non-batch payload.
    (actionResultBatch: ECEventData[], payload: Payload, ecModel: GlobalModel, api: ExtensionAPI): {
        eventContent: ECActionRefinedEventContent<ECActionRefinedEvent>
    }
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
    /**
     * Indicate that the task will be piped all series
     * (`performRawSeries` indicate whether includes filtered series).
     */
    createOnAllSeries?: boolean;
    /**
     * Indicate that the task will be only piped in the pipeline of this type of series.
     * (`performRawSeries` indicate whether includes filtered series).
     */
    seriesType?: string;
    /**
     * Indicate that the task will be only piped in the pipeline of the returned series.
     */
    getTargetSeries?: (ecModel: GlobalModel, api: ExtensionAPI) => HashMap<SeriesModel>;

    /**
     * If `true`, filtered series will also be "performed".
     */
    performRawSeries?: boolean;

    /**
     * Called only when this task in a pipeline.
     */
    plan?: StageHandlerPlan;
    /**
     * If `overallReset` specified, an "overall task" will be created.
     * "overall task" does not belong to a certain pipeline.
     * They always be "performed" in certain phase (depends on when they declared).
     * They has "stub"s to connect with pipelines (one stub for one pipeline),
     * delivering info like "dirty" and "output end".
     */
    overallReset?: StageHandlerOverallReset;
    /**
     * Called only when this task in a pipeline, and "dirty".
     */
    reset?: StageHandlerReset;
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
    dataEach?: (data: SeriesData, idx: number) => void;
    progress?: (params: StageHandlerProgressParams, data: SeriesData) => void;
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

/**
 * 'html' is used for rendering tooltip in extra DOM form, and the result
 * string is used as DOM HTML content.
 * 'richText' is used for rendering tooltip in rich text form, for those where
 * DOM operation is not supported.
 */
export type TooltipRenderMode = 'html' | 'richText';

export type TooltipOrderMode = 'valueAsc' | 'valueDesc' | 'seriesAsc' | 'seriesDesc';


// ---------------------------------
// Data and dimension related types
// ---------------------------------

// Represents the values in series.data that need to be treated in a non-numeric way.
// Can be used by axis.type 'category' (i.e. scale.type 'ordinal').
// Finally the user data will be parsed and stored in `list._storage`.
// `NaN` represents "no data" (raw data `null`/`undefined`/`NaN`/`'-'`).
// Ordinal/category data will be parsed to its index if possible, otherwise
// keep its original string in list._storage.
// Check `convertValue` for more details.
export type OrdinalRawValue = string | number;
export type OrdinalNumber = number; // The number mapped from each OrdinalRawValue.

/**
 * @usage For example,
 * ```js
 * { ordinalNumbers: [2, 5, 3, 4] }
 * ```
 * means that ordinal 2 should be displayed on tick 0,
 * ordinal 5 should be displayed on tick 1, ...
 */
export type OrdinalSortInfo = {
    ordinalNumbers: OrdinalNumber[];
};

/**
 * `OptionDataValue` is the primitive value in `series.data` or `dataset.source`.
 * `OptionDataValue` are parsed (see `src/data/helper/dataValueHelper.parseDataValue`)
 * into `ParsedValue` and stored into `data/SeriesData` storage.
 * Note:
 * (1) The term "parse" does not mean `src/scale/Scale['parse']`(@see `ScaleDataValue`).
 * (2) If a category dimension is not mapped to any axis, its raw value will NOT be
 * parsed to `OrdinalNumber` but keep the original `OrdinalRawValue` in `src/data/SeriesData` storage.
 */
export type ParsedValue = ParsedValueNumeric | OrdinalRawValue;
export type ParsedValueNumeric = number | OrdinalNumber;

/**
 * `ScaleDataValue` represents the user input axis value in echarts API.
 * (For example, used `axis.min`/`axis.max` in echarts option, `convertToPixel`).
 * NOTICE:
 *  `ScaleDataValue` is slightly different from `OptionDataValue` for historical reason.
 *  `ScaleDataValue` should be parsed by `src/scale/Scale['parse']`.
 *  `OptionDataValue` should be parsed by `src/data/helper/dataValueHelper.parseDataValue`.
 * FIXME:
 *  Make `ScaleDataValue` `OptionDataValue` consistent? Since numeric string (like `'123'`) is accepted
 *  in `series.data` and is effectively accepted in some axis relevant option (e.g., `axis.min/max`),
 *  `type ScaleDataValue` should also include it for consistency. But it might bring some breaking in
 *  TS interface (user callback) and need comprehensive checks for all of the parsing of `ScaleDataValue`.
 */
export type ScaleDataValue = ParsedValueNumeric | OrdinalRawValue | Date;


/**
 * - `ScaleDataValue`:
 *   e.g. geo accept that primitive input, like `convertToPixel('some_place')`;
 *   Some coord sys, such as 'cartesian2d', also supports that for only query only a single axis.
 * - `ScaleDataValue[]`:
 *   This is the most common case, each array item represent each data in
 *   every dimension required by the coord sys. e.g., `[12, 98]` represents `[xData, yData]`.
 * - `(ScaleDataValue[])[]`:
 *   represents `[data_range_x, data_range_y]`. e.g., `dataToPoint([[5, 600], [8889, 9000]])`,
 *   represents data range `[5, 600]` in x, and `[8889, 9000]` in y.
 *   Can be also `[5, [8999, 9000]]`.
 */
export type CoordinateSystemDataCoord =
    (ScaleDataValue | NullUndefined)
    | (ScaleDataValue | NullUndefined)[]
    | (ScaleDataValue | ScaleDataValue[] | NullUndefined)[];

export type AxisBreakOption = {
    start: ScaleDataValue,
    end: ScaleDataValue,
    // - `number`: The unit is the same as data value, the same as `start`/`end`, not pixel.
    // - `string`:
    //     - Like '35%'. A percent over the axis extent. Useful for keeping the pixel size of break areas
    //       consistent despite variations in `series.data`, which cannot be achieved by `number`.
    //     - Also support numeric string like `'123'`, means `123`, following convention.
    // - If omitted, means 0.
    gap?: number | string,
    // undefined means false
    isExpanded?: boolean
};
// Within an axis, this is the identifier among multiple breaks.
export type AxisBreakOptionIdentifierInAxis = Pick<AxisBreakOption, 'start' | 'end'>;

// - Parsed from the breaks in axis model.
// - Never be null/undefined.
// - Contain only unexpanded breaks.
export type ParsedAxisBreakList = ParsedAxisBreak[];
export type ParsedAxisBreak = {
    // Keep breakOption.start/breakOption.end to identify the target break item in echarts action.
    breakOption: AxisBreakOption,
    // - Parsed start/end value. e.g. The user input start/end may be a data string
    //  '2021-12-12', and the parsed start/end are timestamp number.
    // - `vmin <= vmax` is ensured in parsing.
    vmin: number,
    vmax: number,
    // Parsed from `AxisBreakOption['gap']`. Need to save this intermediate value
    // because LogScale need to logarithmically transform to them.
    gapParsed: {
        type: 'tpAbs' | 'tpPrct'
        // If 'tpPrct', means percent, val is in 0~1.
        // If 'tpAbs', means absolute value, val is numeric gap value from option.
        val: number,
    },
    // Final calculated gap.
    gapReal: number | NullUndefined,
};
export type VisualAxisBreak = {
    type: 'vmin' | 'vmax',
    parsedBreak: ParsedAxisBreak,
};
export type AxisLabelFormatterExtraBreakPart = {
    break?: {
        type: 'start' | 'end',
        start: ParsedAxisBreak['vmin'],
        end: ParsedAxisBreak['vmax'],
        // After parsing, the start and end may be reversed and thus `start`
        // actually maps to `rawEnd`. It may causing confusion. And the param
        // `value` in the label formatter is also parsed value (except category
        // axis). So we only provide parsed break start/end to users.
    }
};

export interface ScaleTick {
    value: number,
    break?: VisualAxisBreak,
    time?: TimeScaleTick['time'],
};
export interface TimeScaleTick extends ScaleTick {
    time: {
        /**
         * Level information is used for label formatting.
         * `level` is 0 or undefined by default, with higher value indicating greater significant.
         * For example, a time axis may contain labels like: Jan, 8th, 16th, 23th, Feb, and etc.
         * In this case, month labels like Jan and Feb should be displayed in a more significant
         * way than days. The tick labels are:
         *      labels: `Jan  8th  16th  23th  Feb`
         *      levels: `1    0    0     0     1  `
         * The label formatter can be configured as `{[timeUnit]: string | string[]}`, where the
         * timeUnit is determined by the tick value itself by `time.ts#getUnitFromValue`, while
         * the `level` is the index under that time unit. (i.e., `formatter[timeUnit][level]`).
         */
        level: number,
        /**
         * An upper and lower time unit that is suggested to be displayed.
         * Terms upper/lower means, such as 'year' is "upper" and 'month' is "lower".
         * This is just suggestion. Time units that are out of this range can also be displayed.
         */
        upperTimeUnit: PrimaryTimeUnit,
        lowerTimeUnit: PrimaryTimeUnit,
    }
};
export interface OrdinalScaleTick extends ScaleTick {
    /**
     * Represents where the tick will be placed visually.
     * Notice:
     * The value is not the raw ordinal value. And do not changed
     * after ordinal scale sorted.
     * We need to:
     * ```js
     * const coord = dataToCoord(ordinalScale.getRawOrdinalNumber(tick.value)).
     * ```
     * Why place the tick value here rather than the raw ordinal value (like LogScale did)?
     * Because ordinal scale sort is the different case from LogScale, where
     * axis tick, splitArea should better not to be sorted, especially in
     * anid(animation id) when `boundaryGap: true`.
     * Only axis label are sorted.
     */
    value: number
};

/**
 * Return type of API `CoordinateSystem['dataToLayout']`, expose to users.
 */
export interface CoordinateSystemDataLayout {
    // Base layout rect for a data item.
    rect?: RectLike;
    // Commonly equals or shrinked from `rect, may considered padding and border
    // (depends on every coordinate system).
    contentRect?: RectLike;
    // Only available in matrix coordinate system.
    matrixXYLocatorRange?: number[][];

    // May extend.
}


// Can only be string or index, because it is used in object key in some code.
// Making the type alias here just intending to show the meaning clearly in code.
export type DimensionIndex = number;
// If being a number-like string but not being defined a dimension name.
// See `List.js#getDimension` for more details.
export type DimensionIndexLoose = DimensionIndex | string;
export type DimensionName = string;
export type DimensionLoose = DimensionName | DimensionIndexLoose;
export type DimensionType = DataStoreDimensionType;

export const VISUAL_DIMENSIONS = createHashMap<number, keyof DataVisualDimensions>([
    'tooltip', 'label', 'itemName', 'itemId', 'itemGroupId', 'itemChildGroupId', 'seriesName'
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
    itemGroupId?: DimensionIndex;
    itemChildGroupId?: DimensionIndex;
    seriesName?: DimensionIndex;
}

export type DimensionDefinition = {
    type?: DataStoreDimensionType,
    name?: DimensionName,
    displayName?: string
};
export type DimensionDefinitionLoose = DimensionDefinition['name'] | DimensionDefinition;

export const SOURCE_FORMAT_ORIGINAL = 'original' as const;
export const SOURCE_FORMAT_ARRAY_ROWS = 'arrayRows' as const;
export const SOURCE_FORMAT_OBJECT_ROWS = 'objectRows' as const;
export const SOURCE_FORMAT_KEYED_COLUMNS = 'keyedColumns' as const;
export const SOURCE_FORMAT_TYPED_ARRAY = 'typedArray' as const;
export const SOURCE_FORMAT_UNKNOWN = 'unknown' as const;

export type SourceFormat =
    typeof SOURCE_FORMAT_ORIGINAL
    | typeof SOURCE_FORMAT_ARRAY_ROWS
    | typeof SOURCE_FORMAT_OBJECT_ROWS
    | typeof SOURCE_FORMAT_KEYED_COLUMNS
    | typeof SOURCE_FORMAT_TYPED_ARRAY
    | typeof SOURCE_FORMAT_UNKNOWN;

export const SERIES_LAYOUT_BY_COLUMN = 'column' as const;
export const SERIES_LAYOUT_BY_ROW = 'row' as const;

export type SeriesLayoutBy = typeof SERIES_LAYOUT_BY_COLUMN | typeof SERIES_LAYOUT_BY_ROW;
// null/undefined/'auto': auto detect header, see "src/data/helper/sourceHelper".
// If number, means header lines count, or say, `startIndex`.
// Like `sourceHeader: 2`, means line 0 and line 1 are header, data start from line 2.
export type OptionSourceHeader = boolean | 'auto' | number;

export type SeriesDataType = 'main' | 'node' | 'edge';


// --------------------------------------------
// echarts option types (base and common part)
// --------------------------------------------

/**
 * [ECUnitOption]:
 * An object that contains definitions of components
 * and other properties. For example:
 *
 * ```ts
 * let option: ECUnitOption = {
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
    // Exclude these reserved word for `ECOption` to avoid to infer to "any".
    baseOption?: unknown
    options?: unknown
    media?: unknown

    timeline?: ComponentOption | ComponentOption[]
    backgroundColor?: ZRColor
    darkMode?: boolean | 'auto'
    textStyle?: GlobalTextStyleOption
    useUTC?: boolean
    hoverLayerThreshold?: number

    legacyViewCoordSysCenterBase?: boolean

    [key: string]: ComponentOption | ComponentOption[] | Dictionary<unknown> | unknown

    stateAnimation?: AnimationOption
} & AnimationOptionMixin & ColorPaletteOptionMixin;

/**
 * [ECOption]:
 * An object input to echarts.setOption(option).
 * May be an 'option: ECUnitOption',
 * or may be an object contains multi-options. For example:
 *
 * ```ts
 * let option: ECOption = {
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
export interface ECBasicOption extends ECUnitOption {
    baseOption?: ECUnitOption;
    timeline?: ComponentOption | ComponentOption[];
    options?: ECUnitOption[];
    media?: MediaUnit[];
};

// series.data or dataset.source
export type OptionSourceData<
    VAL extends OptionDataValue = OptionDataValue,
    ORIITEM extends OptionDataItemOriginal<VAL> = OptionDataItemOriginal<VAL>
> =
    OptionSourceDataOriginal<VAL, ORIITEM>
    | OptionSourceDataObjectRows<VAL>
    | OptionSourceDataArrayRows<VAL>
    | OptionSourceDataKeyedColumns<VAL>
    | OptionSourceDataTypedArray;
export type OptionDataItemOriginal<
    VAL extends OptionDataValue = OptionDataValue
> = VAL | VAL[] | OptionDataItemObject<VAL>;
export type OptionSourceDataOriginal<
    VAL extends OptionDataValue = OptionDataValue,
    ORIITEM extends OptionDataItemOriginal<VAL> = OptionDataItemOriginal<VAL>
> = ArrayLike<ORIITEM>;
export type OptionSourceDataObjectRows<VAL extends OptionDataValue = OptionDataValue> =
    Array<Dictionary<VAL>>;
export type OptionSourceDataArrayRows<VAL extends OptionDataValue = OptionDataValue> =
    Array<Array<VAL>>;
export type OptionSourceDataKeyedColumns<VAL extends OptionDataValue = OptionDataValue> =
    Dictionary<ArrayLike<VAL>>;
export type OptionSourceDataTypedArray = ArrayLike<number>;

// See also `model.js#getDataItemValue`.
export type OptionDataItem =
    OptionDataValue
    | Dictionary<OptionDataValue>
    | OptionDataValue[]
    // FIXME: In some case (markpoint in geo (geo-map.html)), dataItem is {coord: [...]}
    | OptionDataItemObject<OptionDataValue>;
// Only for `SOURCE_FORMAT_KEYED_ORIGINAL`
export type OptionDataItemObject<T> = {
    id?: OptionId;
    name?: OptionName;
    groupId?: OptionId;
    childGroupId?: OptionId;
    value?: T[] | T;
    selected?: boolean;
};
// Compat number because it is usually used and not easy to
// restrict it in practise.
export type OptionId = string | number;
export type OptionName = string | number;
export interface GraphEdgeItemObject<
    VAL extends OptionDataValue
> extends OptionDataItemObject<VAL> {
    /**
     * Name or index of source node.
     */
    source?: string | number
    /**
     * Name or index of target node.
     */
    target?: string | number
}
export type OptionDataValue = string | number | Date | null | undefined;

export type OptionDataValueNumeric = number | '-';
export type OptionDataValueCategory = string;
export type OptionDataValueDate = Date | string | number;

// export type ModelOption = Dictionary<any> | any[] | string | number | boolean | ((...args: any) => any);
export type ModelOption = any;
export type ThemeOption = Dictionary<any>;

export type DisplayState = 'normal' | 'emphasis' | 'blur' | 'select';
export type DisplayStateNonNormal = Exclude<DisplayState, 'normal'>;
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

    // Group id is used for linking the aggregate relationship between two set of data.
    // Which is useful in prepresenting the transition key of drilldown/up animation.
    // Or hover linking.
    itemGroupId?: OptionEncodeValue;
    childGroupdId?: OptionEncodeValue;
}
export interface OptionEncode extends OptionEncodeVisualDimensions {
    [coordDim: string]: OptionEncodeValue | undefined
}
export type OptionEncodeValue = DimensionLoose | DimensionLoose[];
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
    data: OptionDataItem;
    dataType?: SeriesDataType;
    value: OptionDataItem | OptionDataValue;
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
export type InterpolatableValue = ParsedValue | ParsedValue[];

export type DecalDashArrayX = number | (number | number[])[];
export type DecalDashArrayY = number | number[];
export interface DecalObject {
    // 'image', 'triangle', 'diamond', 'pin', 'arrow', 'line', 'rect', 'roundRect', 'square', 'circle'
    symbol?: string | string[]

    // size relative to the dash bounding box; valued from 0 to 1
    symbolSize?: number
    // keep the aspect ratio and use the smaller one of width and height as bounding box size
    symbolKeepAspect?: boolean

    // foreground color of the pattern
    color?: string
    // background color of the pattern; default value is 'none' (same as 'transparent') so that the underlying series color is displayed
    backgroundColor?: string

    // dash-gap pattern on x
    dashArrayX?: DecalDashArrayX
    // dash-gap pattern on y
    dashArrayY?: DecalDashArrayY

    // in radians; valued from -Math.PI to Math.PI
    rotation?: number

    // boundary of largest tile width
    maxTileWidth?: number
    // boundary of largest tile height
    maxTileHeight?: number
};

export interface InnerDecalObject extends DecalObject {
    // Mark dirty when object may be changed.
    // The record in WeakMap will be deleted.
    dirty?: boolean
}

export interface MediaQuery {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    minAspectRatio?: number;
    maxAspectRatio?: number;
};
export type MediaUnit = {
    query?: MediaQuery,
    option: ECUnitOption
};

export type ComponentLayoutMode = {
    // Only support 'box' now.
    type?: 'box',
    ignoreSize?: boolean | boolean[]
};

// ------------------ Mixins for Common Option Properties ------------------
export type PaletteOptionMixin = ColorPaletteOptionMixin;

export interface ColorPaletteOptionMixin {
    color?: ZRColor | ZRColor[]
    colorLayer?: ZRColor[][]
}

/**
 * Mixin of option set to control the box layout of each component.
 */
export interface BoxLayoutOptionMixin {
    width?: PositionSizeOption;
    height?: PositionSizeOption;
    top?: PositionSizeOption;
    right?: PositionSizeOption;
    bottom?: PositionSizeOption;
    left?: PositionSizeOption;
}
/**
 * Need to be parsed by `parsePositionOption` or `parsePositionSizeOption`.
 * Accept number, or numeric string (`'123'`), or percentage ('100%'), as x/y/width/height pixel number.
 * If null/undefined or invalid, return NaN.
 */
export type PositionSizeOption = number | string;

export interface CircleLayoutOptionMixin<TNuance extends {centerExtra: unknown} = {centerExtra: never}> {
    // Can be percent
    center?: (number | string)[] | TNuance['centerExtra']
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
    borderColor?: ZRColor
    borderWidth?: number
    borderType?: ZRLineType
    borderCap?: CanvasLineCap
    borderJoin?: CanvasLineJoin
    borderDashOffset?: number
    borderMiterLimit?: number
}

export type ColorBy = 'series' | 'data';

export interface SunburstColorByMixin {
    colorBy?: ColorBy
}

export type AnimationDelayCallbackParam = {
    count: number
    index: number
};
export type AnimationDurationCallback = (idx: number) => number;
export type AnimationDelayCallback = (idx: number, params?: AnimationDelayCallbackParam) => number;

export interface AnimationOption {
    duration?: number
    easing?: AnimationEasing
    delay?: number
    // additive?: boolean
}

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
    animationEasing?: AnimationEasing
    /**
     * Delay of initialize animation
     * Can be a callback to specify duration of each element
     */
    animationDelay?: number | AnimationDelayCallback
    // For update animation
    /**
     * Delay of data update animation.
     * Can be a callback to specify duration of each element
     */
    animationDurationUpdate?: number | AnimationDurationCallback
    /**
     * Easing of data update animation.
     */
    animationEasingUpdate?: AnimationEasing
    /**
     * Delay of data update animation.
     * Can be a callback to specify duration of each element
     */
    animationDelayUpdate?: number | AnimationDelayCallback
}

export interface RoamOptionMixin {
    /**
     * If enable roam. can be specified 'scale' or 'move'
     */
    roam?: boolean | 'pan' | 'move' | 'zoom' | 'scale'
    /**
     * Hover over an area where roaming is triggered.
     * - if `null`/`undefined`, the trigger area is
     *   the intersection of "self bounding rect" and "clipping rect (if any)".
     * - if 'global', the trigger area is
     *   the intersection of "the entire canvas" and "clipping rect (if any)".
     * NOTE:
     *  The clipping rect, which can be enabled by `clip: true`, is typically the layout rect.
     *  The layout rect is typically determined by option `left`/`right`/`top`/`bottom`/`width`/`height`, some
     *  components/series, such as `geo` and `series.map` can also be determined by `layoutCenter`/`layoutSize`,
     *  and may modified by `preserveAspect`.
     *
     * PENDING: do we need to support to only trigger roaming on the shapes themselves,
     *  rather than the bounding rect?
     * PENDING: do we need to support to check by the laytout rect? But in this case,
     *  `roamTrigger: 'global', clip: true` is more reasonable.
     */
    roamTrigger?: 'global' | 'selfRect' | NullUndefined
    /**
     * Current center position.
     */
    center?: (number | string)[]
    /**
     * Current zoom level. Default is 1
     */
    zoom?: number

    scaleLimit?: {
        min?: number
        max?: number
    }
}

export interface PreserveAspectMixin {
    // Suppose a "viewport" is decided by `left`/`right`/`top`/`bottom`/`width`/`height`,
    // - null/undefined/false (default): aspect ratio will not be preserved, but stretched to fill
    //   the "viewport".
    // - 'contain'/true: The aspect ratio is preserved; the viewRect is contained by the "viewport",
    //   and scaled up as much as possible to meet the "viewport".
    // - 'cover': The aspect ratio is preserved; the viewRect covers the "viewport", and scaled down
    //   as much as possible to meet the "viewport".
    preserveAspect?: boolean | 'contain' | 'cover';
    // By default 'center'
    preserveAspectAlign?: 'left' | 'right' | 'center';
    // By default 'middle'
    preserveAspectVerticalAlign?: 'top' | 'bottom' | 'middle';
}

// TODO: TYPE value type?
export type SymbolSizeCallback<T> = (rawValue: any, params: T) => number | number[];
export type SymbolCallback<T> = (rawValue: any, params: T) => string;
export type SymbolRotateCallback<T> = (rawValue: any, params: T) => number;
export type SymbolOffsetCallback<T> = (rawValue: any, params: T) => string | number | (string | number)[];
/**
 * Mixin of option set to control the element symbol.
 * Include type of symbol, and size of symbol.
 */
export interface SymbolOptionMixin<T = never> {
    /**
     * type of symbol, like `cirlce`, `rect`, or custom path and image.
     */
    symbol?: string | (T extends never ? never : SymbolCallback<T>)
    /**
     * Size of symbol.
     */
    symbolSize?: number | number[] | (T extends never ? never : SymbolSizeCallback<T>)

    symbolRotate?: number | (T extends never ? never : SymbolRotateCallback<T>)

    symbolKeepAspect?: boolean

    symbolOffset?: string | number | (string | number)[] | (T extends never ? never : SymbolOffsetCallback<T>)
}

/**
 * ItemStyleOption is a most common used set to config element styles.
 * It includes both fill and stroke style.
 */
export interface ItemStyleOption<TCbParams = never> extends ShadowOptionMixin, BorderOptionMixin {
    color?: ZRColor | (TCbParams extends never ? never : ((params: TCbParams) => ZRColor))
    opacity?: number
    decal?: DecalObject | 'none'
    borderRadius?: (number | string)[] | number | string
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
    cap?: CanvasLineCap
    join?: CanvasLineJoin
    dashOffset?: number
    miterLimit?: number
}

/**
 * ItemStyleOption is a option set to control styles on an area, like polygon, rectangle.
 * It only include fill style.
 */
export interface AreaStyleOption<Clr = ZRColor> extends ShadowOptionMixin {
    color?: Clr
    opacity?: number
}

type Arrayable<T extends Dictionary<any>> = { [key in keyof T]: T[key] | T[key][] };
type Dictionaryable<T extends Dictionary<any>> = { [key in keyof T]: T[key] | Dictionary<T[key]>};

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
    decal?: DecalObject

    // Not exposed?
    liftZ?: number
}
export type VisualOptionFixed = VisualOptionUnit;
/**
 * Option about visual properties used in piecewise mapping
 * Used in each piece.
 */
export type VisualOptionPiecewise = VisualOptionUnit;
/**
 * Option about visual properties used in linear mapping
 */
export type VisualOptionLinear = Arrayable<VisualOptionUnit>;

/**
 * Option about visual properties can be encoded from ordinal categories.
 * Each value can either be a dictionary to lookup with category name, or
 * be an array to lookup with category index. In this case the array length should
 * be same with categories.
 */
export type VisualOptionCategory = Arrayable<VisualOptionUnit> | Dictionaryable<VisualOptionUnit>;

/**
 * All visual properties can be encoded.
 */
export type BuiltinVisualProperty = keyof VisualOptionUnit;

export type TextCommonOptionNuanceBase = Record<string, unknown>;
export type TextCommonOptionNuanceDefault = {};
// 'auto' has been deprecated.
type LabelStyleColorString = ColorString | 'inherit' | 'auto'; // Nominal as a comment.
export interface TextCommonOption<
    TNuance extends TextCommonOptionNuanceBase = TextCommonOptionNuanceDefault
> extends ShadowOptionMixin {
    color?: 'color' extends keyof TNuance ? (TNuance['color'] | LabelStyleColorString) : LabelStyleColorString
    fontStyle?: ZRFontStyle
    fontWeight?: ZRFontWeight
    fontFamily?: string
    fontSize?: number | string
    align?: HorizontalAlign
    verticalAlign?: VerticalAlign
    // @deprecated
    baseline?: VerticalAlign

    opacity?: number

    lineHeight?: number
    backgroundColor?: ColorString | {
        image: ImageLike | string
    }
    borderColor?: string
    borderWidth?: number
    borderType?: ZRLineType
    borderDashOffset?: number
    borderRadius?: number | number[]
    padding?: number | number[]
    /**
     * Currently margin related options are not declared here. They are not supported in rich text.
     * @see {LabelCommonOption}
     */

    width?: number | string // Percent
    height?: number
    textBorderColor?: string
    textBorderWidth?: number
    textBorderType?: ZRLineType
    textBorderDashOffset?: number

    textShadowBlur?: number
    textShadowColor?: string
    textShadowOffsetX?: number
    textShadowOffsetY?: number

    tag?: string
}

export type GlobalTextStyleOption = Pick<
    TextCommonOption,
    'color' | 'opacity'
    | 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'
    | 'textShadowColor' | 'textShadowBlur' | 'textShadowOffsetX' | 'textShadowOffsetY'
    | 'textBorderColor' | 'textBorderWidth' | 'textBorderType' | 'textBorderDashOffset'
>;

export interface RichTextOption extends Dictionary<TextCommonOption> {
}

export interface LabelFormatterCallback<T = CallbackDataParams> {
    (params: T): string
}
/**
 * LabelOption is an option set to control the style of labels.
 * Include color, background, shadow, truncate, rotation, distance, etc..
 */
export interface LabelOption<
    TNuance extends {positionExtra: unknown} = {positionExtra: never}
> extends LabelCommonOption {
    /**
     * If show label
     */
    show?: boolean
    // TODO: TYPE More specified 'inside', 'insideTop'....
    // x, y can be both percent string or number px.
    position?: ElementTextConfig['position'] | TNuance['positionExtra']
    distance?: number
    rotate?: number
    offset?: number[]

    silent?: boolean
    precision?: number | 'auto'
    valueAnimation?: boolean

    // TODO: TYPE not all label support formatter
    // formatter?: string | ((params: CallbackDataParams) => string)
}

/**
 * Common options for both `axis.axisLabel`, `axis.nameTextStyle and other `label`s.
 * Historically, they have had some nuances in options.
 */
export interface LabelCommonOption<
    TNuanceOption extends TextCommonOptionNuanceBase = TextCommonOptionNuanceDefault
> extends TextCommonOption<TNuanceOption> {

    /**
     * Min margin between labels. Used when label has layout.
     * PENDING: @see {LabelMarginType}
     * It's `minMargin` instead of `margin` is for not breaking the previous code using `margin`.
     * See the summary in `textMargin`.
     *
     * [CAUTION]: do not set `minMargin` in `defaultOption`, otherwise users have to explicitly
     *  clear the `minMargin` to use `textMargin`.
     */
    minMargin?: number
    /**
     * The space around the label to escape from overlapping.
     * Applied on the label local rect (rather than rotated enlarged rect)
     * Follow the format defined by `format.ts#normalizeCssArray`.
     *
     * Introduce the name `textMargin` rather than reuse the existing names to avoid breaking change:
     *  - `margin` historically have been used to indicate the distance from `label.x/.y` to something:
     *      - `axisLabel.margin` & `axisPointer.label.margin`: to the axis line.
     *      - `calendar.dayLabel/monthLabel/yearLabel.margin`:
     *      - `series-pie.label.margin`: to pie body (deprecated, replaced by `edgeDistance`)
     *      - `series-themeRiver.label.margin`: to the shape edge
     *  - `minMargin` conveys the same meaning as this `textMargin` but has a different nuance,
     *    it works like CSS margin collapse (gap = label1.minMargin/2 + label2.minMargin/2),
     *    and `minMargin` applied on the global bounding rect (parallel to screen x and y) rather
     *    than the original local bounding rect (can be rotated, smaller and more presice).
     * PENDING: @see {LabelMarginType}
     */
    textMargin?: number | number[]

    overflow?: TextStyleProps['overflow']
    lineOverflow?: TextStyleProps['lineOverflow']
    ellipsis?: TextStyleProps['ellipsis']
    rich?: RichTextOption
}

export interface SeriesLabelOption<
    TCallbackDataParams extends CallbackDataParams = CallbackDataParams,
    TNuance extends {positionExtra: unknown} = {positionExtra: never}
> extends LabelOption<TNuance> {
    formatter?: string | LabelFormatterCallback<TCallbackDataParams>
}

/**
 * Option for labels on line, like markLine, lines
 */
export interface LineLabelOption extends Omit<LabelOption, 'distance' | 'position'> {
    position?: 'start'
        | 'middle'
        | 'end'
        | 'insideStart'
        | 'insideStartTop'
        | 'insideStartBottom'
        | 'insideMiddle'
        | 'insideMiddleTop'
        | 'insideMiddleBottom'
        | 'insideEnd'
        | 'insideEndTop'
        | 'insideEndBottom'
        | 'insideMiddleBottom'
    /**
     * Distance can be an array.
     * Which will specify horizontal and vertical distance respectively
     */
    distance?: number | number[]
}

export interface LabelLineOption {
    show?: boolean
    /**
     * If displayed above other elements
     */
    showAbove?: boolean
    length?: number
    length2?: number
    smooth?: boolean | number
    minTurnAngle?: number,
    lineStyle?: LineStyleOption
}

export interface SeriesLineLabelOption extends LineLabelOption {
    formatter?: string | LabelFormatterCallback<CallbackDataParams>
}



export interface LabelLayoutOptionCallbackParams {
    /**
     * Index of data which the label represents.
     * It can be null if label doesn't represent any data.
     */
    dataIndex?: number,
    /**
     * Type of data which the label represents.
     * It can be null if label doesn't represent any data.
     */
    dataType?: SeriesDataType,
    seriesIndex: number,
    text: string
    align: ZRTextAlign
    verticalAlign: ZRTextVerticalAlign
    rect: RectLike
    labelRect: RectLike
    // Points of label line in pie/funnel
    labelLinePoints?: number[][]
    // x: number
    // y: number
};

export interface LabelLayoutOption {
    /**
     * If move the overlapped label. If label is still overlapped after moved.
     * It will determine if to hide this label with `hideOverlap` policy.
     *
     * shiftX/Y will keep the order on x/y
     * shuffleX/y will move the label around the original position randomly.
     */
    moveOverlap?: 'shiftX'
        | 'shiftY'
        | 'shuffleX'
        | 'shuffleY'
    /**
     * If hide the overlapped label. It will be handled after move.
     * @default 'none'
     */
    hideOverlap?: boolean
    /**
     * If label is draggable.
     */
    draggable?: boolean
    /**
     * Can be absolute px number or percent string.
     */
    x?: number | string
    y?: number | string
    /**
     * offset on x based on the original position.
     */
    dx?: number
    /**
     * offset on y based on the original position.
     */
    dy?: number
    rotate?: number

    align?: ZRTextAlign
    verticalAlign?: ZRTextVerticalAlign
    width?: number
    height?: number
    fontSize?: number

    labelLinePoints?: number[][]
}

export type LabelLayoutOptionCallback = (params: LabelLayoutOptionCallbackParams) => LabelLayoutOption;


export interface TooltipFormatterCallback<T> {
    /**
     * For sync callback
     * params will be an array on axis trigger.
     */
    (params: T, asyncTicket: string): string | HTMLElement | HTMLElement[]
    /**
     * For async callback.
     * Returned html string will be a placeholder when callback is not invoked.
     */
    (
        params: T, asyncTicket: string,
        callback: (cbTicket: string, htmlOrDomNodes: string | HTMLElement | HTMLElement[]) => void
    ) : string | HTMLElement | HTMLElement[]
}

type TooltipBuiltinPosition = 'inside' | 'top' | 'left' | 'right' | 'bottom';
type TooltipBoxLayoutOption = Pick<
    BoxLayoutOptionMixin, 'top' | 'left' | 'right' | 'bottom'
>;

export type TooltipPositionCallbackParams = CallbackDataParams | CallbackDataParams[];

/**
 * Position relative to the hoverred element. Only available when trigger is item.
 */
export interface TooltipPositionCallback {
    (
        point: [number, number],
        /**
         * params will be an array on axis trigger.
         */
        params: TooltipPositionCallbackParams,
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
    ): Array<number | string> | TooltipBuiltinPosition | TooltipBoxLayoutOption
}
/**
 * Common tooltip option
 * Can be configured on series, graphic elements
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
     * Formatter of value.
     *
     * Will be ignored if tooltip.formatter is specified.
     */
    valueFormatter?: (value: OptionDataValue | OptionDataValue[], dataIndex: number) => string
    /**
     * Absolution pixel [x, y] array. Or relative percent string [x, y] array.
     * If trigger is 'item'. position can be set to 'inside' / 'top' / 'left' / 'right' / 'bottom',
     * which is relative to the hovered element.
     *
     * Support to be a callback
     */
    position?: (number | string)[] | TooltipBuiltinPosition | TooltipPositionCallback | TooltipBoxLayoutOption

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

    /**
     * Whether enable display transition when show/hide tooltip.
     * Defaults to `true` for backward compatibility.
     * If set to `false`, the tooltip 'display' will be set to 'none' when hidden.
     * @default true
     * @since v6.0.0
     */
    displayTransition?: boolean

    backgroundColor?: ColorString
    borderColor?: ColorString
    borderRadius?: number
    borderWidth?: number
    shadowBlur?: number
    shadowColor?: string
    shadowOffsetX?: number
    shadowOffsetY?: number

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

export type ComponentItemTooltipOption<T> = CommonTooltipOption<T> & {
    // Default content HTML.
    content?: string;
    /**
     * Whether to encode HTML content according to `tooltip.renderMode`.
     *
     * e.g. renderMode 'html' needs to encode but 'richText' does not.
     */
    encodeHTMLContent?: boolean;
    formatterParams?: ComponentItemTooltipLabelFormatterParams;
};
export type ComponentItemTooltipLabelFormatterParams = {
    componentType: string
    name: string
    // properties key array like ['name']
    $vars: string[]
} & {
    // Other properties
    [key in string]: unknown
};


/**
 * Tooltip option configured on each series
 */
export type SeriesTooltipOption = CommonTooltipOption<CallbackDataParams> & {
    trigger?: 'item' | 'axis' | boolean | 'none'
};




type LabelFormatterParams = {
    value: ScaleDataValue
    axisDimension: string
    axisIndex: number
    seriesData: CallbackDataParams[]
};
/**
 * Common axis option. can be configured on each axis
 */
export interface CommonAxisPointerOption {
    show?: boolean | 'auto'

    z?: number;
    zlevel?: number;

    triggerOn?: 'click' | 'mousemove' | 'none' | 'mousemove|click'

    type?: 'line' | 'shadow' | 'none'

    snap?: boolean

    triggerTooltip?: boolean

    triggerEmphasis?: boolean

    /**
     * current value. When using axisPointer.handle, value can be set to define the initial position of axisPointer.
     */
    value?: ScaleDataValue

    status?: 'show' | 'hide'

    // [group0, group1, ...]
    // Each group can be: {
    //      mapper: function () {},
    //      singleTooltip: 'multiple',  // 'multiple' or 'single'
    //      xAxisId: ...,
    //      yAxisName: ...,
    //      angleAxisIndex: ...
    // }
    // mapper: can be ignored.
    //      input: {axisInfo, value}
    //      output: {axisInfo, value}

    label?: LabelOption & {
        precision?: 'auto' | number
        margin?: number
        /**
         * String template include variable {value} or callback function
         */
        formatter?: string | ((params: LabelFormatterParams) => string)
    }
    animation?: boolean | 'auto'
    animationDurationUpdate?: number
    animationEasingUpdate?: ZREasing

    /**
     * Available when type is 'line'
     */
    lineStyle?: LineStyleOption
    /**
     * Available when type is 'shadow'
     */
    shadowStyle?: AreaStyleOption

    handle?: {
        show?: boolean
        icon?: string
        /**
         * The size of the handle
         */
        size?: number | number[]
        /**
         * Distance from handle center to axis.
         */
        margin?: number

        color?: ColorString

        /**
         * Throttle for mobile performance
         */
        throttle?: number
    } & ShadowOptionMixin


    seriesDataIndices?: {
        seriesIndex: number
        dataIndex: number
        dataIndexInside: number
    }[]

}

export interface ComponentOption {
    mainType?: string;

    type?: string;

    id?: OptionId;
    name?: OptionName;

    z?: number;
    zlevel?: number;

    coordinateSystem?: string
    coordinateSystemUsage?: CoordinateSystemUsageOption
    coord?: CoordinateSystemDataCoord
}

/**
 * - "data": Use it as "dataCoordSys", each data item is laid out based on a coord sys.
 * - "box": Use it as "boxCoordSys", the overall bounding rect or anchor point is calculated based on a coord sys.
 *   e.g.,
 *      grid rect (cartesian rect) is calculate based on matrix/calendar coord sys;
 *      pie center is calculated based on calendar/cartesian;
 *
 * The default value (if not declared in option `coordinateSystemUsage`):
 *  For series, be "data", since this is the most case and backward compatible.
 *  For non-series components, be "box", since "data" is not applicable.
 */
export type CoordinateSystemUsageOption = 'data' | 'box';

export type BlurScope = 'coordinateSystem' | 'series' | 'global';

/**
 * can be array of data indices.
 * Or may be an dictionary if have different types of data like in graph.
 */
export type InnerFocus = DefaultEmphasisFocus | ArrayLike<number> | Dictionary<ArrayLike<number>>;

export interface DefaultStatesMixin {
    // FIXME
    emphasis?: any
    select?: any
    blur?: any
}

export type DefaultEmphasisFocus = 'none' | 'self' | 'series';

export interface DefaultStatesMixinEmphasis {
    /**
     * self: Focus self and blur all others.
     * series: Focus series and blur all other series.
     */
    focus?: DefaultEmphasisFocus
}

export interface StatesMixinBase {
    emphasis?: unknown
    select?: unknown
    blur?: unknown
}

export interface StatesOptionMixin<
    StateOption,
    StatesMixin extends StatesMixinBase
> {
    /**
     * Emphasis states
     */
    emphasis?: StateOption & StatesMixin['emphasis'] & {
        /**
         * Scope of blurred element when focus.
         *
         * coordinateSystem: blur others in the same coordinateSystem
         * series: blur others in the same series
         * global: blur all others
         *
         * Default to be coordinate system.
         */
        blurScope?: BlurScope

        /**
         * If emphasis state is disabled.
         */
        disabled?: boolean
    }
    /**
     * Select states
     */
    select?: StateOption & StatesMixin['select'] & {
        disabled?: boolean
    }
    /**
     * Blur states.
     */
    blur?: StateOption & StatesMixin['blur']
}

export interface UniversalTransitionOption {
    enabled?: boolean
    /**
     * Animation delay of each divided element
     */
    delay?: (index: number, count: number) => number
    /**
     * How to divide the shape in combine and split animation.
     */
    divideShape?: 'clone' | 'split'
    /**
     * Series will have transition between if they have same seriesKey.
     * Usually it is a string. It can also be an array,
     * which means it can be transition from or to multiple series with each key in this array item.
     *
     * Note:
     * If two series have both array seriesKey. They will be compared after concated to a string(which is order independent)
     * Transition between string key has higher priority.
     *
     * Default to use series id.
     */
    seriesKey?: string | string[]
}

export interface SeriesOption<
    StateOption = unknown,
    StatesMixin extends StatesMixinBase = DefaultStatesMixin
> extends
    ComponentOption,
    AnimationOptionMixin,
    ColorPaletteOptionMixin,
    StatesOptionMixin<StateOption, StatesMixin>
{
    mainType?: 'series'

    silent?: boolean

    blendMode?: string

    /**
     * Cursor when mouse on the elements
     */
    cursor?: string

    /**
     * groupId of data. can be used for doing drilldown / up animation
     * It will be ignored if:
     *  - groupId is specified in each data
     *  - encode.itemGroupId is given.
     */
    dataGroupId?: OptionId
    // Needs to be override
    data?: unknown

    colorBy?: ColorBy

    legendHoverLink?: boolean

    /**
     * Configurations about progressive rendering
     */
    progressive?: number | false
    progressiveThreshold?: number
    progressiveChunkMode?: 'mod'

    hoverLayerThreshold?: number

    /**
     * When dataset is used, seriesLayoutBy specifies whether the column or the row of dataset is mapped to the series
     * namely, the series is "layout" on columns or rows
     * @default 'column'
     */
    seriesLayoutBy?: 'column' | 'row'

    labelLine?: LabelLineOption

    /**
     * Overall label layout option in label layout stage.
     */
    labelLayout?: LabelLayoutOption | LabelLayoutOptionCallback

    /**
     * Animation config for state transition.
     */
    stateAnimation?: AnimationOption

    /**
     * If enabled universal transition cross series.
     * @example
     *  universalTransition: true
     *  universalTransition: { enabled: true }
     */
    universalTransition?: boolean | UniversalTransitionOption

    /**
     * Map of selected data
     * key is name or index of data.
     */
    selectedMap?: Dictionary<boolean> | 'all'
    selectedMode?: 'single' | 'multiple' | 'series' | boolean
}

export interface SeriesOnCartesianOptionMixin {
    xAxisIndex?: number
    yAxisIndex?: number

    xAxisId?: OptionId
    yAxisId?: OptionId
}

export interface SeriesOnPolarOptionMixin {
    polarIndex?: number
    polarId?: OptionId;
}

export interface SeriesOnSingleOptionMixin {
    singleAxisIndex?: number
    singleAxisId?: OptionId
}

export interface SeriesOnGeoOptionMixin {
    geoIndex?: number;
    geoId?: OptionId
}

export interface SeriesOnRadarOptionMixin {
    radarIndex?: number;
    radarId?: OptionId
}

export interface ComponentOnCalendarOptionMixin {
    calendarIndex?: number
    calendarId?: OptionId
}

export interface ComponentOnMatrixOptionMixin {
    matrixIndex?: number
    matrixId?: OptionId
}

export interface SeriesLargeOptionMixin {
    large?: boolean
    largeThreshold?: number
}
export interface SeriesStackOptionMixin {
    stack?: string
    stackStrategy?: 'samesign' | 'all' | 'positive' | 'negative';
    stackOrder?: 'seriesAsc' | 'seriesDesc'; // default: seriesAsc
}

type SamplingFunc = (frame: ArrayLike<number>) => number;

export interface SeriesSamplingOptionMixin {
    sampling?: 'none' | 'average' | 'min' | 'max' | 'minmax' | 'sum' | 'lttb' | SamplingFunc
}

export interface SeriesEncodeOptionMixin {
    datasetIndex?: number;
    datasetId?: string | number;
    seriesLayoutBy?: SeriesLayoutBy;
    sourceHeader?: OptionSourceHeader;
    dimensions?: DimensionDefinitionLoose[];
    encode?: OptionEncode
}

export type SeriesEncodableModel = SeriesModel<SeriesOption & SeriesEncodeOptionMixin>;


// TODO Move to aria component
export interface AriaLabelOption {
    enabled?: boolean;
    description?: string;
    general?: {
        withTitle?: string;
        withoutTitle?: string;
    };
    series?: {
        maxCount?: number;
        single?: {
            prefix?: string;
            withName?: string;
            withoutName?: string;
        };
        multiple?: {
            prefix?: string;
            withName?: string;
            withoutName?: string;
            separator?: {
                middle?: string;
                end?: string;
            }
        }
    };
    data?: {
        maxCount?: number;
        allData?: string;
        partialData?: string;
        withName?: string;
        withoutName?: string;
        separator?: {
            middle?: string;
            end?: string;
        },
        excludeDimensionId?: number[]
    }
}

// Extending is for compating ECharts 4
export interface AriaOption extends AriaLabelOption {
    mainType?: 'aria';

    enabled?: boolean;
    label?: AriaLabelOption;
    decal?: {
        show?: boolean;
        decals?: DecalObject | DecalObject[];
    };
}

export interface AriaOptionMixin {
    aria?: AriaOption
}
