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

import {
    hasOwn, assert, isString, retrieve2, retrieve3, defaults, each, indexOf
} from 'zrender/src/core/util';
import * as graphicUtil from '../../util/graphic';
import { setDefaultStateProxy, toggleHoverEmphasis } from '../../util/states';
import * as labelStyleHelper from '../../label/labelStyle';
import {getDefaultLabel} from '../helper/labelHelper';
import {getLayoutOnAxis} from '../../layout/barGrid';
import DataDiffer from '../../data/DataDiffer';
import Model from '../../model/Model';
import ChartView from '../../view/Chart';
import {createClipPath} from '../helper/createClipPathFromCoordSys';
import {
    EventQueryItem, ECActionEvent,
    DimensionLoose,
    ParsedValue,
    Dictionary,
    Payload,
    StageHandlerProgressParams,
    ViewRootGroup,
    ZRStyleProps,
    DisplayState,
    ECElement,
    DisplayStateNonNormal,
    OrdinalRawValue,
    InnerDecalObject
} from '../../util/types';
import Element, { ElementTextConfig } from 'zrender/src/Element';
import prepareCartesian2d from '../../coord/cartesian/prepareCustom';
import prepareGeo from '../../coord/geo/prepareCustom';
import prepareSingleAxis from '../../coord/single/prepareCustom';
import preparePolar from '../../coord/polar/prepareCustom';
import prepareCalendar from '../../coord/calendar/prepareCustom';
import SeriesData, { DefaultDataVisual } from '../../data/SeriesData';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import Displayable from 'zrender/src/graphic/Displayable';
import Axis2D from '../../coord/cartesian/Axis2D';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { TextStyleProps } from 'zrender/src/graphic/Text';
import {
    convertToEC4StyleForCustomSerise,
    isEC4CompatibleStyle,
    convertFromEC4CompatibleStyle,
    LegacyStyleProps,
    warnDeprecated
} from '../../util/styleCompat';
import { ItemStyleProps } from '../../model/mixin/itemStyle';
import { throwError } from '../../util/log';
import { createOrUpdatePatternFromDecal } from '../../util/decal';
import CustomSeriesModel, {
    CustomImageOption,
    CustomElementOption,
    CustomElementOptionOnState,
    CustomSVGPathOption,
    CustomBaseZRPathOption,
    CustomDisplayableOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomGroupOption,
    WrapEncodeDefRet,
    NonStyleVisualProps,
    StyleVisualProps,
    STYLE_VISUAL_TYPE,
    NON_STYLE_VISUAL_PROPS,
    customInnerStore,
    PrepareCustomInfo,
    CustomPathOption,
    CustomRootElementOption,
    CustomSeriesOption
} from './CustomSeries';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import {
    applyLeaveTransition,
    applyUpdateTransition,
    ElementRootTransitionProp
} from '../../animation/customGraphicTransition';
import {
    applyKeyframeAnimation,
    stopPreviousKeyframeAnimationAndRestore
} from '../../animation/customGraphicKeyframeAnimation';
import type SeriesModel from '../../model/Series';

const EMPHASIS = 'emphasis' as const;
const NORMAL = 'normal' as const;
const BLUR = 'blur' as const;
const SELECT = 'select' as const;
const STATES = [NORMAL, EMPHASIS, BLUR, SELECT] as const;
const PATH_ITEM_STYLE = {
    normal: ['itemStyle'],
    emphasis: [EMPHASIS, 'itemStyle'],
    blur: [BLUR, 'itemStyle'],
    select: [SELECT, 'itemStyle']
} as const;
const PATH_LABEL = {
    normal: ['label'],
    emphasis: [EMPHASIS, 'label'],
    blur: [BLUR, 'label'],
    select: [SELECT, 'label']
} as const;
const DEFAULT_TRANSITION: ElementRootTransitionProp[] = ['x', 'y'];
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
    blur: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOptionOnState;
    };
    select: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOptionOnState;
    };
};
const attachedTxInfoTmp = {
    normal: {},
    emphasis: {},
    blur: {},
    select: {}
} as AttachedTxInfo;


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
    single: prepareSingleAxis,
    polar: preparePolar,
    calendar: prepareCalendar
};


