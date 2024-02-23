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

// Helpers for creating transitions in custom series and graphic components.
import Element, { ElementAnimateConfig, ElementProps } from 'zrender/src/Element';

import { makeInner, normalizeToArray } from '../util/model';
import { assert, bind, each, eqNaN, extend, hasOwn, indexOf, isArrayLike, keys, reduce } from 'zrender/src/core/util';
import { cloneValue } from 'zrender/src/animation/Animator';
import Displayable, { DisplayableProps } from 'zrender/src/graphic/Displayable';
import Model from '../model/Model';
import { getAnimationConfig } from './basicTransition';
import { Path } from '../util/graphic';
import { warn } from '../util/log';
import { AnimationOption, AnimationOptionMixin, ZRStyleProps } from '../util/types';
import { Dictionary } from 'zrender/src/core/types';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { TRANSFORMABLE_PROPS, TransformProp } from 'zrender/src/core/Transformable';

const LEGACY_TRANSFORM_PROPS_MAP = {
    position: ['x', 'y'],
    scale: ['scaleX', 'scaleY'],
    origin: ['originX', 'originY']
} as const;
const LEGACY_TRANSFORM_PROPS = keys(LEGACY_TRANSFORM_PROPS_MAP);

const TRANSFORM_PROPS_MAP = reduce(TRANSFORMABLE_PROPS, (obj, key) => {
    obj[key] = 1;
    return obj;
}, {} as Record<TransformProp, 1>);
const transformPropNamesStr = TRANSFORMABLE_PROPS.join(', ');

// '' means root
export const ELEMENT_ANIMATABLE_PROPS = ['', 'style', 'shape', 'extra'] as const;

export type TransitionProps = string | string[];
export type ElementRootTransitionProp = TransformProp | 'shape' | 'extra' | 'style';

export interface TransitionOptionMixin<T = Record<string, any>> {
    transition?: (keyof T & string) | ((keyof T & string)[]) | 'all'

    enterFrom?: T;
    leaveTo?: T;

    enterAnimation?: AnimationOption
    updateAnimation?: AnimationOption
    leaveAnimation?: AnimationOption
};

interface LooseElementProps extends ElementProps {
    style?: ZRStyleProps;
    shape?: Dictionary<unknown>;
}

type TransitionElementOption = Partial<Record<TransformProp, number>> & {
    shape?: Dictionary<any> & TransitionOptionMixin
    style?: PathStyleProps & TransitionOptionMixin
    extra?: Dictionary<any> & TransitionOptionMixin
    invisible?: boolean
    silent?: boolean
    autoBatch?: boolean
    ignore?: boolean

    during?: (params: TransitionDuringAPI) => void
} & TransitionOptionMixin;

const transitionInnerStore = makeInner<{
    leaveToProps: ElementProps;
    userDuring: (params: TransitionDuringAPI) => void;
}, Element>();

export interface TransitionBaseDuringAPI {
    // Usually other props do not need to be changed in animation during.
    setTransform(key: TransformProp, val: number): this
    getTransform(key: TransformProp): number;
    setExtra(key: string, val: unknown): this
    getExtra(key: string): unknown
}
export interface TransitionDuringAPI<
    StyleOpt extends any = any,
    ShapeOpt extends any = any
> extends TransitionBaseDuringAPI {
    setShape<T extends keyof ShapeOpt>(key: T, val: ShapeOpt[T]): this;
    getShape<T extends keyof ShapeOpt>(key: T): ShapeOpt[T];
    setStyle<T extends keyof StyleOpt>(key: T, val: StyleOpt[T]): this
    getStyle<T extends keyof StyleOpt>(key: T): StyleOpt[T];
};

function getElementAnimationConfig(
    animationType: 'enter' | 'update' | 'leave',
    el: Element,
    elOption: TransitionElementOption,
    parentModel: Model<AnimationOptionMixin>,
    dataIndex?: number
) {
    const animationProp = `${animationType}Animation` as const;
    const config: ElementAnimateConfig = getAnimationConfig(animationType, parentModel, dataIndex) || {};

    const userDuring = transitionInnerStore(el).userDuring;
    // Only set when duration is > 0 and it's need to be animated.
    if (config.duration > 0) {
        // For simplicity, if during not specified, the previous during will not work any more.
        config.during = userDuring ? bind(duringCall, { el: el, userDuring: userDuring }) : null;
        config.setToFinal = true;
        config.scope = animationType;
    }

    extend(config, elOption[animationProp]);
    return config;
}


