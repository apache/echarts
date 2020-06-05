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


import {__DEV__} from '../config';
import {
    hasOwn, assert, isString, retrieve2, retrieve3, defaults, each, keys, isArrayLike
} from 'zrender/src/core/util';
import * as graphicUtil from '../util/graphic';
import {getDefaultLabel} from './helper/labelHelper';
import createListFromArray from './helper/createListFromArray';
import {getLayoutOnAxis} from '../layout/barGrid';
import DataDiffer from '../data/DataDiffer';
import SeriesModel from '../model/Series';
import Model from '../model/Model';
import ChartView from '../view/Chart';
import {createClipPath} from './helper/createClipPathFromCoordSys';
import {
    EventQueryItem, ECEvent, SeriesOption, SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin, SeriesOnSingleOptionMixin, SeriesOnGeoOptionMixin,
    SeriesOnCalendarOptionMixin, ItemStyleOption, SeriesEncodeOptionMixin,
    SeriesTooltipOption,
    DimensionLoose,
    ParsedValue,
    Dictionary,
    CallbackDataParams,
    Payload,
    StageHandlerProgressParams,
    LabelOption,
    ViewRootGroup,
    OptionDataValue,
    ZRStyleProps,
    DisplayState,
    ECElement,
    DisplayStateNonNormal
} from '../util/types';
import Element, { ElementProps, ElementTextConfig } from 'zrender/src/Element';
import prepareCartesian2d from '../coord/cartesian/prepareCustom';
import prepareGeo from '../coord/geo/prepareCustom';
import prepareSingleAxis from '../coord/single/prepareCustom';
import preparePolar from '../coord/polar/prepareCustom';
import prepareCalendar from '../coord/calendar/prepareCustom';
import ComponentModel from '../model/Component';
import List, { DefaultDataVisual } from '../data/List';
import GlobalModel from '../model/Global';
import { makeInner, normalizeToArray } from '../util/model';
import ExtensionAPI from '../ExtensionAPI';
import Displayable from 'zrender/src/graphic/Displayable';
import Axis2D from '../coord/cartesian/Axis2D';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { PathProps } from 'zrender/src/graphic/Path';
import { ImageStyleProps } from 'zrender/src/graphic/Image';
import { CoordinateSystem } from '../coord/CoordinateSystem';
import { TextStyleProps } from 'zrender/src/graphic/Text';
import {
    convertToEC4StyleForCustomSerise,
    isEC4CompatibleStyle,
    convertFromEC4CompatibleStyle,
    LegacyStyleProps,
    warnDeprecated
} from '../util/styleCompat';
import Transformable from 'zrender/src/core/Transformable';
import { ItemStyleProps } from '../model/mixin/itemStyle';
import { cloneValue } from 'zrender/src/animation/Animator';


const inner = makeInner<{
    info: CustomExtraElementInfo;
    customPathData: string;
    customGraphicType: string;
    customImagePath: CustomImageOption['style']['image'];
    // customText: string;
    txConZ2Set: number;
    orginalDuring: Element['updateDuringAnimation'];
    customDuring: CustomZRPathOption['during'];
    leaveToProps: ElementProps
}, Element>();

type CustomExtraElementInfo = Dictionary<unknown>;
const TRANSFORM_PROPS = {
    x: 1,
    y: 1,
    scaleX: 1,
    scaleY: 1,
    originX: 1,
    originY: 1,
    rotation: 1
} as const;
type TransformProps = keyof typeof TRANSFORM_PROPS;

type TransitionAnyProps = string | string[];
type TransitionTransformProps = TransformProps | TransformProps[];
// Do not declare "Dictionary" in TransitionAnyOption to restrict the type check.
type TransitionAnyOption = {
    $transition?: TransitionAnyProps;
    $enterFrom?: Dictionary<unknown>;
    $leaveTo?: Dictionary<unknown>;
};
type TransitionTransformOption = {
    $transition?: TransitionTransformProps;
    $enterFrom?: Dictionary<unknown>;
    $leaveTo?: Dictionary<unknown>;
};

interface CustomBaseElementOption extends Partial<Pick<
    Element, TransformProps | 'silent' | 'ignore' | 'textConfig'
>>, TransitionTransformOption {
    // element type, mandatory.
    type: string;
    id?: string;
    // For animation diff.
    name?: string;
    info?: CustomExtraElementInfo;
    // `false` means remove the textContent.
    textContent?: CustomTextOption | false;
    // `false` means remove the clipPath
    clipPath?: CustomZRPathOption | false;
    // Shape can be set in any el option for custom prop for annimation duration.
    shape?: TransitionAnyOption;
    // updateDuringAnimation
    during?(elProps: CustomDuringElProps): void;
};
interface CustomDisplayableOption extends CustomBaseElementOption, Partial<Pick<
    Displayable, 'zlevel' | 'z' | 'z2' | 'invisible'
>> {
    style?: ZRStyleProps & TransitionAnyOption;
    // `false` means remove emphasis trigger.
    styleEmphasis?: ZRStyleProps | false;
    emphasis?: CustomDisplayableOptionOnState;
}
interface CustomDisplayableOptionOnState extends Partial<Pick<
    Displayable, TransformProps | 'textConfig' | 'z2'
>> {
    // `false` means remove emphasis trigger.
    style?: (ZRStyleProps & TransitionAnyOption) | false;
}
interface CustomGroupOption extends CustomBaseElementOption {
    type: 'group';
    width?: number;
    height?: number;
    // @deprecated
    diffChildrenByName?: boolean;
    children: CustomElementOption[];
    $mergeChildren: false | 'byName' | 'byIndex';
}
interface CustomZRPathOption extends CustomDisplayableOption {
    shape?: PathProps['shape'] & TransitionAnyOption;
}
interface CustomDuringElProps extends Partial<Pick<Element, TransformProps>> {
    shape?: PathProps['shape'];
    style?: { text: string };
}
interface CustomSVGPathOption extends CustomDisplayableOption {
    type: 'path';
    shape?: {
        // SVG Path, like 'M0,0 L0,-20 L70,-1 L70,0 Z'
        pathData?: string;
        // "d" is the alias of `pathData` follows the SVG convention.
        d?: string;
        layout?: 'center' | 'cover';
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    } & TransitionAnyOption;
}
interface CustomImageOption extends CustomDisplayableOption {
    type: 'image';
    style?: ImageStyleProps & TransitionAnyOption;
    emphasis?: CustomImageOptionOnState;
}
interface CustomImageOptionOnState extends CustomDisplayableOptionOnState {
    style?: ImageStyleProps & TransitionAnyOption;
}
interface CustomTextOption extends CustomDisplayableOption {
    type: 'text';
}
type CustomElementOption = CustomZRPathOption | CustomSVGPathOption | CustomImageOption | CustomTextOption;
type CustomElementOptionOnState = CustomDisplayableOptionOnState | CustomImageOptionOnState;