function isPath(el: Element): el is graphicUtil.Path {
    return el instanceof graphicUtil.Path;
}
function isDisplayable(el: Element) : el is Displayable {
    return el instanceof Displayable;
}
function copyElement(sourceEl: Element, targetEl: Element) {
    targetEl.copyTransform(sourceEl);
    if (isDisplayable(targetEl) && isDisplayable(sourceEl)) {
        targetEl.setStyle(sourceEl.style);
        targetEl.z = sourceEl.z;
        targetEl.z2 = sourceEl.z2;
        targetEl.zlevel = sourceEl.zlevel;
        targetEl.invisible = sourceEl.invisible;
        targetEl.ignore = sourceEl.ignore;

        if (isPath(targetEl) && isPath(sourceEl)) {
            targetEl.setShape(sourceEl.shape);
        }
    }
}
export default class CustomChartView extends ChartView {

    static type = 'custom';
    readonly type = CustomChartView.type;

    private _data: SeriesData;
    private _progressiveEls: Element[];

    render(
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void {

        // Clear previously rendered progressive elements.
        this._progressiveEls = null;

        const oldData = this._data;
        const data = customSeries.getData();
        const group = this.group;
        const renderItem = makeRenderItem(customSeries, data, ecModel, api);

        if (!oldData) {
            // Previous render is incremental render or first render.
            // Needs remove the incremental rendered elements.
            group.removeAll();
        }

        data.diff(oldData)
            .add(function (newIdx) {
                createOrUpdateItem(
                    api, null, newIdx, renderItem(newIdx, payload), customSeries, group,
                    data
                );
            })
            .remove(function (oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx);
                el && applyLeaveTransition(el, customInnerStore(el).option, customSeries);
            })
            .update(function (newIdx, oldIdx) {
                const oldEl = oldData.getItemGraphicEl(oldIdx);

                createOrUpdateItem(
                    api, oldEl, newIdx, renderItem(newIdx, payload), customSeries, group,
                    data
                );
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
        const progressiveEls: Element[] = this._progressiveEls = [];

        function setIncrementalAndHoverLayer(el: Displayable) {
            if (!el.isGroup) {
                el.incremental = true;
                el.ensureState('emphasis').hoverLayer = true;
            }
        }
        for (let idx = params.start; idx < params.end; idx++) {
            const el = createOrUpdateItem(
                null, null, idx, renderItem(idx, payload), customSeries, this.group, data
            );
            if (el) {
                el.traverse(setIncrementalAndHoverLayer);
                progressiveEls.push(el);
            }
        }
    }

    eachRendered(cb: (el: Element) => boolean | void) {
        graphicUtil.traverseElements(this._progressiveEls || this.group, cb);
    }

    filterForExposedEvent(
        eventType: string, query: EventQueryItem, targetEl: Element, packedEvent: ECActionEvent
    ): boolean {
        const elementName = query.element;
        if (elementName == null || targetEl.name === elementName) {
            return true;
        }

        // Enable to give a name on a group made by `renderItem`, and listen
        // events that are triggered by its descendents.
        while ((targetEl = (targetEl.__hostTarget || targetEl.parent)) && targetEl !== this.group) {
            if (targetEl.name === elementName) {
                return true;
            }
        }

        return false;
    }
}


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
        customInnerStore(el).customPathData = pathData;
    }
    else if (graphicType === 'image') {
        el = new graphicUtil.Image({});
        customInnerStore(el).customImagePath = (elOption as CustomImageOption).style.image;
    }
    else if (graphicType === 'text') {
        el = new graphicUtil.Text({});
        // customInnerStore(el).customText = (elOption.style as TextStyleProps).text;
    }
    else if (graphicType === 'group') {
        el = new graphicUtil.Group();
    }
    else if (graphicType === 'compoundPath') {
        throw new Error('"compoundPath" is not supported yet.');
    }
    else {
        const Clz = graphicUtil.getShapeClass(graphicType);
        if (!Clz) {
            let errMsg = '';
            if (__DEV__) {
                errMsg = 'graphic type "' + graphicType + '" can not be found.';
            }
            throwError(errMsg);
        }
        el = new Clz();
    }

    customInnerStore(el).customGraphicType = graphicType;
    el.name = elOption.name;

    // Compat ec4: the default z2 lift is 1. If changing the number,
    // some cases probably be broken: hierarchy layout along z, like circle packing,
    // where emphasis only intending to modify color/border rather than lift z2.
    (el as ECElement).z2EmphasisLift = 1;
    (el as ECElement).z2SelectLift = 1;

