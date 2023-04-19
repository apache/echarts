
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

import { Dictionary } from 'zrender/src/core/types';
import LRU from 'zrender/src/core/LRU';
import Displayable, { DisplayableState } from 'zrender/src/graphic/Displayable';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import { GradientObject } from 'zrender/src/graphic/Gradient';
import Element, { ElementEvent } from 'zrender/src/Element';
import Model from '../model/Model';
import {
    SeriesDataType,
    DisplayState,
    ECElement,
    ColorString,
    BlurScope,
    InnerFocus,
    Payload,
    ZRColor,
    HighlightPayload,
    DownplayPayload,
    ComponentMainType
} from './types';
import {
    extend,
    indexOf,
    isArrayLike,
    isObject,
    keys,
    isArray,
    each,
    isString,
    isGradientObject,
    map
} from 'zrender/src/core/util';
import { getECData } from './innerStore';
import * as colorTool from 'zrender/src/tool/color';
import SeriesData from '../data/SeriesData';
import SeriesModel from '../model/Series';
import { CoordinateSystemMaster, CoordinateSystem } from '../coord/CoordinateSystem';
import { queryDataIndex, makeInner } from './model';
import Path, { PathStyleProps } from 'zrender/src/graphic/Path';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../core/ExtensionAPI';
import ComponentModel from '../model/Component';
import { error } from './log';
import type ComponentView from '../view/Component';

// Reserve 0 as default.
let _highlightNextDigit = 1;

const _highlightKeyMap: Dictionary<number> = {};

const getSavedStates = makeInner<{
    normalFill: ZRColor
    normalStroke: ZRColor
    selectFill?: ZRColor
    selectStroke?: ZRColor
}, Path>();

const getComponentStates = makeInner<{
    isBlured: boolean
}, SeriesModel | ComponentModel>();

export const HOVER_STATE_NORMAL: 0 = 0;
export const HOVER_STATE_BLUR: 1 = 1;
export const HOVER_STATE_EMPHASIS: 2 = 2;

export const SPECIAL_STATES = ['emphasis', 'blur', 'select'] as const;
export const DISPLAY_STATES = ['normal', 'emphasis', 'blur', 'select'] as const;

export const Z2_EMPHASIS_LIFT = 10;
export const Z2_SELECT_LIFT = 9;

export const HIGHLIGHT_ACTION_TYPE = 'highlight';
export const DOWNPLAY_ACTION_TYPE = 'downplay';

export const SELECT_ACTION_TYPE = 'select';
export const UNSELECT_ACTION_TYPE = 'unselect';
export const TOGGLE_SELECT_ACTION_TYPE = 'toggleSelect';

type ExtendedProps = {
    __highByOuter: number

    __highDownSilentOnTouch: boolean

    __highDownDispatcher: boolean
};
type ExtendedElement = Element & ExtendedProps;
type ExtendedDisplayable = Displayable & ExtendedProps;

function hasFillOrStroke(fillOrStroke: string | PatternObject | GradientObject) {
    return fillOrStroke != null && fillOrStroke !== 'none';
}
// Most lifted color are duplicated.
const liftedColorCache = new LRU<string>(100);
function liftColor(color: GradientObject): GradientObject;
function liftColor(color: string): string;
function liftColor(color: string | GradientObject): string | GradientObject {
    if (isString(color)) {
        let liftedColor = liftedColorCache.get(color);
        if (!liftedColor) {
            liftedColor = colorTool.lift(color, -0.1);
            liftedColorCache.put(color, liftedColor);
        }
        return liftedColor;
    }
    else if (isGradientObject(color)) {
        const ret = extend({}, color) as GradientObject;
        ret.colorStops = map(color.colorStops, stop => ({
            offset: stop.offset,
            color: colorTool.lift(stop.color, -0.1)
        }));
        return ret;
    }
    // Change nothing.
    return color;
}

