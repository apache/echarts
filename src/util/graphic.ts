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
import * as matrix from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import Path, { PathProps } from 'zrender/src/graphic/Path';
import Transformable from 'zrender/src/core/Transformable';
import ZRImage, { ImageStyleProps } from 'zrender/src/graphic/Image';
import Group from 'zrender/src/graphic/Group';
import ZRText from 'zrender/src/graphic/Text';
import Circle from 'zrender/src/graphic/shape/Circle';
import Ellipse from 'zrender/src/graphic/shape/Ellipse';
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
import Displayable, { DisplayableProps } from 'zrender/src/graphic/Displayable';
import Element, { ElementProps } from 'zrender/src/Element';
import Model from '../model/Model';
import {
    AnimationOptionMixin,
    LabelOption,
    AnimationDelayCallbackParam,
    DisplayState,
    ZRRectLike,
    ColorString,
    DataModel,
    ECEventData,
    ZRStyleProps,
    ParsedValue,
    BlurScope} from './types';
import { makeInner } from './model';
import {
    extend,
    isArrayLike,
    map,
    defaults,
    isObject
} from 'zrender/src/core/util';
import * as numberUtil from './number';
import SeriesModel from '../model/Series';
import {interpolateNumber} from 'zrender/src/animation/Animator';
import List from '../data/List';
import { getLabelText } from '../label/labelStyle';


const mathMax = Math.max;
const mathMin = Math.min;

export const EMPTY_OBJ = {};

export const Z2_EMPHASIS_LIFT = 10;

export const EMPHASIS = 'emphasis';
export const NORMAL = 'normal';

export const _highlightKeyMap: Dictionary<number> = {};

const _customShapeMap: Dictionary<{ new(): Path }> = {};

type ExtendShapeOpt = Parameters<typeof Path.extend>[0];
type ExtendShapeReturn = ReturnType<typeof Path.extend>;


type ExtendedProps = {
    __highByOuter: number

    __highDownSilentOnTouch: boolean
    __onStateChange: (fromState: DisplayState, toState: DisplayState) => void

    __highDownDispatcher: boolean
};
export type ExtendedElement = Element & ExtendedProps;
export type ExtendedDisplayable = Displayable & ExtendedProps;

