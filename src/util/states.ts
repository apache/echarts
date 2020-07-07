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
import { __DEV__ } from '../config';
import {
    ExtendedElement,
    NORMAL,
    EMPHASIS,
    Z2_EMPHASIS_LIFT,
    getECData,
    ExtendedDisplayable,
    _highlightKeyMap
} from './graphic';
import * as colorTool from 'zrender/src/tool/color';

// Reserve 0 as default.
export let _highlightNextDigit = 1;

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

function singleEnterEmphasis(el: Element) {
    // Only mark the flag.
    // States will be applied in the echarts.ts in next frame.
    (el as ECElement).highlighted = true;
}

function singleLeaveEmphasis(el: Element) {
    // Only mark the flag.
    // States will be applied in the echarts.ts in next frame.
    (el as ECElement).highlighted = false;
}

function updateElementState<T>(
    el: ExtendedElement,
    updater: (this: void, el: Element, commonParam?: T) => void,
    commonParam?: T
) {
    // If root is group, also enter updater for `onStateChange`.
    let fromState: DisplayState = NORMAL;
    let toState: DisplayState = NORMAL;
    let trigger;
    // See the rule of `onStateChange` on `graphic.setAsHighDownDispatcher`.
    (el as ECElement).highlighted && (fromState = EMPHASIS, trigger = true);
    updater(el, commonParam);
    (el as ECElement).highlighted && (toState = EMPHASIS, trigger = true);
    trigger && el.__onStateChange && el.__onStateChange(fromState, toState);
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
function elementStateProxy(this: Displayable, stateName: string): DisplayableState {
    let state = this.states[stateName];
    if (stateName === 'emphasis' && this.style) {
        const hasEmphasis = indexOf(this.currentStates, stateName) >= 0;
        if (!(this instanceof ZRText)) {
            const currentFill = this.style.fill;
            const currentStroke = this.style.stroke;
            if (currentFill || currentStroke) {
                let fromState: {
                    fill: ColorString;
                    stroke: ColorString;
                };
                if (!hasEmphasis) {
                    fromState = { fill: currentFill, stroke: currentStroke };
                    for (let i = 0; i < this.animators.length; i++) {
                        const animator = this.animators[i];
                        if (animator.__fromStateTransition
                            // Dont consider the animation to emphasis state.
                            && animator.__fromStateTransition.indexOf('emphasis') < 0
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
            const z2EmphasisLift = (this as ECElement).z2EmphasisLift;
            // TODO Share with textContent?
            state.z2 = this.z2 + (z2EmphasisLift != null ? z2EmphasisLift : Z2_EMPHASIS_LIFT);
        }
    }
    return state;
}
/**FI
 * Set hover style (namely "emphasis style") of element.
 * @param el Should not be `zrender/graphic/Group`.
 * @param focus 'self' | 'selfInSeries' | 'series'
 */
export function enableElementHoverEmphasis(el: Displayable) {
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

/**
 * Enable the function that mouseover will trigger the emphasis state.
 *
 * NOTICE:
 * Call the method for a "root" element once. Do not call it for each descendants.
 * If the descendants elemenets of a group has itself hover style different from the
 * root group, we can simply mount the style on `el.states.emphasis` for them, but should
 * not call this method for them.
 */
export function enableHoverEmphasis(el: Element, focus?: string, blurScope?: BlurScope) {
    setAsHighDownDispatcher(el, true);
    traverseUpdateState(el as ExtendedElement, enableElementHoverEmphasis);
    const ecData = getECData(el);
    if (__DEV__) {
        if (ecData.dataIndex == null && focus != null) {
            console.warn('focus can only been set on element with dataIndex');
        }
    }
    ecData.focus = focus;
    ecData.blurScope = blurScope;
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
 * @param {module:zrender/Element} el
 * @param {Function} [el.onStateChange] Called when state updated.
 *        Since `setHoverStyle` has the constraint that it must be called after
 *        all of the normal style updated, `onStateChange` is not needed to
 *        trigger if both `fromState` and `toState` is 'normal', and needed to
 *        trigger if both `fromState` and `toState` is 'emphasis', which enables
 *        to sync outside style settings to "emphasis" state.
 *        @this {string} This dispatcher `el`.
 *        @param {string} fromState Can be "normal" or "emphasis".
 *               `fromState` might equal to `toState`,
 *               for example, when this method is called when `el` is
 *               on "emphasis" state.
 *        @param {string} toState Can be "normal" or "emphasis".
 *
 *        FIXME
 *        CAUTION: Do not expose `onStateChange` outside echarts.
 *        Because it is not a complete solution. The update
 *        listener should not have been mount in element,
 *        and the normal/emphasis state should not have
 *        mantained on elements.
 *
 * @param {boolean} [el.highDownSilentOnTouch=false]
 *        In touch device, mouseover event will be trigger on touchstart event
 *        (see module:zrender/dom/HandlerProxy). By this mechanism, we can
 *        conveniently use hoverStyle when tap on touch screen without additional
 *        code for compatibility.
 *        But if the chart/component has select feature, which usually also use
 *        hoverStyle, there might be conflict between 'select-highlight' and
 *        'hover-highlight' especially when roam is enabled (see geo for example).
 *        In this case, `highDownSilentOnTouch` should be used to disable
 *        hover-highlight on touch device.
 * @param {boolean} [asDispatcher=true] If `false`, do not set as "highDownDispatcher".
 */
export function setAsHighDownDispatcher(el: Element, asDispatcher: boolean) {
    const disable = asDispatcher === false;
    const extendedEl = el as ExtendedElement;
    // Make `highDownSilentOnTouch` and `onStateChange` only work after
    // `setAsHighDownDispatcher` called. Avoid it is modified by user unexpectedly.
    if ((el as ECElement).highDownSilentOnTouch) {
        extendedEl.__highDownSilentOnTouch = (el as ECElement).highDownSilentOnTouch;
    }
    if ((el as ECElement).onStateChange) {
        extendedEl.__onStateChange = (el as ECElement).onStateChange;
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