function doChangeHoverState(el: ECElement, stateName: DisplayState, hoverStateEnum: 0 | 1 | 2) {
    if (el.onHoverStateChange && (el.hoverState || 0) !== hoverStateEnum) {
        el.onHoverStateChange(stateName);
    }
    el.hoverState = hoverStateEnum;
}

function singleEnterEmphasis(el: ECElement) {
    // Only mark the flag.
    // States will be applied in the echarts.ts in next frame.
    doChangeHoverState(el, 'emphasis', HOVER_STATE_EMPHASIS);
}

function singleLeaveEmphasis(el: ECElement) {
    // Only mark the flag.
    // States will be applied in the echarts.ts in next frame.
    if (el.hoverState === HOVER_STATE_EMPHASIS) {
        doChangeHoverState(el, 'normal', HOVER_STATE_NORMAL);
    }
}

function singleEnterBlur(el: ECElement) {
    doChangeHoverState(el, 'blur', HOVER_STATE_BLUR);
}

function singleLeaveBlur(el: ECElement) {
    if (el.hoverState === HOVER_STATE_BLUR) {
        doChangeHoverState(el, 'normal', HOVER_STATE_NORMAL);
    }
}

function singleEnterSelect(el: ECElement) {
    el.selected = true;
}
function singleLeaveSelect(el: ECElement) {
    el.selected = false;
}

function updateElementState<T>(
    el: ExtendedElement,
    updater: (this: void, el: Element, commonParam?: T) => void,
    commonParam?: T
) {
    updater(el, commonParam);
}

function traverseUpdateState<T>(
    el: ExtendedElement,
    updater: (this: void, el: Element, commonParam?: T) => void,
    commonParam?: T
) {
    updateElementState(el, updater, commonParam);
    el.isGroup && el.traverse(function (child: ExtendedElement) {
        updateElementState(child, updater, commonParam);
    });
}

export function setStatesFlag(el: ECElement, stateName: DisplayState) {
    switch (stateName) {
        case 'emphasis':
            el.hoverState = HOVER_STATE_EMPHASIS;
            break;
        case 'normal':
            el.hoverState = HOVER_STATE_NORMAL;
            break;
        case 'blur':
            el.hoverState = HOVER_STATE_BLUR;
            break;
        case 'select':
            el.selected = true;
    }
}

/**
 * If we reuse elements when rerender.
 * DON'T forget to clearStates before we update the style and shape.
 * Or we may update on the wrong state instead of normal state.
 */
export function clearStates(el: Element) {
    if (el.isGroup) {
        el.traverse(function (child) {
            child.clearStates();
        });
    }
    else {
        el.clearStates();
    }
}

function getFromStateStyle(
    el: Displayable,
    props: (keyof PathStyleProps)[],
    toStateName: string,
    defaultValue?: PathStyleProps
): PathStyleProps {
    const style = el.style;
    const fromState: PathStyleProps = {};
    for (let i = 0; i < props.length; i++) {
        const propName = props[i];
        const val = style[propName];
        (fromState as any)[propName] = val == null ? (defaultValue && defaultValue[propName]) : val;
    }
    for (let i = 0; i < el.animators.length; i++) {
        const animator = el.animators[i];
        if (animator.__fromStateTransition
            // Don't consider the animation to emphasis state.
            && animator.__fromStateTransition.indexOf(toStateName) < 0
            && animator.targetName === 'style') {
            animator.saveTo(fromState, props);
        }
    }
    return fromState;
}

