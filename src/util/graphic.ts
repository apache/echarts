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

import * as pathTool from 'zrender/src/tool/path';
import * as colorTool from 'zrender/src/tool/color';
import * as matrix from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import Path, { PathProps } from 'zrender/src/graphic/Path';
import Transformable from 'zrender/src/core/Transformable';
import ZRImage, { ImageStyleProps } from 'zrender/src/graphic/Image';
import Group from 'zrender/src/graphic/Group';
import ZRText, { TextStyleProps } from 'zrender/src/graphic/Text';
import Circle from 'zrender/src/graphic/shape/Circle';
import Sector from 'zrender/src/graphic/shape/Sector';
import Ring from 'zrender/src/graphic/shape/Ring';
import Polygon from 'zrender/src/graphic/shape/Polygon';
import Polyline from 'zrender/src/graphic/shape/Polyline';
import Rect from 'zrender/src/graphic/shape/Rect';
import Line from 'zrender/src/graphic/shape/Line';
import BezierCurve from 'zrender/src/graphic/shape/BezierCurve';
import Arc from 'zrender/src/graphic/shape/Arc';
import CompoundPath from 'zrender/src/graphic/CompoundPath';
import LinearGradient from 'zrender/src/graphic/LinearGradient';
import RadialGradient from 'zrender/src/graphic/RadialGradient';
import BoundingRect from 'zrender/src/core/BoundingRect';
import OrientedBoundingRect from 'zrender/src/core/OrientedBoundingRect';
import Point from 'zrender/src/core/Point';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';
import * as subPixelOptimizeUtil from 'zrender/src/graphic/helper/subPixelOptimize';
import { Dictionary } from 'zrender/src/core/types';
import LRU from 'zrender/src/core/LRU';
import Displayable, { DisplayableProps, DisplayableState } from 'zrender/src/graphic/Displayable';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import { GradientObject } from 'zrender/src/graphic/Gradient';
import Element, { ElementEvent, ElementTextConfig } from 'zrender/src/Element';
import Model from '../model/Model';
import {
    AnimationOptionMixin,
    LabelOption,
    AnimationDelayCallbackParam,
    DisplayState,
    ECElement,
    ZRRectLike,
    ColorString,
    DataModel,
    ECEventData,
    ZRStyleProps,
    AnimationOption
} from './types';
import GlobalModel from '../model/Global';
import { makeInner } from './model';
import {
    isFunction,
    retrieve2,
    extend,
    keys,
    trim,
    isArrayLike,
    map,
    defaults,
    indexOf
} from 'zrender/src/core/util';


const mathMax = Math.max;
const mathMin = Math.min;

const EMPTY_OBJ = {};

export const Z2_EMPHASIS_LIFT = 10;

// key: label model property nane, value: style property name.
export const CACHED_LABEL_STYLE_PROPERTIES = {
    color: 'textFill',
    textBorderColor: 'textStroke',
    textBorderWidth: 'textStrokeWidth'
};

const EMPHASIS = 'emphasis';
const NORMAL = 'normal';

// Reserve 0 as default.
let _highlightNextDigit = 1;
const _highlightKeyMap: Dictionary<number> = {};

const _customShapeMap: Dictionary<{ new(): Path }> = {};

type ExtendShapeOpt = Parameters<typeof Path.extend>[0];
type ExtendShapeReturn = ReturnType<typeof Path.extend>;


type ExtendedProps = {
    __highByOuter: number

    __highDownSilentOnTouch: boolean
    __onStateChange: (fromState: DisplayState, toState: DisplayState) => void

    __highDownDispatcher: boolean
};
type ExtendedElement = Element & ExtendedProps;
type ExtendedDisplayable = Displayable & ExtendedProps;

type TextCommonParams = {
    /**
     * Whether diable drawing box of block (outer most).
     */
    disableBox?: boolean
    /**
     * Specify a color when color is 'auto',
     * for textFill, textStroke, textBackgroundColor, and textBorderColor. If autoColor specified, it is used as default textFill.
     */
    autoColor?: ColorString

    getTextPosition?: (textStyleModel: Model, isEmphasis?: boolean) => string | string[] | number[]

    defaultOutsidePosition?: LabelOption['position']

    textStyle?: ZRStyleProps
};

/**
 * Extend shape with parameters
 */
export function extendShape(opts: ExtendShapeOpt): ExtendShapeReturn {
    return Path.extend(opts);
}

const extendPathFromString = pathTool.extendFromString;
type SVGPathOption = Parameters<typeof extendPathFromString>[1];
type SVGPathCtor = ReturnType<typeof extendPathFromString>;
type SVGPath = InstanceType<SVGPathCtor>;
/**
 * Extend path
 */
export function extendPath(pathData: string, opts: SVGPathOption): SVGPathCtor {
    return extendPathFromString(pathData, opts);
}

/**
 * Register a user defined shape.
 * The shape class can be fetched by `getShapeClass`
 * This method will overwrite the registered shapes, including
 * the registered built-in shapes, if using the same `name`.
 * The shape can be used in `custom series` and
 * `graphic component` by declaring `{type: name}`.
 *
 * @param name
 * @param ShapeClass Can be generated by `extendShape`.
 */