    return el;
}


/**
 * ----------------------------------------------------------
 * [STRATEGY_MERGE] Merge properties or erase all properties:
 *
 * Based on the fact that the existing zr element probably is reused, we now consider whether
 * merge or erase all properties to the existing elements.
 * That is, if a certain props is not specified in the latest return of `renderItem`:
 * + "Merge" means that do not modify the value on the existing element.
 * + "Erase all" means that use a default value to the existing element.
 *
 * "Merge" might bring some unexpected state retaining for users and "erase all" seems to be
 * more safe. "erase all" forces users to specify all of the props each time, which is recommended
 * in most cases.
 * But "erase all" theoretically disables the chance of performance optimization (e.g., just
 * generete shape and style at the first time rather than always do that).
 * So we still use "merge" rather than "erase all". If users need "erase all", they can
 * simply always set all of the props each time.
 * Some "object-like" config like `textConfig`, `textContent`, `style` which are not needed for
 * every element, so we replace them only when users specify them. And that is a total replace.
 *
 * TODO: There is no hint of 'isFirst' to users. So the performance enhancement cannot be
 * performed yet. Consider the case:
 * (1) setOption to "mergeChildren" with a smaller children count
 * (2) Use dataZoom to make an item disappear.
 * (3) User dataZoom to make the item display again. At that time, renderItem need to return the
 * full option rather than partial option to recreate the element.
 *
 * ----------------------------------------------
 * [STRATEGY_NULL] `hasOwnProperty` or `== null`:
 *
 * Ditinguishing "own property" probably bring little trouble to user when make el options.
 * So we  trade a {xx: null} or {xx: undefined} as "not specified" if possible rather than
 * "set them to null/undefined". In most cases, props can not be cleared. Some typicall
 * clearable props like `style`/`textConfig`/`textContent` we enable `false` to means
 * "clear". In some other special cases that the prop is able to set as null/undefined,
 * but not suitable to use `false`, `hasOwnProperty` is checked.
 *
 * ---------------------------------------------
 * [STRATEGY_TRANSITION] The rule of transition:
 * + For props on the root level of a element:
 *      If there is no `transition` specified, tansform props will be transitioned by default,
 *      which is the same as the previous setting in echarts4 and suitable for the scenario
 *      of dataZoom change.
 *      If `transition` specified, only the specified props will be transitioned.
 * + For props in `shape` and `style`:
 *      Only props specified in `transition` will be transitioned.
 * + Break:
 *      Since ec5, do not make transition to shape by default, because it might result in
 *      performance issue (especially `points` of polygon) and do not necessary in most cases.
 *
 * @return if `isMorphTo`, return `allPropsFinal`.
 */

interface InnerCustomZRPathOptionStyle extends PathStyleProps {
    __decalPattern: PatternObject
}

function updateElNormal(
    // Can be null/undefined
    api: ExtensionAPI,
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    attachedTxInfo: AttachedTxInfo,
    seriesModel: CustomSeriesModel,
    isInit: boolean
): void {

    // Stop and restore before update any other attributes.
    stopPreviousKeyframeAnimationAndRestore(el);

    const txCfgOpt = attachedTxInfo && attachedTxInfo.normal.cfg;
    if (txCfgOpt) {
        // PENDING: whether use user object directly rather than clone?
        // TODO:5.0 textConfig transition animation?
        el.setTextConfig(txCfgOpt);
    }

    // Default transition ['x', 'y']
    if (elOption && elOption.transition == null) {
        elOption.transition = DEFAULT_TRANSITION;
    }

    // Do some normalization on style.
    const styleOpt = elOption && (elOption as CustomDisplayableOption).style;

    if (styleOpt) {
        if (el.type === 'text') {
            const textOptionStyle = styleOpt as TextStyleProps;
            // Compatible with ec4: if `textFill` or `textStroke` exists use them.
            hasOwn(textOptionStyle, 'textFill') && (
                textOptionStyle.fill = (textOptionStyle as any).textFill
            );
            hasOwn(textOptionStyle, 'textStroke') && (
                textOptionStyle.stroke = (textOptionStyle as any).textStroke
            );
        }

        let decalPattern;
        const decalObj = isPath(el) ? (styleOpt as CustomBaseZRPathOption['style']).decal : null;
        if (api && decalObj) {
            (decalObj as InnerDecalObject).dirty = true;
            decalPattern = createOrUpdatePatternFromDecal(decalObj, api);
        }
        // Always overwrite in case user specify this prop.
        (styleOpt as InnerCustomZRPathOptionStyle).__decalPattern = decalPattern;
    }

    if (isDisplayable(el)) {
        if (styleOpt) {
            const decalPattern = (styleOpt as InnerCustomZRPathOptionStyle).__decalPattern;
            if (decalPattern) {
                (styleOpt as PathStyleProps).decal = decalPattern;
            }
        }
    }

    applyUpdateTransition(el, elOption, seriesModel, {
        dataIndex,
        isInit,
        clearStyle: true
    });

    applyKeyframeAnimation(el, elOption.keyframeAnimation, seriesModel);
}