function createEmphasisDefaultState(
    el: Displayable,
    stateName: 'emphasis',
    targetStates: string[],
    state: Displayable['states'][number]
): DisplayableState {
    const hasSelect = targetStates && indexOf(targetStates, 'select') >= 0;
    let cloned = false;
    if (el instanceof Path) {
        const store = getSavedStates(el);
        const fromFill = hasSelect ? (store.selectFill || store.normalFill) : store.normalFill;
        const fromStroke = hasSelect ? (store.selectStroke || store.normalStroke) : store.normalStroke;
        if (hasFillOrStroke(fromFill) || hasFillOrStroke(fromStroke)) {
            state = state || {};
            let emphasisStyle = state.style || {};

            // inherit case
            if (emphasisStyle.fill === 'inherit') {
                cloned = true;
                state = extend({}, state);
                emphasisStyle = extend({}, emphasisStyle);
                emphasisStyle.fill = fromFill;
            }
            // Apply default color lift
            else if (!hasFillOrStroke(emphasisStyle.fill) && hasFillOrStroke(fromFill)) {
                cloned = true;
                // Not modify the original value.
                state = extend({}, state);
                emphasisStyle = extend({}, emphasisStyle);
                // Already being applied 'emphasis'. DON'T lift color multiple times.
                emphasisStyle.fill = liftColor(fromFill as ColorString);
            }
            // Not highlight stroke if fill has been highlighted.
            else if (!hasFillOrStroke(emphasisStyle.stroke) && hasFillOrStroke(fromStroke)) {
                if (!cloned) {
                    state = extend({}, state);
                    emphasisStyle = extend({}, emphasisStyle);
                }
                emphasisStyle.stroke = liftColor(fromStroke as ColorString);
            }
            state.style = emphasisStyle;
        }
    }
    if (state) {
        // TODO Share with textContent?
        if (state.z2 == null) {
            if (!cloned) {
                state = extend({}, state);
            }
            const z2EmphasisLift = (el as ECElement).z2EmphasisLift;
            state.z2 = el.z2 + (z2EmphasisLift != null ? z2EmphasisLift : Z2_EMPHASIS_LIFT);
        }
    }
    return state;
}

function createSelectDefaultState(
    el: Displayable,
    stateName: 'select',
    state: Displayable['states'][number]
): DisplayableState {
    // const hasSelect = indexOf(el.currentStates, stateName) >= 0;
    if (state) {
        // TODO Share with textContent?
        if (state.z2 == null) {
            state = extend({}, state);
            const z2SelectLift = (el as ECElement).z2SelectLift;
            state.z2 = el.z2 + (z2SelectLift != null ? z2SelectLift : Z2_SELECT_LIFT);
        }
    }
    return state;
}

function createBlurDefaultState(
    el: Displayable,
    stateName: 'blur',
    state: Displayable['states'][number]
): DisplayableState {
    const hasBlur = indexOf(el.currentStates, stateName) >= 0;
    const currentOpacity = el.style.opacity;

    const fromState = !hasBlur
        ? getFromStateStyle(el, ['opacity'], stateName, {
            opacity: 1
        })
        : null;

    state = state || {};
    let blurStyle = state.style || {};
    if (blurStyle.opacity == null) {
        // clone state
        state = extend({}, state);
        blurStyle = extend({
            // Already being applied 'emphasis'. DON'T mul opacity multiple times.
            opacity: hasBlur ? currentOpacity : (fromState.opacity * 0.1)
        }, blurStyle);
        state.style = blurStyle;
    }

    return state;
}

function elementStateProxy(this: Displayable, stateName: string, targetStates?: string[]): DisplayableState {
    const state = this.states[stateName];
    if (this.style) {
        if (stateName === 'emphasis') {
            return createEmphasisDefaultState(this, stateName, targetStates, state);
        }
        else if (stateName === 'blur') {
            return createBlurDefaultState(this, stateName, state);
        }
        else if (stateName === 'select') {
            return createSelectDefaultState(this, stateName, state);
        }
    }
    return state;
}

/**
 * Set hover style (namely "emphasis style") of element.
 * @param el Should not be `zrender/graphic/Group`.
 * @param focus 'self' | 'selfInSeries' | 'series'
 */
export function setDefaultStateProxy(el: Displayable) {
    el.stateProxy = elementStateProxy;
    const textContent = el.getTextContent();
    const textGuide = el.getTextGuideLine();
    if (textContent) {
        textContent.stateProxy = elementStateProxy;
    }
    if (textGuide) {
        textGuide.stateProxy = elementStateProxy;
    }
}