export function registerShape(name: string, ShapeClass: {new(): Path}) {
    _customShapeMap[name] = ShapeClass;
}

/**
 * Find shape class registered by `registerShape`. Usually used in
 * fetching user defined shape.
 *
 * [Caution]:
 * (1) This method **MUST NOT be used inside echarts !!!**, unless it is prepared
 * to use user registered shapes.
 * Because the built-in shape (see `getBuiltInShape`) will be registered by
 * `registerShape` by default. That enables users to get both built-in
 * shapes as well as the shapes belonging to themsleves. But users can overwrite
 * the built-in shapes by using names like 'circle', 'rect' via calling
 * `registerShape`. So the echarts inner featrues should not fetch shapes from here
 * in case that it is overwritten by users, except that some features, like
 * `custom series`, `graphic component`, do it deliberately.
 *
 * (2) In the features like `custom series`, `graphic component`, the user input
 * `{tpye: 'xxx'}` does not only specify shapes but also specify other graphic
 * elements like `'group'`, `'text'`, `'image'` or event `'path'`. Those names
 * are reserved names, that is, if some user register a shape named `'image'`,
 * the shape will not be used. If we intending to add some more reserved names
 * in feature, that might bring break changes (disable some existing user shape
 * names). But that case probably rearly happen. So we dont make more mechanism
 * to resolve this issue here.
 *
 * @param name
 * @return The shape class. If not found, return nothing.
 */
export function getShapeClass(name: string): {new(): Path} {
    if (_customShapeMap.hasOwnProperty(name)) {
        return _customShapeMap[name];
    }
}

/**
 * Create a path element from path data string
 * @param pathData
 * @param opts
 * @param rect
 * @param layout 'center' or 'cover' default to be cover
 */
export function makePath(
    pathData: string,
    opts: SVGPathOption,
    rect: ZRRectLike,
    layout?: 'center' | 'cover'
): SVGPath {
    const path = pathTool.createFromString(pathData, opts);
    if (rect) {
        if (layout === 'center') {
            rect = centerGraphic(rect, path.getBoundingRect());
        }
        resizePath(path, rect);
    }
    return path;
}

/**
 * Create a image element from image url
 * @param imageUrl image url
 * @param opts options
 * @param rect constrain rect
 * @param layout 'center' or 'cover'. Default to be 'cover'
 */
export function makeImage(
    imageUrl: string,
    rect: ZRRectLike,
    layout?: 'center' | 'cover'
) {
    const path = new ZRImage({
        style: {
            image: imageUrl,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        onload(img) {
            if (layout === 'center') {
                const boundingRect = {
                    width: img.width,
                    height: img.height
                };
                path.setStyle(centerGraphic(rect, boundingRect));
            }
        }
    });
    return path;
}

/**
 * Get position of centered element in bounding box.
 *
 * @param  rect         element local bounding box
 * @param  boundingRect constraint bounding box
 * @return element position containing x, y, width, and height
 */
function centerGraphic(rect: ZRRectLike, boundingRect: {
    width: number
    height: number
}): ZRRectLike {
    // Set rect to center, keep width / height ratio.
    const aspect = boundingRect.width / boundingRect.height;
    let width = rect.height * aspect;
    let height;
    if (width <= rect.width) {
        height = rect.height;
    }
    else {
        width = rect.width;
        height = width / aspect;
    }
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;

    return {
        x: cx - width / 2,
        y: cy - height / 2,
        width: width,
        height: height
    };
}

export const mergePath = pathTool.mergePath;

/**
 * Resize a path to fit the rect
 * @param path
 * @param rect
 */
export function resizePath(path: SVGPath, rect: ZRRectLike): void {
    if (!path.applyTransform) {
        return;
    }

    const pathRect = path.getBoundingRect();

    const m = pathRect.calculateTransform(rect);

    path.applyTransform(m);
}

/**
 * Sub pixel optimize line for canvas
 */
export function subPixelOptimizeLine(param: {
    shape: {
        x1: number, y1: number, x2: number, y2: number
    },
    style: {
        lineWidth: number
    }
}) {
    subPixelOptimizeUtil.subPixelOptimizeLine(param.shape, param.shape, param.style);
    return param;
}

/**
 * Sub pixel optimize rect for canvas
 */
export function subPixelOptimizeRect(param: {
    shape: {
        x: number, y: number, width: number, height: number
    },
    style: {
        lineWidth: number
    }
}) {
    subPixelOptimizeUtil.subPixelOptimizeRect(param.shape, param.shape, param.style);
    return param;
}

/**
 * Sub pixel optimize for canvas
 *
 * @param position Coordinate, such as x, y
 * @param lineWidth Should be nonnegative integer.
 * @param positiveOrNegative Default false (negative).
 * @return Optimized position.
 */
export const subPixelOptimize = subPixelOptimizeUtil.subPixelOptimize;


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

    (el as ECElement).highlighted = true;

    // el may be an array.
    if (!el.states.emphasis) {
        return;
    }

    el.useState('emphasis', true);
    // TODO hover layer
}