function updateElOnState(
    state: DisplayStateNonNormal,
    el: Element,
    elStateOpt: CustomElementOptionOnState,
    styleOpt: CustomElementOptionOnState['style'],
    attachedTxInfo: AttachedTxInfo
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
            // style is needed to enable default emphasis.
            stateObj.style = styleOpt || null;
        }
        // If `elOption.styleEmphasis` or `elOption.emphasis.style` is `false`,
        // remove hover style.
        // If `elOption.textConfig` or `elOption.emphasis.textConfig` is null/undefined, it does not
        // make sense. So for simplicity, we do not ditinguish `hasOwnProperty` and null/undefined.
        if (txCfgOpt) {
            stateObj.textConfig = txCfgOpt;
        }

        setDefaultStateProxy(elDisplayable);
    }
}

function updateZ(
    el: Element,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel
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
    const optZ2 = (elOption as CustomDisplayableOption).z2;
    optZ2 != null && (elDisplayable.z2 = optZ2 || 0);

    for (let i = 0; i < STATES.length; i++) {
        updateZForEachState(elDisplayable, elOption, STATES[i]);
    }
}

function updateZForEachState(
    elDisplayable: Displayable,
    elOption: CustomDisplayableOption,
    state: DisplayState
): void {
    const isNormal = state === NORMAL;
    const elStateOpt = isNormal ? elOption : retrieveStateOption(
        elOption as CustomElementOption,
        state as DisplayStateNonNormal
    );
    const optZ2 = elStateOpt ? elStateOpt.z2 : null;
    let stateObj;
    if (optZ2 != null) {
        // Do not `ensureState` until required.
        stateObj = isNormal ? elDisplayable : elDisplayable.ensureState(state);
        stateObj.z2 = optZ2 || 0;
    }
}