export function enterEmphasisWhenMouseOver(el: Element, e: ElementEvent) {
    !shouldSilent(el, e)
        // "emphasis" event highlight has higher priority than mouse highlight.
        && !(el as ExtendedElement).__highByOuter
        && traverseUpdateState((el as ExtendedElement), singleEnterEmphasis);
}

export function leaveEmphasisWhenMouseOut(el: Element, e: ElementEvent) {
    !shouldSilent(el, e)
        // "emphasis" event highlight has higher priority than mouse highlight.
        && !(el as ExtendedElement).__highByOuter
        && traverseUpdateState((el as ExtendedElement), singleLeaveEmphasis);
}

export function enterEmphasis(el: Element, highlightDigit?: number) {
    (el as ExtendedElement).__highByOuter |= 1 << (highlightDigit || 0);
    traverseUpdateState((el as ExtendedElement), singleEnterEmphasis);
}

export function leaveEmphasis(el: Element, highlightDigit?: number) {
    !((el as ExtendedElement).__highByOuter &= ~(1 << (highlightDigit || 0)))
        && traverseUpdateState((el as ExtendedElement), singleLeaveEmphasis);
}

export function enterBlur(el: Element) {
    traverseUpdateState(el as ExtendedElement, singleEnterBlur);
}

export function leaveBlur(el: Element) {
    traverseUpdateState(el as ExtendedElement, singleLeaveBlur);
}

export function enterSelect(el: Element) {
    traverseUpdateState(el as ExtendedElement, singleEnterSelect);
}

export function leaveSelect(el: Element) {
    traverseUpdateState(el as ExtendedElement, singleLeaveSelect);
}

function shouldSilent(el: Element, e: ElementEvent) {
    return (el as ExtendedElement).__highDownSilentOnTouch && e.zrByTouch;
}

export function allLeaveBlur(api: ExtensionAPI) {
    const model = api.getModel();
    const leaveBlurredSeries: SeriesModel[] = [];
    const allComponentViews: ComponentView[] = [];
    model.eachComponent(function (componentType, componentModel) {
        const componentStates = getComponentStates(componentModel);
        const isSeries = componentType === 'series';
        const view = isSeries ? api.getViewOfSeriesModel(componentModel as SeriesModel)
            : api.getViewOfComponentModel(componentModel);
        !isSeries && allComponentViews.push(view as ComponentView);
        if (componentStates.isBlured) {
            // Leave blur anyway
            view.group.traverse(function (child) {
                singleLeaveBlur(child);
            });
            isSeries && leaveBlurredSeries.push(componentModel as SeriesModel);
        }
        componentStates.isBlured = false;
    });
    each(allComponentViews, function (view) {
        if (view && view.toggleBlurSeries) {
            view.toggleBlurSeries(leaveBlurredSeries, false, model);
        }
    });
}

