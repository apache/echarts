import ZRText from 'zrender/src/graphic/Text';
import { Dictionary } from 'zrender/src/core/types';
import LRU from 'zrender/src/core/LRU';
import Displayable, { DisplayableState } from 'zrender/src/graphic/Displayable';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import { GradientObject } from 'zrender/src/graphic/Gradient';
import Element, { ElementEvent } from 'zrender/src/Element';
import Model from '../model/Model';
import { DisplayState, ECElement, ColorString, BlurScope } from './types';
import { extend, indexOf } from 'zrender/src/core/util';
import {
    Z2_EMPHASIS_LIFT,
    getECData,
    _highlightKeyMap
} from './graphic';
import * as colorTool from 'zrender/src/tool/color';
import { EChartsType } from '../echarts';

// Reserve 0 as default.
export let _highlightNextDigit = 1;

export const HOVER_STATE_NORMAL: 0 = 0;
export const HOVER_STATE_BLUR: 1 = 1;
export const HOVER_STATE_EMPHASIS: 2 = 2;

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
function liftColor(color: string): string {
    if (typeof color !== 'string') {
        return color;
    }
    let liftedColor = liftedColorCache.get(color);
    if (!liftedColor) {
        liftedColor = colorTool.lift(color, -0.1);
        liftedColorCache.put(color, liftedColor);
    }
    return liftedColor;
}

function triggerStateChange(el: ECElement, stateEnum: 0 | 1 | 2, stateName: DisplayState) {
    if ((el.hoverState || 0) !== stateEnum) {
        el.onStateChange && el.onStateChange(stateName);
    }
}

function singleEnterEmphasis(el: ECElement) {
    // Only mark the flag.
    // States will be applied in the echarts.ts in next frame.
    triggerStateChange(el, HOVER_STATE_EMPHASIS, 'emphasis');
    el.hoverState = HOVER_STATE_EMPHASIS;
}

function singleLeaveEmphasis(el: ECElement) {
    // Only mark the flag.
    // States will be applied in the echarts.ts in next frame.
    triggerStateChange(el, HOVER_STATE_NORMAL, 'normal');
    el.hoverState = HOVER_STATE_NORMAL;
}

function singleEnterBlur(el: ECElement) {
    triggerStateChange(el, HOVER_STATE_BLUR, 'blur');
    el.hoverState = HOVER_STATE_BLUR;
}