function makeRenderItem(
    customSeries: CustomSeriesModel,
    data: SeriesData<CustomSeriesModel>,
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
        ordinalRawValue: ordinalRawValue,
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
    } as CustomSeriesRenderItemParams;

    // If someday intending to refactor them to a class, should consider do not
    // break change: currently these attribute member are encapsulated in a closure
    // so that do not need to force user to call these method with a scope.

    // Do not support call `api` asynchronously without dataIndexInside input.
    let currDataIndexInside: number;
    let currItemModel: Model<CustomSeriesOption>;
    let currItemStyleModels: Partial<Record<DisplayState, Model<CustomSeriesOption['itemStyle']>>> = {};
    let currLabelModels: Partial<Record<DisplayState, Model<CustomSeriesOption['label']>>> = {};

    const seriesItemStyleModels = {} as Record<DisplayState, Model<CustomSeriesOption['itemStyle']>>;

    const seriesLabelModels = {} as Record<DisplayState, Model<CustomSeriesOption['label']>>;

    for (let i = 0; i < STATES.length; i++) {
        const stateName = STATES[i];
        seriesItemStyleModels[stateName] = (customSeries as Model<CustomSeriesOption>)
            .getModel(PATH_ITEM_STYLE[stateName]);
        seriesLabelModels[stateName] = (customSeries as Model<CustomSeriesOption>)
            .getModel(PATH_LABEL[stateName]);
    }

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
            } as CustomSeriesRenderItemParams, userParams),
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
        return data.getStore().get(data.getDimensionIndex(dim || 0), dataIndexInside);
    }

    /**
     * @public
     * @param dim by default 0.
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function ordinalRawValue(dim?: DimensionLoose, dataIndexInside?: number): ParsedValue | OrdinalRawValue {
        dataIndexInside == null && (dataIndexInside = currDataIndexInside);
        dim = dim || 0;
        const dimInfo = data.getDimensionInfo(dim);
        if (!dimInfo) {
            const dimIndex = data.getDimensionIndex(dim);
            return dimIndex >= 0 ? data.getStore().get(dimIndex, dataIndexInside) : undefined;
        }
        const val = data.get(dimInfo.name, dataIndexInside);
        const ordinalMeta = dimInfo && dimInfo.ordinalMeta;
        return ordinalMeta
            ? ordinalMeta.categories[val as number]
            : val;
    }

    /**
     * @deprecated The original intention of `api.style` is enable to set itemStyle
     * like other series. But it is not necessary and not easy to give a strict definition
     * of what it returns. And since echarts5 it needs to be make compat work. So
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
    function style(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps {
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

        const opt = {inheritColor: isString(visualColor) ? visualColor : '#000'};
        const labelModel = getLabelModel(dataIndexInside, NORMAL);
        // Now that the feature of "auto adjust text fill/stroke" has been migrated to zrender
        // since ec5, we should set `isAttached` as `false` here and make compat in
        // `convertToEC4StyleForCustomSerise`.
        const textStyle = labelStyleHelper.createTextStyle(labelModel, null, opt, false, true);
        textStyle.text = labelModel.getShallow('show')
            ? retrieve2(
                customSeries.getFormattedLabel(dataIndexInside, NORMAL),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;
        const textConfig = labelStyleHelper.createTextConfig(labelModel, opt, false);

        preFetchFromExtra(userProps, itemStyle);
        itemStyle = convertToEC4StyleForCustomSerise(itemStyle, textStyle, textConfig);

        userProps && applyUserPropsAfter(itemStyle, userProps);
        (itemStyle as LegacyStyleProps).legacy = true;

        return itemStyle;
    }

    /**
     * @deprecated The reason see `api.style()`
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function styleEmphasis(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps {
        if (__DEV__) {
            warnDeprecated('api.styleEmphasis', 'Please write literal style directly instead.');
        }

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        let itemStyle = getItemStyleModel(dataIndexInside, EMPHASIS).getItemStyle();
        const labelModel = getLabelModel(dataIndexInside, EMPHASIS);
        const textStyle = labelStyleHelper.createTextStyle(labelModel, null, null, true, true);
        textStyle.text = labelModel.getShallow('show')
            ? retrieve3(
                customSeries.getFormattedLabel(dataIndexInside, EMPHASIS),
                customSeries.getFormattedLabel(dataIndexInside, NORMAL),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;
        const textConfig = labelStyleHelper.createTextConfig(labelModel, null, true);

        preFetchFromExtra(userProps, itemStyle);
        itemStyle = convertToEC4StyleForCustomSerise(itemStyle, textStyle, textConfig);

        userProps && applyUserPropsAfter(itemStyle, userProps);
        (itemStyle as LegacyStyleProps).legacy = true;

        return itemStyle;
    }

    function applyUserPropsAfter(itemStyle: ZRStyleProps, extra: ZRStyleProps): void {
        for (const key in extra) {
            if (hasOwn(extra, key)) {
                (itemStyle as any)[key] = (extra as any)[key];
            }
        }
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
    function visual<VT extends NonStyleVisualProps | StyleVisualProps>(
        visualType: VT,
        dataIndexInside?: number
    ): VT extends NonStyleVisualProps ? DefaultDataVisual[VT]
            : VT extends StyleVisualProps ? PathStyleProps[typeof STYLE_VISUAL_TYPE[VT]]
            : never {

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        if (hasOwn(STYLE_VISUAL_TYPE, visualType)) {
            const style = data.getItemVisual(dataIndexInside, 'style');
            return style
                ? style[STYLE_VISUAL_TYPE[visualType as StyleVisualProps]] as any
                : null;
        }
        // Only support these visuals. Other visual might be inner tricky
        // for performance (like `style`), do not expose to users.
        if (hasOwn(NON_STYLE_VISUAL_PROPS, visualType)) {
            return data.getItemVisual(dataIndexInside, visualType as NonStyleVisualProps) as any;
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
        opt: Parameters<typeof labelStyleHelper.getFont>[0]
    ): ReturnType<typeof labelStyleHelper.getFont> {
        return labelStyleHelper.getFont(opt, ecModel);
    }
}

function wrapEncodeDef(data: SeriesData<CustomSeriesModel>): WrapEncodeDefRet {
    const encodeDef = {} as WrapEncodeDefRet;
    each(data.dimensions, function (dimName) {
        const dimInfo = data.getDimensionInfo(dimName);
        if (!dimInfo.isExtraCoord) {
            const coordDim = dimInfo.coordDim;
            const dataDims = encodeDef[coordDim] = encodeDef[coordDim] || [];
            dataDims[dimInfo.coordDimIndex] = data.getDimensionIndex(dimName);
        }
    });
    return encodeDef;
}

function createOrUpdateItem(
    api: ExtensionAPI,
    existsEl: Element,
    dataIndex: number,
    elOption: CustomRootElementOption,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup,
    data: SeriesData<CustomSeriesModel>
): Element {
    // [Rule]
    // If `renderItem` returns `null`/`undefined`/`false`, remove the previous el if existing.
    //     (It seems that violate the "merge" principle, but most of users probably intuitively
    //     regard "return;" as "show nothing element whatever", so make a exception to meet the
    //     most cases.)
    // The rule or "merge" see [STRATEGY_MERGE].

    // If `elOption` is `null`/`undefined`/`false` (when `renderItem` returns nothing).
    if (!elOption) {
        group.remove(existsEl);
        return;
    }
    const el = doCreateOrUpdateEl(api, existsEl, dataIndex, elOption, seriesModel, group);
    el && data.setItemGraphicEl(dataIndex, el);

    el && toggleHoverEmphasis(
        el,
        elOption.focus,
        elOption.blurScope,
        elOption.emphasisDisabled
    );

    return el;
}

function doCreateOrUpdateEl(
    api: ExtensionAPI,
    existsEl: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup
): Element {

    if (__DEV__) {
        assert(elOption, 'should not have an null/undefined element setting');
    }

    let toBeReplacedIdx = -1;
    const oldEl = existsEl;
    if (
        existsEl && (
            doesElNeedRecreate(existsEl, elOption, seriesModel)
            // || (
            //     // PENDING: even in one-to-one mapping case, if el is marked as morph,
            //     // do not sure whether the el will be mapped to another el with different
            //     // hierarchy in Group tree. So always recreate el rather than reuse the el.
            //     morphHelper && morphHelper.isOneToOneFrom(el)
            // )
        )
    ) {
        // Should keep at the original index, otherwise "merge by index" will be incorrect.
        toBeReplacedIdx = indexOf(group.childrenRef(), existsEl);
        existsEl = null;
    }

    const isInit = !existsEl;
    let el = existsEl;

    if (!el) {
        el = createEl(elOption);
        if (oldEl) {
            copyElement(oldEl, el);
        }
    }
    else {
        // FIMXE:NEXT unified clearState?
        // If in some case the performance issue arised, consider
        // do not clearState but update cached normal state directly.
        el.clearStates();
    }

    // Need to set morph: false explictly to disable automatically morphing.
    if ((elOption as CustomBaseZRPathOption).morph === false) {
        (el as ECElement).disableMorphing = true;
    }
    else if ((el as ECElement).disableMorphing) {
        (el as ECElement).disableMorphing = false;
    }

    attachedTxInfoTmp.normal.cfg = attachedTxInfoTmp.normal.conOpt =
        attachedTxInfoTmp.emphasis.cfg = attachedTxInfoTmp.emphasis.conOpt =
        attachedTxInfoTmp.blur.cfg = attachedTxInfoTmp.blur.conOpt =
        attachedTxInfoTmp.select.cfg = attachedTxInfoTmp.select.conOpt = null;

    attachedTxInfoTmp.isLegacy = false;

    doCreateOrUpdateAttachedTx(
        el, dataIndex, elOption, seriesModel, isInit, attachedTxInfoTmp
    );

    doCreateOrUpdateClipPath(
        el, dataIndex, elOption, seriesModel, isInit
    );

    updateElNormal(
        api,
        el,
        dataIndex,
        elOption,
        attachedTxInfoTmp,
        seriesModel,
        isInit
    );
    // `elOption.info` enables user to mount some info on
    // elements and use them in event handlers.
    // Update them only when user specified, otherwise, remain.
    hasOwn(elOption, 'info') && (customInnerStore(el).info = elOption.info);

    for (let i = 0; i < STATES.length; i++) {
        const stateName = STATES[i];
        if (stateName !== NORMAL) {
            const otherStateOpt = retrieveStateOption(elOption, stateName);
            const otherStyleOpt = retrieveStyleOptionOnState(elOption, otherStateOpt, stateName);
            updateElOnState(stateName, el, otherStateOpt, otherStyleOpt, attachedTxInfoTmp);
        }
    }

    updateZ(el, elOption, seriesModel);

    if (elOption.type === 'group') {
        mergeChildren(
            api, el as graphicUtil.Group, dataIndex, elOption as CustomGroupOption, seriesModel
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
function doesElNeedRecreate(el: Element, elOption: CustomElementOption, seriesModel: CustomSeriesModel): boolean {
    const elInner = customInnerStore(el);
    const elOptionType = elOption.type;
    const elOptionShape = (elOption as CustomBaseZRPathOption).shape;
    const elOptionStyle = (elOption as CustomDisplayableOption).style;
    return (
        // Always create new if universal transition is enabled.
        // Because we do transition after render. It needs to know what old element is. Replacement will loose it.
        seriesModel.isUniversalTransitionEnabled()
        // If `elOptionType` is `null`, follow the merge principle.
        || (elOptionType != null
            && elOptionType !== elInner.customGraphicType
        )
        || (elOptionType === 'path'
            && hasOwnPathData(elOptionShape as CustomSVGPathOption['shape'])
            && getPathData(elOptionShape as CustomSVGPathOption['shape']) !== elInner.customPathData
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
    const clipPathOpt = elOption.clipPath as CustomPathOption | false;
    if (clipPathOpt === false) {
        if (el && el.getClipPath()) {
            el.removeClipPath();
        }
    }
    else if (clipPathOpt) {
        let clipPath = el.getClipPath();
        if (clipPath && doesElNeedRecreate(
            clipPath,
            clipPathOpt,
            seriesModel
        )) {
            clipPath = null;
        }
        if (!clipPath) {
            clipPath = createEl(clipPathOpt) as graphicUtil.Path;
            if (__DEV__) {
                assert(
                    isPath(clipPath),
                    'Only any type of `path` can be used in `clipPath`, rather than ' + clipPath.type + '.'
                );
            }
            el.setClipPath(clipPath);
        }
        updateElNormal(
            null, clipPath, dataIndex, clipPathOpt, null, seriesModel, isInit
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
    // Group does not support textContent temporarily until necessary.
    if (el.isGroup) {
        return;
    }

    // Normal must be called before emphasis, for `isLegacy` detection.
    processTxInfo(elOption, null, attachedTxInfo);
    processTxInfo(elOption, EMPHASIS, attachedTxInfo);

    // If `elOption.textConfig` or `elOption.textContent` is null/undefined, it does not make sense.
    // So for simplicity, if "elOption hasOwnProperty of them but be null/undefined", we do not
    // trade them as set to null to el.
    // Especially:
    // `elOption.textContent: false` means remove textContent.
    // `elOption.textContent.emphasis.style: false` means remove the style from emphasis state.
    let txConOptNormal = attachedTxInfo.normal.conOpt as CustomElementOption | false;
    const txConOptEmphasis = attachedTxInfo.emphasis.conOpt as CustomElementOptionOnState;
    const txConOptBlur = attachedTxInfo.blur.conOpt as CustomElementOptionOnState;
    const txConOptSelect = attachedTxInfo.select.conOpt as CustomElementOptionOnState;

    if (txConOptNormal != null || txConOptEmphasis != null || txConOptSelect != null || txConOptBlur != null) {
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

            updateElNormal(null, textContent, dataIndex, txConOptNormal, null, seriesModel, isInit);
            const txConStlOptNormal = txConOptNormal && (txConOptNormal as CustomDisplayableOption).style;
            for (let i = 0; i < STATES.length; i++) {
                const stateName = STATES[i];
                if (stateName !== NORMAL) {
                    const txConOptOtherState = attachedTxInfo[stateName].conOpt as CustomElementOptionOnState;
                    updateElOnState(
                        stateName,
                        textContent,
                        txConOptOtherState,
                        retrieveStyleOptionOnState(txConOptNormal, txConOptOtherState, stateName),
                        null
                    );
                }
            }

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
    const styleOpt = !state
        ? (elOption as CustomDisplayableOption).style
        : retrieveStyleOptionOnState(elOption, stateOpt, EMPHASIS);

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
            // Do not tolerate incorrcet type for forward compat.
            assert(
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
    return !state ? elOption : elOption ? (elOption as CustomDisplayableOption)[state] : null;
}

function retrieveStyleOptionOnState(
    stateOptionNormal: CustomElementOption,
    stateOption: CustomElementOptionOnState,
    state: DisplayStateNonNormal
): CustomElementOptionOnState['style'] {
    let style = stateOption && stateOption.style;
    if (style == null && state === EMPHASIS && stateOptionNormal) {
        style = (stateOptionNormal as CustomDisplayableOption).styleEmphasis;
    }
    return style;
}


// Usage:
// (1) By default, `elOption.$mergeChildren` is `'byIndex'`, which indicates
//     that the existing children will not be removed, and enables the feature
//     that update some of the props of some of the children simply by construct
//     the returned children of `renderItem` like:
//     `var children = group.children = []; children[3] = {opacity: 0.5};`
// (2) If `elOption.$mergeChildren` is `'byName'`, add/update/remove children
//     by child.name. But that might be lower performance.
// (3) If `elOption.$mergeChildren` is `false`, the existing children will be
//     replaced totally.
// (4) If `!elOption.children`, following the "merge" principle, nothing will
//     happen.
// (5) If `elOption.$mergeChildren` is not `false` neither `'byName'` and the
//     `el` is a group, and if any of the new child is null, it means to remove
//     the element at the same index, if exists. On the other hand, if the new
//     child is and empty object `{}`, it means to keep the element not changed.
//
// For implementation simpleness, do not provide a direct way to remove single
// child (otherwise the total indices of the children array have to be modified).
// User can remove a single child by setting its `ignore` to `true`.
function mergeChildren(
    api: ExtensionAPI,
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
            api: api,
            oldChildren: el.children() || [],
            newChildren: newChildren as CustomElementOption[] || [],
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
        const newChild = newChildren[index];
        const oldChild = el.childAt(index);
        if (newChild) {
            if (newChild.ignore == null) {
                // The old child is set to be ignored if null (see comments
                // below). So we need to set ignore to be false back.
                newChild.ignore = false;
            }
            doCreateOrUpdateEl(
                api,
                oldChild,
                dataIndex,
                newChild as CustomElementOption,
                seriesModel,
                el
            );
        }
        else {
            if (__DEV__) {
                assert(
                    oldChild,
                    'renderItem should not return a group containing elements'
                    + ' as null/undefined/{} if they do not exist before.'
                );
            }
            // If the new element option is null, it means to remove the old
            // element. But we cannot really remove the element from the group
            // directly, because the element order may not be stable when this
            // element is added back. So we set the element to be ignored.
            oldChild.ignore = true;
        }
    }
    for (let i = el.childCount() - 1; i >= index; i--) {
        const child = el.childAt(i);
        removeChildFromGroup(el, child, seriesModel);
    }
}

function removeChildFromGroup(
    group: graphicUtil.Group,
    child: Element,
    seriesModel: SeriesModel
) {
    // Do not support leave elements that are not mentioned in the latest
    // `renderItem` return. Otherwise users may not have a clear and simple
    // concept that how to control all of the elements.
    child && applyLeaveTransition(
        child,
        customInnerStore(group).option,
        seriesModel
    );
}

type DiffGroupContext = {
    api: ExtensionAPI;
    oldChildren: Element[];
    newChildren: CustomElementOption[];
    dataIndex: number;
    seriesModel: CustomSeriesModel;
    group: graphicUtil.Group;
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

    doCreateOrUpdateEl(
        context.api,
        child,
        context.dataIndex,
        childOption,
        context.seriesModel,
        context.group
    );
}

function processRemove(this: DataDiffer<DiffGroupContext>, oldIndex: number): void {
    const context = this.context;
    const child = context.oldChildren[oldIndex];
    child && applyLeaveTransition(child, customInnerStore(child).option, context.seriesModel);
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