export function blurSeries(
    targetSeriesIndex: number,
    focus: InnerFocus,
    blurScope: BlurScope,
    api: ExtensionAPI
) {
    const ecModel = api.getModel();
    blurScope = blurScope || 'coordinateSystem';

    function leaveBlurOfIndices(data: SeriesData, dataIndices: ArrayLike<number>) {
        for (let i = 0; i < dataIndices.length; i++) {
            const itemEl = data.getItemGraphicEl(dataIndices[i]);
            itemEl && leaveBlur(itemEl);
        }
    }

    if (targetSeriesIndex == null) {
        return;
    }

    if (!focus || focus === 'none') {
        return;
    }

    const targetSeriesModel = ecModel.getSeriesByIndex(targetSeriesIndex);
    let targetCoordSys: CoordinateSystemMaster | CoordinateSystem = targetSeriesModel.coordinateSystem;
    if (targetCoordSys && (targetCoordSys as CoordinateSystem).master) {
        targetCoordSys = (targetCoordSys as CoordinateSystem).master;
    }

    const blurredSeries: SeriesModel[] = [];

    ecModel.eachSeries(function (seriesModel) {

        const sameSeries = targetSeriesModel === seriesModel;
        let coordSys: CoordinateSystemMaster | CoordinateSystem = seriesModel.coordinateSystem;
        if (coordSys && (coordSys as CoordinateSystem).master) {
            coordSys = (coordSys as CoordinateSystem).master;
        }
        const sameCoordSys = coordSys && targetCoordSys
            ? coordSys === targetCoordSys
            : sameSeries;   // If there is no coordinate system. use sameSeries instead.
        if (!(
            // Not blur other series if blurScope series
            blurScope === 'series' && !sameSeries
            // Not blur other coordinate system if blurScope is coordinateSystem
            || blurScope === 'coordinateSystem' && !sameCoordSys
            // Not blur self series if focus is series.
            || focus === 'series' && sameSeries
            // TODO blurScope: coordinate system
        )) {
            const view = api.getViewOfSeriesModel(seriesModel);
            view.group.traverse(function (child) {
                // For the elements that have been triggered by other components,
                // and are still required to be highlighted,
                // because the current is directly forced to blur the element,
                // it will cause the focus self to be unable to highlight, so skip the blur of this element.
                if ((child as ExtendedElement).__highByOuter && sameSeries && focus === 'self') {
                    return;
                }
                singleEnterBlur(child);
            });

            if (isArrayLike(focus)) {
                leaveBlurOfIndices(seriesModel.getData(), focus as ArrayLike<number>);
            }
            else if (isObject(focus)) {
                const dataTypes = keys(focus);
                for (let d = 0; d < dataTypes.length; d++) {
                    leaveBlurOfIndices(seriesModel.getData(dataTypes[d] as SeriesDataType), focus[dataTypes[d]]);
                }
            }

            blurredSeries.push(seriesModel);

            getComponentStates(seriesModel).isBlured = true;
        }
    });

    ecModel.eachComponent(function (componentType, componentModel) {
        if (componentType === 'series') {
            return;
        }
        const view = api.getViewOfComponentModel(componentModel);
        if (view && view.toggleBlurSeries) {
            view.toggleBlurSeries(blurredSeries, true, ecModel);
        }
    });
}

export function blurComponent(
    componentMainType: ComponentMainType,
    componentIndex: number,
    api: ExtensionAPI
) {
    if (componentMainType == null || componentIndex == null) {
        return;
    }

    const componentModel = api.getModel().getComponent(componentMainType, componentIndex);
    if (!componentModel) {
        return;
    }

    getComponentStates(componentModel).isBlured = true;

    const view = api.getViewOfComponentModel(componentModel);
    if (!view || !view.focusBlurEnabled) {
        return;
    }

    view.group.traverse(function (child) {
        singleEnterBlur(child);
    });
}

export function blurSeriesFromHighlightPayload(
    seriesModel: SeriesModel,
    payload: HighlightPayload,
    api: ExtensionAPI
) {
    const seriesIndex = seriesModel.seriesIndex;
    const data = seriesModel.getData(payload.dataType);
    if (!data) {
        if (__DEV__) {
            error(`Unknown dataType ${payload.dataType}`);
        }
        return;
    }
    let dataIndex = queryDataIndex(data, payload);
    // Pick the first one if there is multiple/none exists.
    dataIndex = (isArray(dataIndex) ? dataIndex[0] : dataIndex) || 0;
    let el = data.getItemGraphicEl(dataIndex as number);
    if (!el) {
        const count = data.count();
        let current = 0;
        // If data on dataIndex is NaN.
        while (!el && current < count) {
            el = data.getItemGraphicEl(current++);
        }
    }

    if (el) {
        const ecData = getECData(el);
        blurSeries(
            seriesIndex, ecData.focus, ecData.blurScope, api
        );
    }
    else {
        // If there is no element put on the data. Try getting it from raw option
        // TODO Should put it on seriesModel?
        const focus = seriesModel.get(['emphasis', 'focus']);
        const blurScope = seriesModel.get(['emphasis', 'blurScope']);
        if (focus != null) {
            blurSeries(seriesIndex, focus, blurScope, api);
        }
    }
}