interface CustomSeriesRenderItemAPI extends
        CustomSeriesRenderItemCoordinateSystemAPI,
        Pick<ExtensionAPI, 'getWidth' | 'getHeight' | 'getZr' | 'getDevicePixelRatio'> {
    value(dim: DimensionLoose, dataIndexInside?: number): ParsedValue;
    style(extra?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps;
    styleEmphasis(extra?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps;
    visual(visualType: string, dataIndexInside?: number): ReturnType<List['getItemVisual']>;
    barLayout(opt: Omit<Parameters<typeof getLayoutOnAxis>[0], 'axis'>): ReturnType<typeof getLayoutOnAxis>;
    currentSeriesIndices(): ReturnType<GlobalModel['getCurrentSeriesIndices']>;
    font(opt: Parameters<typeof graphicUtil.getFont>[0]): ReturnType<typeof graphicUtil.getFont>;
}
interface CustomSeriesRenderItemParamsCoordSys {
    type: string;
    // And extra params for each coordinate systems.
}
interface CustomSeriesRenderItemCoordinateSystemAPI {
    coord(
        data: OptionDataValue | OptionDataValue[],
        clamp?: boolean
    ): number[];
    size?(
        dataSize: OptionDataValue | OptionDataValue[],
        dataItem: OptionDataValue | OptionDataValue[]
    ): number | number[];
}
interface CustomSeriesRenderItemParams {
    context: Dictionary<unknown>;
    seriesId: string;
    seriesName: string;
    seriesIndex: number;
    coordSys: CustomSeriesRenderItemParamsCoordSys;
    dataInsideLength: number;
    encode: ReturnType<typeof wrapEncodeDef>;
}
type CustomSeriesRenderItem = (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
) => CustomElementOption;


interface CustomSeriesOption extends
    SeriesOption,
    SeriesEncodeOptionMixin,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    SeriesOnSingleOptionMixin,
    SeriesOnGeoOptionMixin,
    SeriesOnCalendarOptionMixin {

    // If set as 'none', do not depends on coord sys.
    coordinateSystem?: string | 'none';

    renderItem?: CustomSeriesRenderItem;

    // Only works on polar and cartesian2d coordinate system.
    clip?: boolean;

    // FIXME needed?
    tooltip?: SeriesTooltipOption;

    itemStyle?: ItemStyleOption;
    label?: LabelOption;
    emphasis?: {
        itemStyle?: ItemStyleOption;
        label?: LabelOption;
    };
}

interface LooseElementProps extends ElementProps {
    style?: ZRStyleProps;
    shape?: Dictionary<unknown>;
}

// Also compat with ec4, where
// `visual('color') visual('borderColor')` is supported.
const STYLE_VISUAL_TYPE = {
    color: 'fill',
    borderColor: 'stroke'
} as const;

const VISUAL_PROPS = {
    symbol: 1,
    symbolSize: 1,
    symbolKeepAspect: 1,
    legendSymbol: 1,
    visualMeta: 1,
    liftZ: 1
} as const;

const EMPHASIS = 'emphasis' as const;
const NORMAL = 'normal' as const;
const PATH_ITEM_STYLE = {
    normal: ['itemStyle'],
    emphasis: [EMPHASIS, 'itemStyle']
} as const;
const PATH_LABEL = {
    normal: ['label'],
    emphasis: [EMPHASIS, 'label']
} as const;
// Use prefix to avoid index to be the same as el.name,
// which will cause weird update animation.
const GROUP_DIFF_PREFIX = 'e\0\0';

type AttachedTxInfo = {
    isLegacy: boolean;
    normal: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOption | false;
    };
    emphasis: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOptionOnState;
    };
};
const attachedTxInfoTmp = {
    normal: {},
    emphasis: {}
} as AttachedTxInfo;

const Z2_SPECIFIED_BIT = {
    normal: 0,
    emphasis: 1
} as const;

const tmpDuringStyle = {} as CustomDuringElProps['style'];
const tmpDuringElProps = {} as CustomDuringElProps;

const LEGACY_TRANSFORM_PROPS = {
    position: ['x', 'y'],
    scale: ['scaleX', 'scaleY'],
    origin: ['originX', 'originY']
} as const;
type LegacyTransformProp = keyof typeof LEGACY_TRANSFORM_PROPS;

export type PrepareCustomInfo = (coordSys: CoordinateSystem) => {
    coordSys: CustomSeriesRenderItemParamsCoordSys;
    api: CustomSeriesRenderItemCoordinateSystemAPI
};

/**
 * To reduce total package size of each coordinate systems, the modules `prepareCustom`
 * of each coordinate systems are not required by each coordinate systems directly, but
 * required by the module `custom`.
 *
 * prepareInfoForCustomSeries {Function}: optional
 *     @return {Object} {coordSys: {...}, api: {
 *         coord: function (data, clamp) {}, // return point in global.
 *         size: function (dataSize, dataItem) {} // return size of each axis in coordSys.
 *     }}
 */
const prepareCustoms: Dictionary<PrepareCustomInfo> = {
    cartesian2d: prepareCartesian2d,
    geo: prepareGeo,
    singleAxis: prepareSingleAxis,
    polar: preparePolar,
    calendar: prepareCalendar
};

class CustomSeriesModel extends SeriesModel<CustomSeriesOption> {

    static type = 'series.custom';
    readonly type = CustomSeriesModel.type;

    static dependencies = ['grid', 'polar', 'geo', 'singleAxis', 'calendar'];

    preventAutoZ = true;

    currentZLevel: number;
    currentZ: number;

    static defaultOption: CustomSeriesOption = {
        coordinateSystem: 'cartesian2d', // Can be set as 'none'
        zlevel: 0,
        z: 2,
        legendHoverLink: true,

        // Custom series will not clip by default.
        // Some case will use custom series to draw label
        // For example https://echarts.apache.org/examples/en/editor.html?c=custom-gantt-flight
        clip: false

        // Cartesian coordinate system
        // xAxisIndex: 0,
        // yAxisIndex: 0,

        // Polar coordinate system
        // polarIndex: 0,

        // Geo coordinate system
        // geoIndex: 0,

        // label: {}
        // itemStyle: {}
    };

    optionUpdated() {
        this.currentZLevel = this.get('zlevel', true);
        this.currentZ = this.get('z', true);
    }

    getInitialData(option: CustomSeriesOption, ecModel: GlobalModel): List {
        return createListFromArray(this.getSource(), this);
    }

    getDataParams(dataIndex: number, dataType: string, el: Element): CallbackDataParams & {
        info: CustomExtraElementInfo
    } {
        const params = super.getDataParams(dataIndex, dataType, el) as ReturnType<CustomSeriesModel['getDataParams']>;
        el && (params.info = inner(el).info);
        return params;
    }
}

ComponentModel.registerClass(CustomSeriesModel);



class CustomSeriesView extends ChartView {

    static type = 'custom';
    readonly type = CustomSeriesView.type;

    private _data: List;