function singleLeaveEmphasis(el: Element) {
    el.removeState('emphasis');
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
                let fromState;
                if (!hasEmphasis) {
                    fromState = {fill: currentFill, stroke: currentStroke};
                    for (let i = 0; i < this.animators.length; i++) {
                        const animator = this.animators[i];
                        if (animator.targetName === 'style') {
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
            state.z2 = this.z2 + Z2_EMPHASIS_LIFT;
        }
    }

    return state;
}

/**FI
 * Set hover style (namely "emphasis style") of element.
 * @param el Should not be `zrender/graphic/Group`.
 */
export function enableElementHoverEmphasis(el: Displayable, hoverStl?: ZRStyleProps) {
    if (hoverStl) {
        const emphasisState = el.ensureState('emphasis');
        emphasisState.style = hoverStl;
    }

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
 * It will set hoverStyle to 'emphasis' state of each children displayables.
 * If hoverStyle is not given, it will just ignore it and use the preset 'emphasis' state.
 *
 * NOTICE
 * (1)
 * Call the method for a "root" element once. Do not call it for each descendants.
 * If the descendants elemenets of a group has itself hover style different from the
 * root group, we can simply mount the style on `el.states.emphasis` for them, but should
 * not call this method for them.
 *
 * (2) The given hover style will replace the style in emphasis state already exists.
 */
export function enableHoverEmphasis(el: Element, hoverStyle?: ZRStyleProps) {
    setAsHighDownDispatcher(el, true);
    traverseUpdateState(el as ExtendedElement, enableElementHoverEmphasis, hoverStyle);
}

/**
 * Set animation config on state transition.
 */
export function setStateTransition(el: Element, animatableModel: Model<AnimationOption>) {
    const duration = animatableModel.get('duration');
    if (duration > 0) {
        el.stateTransition = {
            duration,
            delay: animatableModel.get('delay'),
            easing: animatableModel.get('easing')
        };
    }
    else if (el.stateTransition) {
        el.stateTransition = null;
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

interface SetLabelStyleOpt<LDI> extends TextCommonParams {
    defaultText?: string | (
        (labelDataIndex: LDI, opt: SetLabelStyleOpt<LDI>) => string
    ),
    // Fetch text by `opt.labelFetcher.getFormattedLabel(opt.labelDataIndex, 'normal'/'emphasis', null, opt.labelDimIndex)`
    labelFetcher?: {
        getFormattedLabel: (
            // In MapDraw case it can be string (region name)
            labelDataIndex: LDI,
            status: DisplayState,
            dataType?: string,
            labelDimIndex?: number,
            formatter?: string | ((params: object) => string)
        ) => string
        // getDataParams: (labelDataIndex: LDI, dataType?: string) => object
    },
    labelDataIndex?: LDI,
    labelDimIndex?: number
}


type LabelModel = Model<LabelOption & {
    formatter?: string | ((params: any) => string)
}>;
type LabelModelForText = Model<Omit<
    // Remove
    LabelOption, 'position' | 'rotate'
> & {
    formatter?: string | ((params: any) => string)
}>;
/**
 * Set normal styles and emphasis styles about text on target element
 * If target is a ZRText. It will create a new style object.
 * If target is other Element. It will create or reuse ZRText which is attached on the target.
 * And create a new style object.
 *
 * NOTICE: Because the style on ZRText will be replaced with new(only x, y are keeped).
 * So please update the style on ZRText after use this method.
 */
// eslint-disable-next-line
function setLabelStyle<LDI>(targetEl: ZRText, normalModel: LabelModelForText, emphasisModel: LabelModelForText, opt?: SetLabelStyleOpt<LDI>, normalSpecified?: TextStyleProps, emphasisSpecified?: TextStyleProps): void;
// eslint-disable-next-line
function setLabelStyle<LDI>(targetEl: Element, normalModel: LabelModel, emphasisModel: LabelModel, opt?: SetLabelStyleOpt<LDI>, normalSpecified?: TextStyleProps, emphasisSpecified?: TextStyleProps): void;
function setLabelStyle<LDI>(
    targetEl: Element,
    normalModel: LabelModel,
    emphasisModel: LabelModel,
    opt?: SetLabelStyleOpt<LDI>,
    normalSpecified?: TextStyleProps,
    emphasisSpecified?: TextStyleProps
    // TODO specified position?
) {
    opt = opt || EMPTY_OBJ;
    const isSetOnText = targetEl instanceof ZRText;

    const labelFetcher = opt.labelFetcher;
    const labelDataIndex = opt.labelDataIndex;
    const labelDimIndex = opt.labelDimIndex;

    const showNormal = normalModel.getShallow('show');
    const showEmphasis = emphasisModel.getShallow('show');

    let richText = isSetOnText ? targetEl as ZRText : null;
    if (showNormal || showEmphasis) {
        let baseText;
        if (labelFetcher) {
            baseText = labelFetcher.getFormattedLabel(
                labelDataIndex, 'normal', null, labelDimIndex,
                normalModel.get('formatter')
            );
        }
        if (baseText == null) {
            baseText = isFunction(opt.defaultText) ? opt.defaultText(labelDataIndex, opt) : opt.defaultText;
        }
        const normalStyleText = baseText;
        const emphasisStyleText = retrieve2(
            labelFetcher
                ? labelFetcher.getFormattedLabel(
                    labelDataIndex, 'emphasis', null, labelDimIndex,
                    emphasisModel.get('formatter')
                )
                : null,
            baseText
        );

        if (!isSetOnText) {
            // Reuse the previous
            richText = targetEl.getTextContent();
            if (!richText) {
                richText = new ZRText();
                targetEl.setTextContent(richText);
            }
        }
        richText.ignore = !showNormal;

        const emphasisState = richText.ensureState('emphasis');
        emphasisState.ignore = !showEmphasis;

        const normalStyle = createTextStyle(
            normalModel,
            normalSpecified,
            opt,
            false,
            !isSetOnText
        );
        emphasisState.style = createTextStyle(
            emphasisModel,
            emphasisSpecified,
            opt,
            true,
            !isSetOnText
        );

        if (!isSetOnText) {
            // Always create new
            targetEl.setTextConfig(createTextConfig(
                normalStyle,
                normalModel,
                opt,
                false
            ));
            const targetElEmphasisState = targetEl.ensureState('emphasis');
            targetElEmphasisState.textConfig = createTextConfig(
                emphasisState.style,
                emphasisModel,
                opt,
                true
            );
        }

        // PENDING: if there is many requirements that emphasis position
        // need to be different from normal position, we might consider
        // auto slient is those cases.
        richText.silent = !!normalModel.getShallow('silent');

        normalStyle.text = normalStyleText;
        emphasisState.style.text = emphasisStyleText;

        // Keep x and y
        if (richText.style.x != null) {
            normalStyle.x = richText.style.x;
        }
        if (richText.style.y != null) {
            normalStyle.y = richText.style.y;
        }

        // Always create new style.
        richText.useStyle(normalStyle);

        richText.dirty();
    }
    else if (richText) {
        // Not display rich text.
        richText.ignore = true;
    }

    targetEl.dirty();
}

export {setLabelStyle};
/**
 * Set basic textStyle properties.
 */
export function createTextStyle(
    textStyleModel: Model,
    specifiedTextStyle?: TextStyleProps,    // Can be overrided by settings in model.
    opt?: Pick<TextCommonParams, 'autoColor' | 'disableBox'>,
    isNotNormal?: boolean,
    isAttached?: boolean // If text is attached on an element. If so, auto color will handling in zrender.
) {
    const textStyle: TextStyleProps = {};
    setTextStyleCommon(textStyle, textStyleModel, opt, isNotNormal, isAttached);
    specifiedTextStyle && extend(textStyle, specifiedTextStyle);
    // textStyle.host && textStyle.host.dirty && textStyle.host.dirty(false);

    return textStyle;
}

export function createTextConfig(
    textStyle: TextStyleProps,
    textStyleModel: Model,
    opt?: Pick<TextCommonParams, 'getTextPosition' | 'defaultOutsidePosition' | 'autoColor'>,
    isNotNormal?: boolean
) {
    const textConfig: ElementTextConfig = {};
    let labelPosition;
    let labelRotate = textStyleModel.getShallow('rotate');
    const labelDistance = retrieve2(
        textStyleModel.getShallow('distance'), isNotNormal ? null : 5
    );
    const labelOffset = textStyleModel.getShallow('offset');

    if (opt.getTextPosition) {
        labelPosition = opt.getTextPosition(textStyleModel, isNotNormal);
    }
    else {
        labelPosition = textStyleModel.getShallow('position')
            || (isNotNormal ? null : 'inside');
        // 'outside' is not a valid zr textPostion value, but used
        // in bar series, and magic type should be considered.
        labelPosition === 'outside' && (labelPosition = opt.defaultOutsidePosition || 'top');
    }

    if (labelPosition != null) {
        textConfig.position = labelPosition;
    }
    if (labelOffset != null) {
        textConfig.offset = labelOffset;
    }
    if (labelRotate != null) {
        labelRotate *= Math.PI / 180;
        textConfig.rotation = labelRotate;
    }
    if (labelDistance != null) {
        textConfig.distance = labelDistance;
    }

    // fill and auto is determined by the color of path fill if it's not specified by developers.
    textConfig.outsideFill = opt.autoColor || null;

    // if (!textStyle.fill) {
    //     textConfig.insideFill = 'auto';
    //     textConfig.outsideFill = opt.autoColor || null;
    // }
    // if (!textStyle.stroke) {
    //     textConfig.insideStroke = 'auto';
    // }
    // else if (opt.autoColor) {
    //     // TODO: stroke set to autoColor. if label is inside?
    //     textConfig.insideStroke = opt.autoColor;
    // }

    return textConfig;
}


/**
 * The uniform entry of set text style, that is, retrieve style definitions
 * from `model` and set to `textStyle` object.
 *
 * Never in merge mode, but in overwrite mode, that is, all of the text style
 * properties will be set. (Consider the states of normal and emphasis and
 * default value can be adopted, merge would make the logic too complicated
 * to manage.)
 */
function setTextStyleCommon(
    textStyle: TextStyleProps,
    textStyleModel: Model,
    opt?: Pick<TextCommonParams, 'autoColor' | 'disableBox'>,
    isNotNormal?: boolean,
    isAttached?: boolean
) {
    // Consider there will be abnormal when merge hover style to normal style if given default value.
    opt = opt || EMPTY_OBJ;

    const ecModel = textStyleModel.ecModel;
    const globalTextStyle = ecModel && ecModel.option.textStyle;

    // Consider case:
    // {
    //     data: [{
    //         value: 12,
    //         label: {
    //             rich: {
    //                 // no 'a' here but using parent 'a'.
    //             }
    //         }
    //     }],
    //     rich: {
    //         a: { ... }
    //     }
    // }
    const richItemNames = getRichItemNames(textStyleModel);
    let richResult: TextStyleProps['rich'];
    if (richItemNames) {
        richResult = {};
        for (const name in richItemNames) {
            if (richItemNames.hasOwnProperty(name)) {
                // Cascade is supported in rich.
                const richTextStyle = textStyleModel.getModel(['rich', name]);
                // In rich, never `disableBox`.
                // FIXME: consider `label: {formatter: '{a|xx}', color: 'blue', rich: {a: {}}}`,
                // the default color `'blue'` will not be adopted if no color declared in `rich`.
                // That might confuses users. So probably we should put `textStyleModel` as the
                // root ancestor of the `richTextStyle`. But that would be a break change.
                setTokenTextStyle(richResult[name] = {}, richTextStyle, globalTextStyle, opt, isNotNormal, isAttached);
            }
        }
    }

    if (richResult) {
        textStyle.rich = richResult;
    }
    const overflow = textStyleModel.get('overflow');
    if (overflow) {
        textStyle.overflow = overflow;
    }

    setTokenTextStyle(textStyle, textStyleModel, globalTextStyle, opt, isNotNormal, isAttached, true);
}

// Consider case:
// {
//     data: [{
//         value: 12,
//         label: {
//             rich: {
//                 // no 'a' here but using parent 'a'.
//             }
//         }
//     }],
//     rich: {
//         a: { ... }
//     }
// }
// TODO TextStyleModel
function getRichItemNames(textStyleModel: Model<LabelOption>) {
    // Use object to remove duplicated names.
    let richItemNameMap: Dictionary<number>;
    while (textStyleModel && textStyleModel !== textStyleModel.ecModel) {
        const rich = (textStyleModel.option || EMPTY_OBJ as LabelOption).rich;
        if (rich) {
            richItemNameMap = richItemNameMap || {};
            const richKeys = keys(rich);
            for (let i = 0; i < richKeys.length; i++) {
                const richKey = richKeys[i];
                richItemNameMap[richKey] = 1;
            }
        }
        textStyleModel = textStyleModel.parentModel;
    }
    return richItemNameMap;
}

const TEXT_PROPS_WITH_GLOBAL = [
    'fontStyle', 'fontWeight', 'fontSize', 'fontFamily', 'opacity',
    'textShadowColor', 'textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY'
] as const;

const TEXT_PROPS_SELF = [
    'align', 'lineHeight', 'width', 'height', 'tag', 'verticalAlign'
] as const;

const TEXT_PROPS_BOX = [
    'padding', 'borderWidth', 'borderRadius',
    'backgroundColor', 'borderColor',
    'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'
] as const;

function setTokenTextStyle(
    textStyle: TextStyleProps['rich'][string],
    textStyleModel: Model<LabelOption>,
    globalTextStyle: LabelOption,
    opt?: Pick<TextCommonParams, 'autoColor' | 'disableBox'>,
    isNotNormal?: boolean,
    isAttached?: boolean,
    isBlock?: boolean
) {
    // In merge mode, default value should not be given.
    globalTextStyle = !isNotNormal && globalTextStyle || EMPTY_OBJ;

    const autoColor = opt && opt.autoColor;
    let fillColor = textStyleModel.getShallow('color');
    let strokeColor = textStyleModel.getShallow('textBorderColor');
    if (fillColor === 'auto' && autoColor) {
        fillColor = autoColor;
    }
    if (strokeColor === 'auto' && autoColor) {
        strokeColor = autoColor;
    }
    fillColor = fillColor || globalTextStyle.color;
    strokeColor = strokeColor || globalTextStyle.textBorderColor;
    if (fillColor != null) {
        textStyle.fill = fillColor;
    }
    if (strokeColor != null) {
        textStyle.stroke = strokeColor;
    }

    const lineWidth = retrieve2(
        textStyleModel.getShallow('textBorderWidth'),
        globalTextStyle.textBorderWidth
    );
    if (lineWidth != null) {
        textStyle.lineWidth = lineWidth;
    }

    // TODO
    if (!isNotNormal && !isAttached) {
        // Set default finally.
        if (textStyle.fill == null && opt.autoColor) {
            textStyle.fill = opt.autoColor;
        }
    }

    // Do not use `getFont` here, because merge should be supported, where
    // part of these properties may be changed in emphasis style, and the
    // others should remain their original value got from normal style.
    for (let i = 0; i < TEXT_PROPS_WITH_GLOBAL.length; i++) {
        const key = TEXT_PROPS_WITH_GLOBAL[i];
        const val = retrieve2(textStyleModel.getShallow(key), globalTextStyle[key]);
        if (val != null) {
            (textStyle as any)[key] = val;
        }
    }

    for (let i = 0; i < TEXT_PROPS_SELF.length; i++) {
        const key = TEXT_PROPS_SELF[i];
        const val = textStyleModel.getShallow(key);
        if (val != null) {
            (textStyle as any)[key] = val;
        }
    }

    if (textStyle.verticalAlign == null) {
        const baseline = textStyleModel.getShallow('baseline');
        if (baseline != null) {
            textStyle.verticalAlign = baseline;
        }
    }


    if (!isBlock || !opt.disableBox) {
        if (textStyle.backgroundColor === 'auto' && autoColor) {
            textStyle.backgroundColor = autoColor;
        }
        if (textStyle.borderColor === 'auto' && autoColor) {
            textStyle.borderColor = autoColor;
        }

        for (let i = 0; i < TEXT_PROPS_BOX.length; i++) {
            const key = TEXT_PROPS_BOX[i];
            const val = textStyleModel.getShallow(key);
            if (val != null) {
                (textStyle as any)[key] = val;
            }
        }
    }
}

export function getFont(opt: LabelOption, ecModel: GlobalModel) {
    const gTextStyleModel = ecModel && ecModel.getModel('textStyle');
    return trim([
        // FIXME in node-canvas fontWeight is before fontStyle
        opt.fontStyle || gTextStyleModel && gTextStyleModel.getShallow('fontStyle') || '',
        opt.fontWeight || gTextStyleModel && gTextStyleModel.getShallow('fontWeight') || '',
        (opt.fontSize || gTextStyleModel && gTextStyleModel.getShallow('fontSize') || 12) + 'px',
        opt.fontFamily || gTextStyleModel && gTextStyleModel.getShallow('fontFamily') || 'sans-serif'
    ].join(' '));
}

function animateOrSetProps<Props>(
    isUpdate: boolean,
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin> & {
        getAnimationDelayParams?: (el: Element<Props>, dataIndex: number) => AnimationDelayCallbackParam
    },
    dataIndex?: number | (() => void),
    cb?: () => void
) {
    if (typeof dataIndex === 'function') {
        cb = dataIndex;
        dataIndex = null;
    }
    // Do not check 'animation' property directly here. Consider this case:
    // animation model is an `itemModel`, whose does not have `isAnimationEnabled`
    // but its parent model (`seriesModel`) does.
    const animationEnabled = animatableModel && animatableModel.isAnimationEnabled();

    if (animationEnabled) {
        let duration = animatableModel.getShallow(
            isUpdate ? 'animationDurationUpdate' : 'animationDuration'
        );
        const animationEasing = animatableModel.getShallow(
            isUpdate ? 'animationEasingUpdate' : 'animationEasing'
        );
        let animationDelay = animatableModel.getShallow(
            isUpdate ? 'animationDelayUpdate' : 'animationDelay'
        );
        if (typeof animationDelay === 'function') {
            animationDelay = animationDelay(
                dataIndex as number,
                animatableModel.getAnimationDelayParams
                    ? animatableModel.getAnimationDelayParams(el, dataIndex as number)
                    : null
            );
        }
        if (typeof duration === 'function') {
            duration = duration(dataIndex as number);
        }

        duration > 0
            ? el.animateTo(props, {
                duration,
                delay: animationDelay || 0,
                easing: animationEasing,
                done: cb,
                setToFinal: true,
                force: !!cb
            })
            : (el.stopAnimation(), el.attr(props), cb && cb());
    }
    else {
        el.stopAnimation();
        el.attr(props);
        cb && cb();
    }
}

/**
 * Update graphic element properties with or without animation according to the
 * configuration in series.
 *
 * Caution: this method will stop previous animation.
 * So do not use this method to one element twice before
 * animation starts, unless you know what you are doing.
 * @example
 *     graphic.updateProps(el, {
 *         position: [100, 100]
 *     }, seriesModel, dataIndex, function () { console.log('Animation done!'); });
 *     // Or
 *     graphic.updateProps(el, {
 *         position: [100, 100]
 *     }, seriesModel, function () { console.log('Animation done!'); });
 */
function updateProps<Props>(
    el: Element<Props>,
    props: Props,
    // TODO: TYPE AnimatableModel
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: number | (() => void),
    cb?: () => void
) {
    animateOrSetProps(true, el, props, animatableModel, dataIndex, cb);
}

export {updateProps};

/**
 * Init graphic element properties with or without animation according to the
 * configuration in series.
 *
 * Caution: this method will stop previous animation.
 * So do not use this method to one element twice before
 * animation starts, unless you know what you are doing.
 */
export function initProps<Props>(
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: number | (() => void),
    cb?: () => void
) {
    animateOrSetProps(false, el, props, animatableModel, dataIndex, cb);
}

/**
 * Get transform matrix of target (param target),
 * in coordinate of its ancestor (param ancestor)
 *
 * @param target
 * @param [ancestor]
 */
export function getTransform(target: Transformable, ancestor?: Transformable): matrix.MatrixArray {
    const mat = matrix.identity([]);

    while (target && target !== ancestor) {
        matrix.mul(mat, target.getLocalTransform(), mat);
        target = target.parent;
    }

    return mat;
}

/**
 * Apply transform to an vertex.
 * @param target [x, y]
 * @param transform Can be:
 *      + Transform matrix: like [1, 0, 0, 1, 0, 0]
 *      + {position, rotation, scale}, the same as `zrender/Transformable`.
 * @param invert Whether use invert matrix.
 * @return [x, y]
 */
export function applyTransform(
    target: vector.VectorArray,
    transform: Transformable | matrix.MatrixArray,
    invert?: boolean
): number[] {
    if (transform && !isArrayLike(transform)) {
        transform = Transformable.getLocalTransform(transform);
    }

    if (invert) {
        transform = matrix.invert([], transform as matrix.MatrixArray);
    }
    return vector.applyTransform([], target, transform as matrix.MatrixArray);
}

/**
 * @param direction 'left' 'right' 'top' 'bottom'
 * @param transform Transform matrix: like [1, 0, 0, 1, 0, 0]
 * @param invert Whether use invert matrix.
 * @return Transformed direction. 'left' 'right' 'top' 'bottom'
 */
export function transformDirection(
    direction: 'left' | 'right' | 'top' | 'bottom',
    transform: matrix.MatrixArray,
    invert?: boolean
): 'left' | 'right' | 'top' | 'bottom' {

    // Pick a base, ensure that transform result will not be (0, 0).
    const hBase = (transform[4] === 0 || transform[5] === 0 || transform[0] === 0)
        ? 1 : Math.abs(2 * transform[4] / transform[0]);
    const vBase = (transform[4] === 0 || transform[5] === 0 || transform[2] === 0)
        ? 1 : Math.abs(2 * transform[4] / transform[2]);

    let vertex: vector.VectorArray = [
        direction === 'left' ? -hBase : direction === 'right' ? hBase : 0,
        direction === 'top' ? -vBase : direction === 'bottom' ? vBase : 0
    ];

    vertex = applyTransform(vertex, transform, invert);

    return Math.abs(vertex[0]) > Math.abs(vertex[1])
        ? (vertex[0] > 0 ? 'right' : 'left')
        : (vertex[1] > 0 ? 'bottom' : 'top');
}

function isNotGroup(el: Element): el is Displayable {
    return !el.isGroup;
}
function isPath(el: Displayable): el is Path {
    return (el as Path).shape != null;
}
/**
 * Apply group transition animation from g1 to g2.
 * If no animatableModel, no animation.
 */
export function groupTransition(
    g1: Group,
    g2: Group,
    animatableModel: Model<AnimationOptionMixin>
) {
    if (!g1 || !g2) {
        return;
    }

    function getElMap(g: Group) {
        const elMap: Dictionary<Displayable> = {};
        g.traverse(function (el: Element) {
            if (isNotGroup(el) && el.anid) {
                elMap[el.anid] = el;
            }
        });
        return elMap;
    }
    function getAnimatableProps(el: Displayable) {
        const obj: PathProps = {
            x: el.x,
            y: el.y,
            rotation: el.rotation
        };
        if (isPath(el)) {
            obj.shape = extend({}, el.shape);
        }
        return obj;
    }
    const elMap1 = getElMap(g1);

    g2.traverse(function (el) {
        if (isNotGroup(el) && el.anid) {
            const oldEl = elMap1[el.anid];
            if (oldEl) {
                const newProp = getAnimatableProps(el);
                el.attr(getAnimatableProps(oldEl));
                updateProps(el, newProp, animatableModel, getECData(el).dataIndex);
            }
        }
    });
}

export function clipPointsByRect(points: vector.VectorArray[], rect: ZRRectLike): number[][] {
    // FIXME: this way migth be incorrect when grpahic clipped by a corner.
    // and when element have border.
    return map(points, function (point) {
        let x = point[0];
        x = mathMax(x, rect.x);
        x = mathMin(x, rect.x + rect.width);
        let y = point[1];
        y = mathMax(y, rect.y);
        y = mathMin(y, rect.y + rect.height);
        return [x, y];
    });
}

/**
 * Return a new clipped rect. If rect size are negative, return undefined.
 */
export function clipRectByRect(targetRect: ZRRectLike, rect: ZRRectLike): ZRRectLike {
    const x = mathMax(targetRect.x, rect.x);
    const x2 = mathMin(targetRect.x + targetRect.width, rect.x + rect.width);
    const y = mathMax(targetRect.y, rect.y);
    const y2 = mathMin(targetRect.y + targetRect.height, rect.y + rect.height);

    // If the total rect is cliped, nothing, including the border,
    // should be painted. So return undefined.
    if (x2 >= x && y2 >= y) {
        return {
            x: x,
            y: y,
            width: x2 - x,
            height: y2 - y
        };
    }
}

export function createIcon(
    iconStr: string,    // Support 'image://' or 'path://' or direct svg path.
    opt?: Omit<DisplayableProps, 'style'>,
    rect?: ZRRectLike
): SVGPath | ZRImage {
    const innerOpts: DisplayableProps = extend({rectHover: true}, opt);
    const style: ZRStyleProps = innerOpts.style = {strokeNoScale: true};
    rect = rect || {x: -1, y: -1, width: 2, height: 2};

    if (iconStr) {
        return iconStr.indexOf('image://') === 0
            ? (
                (style as ImageStyleProps).image = iconStr.slice(8),
                defaults(style, rect),
                new ZRImage(innerOpts)
            )
            : (
                makePath(
                    iconStr.replace('path://', ''),
                    innerOpts,
                    rect,
                    'center'
                )
            );
    }
}

/**
 * Return `true` if the given line (line `a`) and the given polygon
 * are intersect.
 * Note that we do not count colinear as intersect here because no
 * requirement for that. We could do that if required in future.
 */
export function linePolygonIntersect(
    a1x: number, a1y: number, a2x: number, a2y: number,
    points: vector.VectorArray[]
): boolean {
    for (let i = 0, p2 = points[points.length - 1]; i < points.length; i++) {
        const p = points[i];
        if (lineLineIntersect(a1x, a1y, a2x, a2y, p[0], p[1], p2[0], p2[1])) {
            return true;
        }
        p2 = p;
    }
}

/**
 * Return `true` if the given two lines (line `a` and line `b`)
 * are intersect.
 * Note that we do not count colinear as intersect here because no
 * requirement for that. We could do that if required in future.
 */
export function lineLineIntersect(
    a1x: number, a1y: number, a2x: number, a2y: number,
    b1x: number, b1y: number, b2x: number, b2y: number
): boolean {
    // let `vec_m` to be `vec_a2 - vec_a1` and `vec_n` to be `vec_b2 - vec_b1`.
    const mx = a2x - a1x;
    const my = a2y - a1y;
    const nx = b2x - b1x;
    const ny = b2y - b1y;

    // `vec_m` and `vec_n` are parallel iff
    //     exising `k` such that `vec_m = k · vec_n`, equivalent to `vec_m X vec_n = 0`.
    const nmCrossProduct = crossProduct2d(nx, ny, mx, my);
    if (nearZero(nmCrossProduct)) {
        return false;
    }

    // `vec_m` and `vec_n` are intersect iff
    //     existing `p` and `q` in [0, 1] such that `vec_a1 + p * vec_m = vec_b1 + q * vec_n`,
    //     such that `q = ((vec_a1 - vec_b1) X vec_m) / (vec_n X vec_m)`
    //           and `p = ((vec_a1 - vec_b1) X vec_n) / (vec_n X vec_m)`.
    const b1a1x = a1x - b1x;
    const b1a1y = a1y - b1y;
    const q = crossProduct2d(b1a1x, b1a1y, mx, my) / nmCrossProduct;
    if (q < 0 || q > 1) {
        return false;
    }
    const p = crossProduct2d(b1a1x, b1a1y, nx, ny) / nmCrossProduct;
    if (p < 0 || p > 1) {
        return false;
    }

    return true;
}

/**
 * Cross product of 2-dimension vector.
 */
function crossProduct2d(x1: number, y1: number, x2: number, y2: number) {
    return x1 * y2 - x2 * y1;
}

function nearZero(val: number) {
    return val <= (1e-6) && val >= -(1e-6);
}


/**
 * ECData stored on graphic element
 */
export interface ECData {
    dataIndex?: number;
    dataModel?: DataModel;
    eventData?: ECEventData;
    seriesIndex?: number;
    dataType?: string;
}

export const getECData = makeInner<ECData, Element>();

// Register built-in shapes. These shapes might be overwirtten
// by users, although we do not recommend that.
registerShape('circle', Circle);
registerShape('sector', Sector);
registerShape('ring', Ring);
registerShape('polygon', Polygon);
registerShape('polyline', Polyline);
registerShape('rect', Rect);
registerShape('line', Line);
registerShape('bezierCurve', BezierCurve);
registerShape('arc', Arc);

export {
    Group,
    ZRImage as Image,
    ZRText as Text,
    Circle,
    Sector,
    Ring,
    Polygon,
    Polyline,
    Rect,
    Line,
    BezierCurve,
    Arc,
    IncrementalDisplayable,
    CompoundPath,
    LinearGradient,
    RadialGradient,
    BoundingRect,
    OrientedBoundingRect,
    Point,
    Path
};