export function findComponentHighDownDispatchers(
    componentMainType: ComponentMainType,
    componentIndex: number,
    name: string,
    api: ExtensionAPI
): {
    focusSelf: boolean;
    // If return null/undefined, do not support this feature.
    dispatchers: Element[];
} {
    const ret = {
        focusSelf: false,
        dispatchers: null as Element[]
    };
    if (componentMainType == null
        || componentMainType === 'series'
        || componentIndex == null
        || name == null
    ) {
        return ret;
    }

    const componentModel = api.getModel().getComponent(componentMainType, componentIndex);
    if (!componentModel) {
        return ret;
    }

    const view = api.getViewOfComponentModel(componentModel);
    if (!view || !view.findHighDownDispatchers) {
        return ret;
    }

    const dispatchers = view.findHighDownDispatchers(name);

    // At presnet, the component (like Geo) only blur inside itself.
    // So we do not use `blurScope` in component.
    let focusSelf: boolean;
    for (let i = 0; i < dispatchers.length; i++) {
        if (__DEV__ && !isHighDownDispatcher(dispatchers[i])) {
            error('param should be highDownDispatcher');
        }
        if (getECData(dispatchers[i]).focus === 'self') {
            focusSelf = true;
            break;
        }
    }

    return { focusSelf, dispatchers };
}

export function handleGlobalMouseOverForHighDown(
    dispatcher: Element,
    e: ElementEvent,
    api: ExtensionAPI
): void {
    if (__DEV__ && !isHighDownDispatcher(dispatcher)) {
        error('param should be highDownDispatcher');
    }

    const ecData = getECData(dispatcher);

    const { dispatchers, focusSelf } = findComponentHighDownDispatchers(
        ecData.componentMainType, ecData.componentIndex, ecData.componentHighDownName, api
    );
    // If `findHighDownDispatchers` is supported on the component,
    // highlight/downplay elements with the same name.
    if (dispatchers) {
        if (focusSelf) {
            blurComponent(ecData.componentMainType, ecData.componentIndex, api);
        }
        each(dispatchers, dispatcher => enterEmphasisWhenMouseOver(dispatcher, e));
    }
    else {
        // Try blur all in the related series. Then emphasis the hoverred.
        // TODO. progressive mode.
        blurSeries(ecData.seriesIndex, ecData.focus, ecData.blurScope, api);
        if (ecData.focus === 'self') {
            blurComponent(ecData.componentMainType, ecData.componentIndex, api);
        }
        // Other than series, component that not support `findHighDownDispatcher` will
        // also use it. But in this case, highlight/downplay are only supported in
        // mouse hover but not in dispatchAction.
        enterEmphasisWhenMouseOver(dispatcher, e);
    }
}

export function handleGlobalMouseOutForHighDown(
    dispatcher: Element,
    e: ElementEvent,
    api: ExtensionAPI
): void {
    if (__DEV__ && !isHighDownDispatcher(dispatcher)) {
        error('param should be highDownDispatcher');
    }

    allLeaveBlur(api);

    const ecData = getECData(dispatcher);
    const { dispatchers } = findComponentHighDownDispatchers(
        ecData.componentMainType, ecData.componentIndex, ecData.componentHighDownName, api
    );
    if (dispatchers) {
        each(dispatchers, dispatcher => leaveEmphasisWhenMouseOut(dispatcher, e));
    }
    else {
        leaveEmphasisWhenMouseOut(dispatcher, e);
    }
}