export function applyUpdateTransition(
    el: Element,
    elOption: TransitionElementOption,
    animatableModel?: Model<AnimationOptionMixin>,
    opts?: {
        dataIndex?: number,
        isInit?: boolean,
        clearStyle?: boolean
    }
) {
    opts = opts || {};
    const {dataIndex, isInit, clearStyle} = opts;

    const hasAnimation = animatableModel.isAnimationEnabled();
    // Save the meta info for further morphing. Like apply on the sub morphing elements.
    const store = transitionInnerStore(el);
    const styleOpt = elOption.style;
    store.userDuring = elOption.during;

    const transFromProps = {} as ElementProps;
    const propsToSet = {} as ElementProps;

    prepareTransformAllPropsFinal(el, elOption, propsToSet);
    prepareShapeOrExtraAllPropsFinal('shape', elOption, propsToSet);
    prepareShapeOrExtraAllPropsFinal('extra', elOption, propsToSet);

    if (!isInit && hasAnimation) {
        prepareTransformTransitionFrom(el, elOption, transFromProps);
        prepareShapeOrExtraTransitionFrom('shape', el, elOption, transFromProps);
        prepareShapeOrExtraTransitionFrom('extra', el, elOption, transFromProps);
        prepareStyleTransitionFrom(el, elOption, styleOpt, transFromProps);
    }

    (propsToSet as DisplayableProps).style = styleOpt;

    applyPropsDirectly(el, propsToSet, clearStyle);
    applyMiscProps(el, elOption);

    if (hasAnimation) {
        if (isInit) {
            const enterFromProps: ElementProps = {};
            each(ELEMENT_ANIMATABLE_PROPS, propName => {
                const prop: TransitionOptionMixin = propName ? elOption[propName] : elOption;
                if (prop && prop.enterFrom) {
                    if (propName) {
                        (enterFromProps as any)[propName] = (enterFromProps as any)[propName] || {};
                    }
                    extend(propName ? (enterFromProps as any)[propName] : enterFromProps, prop.enterFrom);
                }
            });
            const config = getElementAnimationConfig('enter', el, elOption, animatableModel, dataIndex);
            if (config.duration > 0) {
                el.animateFrom(enterFromProps, config);
            }
        }
        else {
            applyPropsTransition(el, elOption, dataIndex || 0, animatableModel, transFromProps);
        }
    }
    // Store leave to be used in leave transition.
    updateLeaveTo(el, elOption);

    styleOpt ? el.dirty() : el.markRedraw();
}

export function updateLeaveTo(el: Element, elOption: TransitionElementOption) {
    // Try merge to previous set leaveTo
    let leaveToProps: ElementProps = transitionInnerStore(el).leaveToProps;
    for (let i = 0; i < ELEMENT_ANIMATABLE_PROPS.length; i++) {
        const propName = ELEMENT_ANIMATABLE_PROPS[i];
        const prop: TransitionOptionMixin = propName ? elOption[propName] : elOption;
        if (prop && prop.leaveTo) {
            if (!leaveToProps) {
                leaveToProps = transitionInnerStore(el).leaveToProps = {};
            }
            if (propName) {
                (leaveToProps as any)[propName] = (leaveToProps as any)[propName] || {};
            }
            extend(propName ? (leaveToProps as any)[propName] : leaveToProps, prop.leaveTo);
        }
    }
}

export function applyLeaveTransition(
    el: Element,
    elOption: TransitionElementOption,
    animatableModel: Model<AnimationOptionMixin>,
    onRemove?: () => void
): void {
    if (el) {
        const parent = el.parent;
        const leaveToProps = transitionInnerStore(el).leaveToProps;
        if (leaveToProps) {
            // TODO TODO use leave after leaveAnimation in series is introduced
            // TODO Data index?
            const config = getElementAnimationConfig('update', el, elOption, animatableModel, 0);
            config.done = () => {
                parent.remove(el);
                onRemove && onRemove();
            };
            el.animateTo(leaveToProps, config);
        }
        else {
            parent.remove(el);
            onRemove && onRemove();
        }
    }
}

export function isTransitionAll(transition: TransitionProps): transition is 'all' {
    return transition === 'all';
}


