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
import ZImage, { ImageStyleProps } from 'zrender/src/graphic/Image';
import Group from 'zrender/src/graphic/Group';
import RichText, { RichTextStyleProps } from 'zrender/src/graphic/RichText';
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
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';
import * as subPixelOptimizeUtil from 'zrender/src/graphic/helper/subPixelOptimize';
import { Dictionary } from 'zrender/src/core/types';
import LRU from 'zrender/src/core/LRU';
import Displayable, { DisplayableProps } from 'zrender/src/graphic/Displayable';
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
    ZRStyleProps
} from './types';
import GlobalModel from '../model/Global';
import { makeInner } from './model';
import { isFunction, retrieve2, extend, keys, trim, isArrayLike, map, defaults } from 'zrender/src/core/util';


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
    __highlighted?: boolean | 'layer' | 'plain'
    __highByOuter: number

    __highDownSilentOnTouch: boolean
    __highDownOnUpdate: (fromState: DisplayState, toState: DisplayState) => void

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
    /**
     * `true`: Use inside style (textFill, textStroke, textStrokeWidth)
     *     if `textFill` is not specified.
     * `false`: Do not use inside style.
     * `null/undefined`: use inside style if `isRectText` is true and
     *     `textFill` is not specified and textPosition contains `'inside'`.
     */
    useInsideStyle?: boolean

    forceRich?: boolean

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
    let path = pathTool.createFromString(pathData, opts);
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
    let path = new ZImage({
        style: {
            image: imageUrl,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        },
        onload(img) {
            if (layout === 'center') {
                let boundingRect = {
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
    let aspect = boundingRect.width / boundingRect.height;
    let width = rect.height * aspect;
    let height;
    if (width <= rect.width) {
        height = rect.height;
    }
    else {
        width = rect.width;
        height = width / aspect;
    }
    let cx = rect.x + rect.width / 2;
    let cy = rect.y + rect.height / 2;

    return {
        x: cx - width / 2,
        y: cy - height / 2,
        width: width,
        height: height
    };
}

export let mergePath = pathTool.mergePath;

/**
 * Resize a path to fit the rect
 * @param path
 * @param rect
 */
export function resizePath(path: SVGPath, rect: ZRRectLike): void {
    if (!path.applyTransform) {
        return;
    }

    let pathRect = path.getBoundingRect();

    let m = pathRect.calculateTransform(rect);

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
export let subPixelOptimize = subPixelOptimizeUtil.subPixelOptimize;


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

function singleEnterEmphasis(el: Displayable) {
    if (!el.states.emphasis) {
        return;
    }

    const emphasisStyle = el.states.emphasis.style;
    const currentFill = el.style.fill;
    const currentStroke = el.style.stroke;

    el.useState('emphasis');

    if (emphasisStyle && !hasFillOrStroke(emphasisStyle.fill)) {
        el.style.fill = liftColor(currentFill);
    }
    if (emphasisStyle && !hasFillOrStroke(emphasisStyle.stroke)) {
        el.style.stroke = liftColor(currentStroke);
    }

    el.z2 += Z2_EMPHASIS_LIFT;
    const textContent = el.getTextContent();
    if (textContent) {
        textContent.z2 += Z2_EMPHASIS_LIFT;
    }

    // TODO hover layer
}


function singleEnterNormal(el: Displayable) {
    el.clearStates();
}

function traverseUpdate<T>(
    el: ExtendedElement,
    updater: (this: void, el: Element, commonParam?: T) => void,
    commonParam?: T
) {
    // If root is group, also enter updater for `highDownOnUpdate`.
    let fromState: DisplayState = NORMAL;
    let toState: DisplayState = NORMAL;
    let trigger;
    // See the rule of `highDownOnUpdate` on `graphic.setAsHighDownDispatcher`.
    el.__highlighted && (fromState = EMPHASIS, trigger = true);
    updater(el, commonParam);
    el.__highlighted && (toState = EMPHASIS, trigger = true);

    el.isGroup && el.traverse(function (child) {
        !child.isGroup && updater(child, commonParam);
    });

    trigger && el.__highDownOnUpdate && el.__highDownOnUpdate(fromState, toState);
}

/**
 * Set hover style (namely "emphasis style") of element.
 * @param el Should not be `zrender/graphic/Group`.
 */
export function enableElementHoverEmphasis(el: Displayable, hoverStl?: ZRStyleProps) {
    if (hoverStl) {
        const emphasisState = el.ensureState('emphasis');
        emphasisState.style = hoverStl;
    }

    // FIXME
    // It is not completely right to save "normal"/"emphasis" flag on elements.
    // It probably should be saved on `data` of series. Consider the cases:
    // (1) A highlighted elements are moved out of the view port and re-enter
    // again by dataZoom.
    // (2) call `setOption` and replace elements totally when they are highlighted.
    if ((el as ExtendedDisplayable).__highlighted) {
        singleEnterNormal(el);
        singleEnterEmphasis(el);
    }
}

function onElementMouseOver(this: ExtendedDisplayable, e: ElementEvent) {
    !shouldSilent(this, e)
        // "emphasis" event highlight has higher priority than mouse highlight.
        && !this.__highByOuter
        && traverseUpdate(this, singleEnterEmphasis);
}

function onElementMouseOut(this: ExtendedDisplayable, e: ElementEvent) {
    !shouldSilent(this, e)
        // "emphasis" event highlight has higher priority than mouse highlight.
        && !this.__highByOuter
        && traverseUpdate(this, singleEnterNormal);
}

function onElementEmphasisEvent(this: ExtendedDisplayable, highlightDigit: number) {
    this.__highByOuter |= 1 << (highlightDigit || 0);
    traverseUpdate(this, singleEnterEmphasis);
}

function onElementNormalEvent(this: ExtendedDisplayable, highlightDigit: number) {
    !(this.__highByOuter &= ~(1 << (highlightDigit || 0)))
        && traverseUpdate(this, singleEnterNormal);
}

function shouldSilent(el: ExtendedDisplayable, e: ElementEvent) {
    return el.__highDownSilentOnTouch && e.zrByTouch;
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
 * root group, we can simply mount the style on `el.hoverStyle` for them, but should
 * not call this method for them.
 *
 * (2) These input parameters can be set directly on `el`:
 */
export function enableHoverEmphasis(el: Element, hoverStyle?: ZRStyleProps) {
    setAsHighDownDispatcher(el, true);
    traverseUpdate(el as ExtendedElement, enableElementHoverEmphasis, hoverStyle);
}

/**
 * @param {module:zrender/Element} el
 * @param {Function} [el.highDownOnUpdate] Called when state updated.
 *        Since `setHoverStyle` has the constraint that it must be called after
 *        all of the normal style updated, `highDownOnUpdate` is not needed to
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
 *        CAUTION: Do not expose `highDownOnUpdate` outside echarts.
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
    // Make `highDownSilentOnTouch` and `highDownOnUpdate` only work after
    // `setAsHighDownDispatcher` called. Avoid it is modified by user unexpectedly.
    extendedEl.__highDownSilentOnTouch = (el as ECElement).highDownSilentOnTouch;
    extendedEl.__highDownOnUpdate = (el as ECElement).highDownOnUpdate;

    // Simple optimize, since this method might be
    // called for each elements of a group in some cases.
    if (!disable || extendedEl.__highDownDispatcher) {
        let method: 'on' | 'off' = disable ? 'off' : 'on';

        // Duplicated function will be auto-ignored, see Eventful.js.
        el[method]('mouseover', onElementMouseOver)[method]('mouseout', onElementMouseOut);
        // Emphasis, normal can be triggered manually by API or other components like hover link.
        el[method]('emphasis', onElementEmphasisEvent)[method]('normal', onElementNormalEvent);
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
        getFormattedLabel?: (
            // In MapDraw case it can be string (region name)
            labelDataIndex: LDI,
            state: DisplayState,
            dataType: string,
            labelDimIndex: number
        ) => string
    },
    labelDataIndex?: LDI,
    labelDimIndex?: number
}


/**
 * Set normal styles and emphasis styles about text on target element
 * If target is a RichText. It will create a new style object.
 * If target is other Element. It will create or reuse RichText which is attached on the target.
 * And create a new style object.
 *
 * NOTICE: Because the style on RichText will be replaced with new.
 * So please use the style on RichText after use this method.
 */
export function setLabelStyle<LDI>(
    targetEl: Element,
    normalModel: Model,
    emphasisModel: Model,
    opt?: SetLabelStyleOpt<LDI>,
    normalSpecified?: RichTextStyleProps,
    emphasisSpecified?: RichTextStyleProps
    // TODO specified position?
) {
    opt = opt || EMPTY_OBJ;
    const isSetOnRichText = targetEl instanceof RichText;
    const labelFetcher = opt.labelFetcher;
    const labelDataIndex = opt.labelDataIndex;
    const labelDimIndex = opt.labelDimIndex;

    // This scenario, `label.normal.show = true; label.emphasis.show = false`,
    // is not supported util someone requests.

    const showNormal = normalModel.getShallow('show');
    const showEmphasis = emphasisModel.getShallow('show');

    // Consider performance, only fetch label when necessary.
    // If `normal.show` is `false` and `emphasis.show` is `true` and `emphasis.formatter` is not set,
    // label should be displayed, where text is fetched by `normal.formatter` or `opt.defaultText`.
    let baseText;
    if (showNormal || showEmphasis) {
        if (labelFetcher) {
            baseText = labelFetcher.getFormattedLabel(labelDataIndex, 'normal', null, labelDimIndex);
        }
        if (baseText == null) {
            baseText = isFunction(opt.defaultText) ? opt.defaultText(labelDataIndex, opt) : opt.defaultText;
        }
    }
    let normalStyleText = showNormal ? baseText : null;
    let emphasisStyleText = showEmphasis
        ? retrieve2(
            labelFetcher
                ? labelFetcher.getFormattedLabel(labelDataIndex, 'emphasis', null, labelDimIndex)
                : null,
            baseText
        )
        : null;

    let richText = isSetOnRichText ? targetEl as RichText : null;
    // Optimize: If style.text is null, text will not be drawn.
    if (normalStyleText != null || emphasisStyleText != null) {
        if (!isSetOnRichText) {
            // Reuse the previous
            richText = targetEl.getTextContent();
            if (!richText) {
                richText = new RichText();
                targetEl.setTextContent(richText);
            }
            richText.ignore = !normalStyleText;
        }

        const emphasisState = richText.ensureState('emphasis');
        emphasisState.ignore = !emphasisStyleText;

        // Always set `textStyle` even if `normalStyle.text` is null, because default
        // values have to be set on `normalStyle`.
        // If we set default values on `emphasisStyle`, consider case:
        // Firstly, `setOption(... label: {normal: {text: null}, emphasis: {show: true}} ...);`
        // Secondly, `setOption(... label: {noraml: {show: true, text: 'abc', color: 'red'} ...);`
        // Then the 'red' will not work on emphasis.
        const normalStyle = createTextStyle(
            normalModel,
            normalSpecified,
            opt,
            false,
            !isSetOnRichText
        );
        emphasisState.style = createTextStyle(
            emphasisModel,
            emphasisSpecified,
            opt,
            true,
            !isSetOnRichText
        );

        if (!isSetOnRichText) {
            // Always create new
            targetEl.setTextConfig(createTextConfig(
                normalStyle,
                normalModel,
                opt
            ));
            emphasisState.textConfig = createTextConfig(
                emphasisState.style,
                emphasisModel,
                opt
            );
        }

        normalStyle.text = normalStyleText;
        emphasisState.style.text = emphasisStyleText;

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

/**
 * Set basic textStyle properties.
 * See more info in `setTextStyleCommon`.
 */
export function createTextStyle(
    textStyleModel: Model,
    specifiedTextStyle?: RichTextStyleProps,    // Can be overrided by settings in model.
    opt?: TextCommonParams,
    isEmphasis?: boolean,
    isAttached?: boolean // If text is attached on an element. If so, auto color will handling in zrender.
) {
    const textStyle: RichTextStyleProps = {};
    setTextStyleCommon(textStyle, textStyleModel, opt, isEmphasis, isAttached);
    specifiedTextStyle && extend(textStyle, specifiedTextStyle);
    // textStyle.host && textStyle.host.dirty && textStyle.host.dirty(false);

    return textStyle;
}

export function createTextConfig(
    textStyle: RichTextStyleProps,
    textStyleModel: Model,
    opt?: TextCommonParams,
    isEmphasis?: boolean
) {
    const textConfig: ElementTextConfig = {};
    let labelPosition;
    let labelRotate = textStyleModel.getShallow('rotate');
    const labelDistance = retrieve2(
        textStyleModel.getShallow('distance'), isEmphasis ? null : 5
    );
    const labelOffset = textStyleModel.getShallow('offset');

    if (opt.getTextPosition) {
        labelPosition = opt.getTextPosition(textStyleModel, isEmphasis);
    }
    else {
        labelPosition = textStyleModel.getShallow('position')
            || (isEmphasis ? null : 'inside');
        // 'outside' is not a valid zr textPostion value, but used
        // in bar series, and magric type should be considered.
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
    if (!textStyle.fill) {
        textConfig.insideFill = 'auto';
        textConfig.outsideFill = opt.autoColor || null;
    }
    if (!textStyle.stroke) {
        textConfig.insideStroke = 'auto';
    }
    else if (opt.autoColor) {
        // TODO: stroke set to autoColor. if label is inside?
        textConfig.insideStroke = opt.autoColor;
    }

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
    textStyle: RichTextStyleProps,
    textStyleModel: Model,
    opt?: TextCommonParams,
    isEmphasis?: boolean,
    isAttached?: boolean
) {
    // Consider there will be abnormal when merge hover style to normal style if given default value.
    opt = opt || EMPTY_OBJ;

    let ecModel = textStyleModel.ecModel;
    let globalTextStyle = ecModel && ecModel.option.textStyle;

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
    let richItemNames = getRichItemNames(textStyleModel);
    let richResult: RichTextStyleProps['rich'];
    if (richItemNames) {
        richResult = {};
        for (let name in richItemNames) {
            if (richItemNames.hasOwnProperty(name)) {
                // Cascade is supported in rich.
                let richTextStyle = textStyleModel.getModel(['rich', name]);
                // In rich, never `disableBox`.
                // FIXME: consider `label: {formatter: '{a|xx}', color: 'blue', rich: {a: {}}}`,
                // the default color `'blue'` will not be adopted if no color declared in `rich`.
                // That might confuses users. So probably we should put `textStyleModel` as the
                // root ancestor of the `richTextStyle`. But that would be a break change.
                setTokenTextStyle(richResult[name] = {}, richTextStyle, globalTextStyle, opt, isEmphasis, isAttached);
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

    setTokenTextStyle(textStyle, textStyleModel, globalTextStyle, opt, isEmphasis, isAttached, true);

    // TODO
    if (opt.forceRich && !opt.textStyle) {
        opt.textStyle = {};
    }
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
        let rich = (textStyleModel.option || EMPTY_OBJ as LabelOption).rich;
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
    'fontStyle', 'fontWeight', 'fontSize', 'fontFamily',
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
    textStyle: RichTextStyleProps['rich'][string],
    textStyleModel: Model<LabelOption>,
    globalTextStyle: LabelOption,
    opt?: TextCommonParams,
    isEmphasis?: boolean,
    isAttached?: boolean,
    isBlock?: boolean
) {
    // In merge mode, default value should not be given.
    globalTextStyle = !isEmphasis && globalTextStyle || EMPTY_OBJ;

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
    if (!isEmphasis && !isAttached) {
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
    let gTextStyleModel = ecModel && ecModel.getModel('textStyle');
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
    let animationEnabled = animatableModel && animatableModel.isAnimationEnabled();

    if (animationEnabled) {
        let duration = animatableModel.getShallow(
            isUpdate ? 'animationDurationUpdate' : 'animationDuration'
        );
        let animationEasing = animatableModel.getShallow(
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
            ? el.animateTo(props, duration, animationDelay || 0, animationEasing, cb, !!cb)
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
    let mat = matrix.identity([]);

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
    let hBase = (transform[4] === 0 || transform[5] === 0 || transform[0] === 0)
        ? 1 : Math.abs(2 * transform[4] / transform[0]);
    let vBase = (transform[4] === 0 || transform[5] === 0 || transform[2] === 0)
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
        let elMap: Dictionary<Displayable> = {};
        g.traverse(function (el: Element) {
            if (isNotGroup(el) && el.anid) {
                elMap[el.anid];
            }
        });
        return elMap;
    }
    function getAnimatableProps(el: Displayable) {
        let obj: PathProps = {
            position: vector.clone(el.position),
            rotation: el.rotation
        };
        if (isPath(el)) {
            obj.shape = extend({}, el.shape);
        }
        return obj;
    }
    let elMap1 = getElMap(g1);

    g2.traverse(function (el) {
        if (isNotGroup(el) && el.anid) {
            let oldEl = elMap1[el.anid];
            if (oldEl) {
                let newProp = getAnimatableProps(el);
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
    let x = mathMax(targetRect.x, rect.x);
    let x2 = mathMin(targetRect.x + targetRect.width, rect.x + rect.width);
    let y = mathMax(targetRect.y, rect.y);
    let y2 = mathMin(targetRect.y + targetRect.height, rect.y + rect.height);

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
): SVGPath | ZImage {
    const innerOpts: DisplayableProps = extend({rectHover: true}, opt);
    const style: ZRStyleProps = innerOpts.style = {strokeNoScale: true};
    rect = rect || {x: -1, y: -1, width: 2, height: 2};

    if (iconStr) {
        return iconStr.indexOf('image://') === 0
            ? (
                (style as ImageStyleProps).image = iconStr.slice(8),
                defaults(style, rect),
                new ZImage(innerOpts)
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
        let p = points[i];
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
    let mx = a2x - a1x;
    let my = a2y - a1y;
    let nx = b2x - b1x;
    let ny = b2y - b1y;

    // `vec_m` and `vec_n` are parallel iff
    //     exising `k` such that `vec_m = k · vec_n`, equivalent to `vec_m X vec_n = 0`.
    let nmCrossProduct = crossProduct2d(nx, ny, mx, my);
    if (nearZero(nmCrossProduct)) {
        return false;
    }

    // `vec_m` and `vec_n` are intersect iff
    //     existing `p` and `q` in [0, 1] such that `vec_a1 + p * vec_m = vec_b1 + q * vec_n`,
    //     such that `q = ((vec_a1 - vec_b1) X vec_m) / (vec_n X vec_m)`
    //           and `p = ((vec_a1 - vec_b1) X vec_n) / (vec_n X vec_m)`.
    let b1a1x = a1x - b1x;
    let b1a1y = a1y - b1y;
    let q = crossProduct2d(b1a1x, b1a1y, mx, my) / nmCrossProduct;
    if (q < 0 || q > 1) {
        return false;
    }
    let p = crossProduct2d(b1a1x, b1a1y, nx, ny) / nmCrossProduct;
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
    ZImage as Image,
    RichText as Text,
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
    Path
};