export function toggleSelectionFromPayload(
    seriesModel: SeriesModel,
    payload: Payload,
    api: ExtensionAPI
) {
    if (!(isSelectChangePayload(payload))) {
        return;
    }
    const dataType = payload.dataType;
    const data = seriesModel.getData(dataType);
    let dataIndex = queryDataIndex(data, payload);
    if (!isArray(dataIndex)) {
        dataIndex = [dataIndex];
    }

    seriesModel[
        payload.type === TOGGLE_SELECT_ACTION_TYPE ? 'toggleSelect'
            : payload.type === SELECT_ACTION_TYPE ? 'select' : 'unselect'
    ](dataIndex, dataType);
}


export function updateSeriesElementSelection(seriesModel: SeriesModel) {
    const allData = seriesModel.getAllData();
    each(allData, function ({ data, type }) {
        data.eachItemGraphicEl(function (el, idx) {
            seriesModel.isSelected(idx, type) ? enterSelect(el) : leaveSelect(el);
        });
    });
}

export function getAllSelectedIndices(ecModel: GlobalModel) {
    const ret: {
        seriesIndex: number
        dataType?: SeriesDataType
        dataIndex: number[]
    }[] = [];
    ecModel.eachSeries(function (seriesModel) {
        const allData = seriesModel.getAllData();
        each(allData, function ({ data, type }) {
            const dataIndices = seriesModel.getSelectedDataIndices();
            if (dataIndices.length > 0) {
                const item: typeof ret[number] = {
                    dataIndex: dataIndices,
                    seriesIndex: seriesModel.seriesIndex
                };
                if (type != null) {
                    item.dataType = type;
                }
                ret.push(item);

            }
        });
    });
    return ret;
}

/**
 * Enable the function that mouseover will trigger the emphasis state.
 *
 * NOTE:
 * This function should be used on the element with dataIndex, seriesIndex.
 *
 */
export function enableHoverEmphasis(el: Element, focus?: InnerFocus, blurScope?: BlurScope) {
    setAsHighDownDispatcher(el, true);
    traverseUpdateState(el as ExtendedElement, setDefaultStateProxy);

    enableHoverFocus(el, focus, blurScope);
}

export function disableHoverEmphasis(el: Element) {
    setAsHighDownDispatcher(el, false);
}

export function toggleHoverEmphasis(el: Element, focus: InnerFocus, blurScope: BlurScope, isDisabled: boolean) {
    isDisabled ? disableHoverEmphasis(el)
        : enableHoverEmphasis(el, focus, blurScope);
}

export function enableHoverFocus(el: Element, focus: InnerFocus, blurScope: BlurScope) {
    const ecData = getECData(el);
    if (focus != null) {
        // TODO dataIndex may be set after this function. This check is not useful.
        // if (ecData.dataIndex == null) {
        //     if (__DEV__) {
        //         console.warn('focus can only been set on element with dataIndex');
        //     }
        // }
        // else {
        ecData.focus = focus;
        ecData.blurScope = blurScope;
        // }
    }
    else if (ecData.focus) {
        ecData.focus = null;
    }
}

const OTHER_STATES = ['emphasis', 'blur', 'select'] as const;
const defaultStyleGetterMap: Dictionary<'getItemStyle' | 'getLineStyle' | 'getAreaStyle'> = {
    itemStyle: 'getItemStyle',
    lineStyle: 'getLineStyle',
    areaStyle: 'getAreaStyle'
};
/**
 * Set emphasis/blur/selected states of element.
 */
export function setStatesStylesFromModel(
    el: Displayable,
    itemModel: Model<Partial<Record<'emphasis' | 'blur' | 'select', any>>>,
    styleType?: string, // default itemStyle
    getter?: (model: Model) => Dictionary<any>
) {
    styleType = styleType || 'itemStyle';
    for (let i = 0; i < OTHER_STATES.length; i++) {
        const stateName = OTHER_STATES[i];
        const model = itemModel.getModel([stateName, styleType]);
        const state = el.ensureState(stateName);
        // Let it throw error if getterType is not found.
        state.style = getter ? getter(model) : model[defaultStyleGetterMap[styleType]]();
    }
}