function applyPropsDirectly(
    el: Element,
    // Can be null/undefined
    allPropsFinal: ElementProps,
    clearStyle: boolean
) {
    const styleOpt = (allPropsFinal as Displayable).style;
    if (!el.isGroup && styleOpt) {
        if (clearStyle) {
            (el as Displayable).useStyle({});

            // When style object changed, how to trade the existing animation?
            // It is probably complicated and not needed to cover all the cases.
            // But still need consider the case:
            // (1) When using init animation on `style.opacity`, and before the animation
            //     ended users triggers an update by mousewhel. At that time the init
            //     animation should better be continued rather than terminated.
            //     So after `useStyle` called, we should change the animation target manually
            //     to continue the effect of the init animation.
            // (2) PENDING: If the previous animation targeted at a `val1`, and currently we need
            //     to update the value to `val2` and no animation declared, should be terminate
            //     the previous animation or just modify the target of the animation?
            //     Therotically That will happen not only on `style` but also on `shape` and
            //     `transfrom` props. But we haven't handle this case at present yet.
            // (3) PENDING: Is it proper to visit `animators` and `targetName`?
            const animators = el.animators;
            for (let i = 0; i < animators.length; i++) {
                const animator = animators[i];
                // targetName is the "topKey".
                if (animator.targetName === 'style') {
                    animator.changeTarget((el as Displayable).style);
                }
            }
        }
        (el as Displayable).setStyle(styleOpt);
    }

    if (allPropsFinal) {
        // Not set style here.
        (allPropsFinal as DisplayableProps).style = null;
        // Set el to the final state firstly.
        allPropsFinal && el.attr(allPropsFinal);
        (allPropsFinal as DisplayableProps).style = styleOpt;
    }
}

function applyPropsTransition(
    el: Element,
    elOption: TransitionElementOption,
    dataIndex: number,
    model: Model<AnimationOptionMixin>,
    // Can be null/undefined
    transFromProps: ElementProps
): void {
    if (transFromProps) {
        const config = getElementAnimationConfig('update', el, elOption, model, dataIndex);
        if (config.duration > 0) {
            el.animateFrom(transFromProps, config);
        }
    }
}


function applyMiscProps(
    el: Element,
    elOption: TransitionElementOption
) {
    // Merge by default.
    hasOwn(elOption, 'silent') && (el.silent = elOption.silent);
    hasOwn(elOption, 'ignore') && (el.ignore = elOption.ignore);
    if (el instanceof Displayable) {
        hasOwn(elOption, 'invisible') && ((el as Path).invisible = elOption.invisible);
    }
    if (el instanceof Path) {
        hasOwn(elOption, 'autoBatch') && ((el as Path).autoBatch = elOption.autoBatch);
    }
}

// Use it to avoid it be exposed to user.
const tmpDuringScope = {} as {
    el: Element;
};
const transitionDuringAPI: TransitionDuringAPI = {
    // Usually other props do not need to be changed in animation during.
    setTransform(key: TransformProp, val: unknown) {
        if (__DEV__) {
            assert(hasOwn(TRANSFORM_PROPS_MAP, key), 'Only ' + transformPropNamesStr + ' available in `setTransform`.');
        }
        tmpDuringScope.el[key] = val as number;
        return this;
    },
    getTransform(key: TransformProp): number {
        if (__DEV__) {
            assert(hasOwn(TRANSFORM_PROPS_MAP, key), 'Only ' + transformPropNamesStr + ' available in `getTransform`.');
        }
        return tmpDuringScope.el[key];
    },
    setShape(key: any, val: unknown) {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const el = tmpDuringScope.el as Path;
        const shape = el.shape || (el.shape = {});
        shape[key] = val;
        el.dirtyShape && el.dirtyShape();
        return this;
    },
    getShape(key: any): any {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const shape = (tmpDuringScope.el as Path).shape;
        if (shape) {
            return shape[key];
        }
    },
    setStyle(key: any, val: unknown) {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const el = tmpDuringScope.el as Displayable;
        const style = el.style;
        if (style) {
            if (__DEV__) {
                if (eqNaN(val)) {
                    warn('style.' + key + ' must not be assigned with NaN.');
                }
            }
            style[key] = val;
            el.dirtyStyle && el.dirtyStyle();
        }
        return this;
    },
    getStyle(key: any): any {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const style = (tmpDuringScope.el as Displayable).style;
        if (style) {
            return style[key];
        }
    },
    setExtra(key: any, val: unknown) {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const extra = (tmpDuringScope.el as LooseElementProps).extra
            || ((tmpDuringScope.el as LooseElementProps).extra = {});
        extra[key] = val;
        return this;
    },
    getExtra(key: string): unknown {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const extra = (tmpDuringScope.el as LooseElementProps).extra;
        if (extra) {
            return extra[key];
        }
    }
};