export type TextCommonParams = {
    /**
     * Whether diable drawing box of block (outer most).
     */
    disableBox?: boolean
    /**
     * Specify a color when color is 'inherit',
     * If inheritColor specified, it is used as default textFill.
     */
    inheritColor?: ColorString

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


type AnimateOrSetPropsOption = {
    dataIndex?: number;
    cb?: () => void;
    during?: (percent: number) => void;
    isFrom?: boolean;
};

function animateOrSetProps<Props>(
    animationType: 'init' | 'update' | 'remove',
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin> & {
        getAnimationDelayParams?: (el: Element<Props>, dataIndex: number) => AnimationDelayCallbackParam
    },
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    let isFrom = false;
    if (typeof dataIndex === 'function') {
        during = cb;
        cb = dataIndex;
        dataIndex = null;
    }
    else if (isObject(dataIndex)) {
        cb = dataIndex.cb;
        during = dataIndex.during;
        isFrom = dataIndex.isFrom;
        dataIndex = dataIndex.dataIndex;
    }
    const isUpdate = animationType === 'update';
    const isRemove = animationType === 'remove';
    // Do not check 'animation' property directly here. Consider this case:
    // animation model is an `itemModel`, whose does not have `isAnimationEnabled`
    // but its parent model (`seriesModel`) does.
    const animationEnabled = animatableModel && animatableModel.isAnimationEnabled();

    if (animationEnabled) {
        // TODO Configurable
        let duration = isRemove ? 200 : animatableModel.getShallow(
            isUpdate ? 'animationDurationUpdate' : 'animationDuration'
        );
        const animationEasing = isRemove ? 'cubicOut' : animatableModel.getShallow(
            isUpdate ? 'animationEasingUpdate' : 'animationEasing'
        );
        let animationDelay = isRemove ? 0 : animatableModel.getShallow(
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

        if (!isRemove) {
            // Must stop the remove animation.
            el.stopAnimation('remove');
        }

        duration > 0
            ? (
                isFrom
                    ? el.animateFrom(props, {
                        duration,
                        delay: animationDelay || 0,
                        easing: animationEasing,
                        done: cb,
                        force: !!cb || !!during,
                        scope: animationType,
                        during: during
                    })
                    : el.animateTo(props, {
                        duration,
                        delay: animationDelay || 0,
                        easing: animationEasing,
                        done: cb,
                        force: !!cb || !!during,
                        setToFinal: true,
                        scope: animationType,
                        during: during
                    })
            )
            : (el.stopAnimation(), el.attr(props), cb && (cb as AnimateOrSetPropsOption['cb'])());
    }
    else {
        el.stopAnimation();
        !isFrom && el.attr(props);
        cb && (cb as AnimateOrSetPropsOption['cb'])();
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
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    animateOrSetProps('update', el, props, animatableModel, dataIndex, cb, during);
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
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    animateOrSetProps('init', el, props, animatableModel, dataIndex, cb, during);
}

/**
 * Remove graphic element
 */
export function removeElement<Props>(
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    animateOrSetProps('remove', el, props, animatableModel, dataIndex, cb, during);
}

function animateOrSetLabel<Props extends PathProps>(
    animationType: 'init' | 'update' | 'remove',
    el: Element<Props>,
    data: List,
    dataIndex: number,
    labelModel: Model<LabelOption>,
    seriesModel: SeriesModel,
    animatableModel?: Model<AnimationOptionMixin>,
    defaultTextGetter?: (value: ParsedValue[] | ParsedValue) => string
) {
    const valueAnimationEnabled = labelModel && labelModel.get('valueAnimation');
    if (valueAnimationEnabled) {
        const precisionOption = labelModel.get('precision');
        const precision: number = precisionOption === 'auto' ? 0 : precisionOption;

        let interpolateValues: (number | string)[] | (number | string);
        const rawValues = seriesModel.getRawValue(dataIndex);
        let isRawValueNumber = false;
        if (typeof rawValues === 'number') {
            isRawValueNumber = true;
            interpolateValues = rawValues;
        }
        else {
            interpolateValues = [];
            for (let i = 0; i < (rawValues as []).length; ++i) {
                const info = data.getDimensionInfo(i);
                if (info.type !== 'ordinal') {
                    interpolateValues.push((rawValues as [])[i]);
                }
            }
        }

        const during = (percent: number) => {
            let interpolated;
            if (isRawValueNumber) {
                const value = interpolateNumber(0, interpolateValues as number, percent);
                interpolated = numberUtil.round(value, precision);
            }
            else {
                interpolated = [];
                for (let i = 0; i < (rawValues as []).length; ++i) {
                    const info = data.getDimensionInfo(i);
                    // Don't interpolate ordinal dims
                    if (info.type === 'ordinal') {
                        interpolated[i] = (rawValues as [])[i];
                    }
                    else {
                        const value = interpolateNumber(0, (interpolateValues as number[])[i], percent);
                        interpolated[i] = numberUtil.round(value), precision;
                    }
                }
            }
            const text = el.getTextContent();
            if (text) {
                const labelText = getLabelText({
                    labelDataIndex: dataIndex,
                    labelFetcher: seriesModel,
                    defaultText: defaultTextGetter
                        ? defaultTextGetter(interpolated)
                        : interpolated + ''
                }, labelModel, null, interpolated);
                text.style.text = labelText.normal;
                text.dirty();
            }
        };

        const props: ElementProps = {};
        animateOrSetProps(animationType, el, props, animatableModel, dataIndex, null, during);
    }
}

export function updateLabel<Props>(
    el: Element<Props>,
    data: List,
    dataIndex: number,
    labelModel: Model<LabelOption>,
    seriesModel: SeriesModel,
    animatableModel?: Model<AnimationOptionMixin>,
    defaultTextGetter?: (value: ParsedValue[] | ParsedValue) => string
) {
    animateOrSetLabel('update', el, data, dataIndex, labelModel, seriesModel, animatableModel, defaultTextGetter);
}

export function initLabel<Props>(
    el: Element<Props>,
    data: List,
    dataIndex: number,
    labelModel: Model<LabelOption>,
    seriesModel: SeriesModel,
    animatableModel?: Model<AnimationOptionMixin>,
    defaultTextGetter?: (value: ParsedValue[] | ParsedValue) => string
) {
    animateOrSetLabel('init', el, data, dataIndex, labelModel, seriesModel, animatableModel, defaultTextGetter);
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

    // self | series
    focus?: string
    blurScope?: BlurScope
}

export const getECData = makeInner<ECData, Element>();

// Register built-in shapes. These shapes might be overwirtten
// by users, although we do not recommend that.
registerShape('circle', Circle);
registerShape('ellipse', Ellipse);
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
    Ellipse,
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