/**
 *
 * Set element as highlight / downplay dispatcher.
 * It will be checked when element received mouseover event or from highlight action.
 * It's in change of all highlight/downplay behavior of it's children.
 *
 * @param el
 * @param el.highDownSilentOnTouch
 *        In touch device, mouseover event will be trigger on touchstart event
 *        (see module:zrender/dom/HandlerProxy). By this mechanism, we can
 *        conveniently use hoverStyle when tap on touch screen without additional
 *        code for compatibility.
 *        But if the chart/component has select feature, which usually also use
 *        hoverStyle, there might be conflict between 'select-highlight' and
 *        'hover-highlight' especially when roam is enabled (see geo for example).
 *        In this case, `highDownSilentOnTouch` should be used to disable
 *        hover-highlight on touch device.
 * @param asDispatcher If `false`, do not set as "highDownDispatcher".
 */
export function setAsHighDownDispatcher(el: Element, asDispatcher: boolean) {
    const disable = asDispatcher === false;
    const extendedEl = el as ExtendedElement;
    // Make `highDownSilentOnTouch` and `onStateChange` only work after
    // `setAsHighDownDispatcher` called. Avoid it is modified by user unexpectedly.
    if ((el as ECElement).highDownSilentOnTouch) {
        extendedEl.__highDownSilentOnTouch = (el as ECElement).highDownSilentOnTouch;
    }
    // Simple optimize, since this method might be
    // called for each elements of a group in some cases.
    if (!disable || extendedEl.__highDownDispatcher) {
        // Emphasis, normal can be triggered manually by API or other components like hover link.
        // el[method]('emphasis', onElementEmphasisEvent)[method]('normal', onElementNormalEvent);
        // Also keep previous record.
        extendedEl.__highByOuter = extendedEl.__highByOuter || 0;
        extendedEl.__highDownDispatcher = !disable;
    }
}

export function isHighDownDispatcher(el: Element): boolean {
    return !!(el && (el as ExtendedDisplayable).__highDownDispatcher);
}

/**
 * Enable component highlight/downplay features:
 * + hover link (within the same name)
 * + focus blur in component
 */
export function enableComponentHighDownFeatures(
    el: Element,
    componentModel: ComponentModel,
    componentHighDownName: string
): void {
    const ecData = getECData(el);
    ecData.componentMainType = componentModel.mainType;
    ecData.componentIndex = componentModel.componentIndex;
    ecData.componentHighDownName = componentHighDownName;
}

/**
 * Support highlight/downplay record on each elements.
 * For the case: hover highlight/downplay (legend, visualMap, ...) and
 * user triggered highlight/downplay should not conflict.
 * Only all of the highlightDigit cleared, return to normal.
 * @param {string} highlightKey
 * @return {number} highlightDigit
 */
export function getHighlightDigit(highlightKey: number) {
    let highlightDigit = _highlightKeyMap[highlightKey];
    if (highlightDigit == null && _highlightNextDigit <= 32) {
        highlightDigit = _highlightKeyMap[highlightKey] = _highlightNextDigit++;
    }
    return highlightDigit;
}

export function isSelectChangePayload(payload: Payload) {
    const payloadType = payload.type;
    return payloadType === SELECT_ACTION_TYPE
        || payloadType === UNSELECT_ACTION_TYPE
        || payloadType === TOGGLE_SELECT_ACTION_TYPE;
}

export function isHighDownPayload(payload: Payload): payload is HighlightPayload | DownplayPayload {
    const payloadType = payload.type;
    return payloadType === HIGHLIGHT_ACTION_TYPE
        || payloadType === DOWNPLAY_ACTION_TYPE;
}

export function savePathStates(el: Path) {
    const store = getSavedStates(el);
    store.normalFill = el.style.fill;
    store.normalStroke = el.style.stroke;

    const selectState = el.states.select || {};
    store.selectFill = (selectState.style && selectState.style.fill) || null;
    store.selectStroke = (selectState.style && selectState.style.stroke) || null;
}