function assertNotReserved(key: string) {
    if (__DEV__) {
        if (key === 'transition' || key === 'enterFrom' || key === 'leaveTo') {
            throw new Error('key must not be "' + key + '"');
        }
    }
}

function duringCall(
    this: {
        el: Element;
        userDuring: (params: TransitionDuringAPI) => void;
    }
): void {
    // Do not provide "percent" until some requirements come.
    // Because consider thies case:
    // enterFrom: {x: 100, y: 30}, transition: 'x'.
    // And enter duration is different from update duration.
    // Thus it might be confused about the meaning of "percent" in during callback.
    const scope = this;
    const el = scope.el;
    if (!el) {
        return;
    }
    // If el is remove from zr by reason like legend, during still need to called,
    // because el will be added back to zr and the prop value should not be incorrect.

    const latestUserDuring = transitionInnerStore(el).userDuring;
    const scopeUserDuring = scope.userDuring;
    // Ensured a during is only called once in each animation frame.
    // If a during is called multiple times in one frame, maybe some users' calculation logic
    // might be wrong (not sure whether this usage exists).
    // The case of a during might be called twice can be: by default there is a animator for
    // 'x', 'y' when init. Before the init animation finished, call `setOption` to start
    // another animators for 'style'/'shape'/'extra'.
    if (latestUserDuring !== scopeUserDuring) {
        // release
        scope.el = scope.userDuring = null;
        return;
    }

    tmpDuringScope.el = el;

    // Give no `this` to user in "during" calling.
    scopeUserDuring(transitionDuringAPI);

    // FIXME: if in future meet the case that some prop will be both modified in `during` and `state`,
    // consider the issue that the prop might be incorrect when return to "normal" state.
}

function prepareShapeOrExtraTransitionFrom(
    mainAttr: 'shape' | 'extra',
    fromEl: Element,
    elOption: TransitionOptionMixin,
    transFromProps: LooseElementProps
): void {

    const attrOpt: Dictionary<unknown> & TransitionOptionMixin = (elOption as any)[mainAttr];
    if (!attrOpt) {
        return;
    }

    const elPropsInAttr = (fromEl as LooseElementProps)[mainAttr];
    let transFromPropsInAttr: Dictionary<unknown>;

    if (elPropsInAttr) {
        const transition = elOption.transition;
        const attrTransition = attrOpt.transition;
        if (attrTransition) {
            !transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
            if (isTransitionAll(attrTransition)) {
                extend(transFromPropsInAttr, elPropsInAttr);
            }
            else {
                const transitionKeys = normalizeToArray(attrTransition);
                for (let i = 0; i < transitionKeys.length; i++) {
                    const key = transitionKeys[i];
                    const elVal = elPropsInAttr[key];
                    transFromPropsInAttr[key] = elVal;
                }
            }
        }
        else if (isTransitionAll(transition) || indexOf(transition, mainAttr) >= 0) {
            !transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
            const elPropsInAttrKeys = keys(elPropsInAttr);
            for (let i = 0; i < elPropsInAttrKeys.length; i++) {
                const key = elPropsInAttrKeys[i];
                const elVal = elPropsInAttr[key];
                if (isNonStyleTransitionEnabled((attrOpt as any)[key], elVal)) {
                    transFromPropsInAttr[key] = elVal;
                }
            }
        }
    }
}

function prepareShapeOrExtraAllPropsFinal(
    mainAttr: 'shape' | 'extra',
    elOption: TransitionElementOption,
    allProps: LooseElementProps
): void {
    const attrOpt: Dictionary<unknown> = (elOption as any)[mainAttr];
    if (!attrOpt) {
        return;
    }
    const allPropsInAttr = allProps[mainAttr] = {} as Dictionary<unknown>;
    const keysInAttr = keys(attrOpt);
    for (let i = 0; i < keysInAttr.length; i++) {
        const key = keysInAttr[i];
        // To avoid share one object with different element, and
        // to avoid user modify the object inexpectedly, have to clone.
        allPropsInAttr[key] = cloneValue((attrOpt as any)[key]);
    }
}