function singleLeaveBlur(el: ECElement) {
    triggerStateChange(el, HOVER_STATE_NORMAL, 'normal');
    el.hoverState = HOVER_STATE_NORMAL;
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
 * DONT forget to clearStates before we update the style and shape.
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

function createEmphasisDefaultState(
    el: Displayable,
    stateName: 'emphasis',
    state: Displayable['states'][number]
) {
    const hasEmphasis = indexOf(el.currentStates, stateName) >= 0;
    if (!(el instanceof ZRText)) {
        const currentFill = el.style.fill;
        const currentStroke = el.style.stroke;
        if (currentFill || currentStroke) {
            let fromState: {
                fill: ColorString;
                stroke: ColorString;
            };
            if (!hasEmphasis) {
                fromState = { fill: currentFill, stroke: currentStroke };
                for (let i = 0; i < el.animators.length; i++) {
                    const animator = el.animators[i];
                    if (animator.__fromStateTransition
                        // Dont consider the animation to emphasis state.
                        && animator.__fromStateTransition.indexOf(stateName) < 0
                        && animator.targetName === 'style') {
                        animator.saveFinalToTarget(fromState, ['fill', 'stroke']);
                    }
                }
            }
            state = state || {};
            // Apply default color lift
            let emphasisStyle = state.style || {};
            let cloned = false;
            if (!hasFillOrStroke(emphasisStyle.fill)) {
                cloned = true;
                // Not modify the original value.
                state = extend({}, state);
                emphasisStyle = extend({}, emphasisStyle);
                // Already being applied 'emphasis'. DON'T lift color multiple times.
                emphasisStyle.fill = hasEmphasis ? currentFill : liftColor(fromState.fill);
            }
            if (!hasFillOrStroke(emphasisStyle.stroke)) {
                if (!cloned) {
                    state = extend({}, state);
                    emphasisStyle = extend({}, emphasisStyle);
                }
                emphasisStyle.stroke = hasEmphasis ? currentStroke : liftColor(fromState.stroke);
            }
            state.style = emphasisStyle;
        }
    }
    if (state) {
        const z2EmphasisLift = (el as ECElement).z2EmphasisLift;
        // TODO Share with textContent?
        state.z2 = el.z2 + (z2EmphasisLift != null ? z2EmphasisLift : Z2_EMPHASIS_LIFT);
    }
    return state;
}

function createBlurDefaultState(
    el: Displayable,
    stateName: 'blur',
    state: Displayable['states'][number]
) {
    const hasBlur = indexOf(el.currentStates, stateName) >= 0;
    const currentOpacity = el.style.opacity;
    const fromState = {
        opacity: currentOpacity == null ? 1 : currentOpacity
    };
    if (!hasBlur) {
        for (let i = 0; i < el.animators.length; i++) {
            const animator = el.animators[i];
            if (animator.__fromStateTransition
                // Dont consider the animation to emphasis state.
                && animator.__fromStateTransition.indexOf(stateName) < 0
                && animator.targetName === 'style') {
                animator.saveFinalToTarget(fromState, ['opacity']);
            }
        }
    }

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

function elementStateProxy(this: Displayable, stateName: string): DisplayableState {
    const state = this.states[stateName];
    if (this.style) {
        if (stateName === 'emphasis') {
            return createEmphasisDefaultState(this, stateName, state);
        }
        else if (stateName === 'blur') {
            return createBlurDefaultState(this, stateName, state);
        }
    }
    return state;
}
/**FI
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

function shouldSilent(el: Element, e: ElementEvent) {
    return (el as ExtendedElement).__highDownSilentOnTouch && e.zrByTouch;
}

export function toggleSeriesBlurStates(
    targetSeriesIndex: number,
    focus: string,
    blurScope: BlurScope,
    ecIns: EChartsType,
    dataIndices: number[],  // TODO
    isBlur: boolean
) {
    if (targetSeriesIndex == null) {
        return;
    }

    const model = ecIns.getModel();
    blurScope = blurScope || 'coordinateSystem';

    if (!(focus === 'series' || focus === 'self')) {
        return;
    }

    model.eachSeries(function (seriesModel) {
        const sameSeries = targetSeriesIndex === seriesModel.seriesIndex;
        if (!(
            blurScope === 'series' && !sameSeries   // Not blur other series if blurScope series
          || focus === 'series' && sameSeries   // Not blur self series if focus is series.
          // TODO blurScope: coordinate system
        )) {
            const view = ecIns.getViewOfSeriesModel(seriesModel);
            view.group.traverse(function (child) {
                isBlur ? singleEnterBlur(child) : singleLeaveBlur(child);
            });
        }
    });
}

/**
 * Enable the function that mouseover will trigger the emphasis state.
 *
 * NOTE:
 * This function should be used on the element with dataIndex, seriesIndex.
 *
 */
export function enableHoverEmphasis(el: Element, focus?: string, blurScope?: BlurScope) {
    setAsHighDownDispatcher(el, true);
    traverseUpdateState(el as ExtendedElement, setDefaultStateProxy);

    enableHoverFocus(el, focus, blurScope);
}

export function enableHoverFocus(el: Element, focus: string, blurScope: BlurScope) {
    if (focus != null) {
        const ecData = getECData(el);
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
}

const OTHER_STATES = ['emphasis', 'blur', 'select'] as const;
const styleGetterMap: Dictionary<'getItemStyle' | 'getLineStyle' | 'getAreaStyle'> = {
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
    getterType?: 'getItemStyle' | 'getLineStyle' | 'getAreaStyle'
) {
    styleType = styleType || 'itemStyle';
    for (let i = 0; i < OTHER_STATES.length; i++) {
        const stateName = OTHER_STATES[i];
        const model = itemModel.getModel([stateName, styleType]);
        const state = el.ensureState(stateName);
        // Let it throw error if getterType is not found.
        state.style = model[getterType || styleGetterMap[styleType]]();
    }
}


/**
 * @parame el
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
 * Support hightlight/downplay record on each elements.
 * For the case: hover highlight/downplay (legend, visualMap, ...) and
 * user triggerred hightlight/downplay should not conflict.
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