    render(
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void {
        const oldData = this._data;
        const data = customSeries.getData();
        const group = this.group;
        const renderItem = makeRenderItem(customSeries, data, ecModel, api);

        // By default, merge mode is applied. In most cases, custom series is
        // used in the scenario that data amount is not large but graphic elements
        // is complicated, where merge mode is probably necessary for optimization.
        // For example, reuse graphic elements and only update the transform when
        // roam or data zoom according to `actionType`.
        data.diff(oldData)
            .add(function (newIdx) {
                createOrUpdateItemEl(
                    null, newIdx, renderItem(newIdx, payload), customSeries, group, data
                );
            })
            .update(function (newIdx, oldIdx) {
                createOrUpdateItemEl(
                    oldData.getItemGraphicEl(oldIdx),
                    newIdx, renderItem(newIdx, payload), customSeries, group, data
                );
            })
            .remove(function (oldIdx) {
                removeItemEl(oldData.getItemGraphicEl(oldIdx), customSeries, group);
            })
            .execute();

        // Do clipping
        const clipPath = customSeries.get('clip', true)
            ? createClipPath(customSeries.coordinateSystem, false, customSeries)
            : null;
        if (clipPath) {
            group.setClipPath(clipPath);
        }
        else {
            group.removeClipPath();
        }

        this._data = data;
    }

    incrementalPrepareRender(
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ): void {
        this.group.removeAll();
        this._data = null;
    }

    incrementalRender(
        params: StageHandlerProgressParams,
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void {
        const data = customSeries.getData();
        const renderItem = makeRenderItem(customSeries, data, ecModel, api);
        function setIncrementalAndHoverLayer(el: Displayable) {
            if (!el.isGroup) {
                el.incremental = true;
                el.useHoverLayer = true;
            }
        }
        for (let idx = params.start; idx < params.end; idx++) {
            const el = createOrUpdateItemEl(null, idx, renderItem(idx, payload), customSeries, this.group, data);
            el.traverse(setIncrementalAndHoverLayer);
        }
    }

    filterForExposedEvent(
        eventType: string, query: EventQueryItem, targetEl: Element, packedEvent: ECEvent
    ): boolean {
        const elementName = query.element;
        if (elementName == null || targetEl.name === elementName) {
            return true;
        }

        // Enable to give a name on a group made by `renderItem`, and listen
        // events that triggerd by its descendents.
        while ((targetEl = targetEl.parent) && targetEl !== this.group) {
            if (targetEl.name === elementName) {
                return true;
            }
        }

        return false;
    }
}

ChartView.registerClass(CustomSeriesView);


function createEl(elOption: CustomElementOption): Element {
    const graphicType = elOption.type;
    let el;

    // Those graphic elements are not shapes. They should not be
    // overwritten by users, so do them first.
    if (graphicType === 'path') {
        const shape = (elOption as CustomSVGPathOption).shape;
        // Using pathRect brings convenience to users sacle svg path.
        const pathRect = (shape.width != null && shape.height != null)
            ? {
                x: shape.x || 0,
                y: shape.y || 0,
                width: shape.width,
                height: shape.height
            } as RectLike
            : null;
        const pathData = getPathData(shape);
        // Path is also used for icon, so layout 'center' by default.
        el = graphicUtil.makePath(pathData, null, pathRect, shape.layout || 'center');
        inner(el).customPathData = pathData;
    }
    else if (graphicType === 'image') {
        el = new graphicUtil.Image({});
        inner(el).customImagePath = (elOption as CustomImageOption).style.image;
    }
    else if (graphicType === 'text') {
        el = new graphicUtil.Text({});
        // inner(el).customText = (elOption.style as TextStyleProps).text;
    }
    else if (graphicType === 'group') {
        el = new graphicUtil.Group();
    }
    else if (graphicType === 'compoundPath') {
        throw new Error('"compoundPath" is not supported yet.');
    }
    else {
        const Clz = graphicUtil.getShapeClass(graphicType);

        if (__DEV__) {
            assert(Clz, 'graphic type "' + graphicType + '" can not be found.');
        }

        el = new Clz();
    }

    inner(el).customGraphicType = graphicType;
    el.name = elOption.name;

    // Compat ec4: the default z2 lift is 1. If changing the number,
    // some cases probably be broken: hierarchy layout along z, like circle packing,
    // where emphasis only intending to modify color/border rather than lift z2.
    (el as ECElement).z2EmphasisLift = 1;

    return el;
}

/**
 * ----------------------------------------------------------
 * [STRATEGY_MERGE] Merge properties or erase all properties:
 *
 * Based on the fact that the existing zr element probably be reused, we discuss whether
 * merge or erase all properties to the exsiting elements.
 * + "Merge" means that if a certain props is not specified, do not assign to the existing element.
 * + "Erase all" means that assign all of the available props whatever it specified by users.
 *
 * "Merge" might bring some unexpected state retaining for users and "erase all" seams to be
 * more safe. But "erase all" force users to specify all of the props each time, which
 * theoretically disables the chance of performance optimization (e.g., just generete shape
 * and style at the first time rather than always do that). And "force user set all of the props"
 * might bring trouble to specify which props need to perform "transition animation".
 * So we still use "merge" rather than "erase all". If users need "erase all", they can
 * simple always set all of the props each time.
 * Some "object-like" config like `textConfig`, `textContent`, `style` which are not needed for
 * every elment, so we replace them only when user specify them. And the that is a total replace.
 *
 * ----------------------------------------------
 * [STRATEGY_NULL] `hasOwnProperty` or `== null`:
 *
 * Ditinguishing "own property" probably bring little trouble to user when make el options.
 * So we  trade a {xx: null} or {xx: undefined} as "not specified" if possible rather than
 * "set them to null/undefined". In most cases, props can not be cleared. Some typicall
 * clearable props like `style`/`textConfig`/`textContent` we enable `false` to means
 * "clear". In some othere special cases that the prop is able to set as null/undefined,
 * but not suitable to use `false`, `hasOwnProperty` is checked.
 *
 * ---------------------------------------------
 * [STRATEGY_TRANSITION] The rule of transition:
 * + For props on the root level of a element:
 *      If there is no `$transition` specified, tansform props will be transitioned by default,
 *      which is the same as the previous setting in echarts4 and suitable for the scenario
 *      of dataZoom change.
 *      If `$transition` specified, only the specified props will be transitioned.
 * + For props in `shape` and `style`:
 *      Only props specified in `$transition` will be transitioned.
 * + Break:
 *      Since ec5, do not make transition to shape by default, because it might result in
 *      performance issue (especially `points` of polygon) and do not necessary in most cases.
 */
function updateElNormal(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    styleOpt: CustomElementOption['style'],
    attachedTxInfo: AttachedTxInfo,
    seriesModel: CustomSeriesModel,
    isInit: boolean,
    isTextContent: boolean
): void {
    const transFromProps = {} as ElementProps;
    const allProps = {} as ElementProps;
    const elDisplayable = el.isGroup ? null : el as Displayable;

    prepareShapeUpdate(el, elOption, allProps, transFromProps, isInit);
    prepareTransformUpdate(el, elOption, allProps, transFromProps, isInit);

    const txCfgOpt = attachedTxInfo && attachedTxInfo.normal.cfg;
    if (txCfgOpt) {
        // PENDING: whether use user object directly rather than clone?
        // TODO:5.0 textConfig transition animation?
        el.setTextConfig(txCfgOpt);
    }

    if (el.type === 'text' && styleOpt) {
        const textOptionStyle = styleOpt as TextStyleProps;
        // Compatible with ec4: if `textFill` or `textStroke` exists use them.
        hasOwn(textOptionStyle, 'textFill') && (
            textOptionStyle.fill = (textOptionStyle as any).textFill
        );
        hasOwn(textOptionStyle, 'textStroke') && (
            textOptionStyle.stroke = (textOptionStyle as any).textStroke
        );
    }

    prepareStyleUpdate(el, styleOpt, transFromProps, isInit);

    if (elDisplayable) {
        // PENDING: here the input style object is used directly.
        // Good for performance but bad for compatibility control.
        styleOpt && elDisplayable.useStyle(styleOpt);

        // When style object changed, how to trade the existing animation?
        // It is probably conplicated and not needed to cover all the cases.
        // But still need consider the case:
        // (1) When using init animation on `style.opacity`, and before the animation
        //     ended users triggers an update by mousewhell. At that time the init
        //     animation should better be continued rather than terminated.
        //     So after `useStyle` called, we should change the animation target manually
        //     to continue the effect of the init animation.
        // (2) PENDING: If the previous animation targeted at a `val1`, and currently we need
        //     to update the value to `val2` and no animation declared, should be terminate
        //     the previous animation or just modify the target of the animation?
        //     Therotically That will happen not only on `style` but also on `shape` and
        //     `transfrom` props. But we haven't handle this case at present yet.
        // (3) PENDING: Is it proper to visit `animators` and `targetName`?
        const animators = elDisplayable.animators;
        for (let i = 0; i < animators.length; i++) {
            const animator = animators[i];
            // targetName is the "topKey".
            if (animator.targetName === 'style') {
                animator.changeTarget(elDisplayable.style);
            }
        }

        hasOwn(elOption, 'invisible') && (elDisplayable.invisible = elOption.invisible);
    }

    el.attr(allProps);
    const params = {dataIndex: dataIndex, isFrom: true};
    isInit
        ? graphicUtil.initProps(el, transFromProps, seriesModel, params)
        : graphicUtil.updateProps(el, transFromProps, seriesModel, params);

    // Merge by default.
    hasOwn(elOption, 'silent') && (el.silent = elOption.silent);
    hasOwn(elOption, 'ignore') && (el.ignore = elOption.ignore);

    const customDuringMounted = el.updateDuringAnimation === elUpdateDuringAnimation;
    if (elOption.during) {
        const innerEl = inner(el);
        if (!customDuringMounted) {
            innerEl.orginalDuring = el.updateDuringAnimation;
            el.updateDuringAnimation = elUpdateDuringAnimation;
        }
        innerEl.customDuring = elOption.during;
    }
    else if (customDuringMounted) {
        el.updateDuringAnimation = inner(el).orginalDuring;
    }

    if (!isTextContent) {
        // `elOption.info` enables user to mount some info on
        // elements and use them in event handlers.
        // Update them only when user specified, otherwise, remain.
        hasOwn(elOption, 'info') && (inner(el).info = elOption.info);
    }

    styleOpt ? el.dirty() : el.markRedraw();
}

// See [STRATEGY_TRANSITION]
function prepareShapeUpdate(
    el: Element,
    elOption: CustomElementOption,
    allProps: LooseElementProps,
    transFromProps: LooseElementProps,
    isInit: boolean
): void {

    const shapeOpt = (elOption as CustomElementOption).shape;
    if (!shapeOpt) {
        return;
    }

    const elShape = (el as LooseElementProps).shape;
    let tranFromShapeProps: LooseElementProps['shape'];

    const enterFrom = shapeOpt.$enterFrom;
    if (isInit && enterFrom) {
        !tranFromShapeProps && (tranFromShapeProps = transFromProps.shape = {});
        const enterFromKeys = keys(enterFrom);
        for (let i = 0; i < enterFromKeys.length; i++) {
            // `$enterFrom` props are not necessarily also declared in `shape`/`style`/...,
            // for example, `opacity` can only declared in `$enterFrom` but not in `style`.
            const key = enterFromKeys[i];
            // Do not clone, animator will perform that clone.
            tranFromShapeProps[key] = enterFrom[key];
        }
    }

    if (!isInit && elShape && shapeOpt.$transition) {
        !tranFromShapeProps && (tranFromShapeProps = transFromProps.shape = {});
        const transitionKeys = normalizeToArray(shapeOpt.$transition);
        for (let i = 0; i < transitionKeys.length; i++) {
            const key = transitionKeys[i];
            const elVal = elShape[key];
            if (__DEV__) {
                checkTansitionRefer(key, (shapeOpt as any)[key], elVal);
            }
            // Do not clone, see `checkTansitionRefer`.
            tranFromShapeProps[key] = elVal;
        }
    }

    const allPropsShape = allProps.shape = {} as LooseElementProps['shape'];
    const shapeOptKeys = keys(shapeOpt);
    for (let i = 0; i < shapeOptKeys.length; i++) {
        const key = shapeOptKeys[i];
        // To avoid share one object with different element, and
        // to avoid user modify the object inexpectedly, have to clone.
        allPropsShape[key] = cloneValue((shapeOpt as any)[key]);
    }

    const leaveTo = shapeOpt.$leaveTo;
    if (leaveTo) {
        const leaveToProps = getOrCreateLeaveToPropsFromEl(el);
        const leaveToShapeProps = leaveToProps.shape || (leaveToProps.shape = {});
        const leaveToKeys = keys(leaveTo);
        for (let i = 0; i < leaveToKeys.length; i++) {
            const key = leaveToKeys[i];
            leaveToShapeProps[key] = leaveTo[key];
        }
    }
}

// See [STRATEGY_TRANSITION].
function prepareTransformUpdate(
    el: Element,
    elOption: CustomElementOption,
    allProps: ElementProps,
    transFromProps: ElementProps,
    isInit: boolean
): void {
    const enterFrom = elOption.$enterFrom;
    if (isInit && enterFrom) {
        const enterFromKeys = keys(enterFrom);
        for (let i = 0; i < enterFromKeys.length; i++) {
            const key = enterFromKeys[i] as TransformProps;
            if (__DEV__) {
                checkTransformPropRefer(key, 'el.$enterFrom');
            }
            // Do not clone, animator will perform that clone.
            transFromProps[key] = enterFrom[key] as number;
        }
    }

    if (!isInit) {
        if (elOption.$transition) {
            const transitionKeys = normalizeToArray(elOption.$transition);
            for (let i = 0; i < transitionKeys.length; i++) {
                const key = transitionKeys[i];
                const elVal = el[key];
                if (__DEV__) {
                    checkTransformPropRefer(key, 'el.$transition');
                    checkTansitionRefer(key, elOption[key], elVal);
                }
                // Do not clone, see `checkTansitionRefer`.
                transFromProps[key] = elVal;
            }
        }
        // This default transition see [STRATEGY_TRANSITION]
        else {
            setLagecyProp(elOption, transFromProps, 'position', el);
            setTransProp(elOption, transFromProps, 'x', el);
            setTransProp(elOption, transFromProps, 'y', el);
        }
    }

    setLagecyProp(elOption, allProps, 'position');
    setLagecyProp(elOption, allProps, 'scale');
    setLagecyProp(elOption, allProps, 'origin');
    setTransProp(elOption, allProps, 'x');
    setTransProp(elOption, allProps, 'y');
    setTransProp(elOption, allProps, 'scaleX');
    setTransProp(elOption, allProps, 'scaleY');
    setTransProp(elOption, allProps, 'originX');
    setTransProp(elOption, allProps, 'originY');
    setTransProp(elOption, allProps, 'rotation');

    const leaveTo = elOption.$leaveTo;
    if (leaveTo) {
        const leaveToProps = getOrCreateLeaveToPropsFromEl(el);
        const leaveToKeys = keys(leaveTo);
        for (let i = 0; i < leaveToKeys.length; i++) {
            const key = leaveToKeys[i] as TransformProps;
            if (__DEV__) {
                checkTransformPropRefer(key, 'el.$leaveTo');
            }
            leaveToProps[key] = leaveTo[key] as number;
        }
    }
}

// See [STRATEGY_TRANSITION].
function prepareStyleUpdate(
    el: Element,
    styleOpt: CustomElementOption['style'],
    transFromProps: LooseElementProps,
    isInit: boolean
): void {
    if (!styleOpt) {
        return;
    }

    const elStyle = (el as LooseElementProps).style as LooseElementProps['style'];
    let transFromStyleProps: LooseElementProps['style'];

    const enterFrom = styleOpt.$enterFrom;
    if (isInit && enterFrom) {
        const enterFromKeys = keys(enterFrom);
        !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
        for (let i = 0; i < enterFromKeys.length; i++) {
            const key = enterFromKeys[i];
            // Do not clone, animator will perform that clone.
            (transFromStyleProps as any)[key] = enterFrom[key];
        }
    }

    if (!isInit && elStyle && styleOpt.$transition) {
        const transitionKeys = normalizeToArray(styleOpt.$transition);
        !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
        for (let i = 0; i < transitionKeys.length; i++) {
            const key = transitionKeys[i];
            const elVal = (elStyle as any)[key];
            if (__DEV__) {
                checkTansitionRefer(key, (styleOpt as any)[key], elVal);
            }
            // Do not clone, see `checkTansitionRefer`.
            (transFromStyleProps as any)[key] = elVal;
        }
    }

    const leaveTo = styleOpt.$leaveTo;
    if (leaveTo) {
        const leaveToKeys = keys(leaveTo);
        const leaveToProps = getOrCreateLeaveToPropsFromEl(el);
        const leaveToStyleProps = leaveToProps.style || (leaveToProps.style = {});
        for (let i = 0; i < leaveToKeys.length; i++) {
            const key = leaveToKeys[i];
            (leaveToStyleProps as any)[key] = leaveTo[key];
        }
    }
}

function checkTansitionRefer(propName: string, optVal: unknown, elVal: unknown): void {
    const isArrLike = isArrayLike(optVal);
    assert(
        isArrLike || (optVal != null && isFinite(optVal as number)),
        'Prop `' + propName + '` must refer to a finite number or ArrayLike for transition.'
    );
    // Try not to copy array for performance, but if user use the same object in different
    // call of `renderItem`, it will casue animation transition fail.
    assert(
        !isArrLike || optVal !== elVal,
        'Prop `' + propName + '` must use different Array object each time for transition.'
    );
}

function checkTransformPropRefer(key: string, usedIn: string): void {
    assert(
        hasOwn(TRANSFORM_PROPS, key),
        'Prop `' + key + '` is not a permitted in `' + usedIn + '`. '
            + 'Only `' + keys(TRANSFORM_PROPS).join('`, `') + '` are permitted.'
    );
}

function getOrCreateLeaveToPropsFromEl(el: Element): LooseElementProps {
    const innerEl = inner(el);
    return innerEl.leaveToProps || (innerEl.leaveToProps = {});
}

function elUpdateDuringAnimation(this: Element, key: string): void {
    const innerEl = inner(this);
    // FIXME `this.markRedraw();` directly ?
    innerEl.orginalDuring.call(this, key);
    const customDuring = innerEl.customDuring;
    const thisPath = this as graphicUtil.Path;
    const thisText = this as graphicUtil.Text;
    let dirtyStyle = false;

    // Only provide these props. Usually other props do not need to be
    // changed in animation during.
    // Do not give `this` to user util really needed in future.
    // Props in `shape` can be modified directly in the during callback.
    const shapeCurr = tmpDuringElProps.shape = thisPath.shape;
    const xCurr = tmpDuringElProps.x = this.x;
    const yCurr = tmpDuringElProps.y = this.y;
    const scaleXCurr = tmpDuringElProps.scaleX = this.scaleX;
    const scaleYCurr = tmpDuringElProps.scaleY = this.scaleY;
    const originXCurr = tmpDuringElProps.originX = this.originX;
    const originYCurr = tmpDuringElProps.originY = this.originY;
    const rotationCurr = tmpDuringElProps.rotation = this.rotation;

    // PENDING:
    // Do not expose other style in case that is not stable.
    const isText = this.type === 'text';
    // Always assign in case that user modify `.style`.
    tmpDuringElProps.style = tmpDuringStyle;
    const textCurr = tmpDuringStyle.text = isText ? thisText.style.text : null;

    customDuring(tmpDuringElProps);

    tmpDuringElProps.shape !== shapeCurr && (thisPath.shape = tmpDuringElProps.shape);
    // Consider prop on prototype.
    tmpDuringElProps.x !== xCurr && (this.x = tmpDuringElProps.x);
    tmpDuringElProps.y !== yCurr && (this.y = tmpDuringElProps.y);
    tmpDuringElProps.scaleX !== scaleXCurr && (this.scaleX = tmpDuringElProps.scaleX);
    tmpDuringElProps.scaleY !== scaleYCurr && (this.scaleY = tmpDuringElProps.scaleY);
    tmpDuringElProps.originX !== originXCurr && (this.originX = tmpDuringElProps.originX);
    tmpDuringElProps.originY !== originYCurr && (this.originY = tmpDuringElProps.originY);
    tmpDuringElProps.rotation !== rotationCurr && (this.rotation = tmpDuringElProps.rotation);

    if (isText) {
        const currTmpStl = tmpDuringElProps.style; // Allow user modify `.style`.
        currTmpStl && currTmpStl.text !== textCurr && (thisText.style.text = currTmpStl.text, dirtyStyle = true);
    }

    dirtyStyle && this.dirty();
    // markRedraw() will be called by default.

    // FIXME: if in future meet the case that some prop will be both modified in `during` and `state`,
    // consider the issue that the prop might be incorrect when return to "normal" state.
}

function updateElOnState(
    state: DisplayStateNonNormal,
    el: Element,
    elStateOpt: CustomElementOptionOnState,
    styleOpt: CustomElementOptionOnState['style'],
    attachedTxInfo: AttachedTxInfo,
    isRoot: boolean,
    isTextContent: boolean
): void {
    const elDisplayable = el.isGroup ? null : el as Displayable;
    const txCfgOpt = attachedTxInfo && attachedTxInfo[state].cfg;

    // PENDING:5.0 support customize scale change and transition animation?

    if (elDisplayable) {
        // By default support auto lift color when hover whether `emphasis` specified.
        const stateObj = elDisplayable.ensureState(state);
        if (styleOpt === false) {
            const existingEmphasisState = elDisplayable.getState(state);
            if (existingEmphasisState) {
                existingEmphasisState.style = null;
            }
        }
        else {
            // style is needed to enable defaut emphasis.
            stateObj.style = styleOpt || {};
        }
        // If `elOption.styleEmphasis` or `elOption.emphasis.style` is `false`,
        // remove hover style.
        // If `elOption.textConfig` or `elOption.emphasis.textConfig` is null/undefined, it does not
        // make sense. So for simplicity, we do not ditinguish `hasOwnProperty` and null/undefined.
        if (txCfgOpt) {
            stateObj.textConfig = txCfgOpt;
        }

        graphicUtil.enableElementHoverEmphasis(elDisplayable);
    }

    if (isRoot) {
        graphicUtil.setAsHighDownDispatcher(el, styleOpt !== false);
    }
}

function updateZ(
    el: Element,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    attachedTxInfo: AttachedTxInfo
): void {
    // Group not support textContent and not support z yet.
    if (el.isGroup) {
        return;
    }

    const elDisplayable = el as Displayable;
    const currentZ = seriesModel.currentZ;
    const currentZLevel = seriesModel.currentZLevel;
    // Always erase.
    elDisplayable.z = currentZ;
    elDisplayable.zlevel = currentZLevel;
    // z2 must not be null/undefined, otherwise sort error may occur.
    const optZ2 = elOption.z2;
    optZ2 != null && (elDisplayable.z2 = optZ2 || 0);

    const textContent = elDisplayable.getTextContent();
    if (textContent) {
        textContent.z = currentZ;
        textContent.zlevel = currentZLevel;
    }

    updateZForEachState(elDisplayable, textContent, elOption, attachedTxInfo, NORMAL);
    updateZForEachState(elDisplayable, textContent, elOption, attachedTxInfo, EMPHASIS);
}

function updateZForEachState(
    elDisplayable: Displayable,
    textContent: Displayable,
    elOption: CustomDisplayableOption,
    attachedTxInfo: AttachedTxInfo,
    state: DisplayState
): void {
    const isNormal = state === NORMAL;
    const elStateOpt = isNormal ? elOption : retrieveStateOption(elOption, state as DisplayStateNonNormal);
    const optZ2 = elStateOpt ? elStateOpt.z2 : null;
    let stateObj;
    if (optZ2 != null) {
        // Do not `ensureState` until required.
        stateObj = isNormal ? elDisplayable : elDisplayable.ensureState(state);
        stateObj.z2 = optZ2 || 0;
    }

    const txConOpt = attachedTxInfo[state].conOpt;
    if (textContent) {
        const innerEl = inner(elDisplayable);
        const txConZ2Set = innerEl.txConZ2Set || 0;
        const txOptZ2 = txConOpt ? txConOpt.z2 : null;
        const z2SetMask = 1 << Z2_SPECIFIED_BIT[state];

        // Set textContent z2 as hostEl.z2 + 1 only if
        // textContent z2 is not specified.
        if (txOptZ2 != null) {
            // Do not `ensureState` until required.
            (isNormal ? textContent : textContent.ensureState(state)).z2 = txOptZ2;
            innerEl.txConZ2Set = txConZ2Set | z2SetMask;
        }
        // If stateObj exists, that means stateObj.z2 has been updated, where the textContent z2
        // should be followed, no matter textContent or textContent.emphasis is specified in elOption.
        else if (stateObj && (txConZ2Set & z2SetMask) === 0) {
            (isNormal ? textContent : textContent.ensureState(state)).z2 = stateObj.z2 + 1;
        }
    }
}

function setLagecyProp(
    elOption: CustomElementOption,
    targetProps: Partial<Pick<Transformable, TransformProps>>,
    legacyName: LegacyTransformProp,
    fromEl?: Element // If provided, retrieve from the element.
): void {
    const legacyArr = (elOption as any)[legacyName];
    const xyName = LEGACY_TRANSFORM_PROPS[legacyName];
    if (legacyArr) {
        if (fromEl) {
            targetProps[xyName[0]] = fromEl[xyName[0]];
            targetProps[xyName[1]] = fromEl[xyName[1]];
        }
        else {
            targetProps[xyName[0]] = legacyArr[0];
            targetProps[xyName[1]] = legacyArr[1];
        }
    }
}

function setTransProp(
    elOption: CustomElementOption,
    targetProps: Partial<Pick<Transformable, TransformProps>>,
    name: TransformProps,
    fromEl?: Element // If provided, retrieve from the element.
): void {
    if (elOption[name] != null) {
        targetProps[name] = fromEl ? fromEl[name] : elOption[name];
    }
}

function makeRenderItem(
    customSeries: CustomSeriesModel,
    data: List<CustomSeriesModel>,
    ecModel: GlobalModel,
    api: ExtensionAPI
) {
    const renderItem = customSeries.get('renderItem');
    const coordSys = customSeries.coordinateSystem;
    let prepareResult = {} as ReturnType<PrepareCustomInfo>;

    if (coordSys) {
        if (__DEV__) {
            assert(renderItem, 'series.render is required.');
            assert(
                coordSys.prepareCustoms || prepareCustoms[coordSys.type],
                'This coordSys does not support custom series.'
            );
        }

        // `coordSys.prepareCustoms` is used for external coord sys like bmap.
        prepareResult = coordSys.prepareCustoms
            ? coordSys.prepareCustoms(coordSys)
            : prepareCustoms[coordSys.type](coordSys);
    }

    const userAPI = defaults({
        getWidth: api.getWidth,
        getHeight: api.getHeight,
        getZr: api.getZr,
        getDevicePixelRatio: api.getDevicePixelRatio,
        value: value,
        style: style,
        styleEmphasis: styleEmphasis,
        visual: visual,
        barLayout: barLayout,
        currentSeriesIndices: currentSeriesIndices,
        font: font
    }, prepareResult.api || {}) as CustomSeriesRenderItemAPI;

    const userParams: CustomSeriesRenderItemParams = {
        // The life cycle of context: current round of rendering.
        // The global life cycle is probably not necessary, because
        // user can store global status by themselves.
        context: {},
        seriesId: customSeries.id,
        seriesName: customSeries.name,
        seriesIndex: customSeries.seriesIndex,
        coordSys: prepareResult.coordSys,
        dataInsideLength: data.count(),
        encode: wrapEncodeDef(customSeries.getData())
    };

    // If someday intending to refactor them to a class, should consider do not
    // break change: currently these attribute member are encapsulated in a closure
    // so that do not need to force user to call these method with a scope.

    // Do not support call `api` asynchronously without dataIndexInside input.
    let currDataIndexInside: number;
    let currItemModel: Model<CustomSeriesOption>;
    let currItemStyleModels: Partial<Record<DisplayState, Model<CustomSeriesOption['itemStyle']>>> = {};
    let currLabelModels: Partial<Record<DisplayState, Model<CustomSeriesOption['label']>>> = {};

    const seriesItemStyleModels = {
        normal: customSeries.getModel(PATH_ITEM_STYLE.normal),
        emphasis: customSeries.getModel(PATH_ITEM_STYLE.emphasis)
    } as Record<DisplayState, Model<CustomSeriesOption['label']>>;
    const seriesLabelModels = {
        normal: customSeries.getModel(PATH_LABEL.normal),
        emphasis: customSeries.getModel(PATH_LABEL.emphasis)
    } as Record<DisplayState, Model<CustomSeriesOption['label']>>;

    function getItemModel(dataIndexInside: number): Model<CustomSeriesOption> {
        return dataIndexInside === currDataIndexInside
            ? (currItemModel || (currItemModel = data.getItemModel(dataIndexInside)))
            : data.getItemModel(dataIndexInside);
    }
    function getItemStyleModel(dataIndexInside: number, state: DisplayState) {
        return !data.hasItemOption
            ? seriesItemStyleModels[state]
            : dataIndexInside === currDataIndexInside
            ? (currItemStyleModels[state] || (
                currItemStyleModels[state] = getItemModel(dataIndexInside).getModel(PATH_ITEM_STYLE[state])
            ))
            : getItemModel(dataIndexInside).getModel(PATH_ITEM_STYLE[state]);
    }
    function getLabelModel(dataIndexInside: number, state: DisplayState) {
        return !data.hasItemOption
            ? seriesLabelModels[state]
            : dataIndexInside === currDataIndexInside
            ? (currLabelModels[state] || (
                currLabelModels[state] = getItemModel(dataIndexInside).getModel(PATH_LABEL[state])
            ))
            : getItemModel(dataIndexInside).getModel(PATH_LABEL[state]);
    }

    return function (dataIndexInside: number, payload: Payload): CustomElementOption {
        currDataIndexInside = dataIndexInside;
        currItemModel = null;
        currItemStyleModels = {};
        currLabelModels = {};

        return renderItem && renderItem(
            defaults({
                dataIndexInside: dataIndexInside,
                dataIndex: data.getRawIndex(dataIndexInside),
                // Can be used for optimization when zoom or roam.
                actionType: payload ? payload.type : null
            }, userParams),
            userAPI
        );
    };

    /**
     * @public
     * @param dim by default 0.
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function value(dim?: DimensionLoose, dataIndexInside?: number): ParsedValue {
        dataIndexInside == null && (dataIndexInside = currDataIndexInside);
        return data.get(data.getDimension(dim || 0), dataIndexInside);
    }

    /**
     * @deprecated The orgininal intention of `api.style` is enable to set itemStyle
     * like other series. But it not necessary and not easy to give a strict definition
     * of what it return. And since echarts5 it needs to be make compat work. So
     * deprecates it since echarts5.
     *
     * By default, `visual` is applied to style (to support visualMap).
     * `visual.color` is applied at `fill`. If user want apply visual.color on `stroke`,
     * it can be implemented as:
     * `api.style({stroke: api.visual('color'), fill: null})`;
     *
     * [Compat]: since ec5, RectText has been separated from its hosts el.
     * so `api.style()` will only return the style from `itemStyle` but not handle `label`
     * any more. But `series.label` config is never published in doc.
     * We still compat it in `api.style()`. But not encourage to use it and will still not
     * to pulish it to doc.
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function style(extra?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps {
        if (__DEV__) {
            warnDeprecated('api.style', 'Please write literal style directly instead.');
        }

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        const style = data.getItemVisual(dataIndexInside, 'style');
        const visualColor = style && style.fill;
        const opacity = style && style.opacity;

        let itemStyle = getItemStyleModel(dataIndexInside, NORMAL).getItemStyle();
        visualColor != null && (itemStyle.fill = visualColor);
        opacity != null && (itemStyle.opacity = opacity);

        const opt = {autoColor: isString(visualColor) ? visualColor : '#000'};
        const labelModel = getLabelModel(dataIndexInside, NORMAL);
        // Now that the feture of "auto adjust text fill/stroke" has been migrated to zrender
        // since ec5, we should set `isAttached` as `false` here and make compat in
        // `convertToEC4StyleForCustomSerise`.
        const textStyle = graphicUtil.createTextStyle(labelModel, null, opt, false, true);
        textStyle.text = labelModel.getShallow('show')
            ? retrieve2(
                customSeries.getFormattedLabel(dataIndexInside, NORMAL),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;
        const textConfig = graphicUtil.createTextConfig(textStyle, labelModel, opt, false);

        preFetchFromExtra(extra, itemStyle);
        itemStyle = convertToEC4StyleForCustomSerise(itemStyle, textStyle, textConfig);

        extra && applyExtraAfter(itemStyle, extra);
        (itemStyle as LegacyStyleProps).legacy = true;

        return itemStyle;
    }

    /**
     * @deprecated The reason see `api.style()`
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function styleEmphasis(extra?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps {
        if (__DEV__) {
            warnDeprecated('api.styleEmphasis', 'Please write literal style directly instead.');
        }

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        let itemStyle = getItemStyleModel(dataIndexInside, EMPHASIS).getItemStyle();
        const labelModel = getLabelModel(dataIndexInside, EMPHASIS);
        const textStyle = graphicUtil.createTextStyle(labelModel, null, null, true, true);
        textStyle.text = labelModel.getShallow('show')
            ? retrieve3(
                customSeries.getFormattedLabel(dataIndexInside, EMPHASIS),
                customSeries.getFormattedLabel(dataIndexInside, NORMAL),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;
        const textConfig = graphicUtil.createTextConfig(textStyle, labelModel, null, true);

        preFetchFromExtra(extra, itemStyle);
        itemStyle = convertToEC4StyleForCustomSerise(itemStyle, textStyle, textConfig);

        extra && applyExtraAfter(itemStyle, extra);
        (itemStyle as LegacyStyleProps).legacy = true;

        return itemStyle;
    }

    function preFetchFromExtra(extra: ZRStyleProps, itemStyle: ItemStyleProps): void {
        // A trick to retrieve those props firstly, which are used to
        // apply auto inside fill/stroke in `convertToEC4StyleForCustomSerise`.
        // (It's not reasonable but only for a degree of compat)
        if (extra) {
            (extra as any).textFill && ((itemStyle as any).textFill = (extra as any).textFill);
            (extra as any).textPosition && ((itemStyle as any).textPosition = (extra as any).textPosition);
        }
    }

    /**
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function visual(
        visualType: keyof DefaultDataVisual,
        dataIndexInside?: number
    ): ReturnType<List['getItemVisual']> {
        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        if (hasOwn(STYLE_VISUAL_TYPE, visualType)) {
            const style = data.getItemVisual(dataIndexInside, 'style');
            return style
                ? style[STYLE_VISUAL_TYPE[visualType as keyof typeof STYLE_VISUAL_TYPE]] as any
                : null;
        }
        // Only support these visuals. Other visual might be inner tricky
        // for performance (like `style`), do not expose to users.
        if (hasOwn(VISUAL_PROPS, visualType)) {
            return data.getItemVisual(dataIndexInside, visualType);
        }
    }

    /**
     * @public
     * @return If not support, return undefined.
     */
    function barLayout(
        opt: Omit<Parameters<typeof getLayoutOnAxis>[0], 'axis'>
    ): ReturnType<typeof getLayoutOnAxis> {
        if (coordSys.type === 'cartesian2d') {
            const baseAxis = coordSys.getBaseAxis() as Axis2D;
            return getLayoutOnAxis(defaults({axis: baseAxis}, opt));
        }
    }

    /**
     * @public
     */
    function currentSeriesIndices(): ReturnType<GlobalModel['getCurrentSeriesIndices']> {
        return ecModel.getCurrentSeriesIndices();
    }

    /**
     * @public
     * @return font string
     */
    function font(
        opt: Parameters<typeof graphicUtil.getFont>[0]
    ): ReturnType<typeof graphicUtil.getFont> {
        return graphicUtil.getFont(opt, ecModel);
    }
}

function wrapEncodeDef(data: List<CustomSeriesModel>): Dictionary<number[]> {
    const encodeDef = {} as Dictionary<number[]>;
    each(data.dimensions, function (dimName, dataDimIndex) {
        const dimInfo = data.getDimensionInfo(dimName);
        if (!dimInfo.isExtraCoord) {
            const coordDim = dimInfo.coordDim;
            const dataDims = encodeDef[coordDim] = encodeDef[coordDim] || [];
            dataDims[dimInfo.coordDimIndex] = dataDimIndex;
        }
    });
    return encodeDef;
}

function createOrUpdateItemEl(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup,
    data: List<CustomSeriesModel>
): Element {
    el = doCreateOrUpdate(el, dataIndex, elOption, seriesModel, group, true);
    el && data.setItemGraphicEl(dataIndex, el);

    return el;
}

function doCreateOrUpdate(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup,
    isRoot: boolean
): Element {

    // [Rule]
    // If `renderItem` returns `null`/`undefined`/`false`, remove the previous el if existing.
    //     (It seems that violate the "merge" principle, but most of users probably intuitively
    //     regard "return;" as "show nothing element whatever", so make a exception to meet the
    //     most cases.)
    // The rule or "merge" see [STRATEGY_MERGE].

    // If `elOption` is `null`/`undefined`/`false` (when `renderItem` returns nothing).
    if (!elOption) {
        el && group.remove(el);
        return;
    }

    elOption = elOption || {} as CustomElementOption;
    let toBeReplacedIdx = -1;

    if (el && doesElNeedRecreate(el, elOption)) {
        // Should keep at the original index, otherwise "merge by index" will be incorrect.
        toBeReplacedIdx = group.childrenRef().indexOf(el);
        el = null;
    }

    const isInit = !el;

    if (!el) {
        el = createEl(elOption);
    }
    else {
        // FIMXE:NEXT unified clearState?
        // If in some case the performance issue arised, consider
        // do not clearState but update cached normal state directly.
        el.clearStates();
    }

    attachedTxInfoTmp.normal.cfg = attachedTxInfoTmp.normal.conOpt =
        attachedTxInfoTmp.emphasis.cfg = attachedTxInfoTmp.emphasis.conOpt = null;
    attachedTxInfoTmp.isLegacy = false;

    doCreateOrUpdateAttachedTx(
        el, dataIndex, elOption, seriesModel, isInit, attachedTxInfoTmp
    );

    doCreateOrUpdateClipPath(
        el, dataIndex, elOption, seriesModel, isInit
    );

    const stateOptEmphasis = retrieveStateOption(elOption, EMPHASIS);
    const styleOptEmphasis = retrieveStyleOptionOnState(elOption, stateOptEmphasis, EMPHASIS);

    updateElNormal(el, dataIndex, elOption, elOption.style, attachedTxInfoTmp, seriesModel, isInit, false);
    updateElOnState(EMPHASIS, el, stateOptEmphasis, styleOptEmphasis, attachedTxInfoTmp, isRoot, false);

    updateZ(el, elOption, seriesModel, attachedTxInfoTmp);

    if (elOption.type === 'group') {
        mergeChildren(
            el as graphicUtil.Group, dataIndex, elOption as CustomGroupOption, seriesModel
        );
    }

    if (toBeReplacedIdx >= 0) {
        group.replaceAt(el, toBeReplacedIdx);
    }
    else {
        group.add(el);
    }

    return el;
}

// `el` must not be null/undefined.
function doesElNeedRecreate(el: Element, elOption: CustomElementOption): boolean {
    const elInner = inner(el);
    const elOptionType = elOption.type;
    const elOptionShape = (elOption as CustomZRPathOption).shape;
    const elOptionStyle = elOption.style;
    return (
        // || elOption.$merge === false
        // If `elOptionType` is `null`, follow the merge principle.
        (elOptionType != null
            && elOptionType !== elInner.customGraphicType
        )
        || (elOptionType === 'path'
            && hasOwnPathData(elOptionShape)
            && getPathData(elOptionShape) !== elInner.customPathData
        )
        || (elOptionType === 'image'
            && hasOwn(elOptionStyle, 'image')
            && (elOptionStyle as CustomImageOption['style']).image !== elInner.customImagePath
        )
        // // FIXME test and remove this restriction?
        // || (elOptionType === 'text'
        //     && hasOwn(elOptionStyle, 'text')
        //     && (elOptionStyle as TextStyleProps).text !== elInner.customText
        // )
    );
}

function doCreateOrUpdateClipPath(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    isInit: boolean
): void {
    // Based on the "merge" principle, if no clipPath provided,
    // do nothing. The exists clip will be totally removed only if
    // `el.clipPath` is `false`. Otherwise it will be merged/replaced.
    const clipPathOpt = elOption.clipPath;
    if (clipPathOpt === false) {
        if (el && el.getClipPath()) {
            el.removeClipPath();
        }
    }
    else if (clipPathOpt) {
        let clipPath = el.getClipPath();
        if (clipPath && doesElNeedRecreate(clipPath, clipPathOpt)) {
            clipPath = null;
        }
        if (!clipPath) {
            clipPath = createEl(clipPathOpt) as graphicUtil.Path;
            if (__DEV__) {
                assert(
                    clipPath instanceof graphicUtil.Path,
                    'Only any type of `path` can be used in `clipPath`, rather than ' + clipPath.type + '.'
                );
            }
            el.setClipPath(clipPath);
        }
        updateElNormal(
            clipPath, dataIndex, clipPathOpt, null, null, seriesModel, isInit, false
        );
    }
    // If not define `clipPath` in option, do nothing unnecessary.
}

function doCreateOrUpdateAttachedTx(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    isInit: boolean,
    attachedTxInfo: AttachedTxInfo
): void {
    // group do not support textContent temporarily untill necessary.
    if (el.isGroup) {
        return;
    }

    // Normal must be called before emphasis, for `isLegacy` detection.
    processTxInfo(elOption, null, attachedTxInfo);
    processTxInfo(elOption, EMPHASIS, attachedTxInfo);

    // If `elOption.textConfig` or `elOption.textContent` is null/undefined, it does not make sence.
    // So for simplicity, if "elOption hasOwnProperty of them but be null/undefined", we do not
    // trade them as set to null to el.
    // Especially:
    // `elOption.textContent: false` means remove textContent.
    // `elOption.textContent.emphasis.style: false` means remove the style from emphasis state.
    let txConOptNormal = attachedTxInfo.normal.conOpt as CustomElementOption | false;
    const txConOptEmphasis = attachedTxInfo.emphasis.conOpt as CustomElementOptionOnState;

    if (txConOptEmphasis != null) {
        // If textContent has emphasis state, el should auto has emphasis
        // state, otherwise it can not be triggered.
        el.ensureState(EMPHASIS);
    }

    if (txConOptNormal != null || txConOptEmphasis != null) {
        let textContent = el.getTextContent();
        if (txConOptNormal === false) {
            textContent && el.removeTextContent();
        }
        else {
            txConOptNormal = attachedTxInfo.normal.conOpt = txConOptNormal || {type: 'text'};
            if (!textContent) {
                textContent = createEl(txConOptNormal) as graphicUtil.Text;
                el.setTextContent(textContent);
            }
            else {
                // If in some case the performance issue arised, consider
                // do not clearState but update cached normal state directly.
                textContent.clearStates();
            }
            const txConStlOptNormal = txConOptNormal && txConOptNormal.style;

            updateElNormal(
                textContent, dataIndex, txConOptNormal, txConStlOptNormal, null, seriesModel, isInit, true
            );
            const txConStlOptEmphasis = retrieveStyleOptionOnState(txConOptNormal, txConOptEmphasis, EMPHASIS);
            updateElOnState(EMPHASIS, textContent, txConOptEmphasis, txConStlOptEmphasis, null, false, true);

            txConStlOptNormal ? textContent.dirty() : textContent.markRedraw();
        }
    }
}

function processTxInfo(
    elOption: CustomElementOption,
    state: DisplayStateNonNormal,
    attachedTxInfo: AttachedTxInfo
): void {
    const stateOpt = !state ? elOption : retrieveStateOption(elOption, state);
    const styleOpt = !state ? elOption.style : retrieveStyleOptionOnState(elOption, stateOpt, EMPHASIS);

    const elType = elOption.type;
    let txCfg = stateOpt ? stateOpt.textConfig : null;
    const txConOptNormal = elOption.textContent;
    let txConOpt: CustomElementOption | CustomElementOptionOnState =
        !txConOptNormal ? null : !state ? txConOptNormal : retrieveStateOption(txConOptNormal, state);

    if (styleOpt && (
        // Because emphasis style has little info to detect legacy,
        // if normal is legacy, emphasis is trade as legacy.
        attachedTxInfo.isLegacy
        || isEC4CompatibleStyle(styleOpt, elType, !!txCfg, !!txConOpt)
    )) {
        attachedTxInfo.isLegacy = true;
        const convertResult = convertFromEC4CompatibleStyle(styleOpt, elType, !state);
        // Explicitly specified `textConfig` and `textContent` has higher priority than
        // the ones generated by legacy style. Otherwise if users use them and `api.style`
        // at the same time, they not both work and hardly to known why.
        if (!txCfg && convertResult.textConfig) {
            txCfg = convertResult.textConfig;
        }
        if (!txConOpt && convertResult.textContent) {
            txConOpt = convertResult.textContent;
        }
    }

    if (!state && txConOpt) {
        const txConOptNormal = txConOpt as CustomElementOption;
        // `textContent: {type: 'text'}`, the "type" is easy to be missing. So we tolerate it.
        !txConOptNormal.type && (txConOptNormal.type = 'text');
        if (__DEV__) {
            // Do not tolerate incorret type for forward compat.
            txConOptNormal.type !== 'text' && assert(
                txConOptNormal.type === 'text',
                'textContent.type must be "text"'
            );
        }
    }

    const info = !state ? attachedTxInfo.normal : attachedTxInfo[state];
    info.cfg = txCfg;
    info.conOpt = txConOpt;
}

function retrieveStateOption(
    elOption: CustomElementOption, state: DisplayStateNonNormal
): CustomElementOptionOnState {
    return !state ? elOption : elOption ? elOption[state] : null;
}

function retrieveStyleOptionOnState(
    stateOptionNormal: CustomElementOption,
    stateOption: CustomElementOptionOnState,
    state: DisplayStateNonNormal
): CustomElementOptionOnState['style'] {
    let style = stateOption && stateOption.style;
    if (style == null && state === EMPHASIS && stateOptionNormal) {
        style = stateOptionNormal.styleEmphasis;
    }
    return style;
}


// Usage:
// (1) By default, `elOption.$mergeChildren` is `'byIndex'`, which indicates that
//     the existing children will not be removed, and enables the feature that
//     update some of the props of some of the children simply by construct
//     the returned children of `renderItem` like:
//     `var children = group.children = []; children[3] = {opacity: 0.5};`
// (2) If `elOption.$mergeChildren` is `'byName'`, add/update/remove children
//     by child.name. But that might be lower performance.
// (3) If `elOption.$mergeChildren` is `false`, the existing children will be
//     replaced totally.
// (4) If `!elOption.children`, following the "merge" principle, nothing will happen.
//
// For implementation simpleness, do not provide a direct way to remove sinlge
// child (otherwise the total indicies of the children array have to be modified).
// User can remove a single child by set its `ignore` as `true` or replace
// it by another element, where its `$merge` can be set as `true` if necessary.
function mergeChildren(
    el: graphicUtil.Group,
    dataIndex: number,
    elOption: CustomGroupOption,
    seriesModel: CustomSeriesModel
): void {

    const newChildren = elOption.children;
    const newLen = newChildren ? newChildren.length : 0;
    const mergeChildren = elOption.$mergeChildren;
    // `diffChildrenByName` has been deprecated.
    const byName = mergeChildren === 'byName' || elOption.diffChildrenByName;
    const notMerge = mergeChildren === false;

    // For better performance on roam update, only enter if necessary.
    if (!newLen && !byName && !notMerge) {
        return;
    }

    if (byName) {
        diffGroupChildren({
            oldChildren: el.children() || [],
            newChildren: newChildren || [],
            dataIndex: dataIndex,
            seriesModel: seriesModel,
            group: el
        });
        return;
    }

    notMerge && el.removeAll();

    // Mapping children of a group simply by index, which
    // might be better performance.
    let index = 0;
    for (; index < newLen; index++) {
        newChildren[index] && doCreateOrUpdate(
            el.childAt(index),
            dataIndex,
            newChildren[index],
            seriesModel,
            el,
            false
        );
    }
    if (__DEV__) {
        assert(
            !notMerge || el.childCount() === index,
            'MUST NOT contain empty item in children array when `group.$mergeChildren` is `false`.'
        );
    }
}

type DiffGroupContext = {
    oldChildren: Element[],
    newChildren: CustomElementOption[],
    dataIndex: number,
    seriesModel: CustomSeriesModel,
    group: graphicUtil.Group
};
function diffGroupChildren(context: DiffGroupContext) {
    (new DataDiffer(
        context.oldChildren,
        context.newChildren,
        getKey,
        getKey,
        context
    ))
        .add(processAddUpdate)
        .update(processAddUpdate)
        .remove(processRemove)
        .execute();
}

function getKey(item: Element, idx: number): string {
    const name = item && item.name;
    return name != null ? name : GROUP_DIFF_PREFIX + idx;
}

function processAddUpdate(
    this: DataDiffer<DiffGroupContext>,
    newIndex: number,
    oldIndex?: number
): void {
    const context = this.context;
    const childOption = newIndex != null ? context.newChildren[newIndex] : null;
    const child = oldIndex != null ? context.oldChildren[oldIndex] : null;

    doCreateOrUpdate(
        child,
        context.dataIndex,
        childOption,
        context.seriesModel,
        context.group,
        false
    );
}

function applyExtraAfter(itemStyle: ZRStyleProps, extra: ZRStyleProps): void {
    for (const key in extra) {
        if (hasOwn(extra, key)) {
            (itemStyle as any)[key] = (extra as any)[key];
        }
    }
}

function processRemove(this: DataDiffer<DiffGroupContext>, oldIndex: number): void {
    const context = this.context;
    const child = context.oldChildren[oldIndex];
    child && context.group.remove(child);
}

function removeItemEl(
    el: Element,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup
): void {
    if (el) {
        const leaveToProps = inner(el).leaveToProps;
        leaveToProps
            ? graphicUtil.updateProps(el, leaveToProps, seriesModel, {
                cb: function () {
                    group.remove(el);
                }
            })
            : group.remove(el);
    }
}

/**
 * @return SVG Path data.
 */
function getPathData(shape: CustomSVGPathOption['shape']): string {
    // "d" follows the SVG convention.
    return shape && (shape.pathData || shape.d);
}

function hasOwnPathData(shape: CustomSVGPathOption['shape']): boolean {
    return shape && (hasOwn(shape, 'pathData') || hasOwn(shape, 'd'));
}