function prepareTransformTransitionFrom(
    el: Element,
    elOption: TransitionElementOption,
    transFromProps: ElementProps
): void {
    const transition = elOption.transition;
    const transitionKeys = isTransitionAll(transition)
        ? TRANSFORMABLE_PROPS
        : normalizeToArray(transition || []);
    for (let i = 0; i < transitionKeys.length; i++) {
        const key = transitionKeys[i];
        if (key === 'style' || key === 'shape' || key === 'extra') {
            continue;
        }
        const elVal = (el as any)[key];
        if (__DEV__) {
            checkTransformPropRefer(key, 'el.transition');
        }
        // Do not clone, animator will perform that clone.
        (transFromProps as any)[key] = elVal;
    }
}

function prepareTransformAllPropsFinal(
    el: Element,
    elOption: TransitionElementOption,
    allProps: ElementProps
): void {
    for (let i = 0; i < LEGACY_TRANSFORM_PROPS.length; i++) {
        const legacyName = LEGACY_TRANSFORM_PROPS[i];
        const xyName = LEGACY_TRANSFORM_PROPS_MAP[legacyName];
        const legacyArr = (elOption as any)[legacyName];
        if (legacyArr) {
            allProps[xyName[0]] = legacyArr[0];
            allProps[xyName[1]] = legacyArr[1];
        }
    }

    for (let i = 0; i < TRANSFORMABLE_PROPS.length; i++) {
        const key = TRANSFORMABLE_PROPS[i];
        if (elOption[key] != null) {
            allProps[key] = elOption[key];
        }
    }
}

function prepareStyleTransitionFrom(
    fromEl: Element,
    elOption: TransitionElementOption,
    styleOpt: TransitionElementOption['style'],
    transFromProps: LooseElementProps
): void {
    if (!styleOpt) {
        return;
    }

    const fromElStyle = (fromEl as LooseElementProps).style as LooseElementProps['style'];
    let transFromStyleProps: LooseElementProps['style'];

    if (fromElStyle) {
        const styleTransition = styleOpt.transition;
        const elTransition = elOption.transition;
        if (styleTransition && !isTransitionAll(styleTransition)) {
            const transitionKeys = normalizeToArray(styleTransition);
            !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
            for (let i = 0; i < transitionKeys.length; i++) {
                const key = transitionKeys[i];
                const elVal = (fromElStyle as any)[key];
                // Do not clone, see `checkNonStyleTansitionRefer`.
                (transFromStyleProps as any)[key] = elVal;
            }
        }
        else if (
            (fromEl as Displayable).getAnimationStyleProps
            && (
                isTransitionAll(elTransition)
                || isTransitionAll(styleTransition)
                || indexOf(elTransition, 'style') >= 0
            )
        ) {
            const animationProps = (fromEl as Displayable).getAnimationStyleProps();
            const animationStyleProps = animationProps ? animationProps.style : null;
            if (animationStyleProps) {
                !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
                const styleKeys = keys(styleOpt);
                for (let i = 0; i < styleKeys.length; i++) {
                    const key = styleKeys[i];
                    if ((animationStyleProps as Dictionary<unknown>)[key]) {
                        const elVal = (fromElStyle as any)[key];
                        (transFromStyleProps as any)[key] = elVal;
                    }
                }
            }
        }
    }
}

function isNonStyleTransitionEnabled(optVal: unknown, elVal: unknown): boolean {
    // The same as `checkNonStyleTansitionRefer`.
    return !isArrayLike(optVal)
        ? (optVal != null && isFinite(optVal as number))
        : optVal !== elVal;
}

let checkTransformPropRefer: (key: string, usedIn: string) => void;
if (__DEV__) {
    checkTransformPropRefer = function (key: string, usedIn: string): void {
        if (!hasOwn(TRANSFORM_PROPS_MAP, key)) {
            warn('Prop `' + key + '` is not a permitted in `' + usedIn + '`. '
               + 'Only `' + keys(TRANSFORM_PROPS_MAP).join('`, `') + '` are permitted.');
        }
    };
}
